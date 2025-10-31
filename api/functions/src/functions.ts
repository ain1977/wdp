import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";
import { SearchClient, SearchIndexClient, AzureKeyCredential, odata } from "@azure/search-documents";
import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { AzureIdentityAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

// --- Azure AI Search helpers ---
const AI_SEARCH_ENDPOINT = process.env.AI_SEARCH_ENDPOINT ?? '';
const AI_SEARCH_API_KEY = process.env.AI_SEARCH_API_KEY ?? '';
const AI_SEARCH_INDEX = process.env.AI_SEARCH_INDEX ?? 'content';

// --- Your Gut Assistant Configuration ---
const AI_ASSISTANT_SYSTEM_PROMPT = process.env.AI_ASSISTANT_SYSTEM_PROMPT ?? `You are Your Gut Assistant, a helpful assistant for La Cura, a personal chef service focused on healing and wellness through Mediterranean nutrition. You are warm, knowledgeable, and supportive. Help users with questions about services, bookings, nutrition, and wellness. Be concise and friendly.`;
const AI_ASSISTANT_TONE = process.env.AI_ASSISTANT_TONE ?? 'warm, supportive, knowledgeable';

// --- Microsoft Graph API helpers ---
const CALENDAR_OWNER_EMAIL = process.env.CALENDAR_OWNER_EMAIL ?? 'andrea@liveraltravel.com';

function getGraphClient(): Client {
    const credential = new DefaultAzureCredential();
    const authProvider = new AzureIdentityAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
    });
    return Client.initWithMiddleware({ authProvider });
}

function getSearchClients() {
    if (!AI_SEARCH_ENDPOINT || !AI_SEARCH_API_KEY) {
        throw new Error('AI Search not configured');
    }
    const credential = new AzureKeyCredential(AI_SEARCH_API_KEY);
    const searchClient = new SearchClient(AI_SEARCH_ENDPOINT, AI_SEARCH_INDEX, credential);
    const indexClient = new SearchIndexClient(AI_SEARCH_ENDPOINT, credential);
    return { searchClient, indexClient };
}

async function ensureIndexExists(context: InvocationContext) {
    const { indexClient } = getSearchClients();
    try {
        await indexClient.getIndex(AI_SEARCH_INDEX);
        return;
    } catch {
        // Create a minimal text index (BM25). Vectorization can be added later.
        await indexClient.createIndex({
            name: AI_SEARCH_INDEX,
            fields: [
                { name: 'id', type: 'Edm.String', key: true, filterable: true },
                { name: 'content', type: 'Edm.String', searchable: true },
                { name: 'source', type: 'Edm.String', filterable: true, facetable: true },
                { name: 'title', type: 'Edm.String', searchable: true },
                { name: 'timestamp', type: 'Edm.DateTimeOffset', filterable: true, sortable: true }
            ]
        });
        context.log(`Created AI Search index '${AI_SEARCH_INDEX}'.`);
    }
}

// --- Ingestion function: upsert plain text documents ---
export async function contentIngest(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        await ensureIndexExists(context);
        const { searchClient } = getSearchClients();

        const body = (await req.json().catch(() => ({}))) as {
            documents?: Array<{ id?: string; content: string; source?: string; title?: string }>
            text?: string;
            source?: string;
            title?: string;
        };

        const docs = (body.documents && body.documents.length > 0)
            ? body.documents
            : (body.text ? [{ content: String(body.text), source: body.source, title: body.title }] : []);

        if (!docs.length) {
            return { status: 400, jsonBody: { error: 'No content provided' } };
        }

        const shaped = docs.map((d, i) => ({
            id: d.id ?? `${Date.now()}-${i}`,
            content: d.content?.slice(0, 8000) ?? '',
            source: d.source ?? 'manual',
            title: d.title ?? null,
            timestamp: new Date().toISOString()
        }));

        const result = await searchClient.uploadDocuments(shaped as any);
        const failed = result.results.filter(r => !r.succeeded).map(r => r.key);
        if (failed.length) {
            return { status: 207, jsonBody: { upserted: result.results.length - failed.length, failed } };
        }
        return { status: 200, jsonBody: { upserted: result.results.length } };
    } catch (error) {
        context.error('contentIngest error', error);
        return { status: 500, jsonBody: { error: 'Internal error' } };
    }
}

