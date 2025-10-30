import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";

// Chat Ask function
export async function chatAsk(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const { messages } = (await req.json().catch(() => ({ messages: [] }))) as { messages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> };
        const lastUser = [...(messages ?? [])].reverse().find(m => m.role === 'user');
        const userText = lastUser?.content?.slice(0, 1000) ?? '';

        // Stub: echo with policy guardrails note. Wire to Azure OpenAI later.
        const reply = userText
            ? `Thanks for your message: "${userText}". I can help with bookings and FAQs. (AI stub)`
            : 'Hello! How can I assist you with bookings or practice information? (AI stub)';

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
