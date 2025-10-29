import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

type ChatMessage = { role: 'system' | 'user' | 'assistant', content: string };

export async function handler(req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> {
  const { messages } = (await req.json().catch(() => ({ messages: [] }))) as { messages: ChatMessage[] };
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

app.http('ChatAsk', {
  methods: ['POST'],
  route: 'chat/ask',
  authLevel: 'anonymous',
  handler
});


