"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.substackSync = exports.contentGenerator = exports.sendEmail = exports.chatAsk = void 0;
const functions_1 = require("@azure/functions");
const communication_email_1 = require("@azure/communication-email");
// Chat Ask function
async function chatAsk(req, context) {
    try {
        const { messages } = (await req.json().catch(() => ({ messages: [] })));
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
    }
    catch (error) {
        context.error("ChatAsk error", error);
        return {
            status: 500,
            jsonBody: { error: "Internal error" }
        };
    }
}
exports.chatAsk = chatAsk;
// Send Email function
async function sendEmail(req, context) {
    try {
        const connectionString = process.env.ACS_CONNECTION_STRING;
        if (!connectionString) {
            return { status: 500, jsonBody: { error: "ACS connection not configured" } };
        }
        const body = (await req.json().catch(() => ({})));
        const to = body.to;
        const subject = body.subject ?? "Message from Wellness Practice";
        const html = body.html ?? "<p>Hello from Azure Functions.</p>";
        const sender = body.from ?? process.env.ACS_SENDER;
        if (!to || !sender) {
            return { status: 400, jsonBody: { error: "Missing 'to' or configured 'from' sender" } };
        }
        const emailClient = new communication_email_1.EmailClient(connectionString);
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
    }
    catch (error) {
        context.error("SendEmail error", error);
        return {
            status: 500,
            jsonBody: { error: "Internal error" }
        };
    }
}
exports.sendEmail = sendEmail;
// Content Generator function
async function contentGenerator(req, context) {
    try {
        const body = (await req.json().catch(() => ({})));
        const { type, topic, tone = 'professional' } = body;
        if (!type || !topic) {
            return { status: 400, jsonBody: { error: "Missing 'type' or 'topic'" } };
        }
        // Stub: Generate content based on type
        const content = {
            social_post: {
                linkedin: `Professional insight: ${topic}`,
                instagram: `✨ ${topic} ✨`,
                twitter: `Quick tip: ${topic}`
            },
            newsletter: {
                subject: `Weekly Update: ${topic}`,
                content: `This week we're focusing on ${topic}. Here's what you need to know...`
            },
            email_sequence: {
                welcome: `Welcome! Let's explore ${topic} together.`,
                follow_up: `Following up on ${topic} - here's more information...`
            },
            blog_post: {
                title: `Understanding ${topic}`,
                content: `In this comprehensive guide, we'll explore ${topic} and its benefits...`
            }
        };
        return {
            status: 200,
            jsonBody: {
                type,
                topic,
                tone,
                content: content[type]
            }
        };
    }
    catch (error) {
        context.error("ContentGenerator error", error);
        return {
            status: 500,
            jsonBody: { error: "Internal error" }
        };
    }
}
exports.contentGenerator = contentGenerator;
// Substack Sync function
async function substackSync(req, context) {
    try {
        const body = (await req.json().catch(() => ({})));
        const { action, postContent, postId } = body;
        if (!action) {
            return { status: 400, jsonBody: { error: "Missing 'action'" } };
        }
        // Stub: Simulate Substack API calls
        const result = {
            action,
            success: true,
            message: `Successfully ${action}d post`,
            postId: postId || 'new-post-id',
            timestamp: new Date().toISOString()
        };
        return {
            status: 200,
            jsonBody: result
        };
    }
    catch (error) {
        context.error("SubstackSync error", error);
        return {
            status: 500,
            jsonBody: { error: "Internal error" }
        };
    }
}
exports.substackSync = substackSync;
// Register functions
functions_1.app.http('chatAsk', {
    methods: ['POST'],
    route: 'chat/ask',
    authLevel: 'anonymous',
    handler: chatAsk
});
functions_1.app.http('sendEmail', {
    methods: ['POST'],
    route: 'email/send',
    authLevel: 'function',
    handler: sendEmail
});
functions_1.app.http('contentGenerator', {
    methods: ['POST'],
    route: 'content/generate',
    authLevel: 'function',
    handler: contentGenerator
});
functions_1.app.http('substackSync', {
    methods: ['POST'],
    route: 'substack/sync',
    authLevel: 'function',
    handler: substackSync
});
//# sourceMappingURL=functions.js.map