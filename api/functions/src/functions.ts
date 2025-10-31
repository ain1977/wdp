import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";
import { SearchClient, SearchIndexClient, AzureKeyCredential, odata } from "@azure/search-documents";
import { DefaultAzureCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import OpenAI from "openai";

// --- Azure AI Search helpers ---
const AI_SEARCH_ENDPOINT = process.env.AI_SEARCH_ENDPOINT ?? '';
const AI_SEARCH_API_KEY = process.env.AI_SEARCH_API_KEY ?? '';
const AI_SEARCH_INDEX = process.env.AI_SEARCH_INDEX ?? 'content';

// --- Azure OpenAI Configuration ---
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT ?? '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const OPENAI_DEPLOYMENT_NAME = process.env.OPENAI_DEPLOYMENT_NAME ?? 'gpt-4';

// --- Your Gut Assistant Configuration ---
const AI_ASSISTANT_SYSTEM_PROMPT = process.env.AI_ASSISTANT_SYSTEM_PROMPT ?? `You are Your Gut Assistant, a helpful assistant for La Cura, a personal chef service focused on healing and wellness through Mediterranean nutrition. You are warm, knowledgeable, and supportive. Help users with questions about services, bookings, nutrition, and wellness. Be concise and friendly.`;
const AI_ASSISTANT_TONE = process.env.AI_ASSISTANT_TONE ?? 'warm, supportive, knowledgeable';

// --- Microsoft Graph API helpers ---
const CALENDAR_OWNER_EMAIL = process.env.CALENDAR_OWNER_EMAIL ?? 'andrea@liveraltravel.com';

function getOpenAIClient(): OpenAI | null {
    if (!OPENAI_ENDPOINT || !OPENAI_API_KEY) {
        return null;
    }
    // Azure OpenAI endpoint format: https://{resource-name}.openai.azure.com
    // For the openai package, we need to append /openai/deployments/{deployment}
    const baseURL = OPENAI_ENDPOINT.includes('/openai/deployments/') 
        ? OPENAI_ENDPOINT 
        : `${OPENAI_ENDPOINT}/openai/deployments/${OPENAI_DEPLOYMENT_NAME}`;
    
    return new OpenAI({
        apiKey: OPENAI_API_KEY,
        baseURL: baseURL,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: { 'api-key': OPENAI_API_KEY }
    });
}

function getGraphClient(context?: InvocationContext): Client {
    try {
        if (context) {
            context.log('getGraphClient: Initializing DefaultAzureCredential');
        }
        const credential = new DefaultAzureCredential();
        
        if (context) {
            context.log('getGraphClient: Creating TokenCredentialAuthenticationProvider');
        }
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default']
        });
        
        if (context) {
            context.log('getGraphClient: Initializing Graph Client with middleware');
        }
        return Client.initWithMiddleware({ authProvider });
    } catch (error: any) {
        if (context) {
            context.error('getGraphClient: Error initializing Graph client', {
                errorMessage: error?.message,
                errorStack: error?.stack,
                errorType: error?.constructor?.name
            });
        }
        throw error;
    }
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
    const requestId = context.invocationId;
    const startTime = Date.now();
    
    try {
        context.log(`[${requestId}] chatAsk: Starting chat request`);
        
        const body = (await req.json().catch((parseError) => {
            context.error(`[${requestId}] chatAsk: Failed to parse request body`, parseError);
            throw parseError;
        })) as { 
            messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }>;
            menuSelection?: boolean;
        };
        
        const { messages, menuSelection } = body;
        const lastUser = [...(messages ?? [])].reverse().find(m => m.role === 'user');
        const userText = lastUser?.content?.slice(0, 1000) ?? '';
        
        // Detect if this is a practice info query
        const isPracticeInfoQuery = userText.toLowerCase().includes('info about our practice') || 
                                   userText.toLowerCase().includes('about our practice') ||
                                   userText.toLowerCase().includes('practice information') ||
                                   userText.toLowerCase().includes('tell me about');

        context.log(`[${requestId}] chatAsk: Processing user message`, {
            messageLength: userText.length,
            messageCount: messages?.length || 0,
            isPracticeInfoQuery,
            menuSelection
        });

        // If AI Search configured, retrieve relevant content (text/BM25 for now)
        let contextBlurb = '';
        let searchQuery = userText || '*';
        
        // For practice info queries, use a broader search
        if (isPracticeInfoQuery) {
            searchQuery = 'practice services information about La Cura';
        }
        
        if (AI_SEARCH_ENDPOINT && AI_SEARCH_API_KEY) {
            try {
                context.log(`[${requestId}] chatAsk: Searching Azure AI Search`, { searchQuery });
                await ensureIndexExists(context);
                const { searchClient } = getSearchClients();
                const results = await searchClient.search(searchQuery, { top: 8, queryType: 'simple', includeTotalCount: false });
                const snippets: string[] = [];
                for await (const r of results.results) {
                    const doc = r.document as any;
                    if (doc?.content) snippets.push(`${doc.title ? doc.title + ': ' : ''}${String(doc.content).slice(0, 400)}${String(doc.content).length > 400 ? '…' : ''}`);
                }
                if (snippets.length) {
                    contextBlurb = `Information from our knowledge base:\n${snippets.join('\n\n')}`;
                    context.log(`[${requestId}] chatAsk: Found ${snippets.length} relevant search results`);
                } else if (isPracticeInfoQuery) {
                    contextBlurb = 'No specific information found in our knowledge base.';
                    context.log(`[${requestId}] chatAsk: No search results found for practice info query`);
                }
            } catch (e) {
                context.warn(`[${requestId}] chatAsk: AI Search query failed`, e);
            }
        }

        // Build system prompt with context
        // For practice info queries, enforce using ONLY the vector DB results
        let systemPrompt = `${AI_ASSISTANT_SYSTEM_PROMPT}\n\nTone: ${AI_ASSISTANT_TONE}`;
        
        if (isPracticeInfoQuery) {
            if (contextBlurb && !contextBlurb.includes('No specific information')) {
                systemPrompt += `\n\nIMPORTANT: The user is asking about our practice. You MUST ONLY use the information provided below from our knowledge base. Do NOT use any general knowledge or training data about similar services. If the information below doesn't answer the question, say "I don't have that specific information in our knowledge base. Please contact us directly for more details."\n\n${contextBlurb}`;
            } else {
                systemPrompt += `\n\nIMPORTANT: The user is asking about our practice, but no relevant information was found in our knowledge base. Respond by saying that you don't have that specific information available and suggest they contact us directly. Do NOT make up or assume any information about our practice.`;
            }
        } else if (contextBlurb) {
            systemPrompt += `\n\n${contextBlurb}`;
        }
        
        // Prepare messages for OpenAI
        const openAIMessages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
            { role: 'system', content: systemPrompt },
            ...(messages?.filter(m => m.role !== 'system') || [])
        ];

        // Try to use Azure OpenAI if configured
        const openAIClient = getOpenAIClient();
        let reply: string;
        
        if (openAIClient) {
            try {
                context.log(`[${requestId}] chatAsk: Calling Azure OpenAI`, {
                    deployment: OPENAI_DEPLOYMENT_NAME,
                    messageCount: openAIMessages.length
                });
                
                const response = await openAIClient.chat.completions.create({
                    model: OPENAI_DEPLOYMENT_NAME,
                    messages: openAIMessages,
                    temperature: 0.7,
                    max_tokens: 500
                });
                
                reply = response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.';
                
                const duration = Date.now() - startTime;
                context.log(`[${requestId}] chatAsk: Successfully generated response`, {
                    responseLength: reply.length,
                    durationMs: duration,
                    tokensUsed: response.usage?.total_tokens
                });
            } catch (openAIError: any) {
                context.error(`[${requestId}] chatAsk: Azure OpenAI error`, {
                    errorMessage: openAIError?.message,
                    errorCode: openAIError?.code,
                    errorStack: openAIError?.stack
                });
                // Fallback to stub if OpenAI fails
                reply = userText
                    ? `${contextBlurb ? contextBlurb + '\n\n' : ''}I apologize, but I'm having trouble processing your request right now. Please try again or contact us directly.`
                    : 'Hello! How can I assist you with bookings or practice information?';
            }
        } else {
            // Fallback to stub if OpenAI not configured
            context.warn(`[${requestId}] chatAsk: Azure OpenAI not configured, using fallback response`);
            reply = userText
                ? `${contextBlurb ? contextBlurb + '\n\n' : ''}Thanks for your message: "${userText}". I can help with bookings and FAQs. (AI assistant is being configured - please check OpenAI settings)`
                : (contextBlurb || 'Hello! How can I assist you with bookings or practice information?');
        }

        return {
            status: 200,
            jsonBody: {
                message: { role: 'assistant', content: reply }
            }
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        context.error(`[${requestId}] chatAsk: Error processing chat request`, {
            errorMessage: error?.message,
            errorStack: error?.stack,
            durationMs: duration
        });
        return {
            status: 500,
            jsonBody: { 
                error: "Internal error",
                requestId,
                details: process.env.NODE_ENV === 'development' ? error?.message : undefined
            }
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
    const requestId = context.invocationId;
    const startTime = Date.now();
    
    try {
        context.log(`[${requestId}] checkAvailability: Starting availability check`);
        
        const { startDate, endDate } = (await req.json().catch((parseError) => {
            context.error(`[${requestId}] checkAvailability: Failed to parse request body`, parseError);
            throw parseError;
        })) as {
            startDate?: string;
            endDate?: string;
        };

        context.log(`[${requestId}] checkAvailability: Request parameters`, { startDate, endDate });

        if (!startDate || !endDate) {
            context.warn(`[${requestId}] checkAvailability: Missing required fields`, {
                hasStartDate: !!startDate,
                hasEndDate: !!endDate
            });
            return { status: 400, jsonBody: { error: 'startDate and endDate required (ISO format)' } };
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            context.error(`[${requestId}] checkAvailability: Invalid date format`, { startDate, endDate });
            return { status: 400, jsonBody: { error: 'Invalid date format. Use ISO 8601 format.' } };
        }

        context.log(`[${requestId}] checkAvailability: Creating Graph client`);
        const graphClient = getGraphClient(context);
        
        const graphApiPath = `/users/${CALENDAR_OWNER_EMAIL}/calendar/getFreeBusy`;
        context.log(`[${requestId}] checkAvailability: Calling Graph API: ${graphApiPath}`, {
            calendarOwner: CALENDAR_OWNER_EMAIL,
            startDate,
            endDate
        });
        
        // Query calendar for busy times
        const freeBusy = await graphClient
            .api(graphApiPath)
            .post({
                schedules: [CALENDAR_OWNER_EMAIL],
                startTime: { dateTime: startDate, timeZone: 'UTC' },
                endTime: { dateTime: endDate, timeZone: 'UTC' }
            });

        context.log(`[${requestId}] checkAvailability: Received freeBusy response`, {
            hasValue: !!freeBusy?.value,
            scheduleCount: freeBusy?.value?.length || 0
        });

        // Calculate available 30-minute slots
        const busyTimes = freeBusy?.value?.[0]?.scheduleItems || [];
        const availableSlots: string[] = [];
        
        // Generate 30-minute slots and filter out busy ones
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

        const duration = Date.now() - startTime;
        context.log(`[${requestId}] checkAvailability: Successfully calculated availability`, {
            availableSlotsCount: availableSlots.length,
            busyTimesCount: busyTimes.length,
            durationMs: duration
        });

        return {
            status: 200,
            jsonBody: { availableSlots, busyTimes: busyTimes.length }
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        const errorDetails = {
            requestId,
            errorMessage: error?.message || 'Unknown error',
            errorCode: error?.code || error?.statusCode || 'UNKNOWN',
            errorStack: error?.stack || 'No stack trace',
            durationMs: duration,
            calendarOwner: CALENDAR_OWNER_EMAIL,
            errorType: error?.constructor?.name || typeof error
        };
        
        context.error(`[${requestId}] checkAvailability: Error checking availability`, errorDetails);
        context.error(`[${requestId}] checkAvailability: Full error object`, error);
        
        return { 
            status: 500, 
            jsonBody: { 
                error: 'Internal error',
                requestId,
                details: process.env.NODE_ENV === 'development' ? error?.message : undefined
            } 
        };
    }
}

// Create booking (calendar event)
export async function createBooking(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const requestId = context.invocationId;
    const startTime = Date.now();
    
    try {
        context.log(`[${requestId}] createBooking: Starting booking creation request`);
        
        const body = (await req.json().catch((parseError) => {
            context.error(`[${requestId}] createBooking: Failed to parse request body`, parseError);
            throw parseError;
        })) as {
            startTime: string; // ISO format
            clientEmail: string;
            location?: string;
            dietaryNotes?: string;
            clientName?: string;
        };

        context.log(`[${requestId}] createBooking: Request body parsed`, {
            startTime: body.startTime,
            clientEmail: body.clientEmail,
            hasLocation: !!body.location,
            hasDietaryNotes: !!body.dietaryNotes,
            clientName: body.clientName || 'not provided'
        });

        if (!body.startTime || !body.clientEmail) {
            context.warn(`[${requestId}] createBooking: Missing required fields`, {
                hasStartTime: !!body.startTime,
                hasClientEmail: !!body.clientEmail
            });
            return { status: 400, jsonBody: { error: 'startTime and clientEmail required' } };
        }

        const appointmentStart = new Date(body.startTime);
        const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60 * 1000); // 30 minutes

        if (isNaN(appointmentStart.getTime())) {
            context.error(`[${requestId}] createBooking: Invalid startTime format`, { startTime: body.startTime });
            return { status: 400, jsonBody: { error: 'Invalid startTime format. Use ISO 8601 format.' } };
        }

        context.log(`[${requestId}] createBooking: Creating Graph client`);
        const graphClient = getGraphClient(context);
        
        const event = {
            subject: `La Cura Session - ${body.clientName || body.clientEmail}`,
            start: {
                dateTime: appointmentStart.toISOString(),
                timeZone: 'UTC'
            },
            end: {
                dateTime: appointmentEnd.toISOString(),
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

        context.log(`[${requestId}] createBooking: Creating calendar event`, {
            calendarOwner: CALENDAR_OWNER_EMAIL,
            eventSubject: event.subject,
            startDateTime: event.start.dateTime,
            endDateTime: event.end.dateTime
        });

        const graphApiPath = `/users/${CALENDAR_OWNER_EMAIL}/calendar/events`;
        context.log(`[${requestId}] createBooking: Calling Graph API: ${graphApiPath}`);
        
        const createdEvent = await graphClient
            .api(graphApiPath)
            .post(event);

        const duration = Date.now() - startTime;
        context.log(`[${requestId}] createBooking: Successfully created booking`, {
            eventId: createdEvent.id,
            startTime: createdEvent.start?.dateTime,
            endTime: createdEvent.end?.dateTime,
            durationMs: duration
        });

        return {
            status: 200,
            jsonBody: {
                id: createdEvent.id,
                startTime: createdEvent.start.dateTime,
                endTime: createdEvent.end.dateTime,
                webLink: createdEvent.webLink
            }
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        const errorDetails = {
            requestId,
            errorMessage: error?.message || 'Unknown error',
            errorCode: error?.code || error?.statusCode || 'UNKNOWN',
            errorStack: error?.stack || 'No stack trace',
            durationMs: duration,
            calendarOwner: CALENDAR_OWNER_EMAIL,
            errorType: error?.constructor?.name || typeof error
        };
        
        context.error(`[${requestId}] createBooking: Error creating booking`, errorDetails);
        context.error(`[${requestId}] createBooking: Full error object`, error);
        
        // Return more specific error messages
        if (error?.code === 'Forbidden' || error?.statusCode === 403) {
            return { 
                status: 403, 
                jsonBody: { 
                    error: 'Permission denied. Check calendar permissions and Managed Identity configuration.',
                    details: error?.message 
                } 
            };
        }
        if (error?.code === 'NotFound' || error?.statusCode === 404) {
            return { 
                status: 404, 
                jsonBody: { 
                    error: 'Calendar not found. Check CALENDAR_OWNER_EMAIL configuration.',
                    details: error?.message 
                } 
            };
        }
        
        return { 
            status: 500, 
            jsonBody: { 
                error: 'Internal error',
                requestId,
                details: process.env.NODE_ENV === 'development' ? error?.message : undefined
            } 
        };
    }
}

// List user's bookings
export async function listBookings(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const clientEmail = req.query.get('email') || req.headers.get('x-user-email') || '';
        
        if (!clientEmail) {
            return { status: 400, jsonBody: { error: 'email query parameter or x-user-email header required' } };
        }

        const graphClient = getGraphClient(context);
        
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

        const graphClient = getGraphClient(context);
        
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

        const graphClient = getGraphClient(context);
        
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
