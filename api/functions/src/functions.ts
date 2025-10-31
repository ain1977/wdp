import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";
import { SearchClient, SearchIndexClient, AzureKeyCredential, odata } from "@azure/search-documents";

// --- Azure AI Search helpers ---
const AI_SEARCH_ENDPOINT = process.env.AI_SEARCH_ENDPOINT ?? '';
const AI_SEARCH_API_KEY = process.env.AI_SEARCH_API_KEY ?? '';
const AI_SEARCH_INDEX = process.env.AI_SEARCH_INDEX ?? 'content';

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

        // Stubbed assistant response augmented with retrieved context
        const reply = userText
            ? `${contextBlurb ? contextBlurb + '\n\n' : ''}Thanks for your message: "${userText}". I can help with bookings and FAQs. (AI stub)`
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

// Content Generator function

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
    authLevel: 'function',
    handler: contentIngest
});