// Chat Ask function
export async function chatAsk(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const { messages } = (await req.json().catch(() => ({ messages: [] }))) as { messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> };
        const lastUser = [...(messages ?? [])].reverse().find(m => m.role === 'user');
        const userText = lastUser?.content?.slice(0, 1000) ?? '';

        // If AI Search configured, retrieve relevant content (text/BM25 for now)
        let contextBlurb = '';
        if (AI_SEARCH_ENDPOINT && AI_SEARCH_API_KEY) {
            try {
                await ensureIndexExists(context);
                const { searchClient } = getSearchClients();
                const results = await searchClient.search(userText || '*', { top: 5, queryType: 'simple', includeTotalCount: false });
                const snippets: string[] = [];
                for await (const r of results.results) {
                    const doc = r.document as any;
                    if (doc?.content) snippets.push(`- ${doc.title ? doc.title + ': ' : ''}${String(doc.content).slice(0, 300)}${String(doc.content).length > 300 ? '…' : ''}`);
                }
                if (snippets.length) {
                    contextBlurb = `Relevant info:\n${snippets.join('\n')}`;
                }
            } catch (e) {
                context.warn?.('AI Search query failed');
            }
        }

        // Build system prompt with context
        const systemPrompt = `${AI_ASSISTANT_SYSTEM_PROMPT}\n\nTone: ${AI_ASSISTANT_TONE}`;
        
        // Stubbed assistant response augmented with retrieved context
        // TODO: Replace with actual LLM call (Azure OpenAI) when integrated
        const reply = userText
            ? `${contextBlurb ? contextBlurb + '\n\n' : ''}Thanks for your message: "${userText}". I can help with bookings and FAQs. (AI stub - will use: ${systemPrompt.slice(0, 100)}...)`
            : (contextBlurb || 'Hello! How can I assist you with bookings or practice information? (AI stub)');

        return {
            status: 200,
            jsonBody: {
                message: { role: 'assistant', content: reply }
            }
        };
    } catch (error) {
        context.error("ChatAsk error", error);
        return {
            status: 500,
            jsonBody: { error: "Internal error" }
        };
    }
}

// Send Email function
export async function sendEmail(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const connectionString = process.env.ACS_CONNECTION_STRING;
        if (!connectionString) {
            return { status: 500, jsonBody: { error: "ACS connection not configured" } };
        }

        const body = (await req.json().catch(() => ({}))) as {
            to: string;
            subject?: string;
            html?: string;
            from?: string;
        };
        
        const to = body.to;
        const subject = body.subject ?? "Message from Wellness Practice";
        const html = body.html ?? "<p>Hello from Azure Functions.</p>";
        const sender = body.from ?? process.env.ACS_SENDER;

        if (!to || !sender) {
            return { status: 400, jsonBody: { error: "Missing 'to' or configured 'from' sender" } };
        }

        const emailClient = new EmailClient(connectionString);
        const poller = await emailClient.beginSend({
            senderAddress: sender,
            content: { subject, html },
            recipients: { to: [{ address: to }] }
        });
        const result = await poller.pollUntilDone();

        return {
            status: 200,
            jsonBody: {
                messageId: result?.id ?? null,
                status: result?.status ?? 'Unknown'
            }
        };
    } catch (error) {
        context.error("SendEmail error", error);
        return {
            status: 500,
            jsonBody: { error: "Internal error" }
        };
    }
}

// --- Booking Functions (Microsoft 365 Calendar) ---

