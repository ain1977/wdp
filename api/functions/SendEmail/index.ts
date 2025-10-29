import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";

const connectionString = process.env.ACS_CONNECTION_STRING as string | undefined;

export async function handler(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    if (!connectionString) {
      return { status: 500, jsonBody: { error: "ACS connection not configured" } };
    }

    const body = await req.json();
    const to = body?.to;
    const subject = body?.subject ?? "Message from Wellness Practice";
    const html = body?.html ?? "<p>Hello from Azure Functions.</p>";
    const sender = body?.from ?? process.env.ACS_SENDER ?? undefined;

    if (!to || !sender) {
      return { status: 400, jsonBody: { error: "Missing 'to' or configured 'from' sender" } };
    }

    const emailClient = new EmailClient(connectionString);
    const response = await emailClient.send({
      senderAddress: sender,
      content: { subject, html },
      recipients: { to: [{ address: to }] }
    });

    return { status: 200, jsonBody: { messageId: response.id } };
  } catch (err: unknown) {
    context.error("SendEmail error", err as Error);
    return { status: 500, jsonBody: { error: "Internal error" } };
  }
}

app.http("SendEmail", {
  methods: ["POST"],
  route: "email/send",
  authLevel: "function",
  handler
});