// Check availability
export async function checkAvailability(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const { startDate, endDate } = (await req.json().catch(() => ({}))) as {
            startDate?: string;
            endDate?: string;
        };

        if (!startDate || !endDate) {
            return { status: 400, jsonBody: { error: 'startDate and endDate required (ISO format)' } };
        }

        const graphClient = getGraphClient();
        
        // Query calendar for busy times
        const freeBusy = await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/getFreeBusy`)
            .post({
                schedules: [CALENDAR_OWNER_EMAIL],
                startTime: { dateTime: startDate, timeZone: 'UTC' },
                endTime: { dateTime: endDate, timeZone: 'UTC' }
            });

        // Calculate available 30-minute slots
        const busyTimes = freeBusy?.value?.[0]?.scheduleItems || [];
        const availableSlots: string[] = [];
        
        // Generate 30-minute slots and filter out busy ones
        const start = new Date(startDate);
        const end = new Date(endDate);
        const slotDuration = 30 * 60 * 1000; // 30 minutes in ms

        for (let time = new Date(start); time < end; time.setTime(time.getTime() + slotDuration)) {
            const slotEnd = new Date(time.getTime() + slotDuration);
            const isBusy = busyTimes.some((busy: any) => {
                const busyStart = new Date(busy.start.dateTime);
                const busyEnd = new Date(busy.end.dateTime);
                return (time < busyEnd && slotEnd > busyStart);
            });
            
            if (!isBusy) {
                availableSlots.push(time.toISOString());
            }
        }

        return {
            status: 200,
            jsonBody: { availableSlots, busyTimes: busyTimes.length }
        };
    } catch (error) {
        context.error('checkAvailability error', error);
        return { status: 500, jsonBody: { error: 'Internal error' } };
    }
}

// Create booking (calendar event)
export async function createBooking(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = (await req.json().catch(() => ({}))) as {
            startTime: string; // ISO format
            clientEmail: string;
            location?: string;
            dietaryNotes?: string;
            clientName?: string;
        };

        if (!body.startTime || !body.clientEmail) {
            return { status: 400, jsonBody: { error: 'startTime and clientEmail required' } };
        }

        const startTime = new Date(body.startTime);
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes

        const graphClient = getGraphClient();
        
        const event = {
            subject: `La Cura Session - ${body.clientName || body.clientEmail}`,
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'UTC'
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'UTC'
            },
            location: body.location ? { displayName: body.location } : undefined,
            body: {
                contentType: 'text',
                content: `Client: ${body.clientEmail}${body.dietaryNotes ? `\n\nDietary Notes: ${body.dietaryNotes}` : ''}`
            },
            attendees: [
                { emailAddress: { address: body.clientEmail } }
            ],
            categories: ['La Cura Booking']
        };

        const createdEvent = await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/events`)
            .post(event);

        return {
            status: 200,
            jsonBody: {
                id: createdEvent.id,
                startTime: createdEvent.start.dateTime,
                endTime: createdEvent.end.dateTime,
                webLink: createdEvent.webLink
            }
        };
    } catch (error) {
        context.error('createBooking error', error);
        return { status: 500, jsonBody: { error: 'Internal error' } };
    }
}

// List user's bookings
export async function listBookings(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const clientEmail = req.query.get('email') || req.headers.get('x-user-email') || '';
        
        if (!clientEmail) {
            return { status: 400, jsonBody: { error: 'email query parameter or x-user-email header required' } };
        }

        const graphClient = getGraphClient();
        
        // Get events where user is an attendee
        const events = await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/events`)
            .filter(`categories/any(c: c eq 'La Cura Booking')`)
            .select('id,subject,start,end,location,attendees,webLink')
            .get();

        // Filter events where the client is an attendee
        const userBookings = events.value.filter((event: any) =>
            event.attendees?.some((a: any) => a.emailAddress.address === clientEmail)
        );

        return {
            status: 200,
            jsonBody: {
                bookings: userBookings.map((e: any) => ({
                    id: e.id,
                    subject: e.subject,
                    startTime: e.start.dateTime,
                    endTime: e.end.dateTime,
                    location: e.location?.displayName,
                    webLink: e.webLink
                }))
            }
        };
    } catch (error) {
        context.error('listBookings error', error);
        return { status: 500, jsonBody: { error: 'Internal error' } };
    }
}

// Cancel booking
export async function cancelBooking(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const { eventId, clientEmail } = (await req.json().catch(() => ({}))) as {
            eventId: string;
            clientEmail: string;
        };

        if (!eventId || !clientEmail) {
            return { status: 400, jsonBody: { error: 'eventId and clientEmail required' } };
        }

        const graphClient = getGraphClient();
        
        // Verify the event exists and user is an attendee
        const event = await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/events/${eventId}`)
            .get();

        const isAttendee = event.attendees?.some((a: any) => a.emailAddress.address === clientEmail);
        if (!isAttendee) {
            return { status: 403, jsonBody: { error: 'Not authorized to cancel this booking' } };
        }

        // Delete the event
        await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/events/${eventId}`)
            .delete();

        return {
            status: 200,
            jsonBody: { success: true, message: 'Booking cancelled' }
        };
    } catch (error) {
        context.error('cancelBooking error', error);
        return { status: 500, jsonBody: { error: 'Internal error' } };
    }
}

// Reschedule booking
export async function rescheduleBooking(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const { eventId, newStartTime, clientEmail } = (await req.json().catch(() => ({}))) as {
            eventId: string;
            newStartTime: string; // ISO format
            clientEmail: string;
        };

        if (!eventId || !newStartTime || !clientEmail) {
            return { status: 400, jsonBody: { error: 'eventId, newStartTime, and clientEmail required' } };
        }

        const graphClient = getGraphClient();
        
        // Verify the event exists and user is an attendee
        const event = await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/events/${eventId}`)
            .get();

        const isAttendee = event.attendees?.some((a: any) => a.emailAddress.address === clientEmail);
        if (!isAttendee) {
            return { status: 403, jsonBody: { error: 'Not authorized to reschedule this booking' } };
        }

        const startTime = new Date(newStartTime);
        const endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // 30 minutes

        // Update the event
        const updatedEvent = await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/events/${eventId}`)
            .patch({
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'UTC'
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'UTC'
                }
            });

        return {
            status: 200,
            jsonBody: {
                id: updatedEvent.id,
                startTime: updatedEvent.start.dateTime,
                endTime: updatedEvent.end.dateTime,
                webLink: updatedEvent.webLink
            }
        };
    } catch (error) {
        context.error('rescheduleBooking error', error);
        return { status: 500, jsonBody: { error: 'Internal error' } };
    }
}

// Register functions
app.http('chatAsk', {
    methods: ['POST'],
    route: 'chat/ask',
    authLevel: 'anonymous',
    handler: chatAsk
});

app.http('sendEmail', {
    methods: ['POST'],
    route: 'email/send',
    authLevel: 'anonymous',
    handler: sendEmail
});

app.http('contentIngest', {
    methods: ['POST'],
    route: 'ingest',
    authLevel: 'anonymous',
    handler: contentIngest
});

app.http('checkAvailability', {
    methods: ['POST'],
    route: 'bookings/availability',
    authLevel: 'anonymous',
    handler: checkAvailability
});

app.http('createBooking', {
    methods: ['POST'],
    route: 'bookings/create',
    authLevel: 'anonymous',
    handler: createBooking
});

app.http('listBookings', {
    methods: ['GET'],
    route: 'bookings/list',
    authLevel: 'anonymous',
    handler: listBookings
});

app.http('cancelBooking', {
    methods: ['POST'],
    route: 'bookings/cancel',
    authLevel: 'anonymous',
    handler: cancelBooking
});

app.http('rescheduleBooking', {
    methods: ['POST'],
    route: 'bookings/reschedule',
    authLevel: 'anonymous',
    handler: rescheduleBooking
});
