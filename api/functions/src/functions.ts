// Function App entry point
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

// --- Booking Workflow Helpers ---

// Parse date/time from user text (simple patterns)
function parseDateFromText(text: string): { date?: Date; hasDate: boolean; hasTime: boolean } {
    const lower = text.toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Patterns: "tomorrow", "next week", "monday", "tuesday", etc.
    let targetDate: Date | undefined;
    let hasTime = false;
    
    // Check for "tomorrow"
    if (lower.includes('tomorrow')) {
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 1);
    }
    // Check for "next week"
    else if (lower.includes('next week')) {
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 7);
    }
    // Check for day names
    else {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < days.length; i++) {
            if (lower.includes(days[i])) {
                const dayIndex = i;
                const currentDay = today.getDay();
                let daysToAdd = (dayIndex - currentDay + 7) % 7;
                if (daysToAdd === 0) daysToAdd = 7; // Next occurrence
                targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + daysToAdd);
                break;
            }
        }
    }
    
    // Check for time mentions (morning, afternoon, evening, or specific times)
    if (lower.includes('morning') || lower.includes('am') || lower.match(/\d+\s*(am|pm)/i)) {
        hasTime = true;
    } else if (lower.includes('afternoon') || lower.includes('evening') || lower.includes('pm')) {
        hasTime = true;
    }
    
    return { date: targetDate, hasDate: !!targetDate, hasTime };
}

// Format available slots for display
function formatAvailableSlots(slots: string[]): string {
    if (slots.length === 0) {
        return 'I don\'t see any available slots in that time range. Would you like me to check a different date or time?';
    }
    
    // Group by date
    const byDate: { [key: string]: string[] } = {};
    slots.forEach(slot => {
        const date = new Date(slot);
        const dateKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(timeStr);
    });
    
    let formatted = 'I found these available 30-minute slots:\n\n';
    Object.keys(byDate).forEach(date => {
        formatted += `**${date}:**\n`;
        byDate[date].forEach(time => {
            formatted += `  • ${time}\n`;
        });
        formatted += '\n';
    });
    
    formatted += 'Which time works best for you? Just let me know the date and time you prefer.';
    return formatted;
}

// Check availability helper (internal call)
async function checkAvailabilityInternal(startDate: string, endDate: string, context: InvocationContext): Promise<{ availableSlots: string[]; error?: string }> {
    try {
        const graphClient = getGraphClient(context);
        const freeBusy = await graphClient
            .api(`/users/${CALENDAR_OWNER_EMAIL}/calendar/getFreeBusy`)
            .post({
                schedules: [CALENDAR_OWNER_EMAIL],
                startTime: { dateTime: startDate, timeZone: 'UTC' },
                endTime: { dateTime: endDate, timeZone: 'UTC' }
            });
        
        const busyTimes = freeBusy?.value?.[0]?.scheduleItems || [];
        const availableSlots: string[] = [];
        const slotDuration = 30 * 60 * 1000; // 30 minutes
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Business hours: 9 AM to 6 PM (9:00 - 18:00)
        const BUSINESS_START_HOUR = 9;
        const BUSINESS_END_HOUR = 18;
        
        context.log(`[checkAvailabilityInternal] Generating slots`, {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            busyTimesCount: busyTimes.length,
            startHour: start.getUTCHours(),
            endHour: end.getUTCHours()
        });
        
        // Generate slots every 30 minutes, but only during business hours
        for (let time = new Date(start); time < end; time.setTime(time.getTime() + slotDuration)) {
            const slotEnd = new Date(time.getTime() + slotDuration);
            const hour = time.getUTCHours();
            const dayOfWeek = time.getUTCDay(); // 0 = Sunday, 6 = Saturday
            
            // Skip weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                continue;
            }
            
            // Skip if outside business hours (9 AM - 6 PM UTC)
            if (hour < BUSINESS_START_HOUR || hour >= BUSINESS_END_HOUR) {
                continue;
            }
            
            // Check if slot overlaps with any busy time
            const isBusy = busyTimes.some((busy: any) => {
                const busyStart = new Date(busy.start.dateTime);
                const busyEnd = new Date(busy.end.dateTime);
                return (time < busyEnd && slotEnd > busyStart);
            });
            
            if (!isBusy) {
                availableSlots.push(time.toISOString());
            }
        }
        
        context.log(`[checkAvailabilityInternal] Generated ${availableSlots.length} available slots`, {
            totalSlots: availableSlots.length,
            firstSlot: availableSlots[0] || 'none',
            lastSlot: availableSlots[availableSlots.length - 1] || 'none'
        });
        
        return { availableSlots };
    } catch (error: any) {
        context.error('checkAvailabilityInternal error', error);
        return { availableSlots: [], error: error?.message || 'Failed to check availability' };
    }
}

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
        
        const { messages } = body;
        const lastUser = [...(messages ?? [])].reverse().find(m => m.role === 'user');
        const userText = lastUser?.content?.slice(0, 1000) ?? '';

        // Check conversation history to see if we're already in a workflow
        const conversationHistory = messages || [];
        const lastAssistantMessage = [...conversationHistory].reverse().find(m => m.role === 'assistant')?.content?.toLowerCase() || '';
        const isInSchedulingFlow = lastAssistantMessage.includes('schedule') || 
                                   lastAssistantMessage.includes('available') || 
                                   lastAssistantMessage.includes('slots') ||
                                   lastAssistantMessage.includes('date or time');
        const isInCancelFlow = lastAssistantMessage.includes('cancel') && lastAssistantMessage.includes('email');
        const isInRescheduleFlow = lastAssistantMessage.includes('reschedule') && lastAssistantMessage.includes('email');
        
        // Detect booking-related queries (scheduling, canceling, rescheduling)
        // Be more lenient - check for appointment-related keywords or if this is early in conversation
        const lowerText = userText.toLowerCase();
        const messageCount = messages?.length || 0;
        const isEarlyConversation = messageCount <= 3; // First few messages
        
        const isScheduleQuery = lowerText.includes('schedule') || 
                               lowerText.includes('book') ||
                               lowerText.includes('booking') ||
                               (lowerText.includes('appointment') && !lowerText.includes('cancel') && !lowerText.includes('reschedule')) ||
                               lowerText.includes('set up') ||
                               lowerText.includes('make an appointment') ||
                               lowerText.includes('need an appointment') ||
                               lowerText.includes('want to see') ||
                               lowerText.includes('get a time') ||
                               lowerText.includes('available time') ||
                               lowerText.includes('when are you available') ||
                               // Continuation phrases for scheduling workflow
                               (isInSchedulingFlow && (
                                   lowerText.includes('propose') ||
                                   lowerText.includes('suggest') ||
                                   lowerText.includes('show me') ||
                                   lowerText.includes('what times') ||
                                   lowerText.includes('what slots') ||
                                   lowerText.includes('any time') ||
                                   lowerText.includes('any slot') ||
                                   lowerText.includes('prefer') ||
                                   lowerText.includes('date') ||
                                   lowerText.includes('time') ||
                                   lowerText.match(/\d+\s*(am|pm)/i) ||
                                   lowerText.includes('tomorrow') ||
                                   lowerText.includes('monday') ||
                                   lowerText.includes('tuesday') ||
                                   lowerText.includes('wednesday') ||
                                   lowerText.includes('thursday') ||
                                   lowerText.includes('friday') ||
                                   lowerText.includes('saturday') ||
                                   lowerText.includes('sunday')
                               )) ||
                               (isEarlyConversation && (lowerText.includes('hi') || lowerText.includes('hello') || lowerText.includes('help')));
        
        const isCancelQuery = lowerText.includes('cancel') ||
                             lowerText.includes('remove') ||
                             lowerText.includes('delete') ||
                             lowerText.includes('can\'t make it') ||
                             lowerText.includes('cannot make it') ||
                             // Continuation phrases for cancel workflow
                             (isInCancelFlow && (
                                 lowerText.includes('@') || // email
                                 lowerText.match(/\d+/) || // selecting appointment number
                                 lowerText.includes('first') ||
                                 lowerText.includes('second') ||
                                 lowerText.includes('yes') ||
                                 lowerText.includes('confirm')
                             ));
        
        const isRescheduleQuery = lowerText.includes('reschedule') ||
                                 lowerText.includes('move') ||
                                 lowerText.includes('change') ||
                                 lowerText.includes('different time') ||
                                 lowerText.includes('different date') ||
                                 lowerText.includes('another time') ||
                                 lowerText.includes('another date') ||
                                 // Continuation phrases for reschedule workflow
                                 (isInRescheduleFlow && (
                                     lowerText.includes('@') || // email
                                     lowerText.match(/\d+/) || // selecting appointment number
                                     lowerText.includes('prefer') ||
                                     lowerText.includes('date') ||
                                     lowerText.includes('time')
                                 ));
        
        const isBookingQuery = isScheduleQuery || isCancelQuery || isRescheduleQuery;
        
        // If early in conversation and user hasn't explicitly asked about non-appointment topics, assume it's appointment-related
        const isGeneralGreeting = isEarlyConversation && (
            lowerText.includes('hi') || 
            lowerText.includes('hello') || 
            lowerText.includes('hey') ||
            lowerText.trim().length < 10
        );
        
        // DANGEROUS/UNRELATED queries - Explicitly reject these
        const isDangerousOrUnrelated = lowerText.includes('info about') ||
                                      lowerText.includes('tell me about') ||
                                      lowerText.includes('what is') && (lowerText.includes('service') || lowerText.includes('practice')) ||
                                      lowerText.includes('nutrition') ||
                                      lowerText.includes('diet') ||
                                      lowerText.includes('recipe') ||
                                      lowerText.includes('ingredient') ||
                                      lowerText.includes('menu') ||
                                      lowerText.includes('price') ||
                                      lowerText.includes('cost') ||
                                      lowerText.includes('how much') ||
                                      (lowerText.includes('practice') && !lowerText.includes('appointment')) ||
                                      (lowerText.includes('service') && !lowerText.includes('appointment'));
        
        // FLEXIBLE APPROACH: Accept almost everything unless clearly dangerous/unrelated
        // Trust the LLM to understand intent and route to correct workflow
        const shouldTreatAsBooking = !isDangerousOrUnrelated && userText.trim().length > 0;
        
        // Detect if user is providing booking details (email, time, date, confirm)
        const isBookingConfirmation = userText.toLowerCase().includes('@') || // email
                                     userText.toLowerCase().match(/\d{1,2}:\d{2}/) || // time format
                                     userText.toLowerCase().includes('yes') ||
                                     userText.toLowerCase().includes('confirm') ||
                                     userText.toLowerCase().includes('that works') ||
                                     userText.toLowerCase().includes('sounds good') ||
                                     userText.toLowerCase().includes('perfect');

        // Determine which workflow to use (before logging)
        // Use keyword hints for initial routing, but LLM will handle interpretation
        // Default to schedule if unclear (most common use case)
        const workflowType = isCancelQuery && !isScheduleQuery && !isRescheduleQuery
            ? 'cancel' 
            : isRescheduleQuery && !isScheduleQuery && !isCancelQuery
            ? 'reschedule'
            : 'schedule'; // Default to schedule - LLM will adjust based on conversation context
        
        context.log(`[${requestId}] chatAsk: Processing user message`, {
            messageLength: userText.length,
            messageCount: messages?.length || 0,
            userText: userText.substring(0, 100), // Log first 100 chars for debugging
            isScheduleQuery,
            isCancelQuery,
            isRescheduleQuery,
            isBookingQuery,
            isEarlyConversation,
            isInSchedulingFlow,
            isInCancelFlow,
            isInRescheduleFlow,
            isDangerousOrUnrelated,
            shouldTreatAsBooking: shouldTreatAsBooking,
            workflowType: workflowType
        });
        
        // REJECT only dangerous/unrelated queries - be very flexible otherwise
        if (!shouldTreatAsBooking && userText.trim().length > 0) {
            const reply = `I'm here to help you with appointments only. I can help you:
- Schedule a new appointment
- Cancel an existing appointment  
- Reschedule or move an appointment

What would you like to do?`;
            return {
                status: 200,
                jsonBody: {
                    message: { role: 'assistant', content: reply }
                }
            };
        }

        // Build system prompt - Flexible but focused on appointments
        let systemPrompt = `You are an Appointment Assistant for La Cura. Your primary purpose is to help users with:
1. Scheduling new appointments
2. Canceling existing appointments
3. Rescheduling/moving existing appointments

You are FLEXIBLE and UNDERSTANDING - interpret user intent even if they don't use exact keywords. For example:
- "propose a time" = wants to see available slots
- "when can we meet" = scheduling request
- "I can't make it" = cancellation request
- "change to later" = rescheduling request
- Any greeting or unclear message = likely wants to schedule

If the user asks about services, practice information, nutrition, recipes, prices, or anything NOT related to appointments, politely redirect: "I'm here to help with appointments only. I can help you schedule, cancel, or reschedule an appointment. What would you like to do?"

Tone: warm, supportive, professional, concise, understanding

CRITICAL: Be flexible with user language. Don't require exact keywords. Understand intent from context and conversation flow.

`;
        
        if (workflowType === 'schedule') {
            // DETAILED SCHEDULING WORKFLOW
            systemPrompt += `\n\n📅 SCHEDULING WORKFLOW - Follow these steps EXACTLY:

STEP 1 - INITIAL REQUEST:
When user asks to schedule/book an appointment OR any request that sounds like they want to meet/book/see you:
- Interpret flexibly: "schedule", "book", "appointment", "meet", "see you", "propose time", "when available", "find a time", etc.
- Respond: "I'd be happy to help you schedule an appointment! Let me check the calendar for available slots."
- If user mentions a date/time preference (e.g., "tomorrow", "Monday", "next week"), acknowledge it
- IMMEDIATELY check availability (availability data will be provided below)

STEP 2 - SHOW AVAILABILITY:
After availability check, present slots like this EXACT format:
"I found these available 30-minute slots:

**Monday, November 4:**
  • 9:00 AM
  • 2:00 PM
  • 4:30 PM

**Tuesday, November 5:**
  • 10:00 AM
  • 3:00 PM

Which time works best for you?"

- If no slots found: "I don't see any available slots in that time range. Would you like me to check a different date or time?"
- Always group by date, use bullet points, show times in 12-hour format

STEP 3 - COLLECT TIME SELECTION:
When user selects a time (e.g., "Monday at 2 PM", "2:00 PM works", "the second one"):
- Confirm clearly: "Great! I have Monday, November 4 at 2:00 PM available."
- Then ask: "What's your email address so I can send you the calendar invite?"

STEP 4 - COLLECT EMAIL:
- Wait for email address
- Validate format (should contain @)
- If unclear, ask: "Could you please provide your email address?"

STEP 5 - FINAL CONFIRMATION:
Once you have both time and email:
- Summarize: "Perfect! I'm booking a 30-minute session for [DATE] at [TIME] and sending the invite to [EMAIL]. Does that sound good?"
- Wait for confirmation (yes/confirm/sounds good/perfect)

STEP 6 - COMPLETE BOOKING:
After user confirms:
- Respond: "Great! Your appointment is confirmed. You'll receive a calendar invite shortly at [EMAIL]. Looking forward to our session on [DATE] at [TIME]!"
- Note: The actual booking creation happens via API call from the frontend

RULES:
- NEVER create booking until you have: confirmed date/time + email + user confirmation
- Always check availability FIRST before asking for email
- Be warm and conversational but stay focused
- If user provides email early, acknowledge but still follow the workflow
- Keep each response concise (2-3 sentences max)`;
        
        } else if (workflowType === 'cancel') {
            // DETAILED CANCELLING WORKFLOW
            systemPrompt += `\n\n❌ CANCELLING WORKFLOW - Follow these steps EXACTLY:

STEP 1 - INITIAL REQUEST:
When user asks to cancel:
- Respond: "I can help you cancel your appointment. To find your appointment, I'll need your email address."
- Ask: "What email address did you use when booking?"

STEP 2 - COLLECT EMAIL:
- Wait for email address
- Validate format (should contain @)
- If unclear, ask: "Could you please provide the email address you used for booking?"

STEP 3 - LOOK UP APPOINTMENTS:
After receiving email:
- Say: "Let me look up your appointments..."
- List all appointments found for that email, formatted like:
  "I found these appointments:

  1. Monday, November 4 at 2:00 PM
  2. Friday, November 8 at 10:00 AM
  
  Which one would you like to cancel?"

STEP 4 - CONFIRM CANCELLATION:
When user selects which appointment to cancel:
- Confirm: "I'll cancel your appointment on [DATE] at [TIME]. Is that correct?"
- Wait for confirmation (yes/confirm/correct)

STEP 5 - COMPLETE CANCELLATION:
After user confirms:
- Respond: "Your appointment on [DATE] at [TIME] has been cancelled. You should receive a cancellation confirmation email shortly. Is there anything else I can help you with?"
- Note: The actual cancellation happens via API call from the frontend

RULES:
- Always verify email before looking up appointments
- Show all appointments clearly numbered
- Require explicit confirmation before canceling
- Be empathetic but professional`;
        
        } else if (workflowType === 'reschedule') {
            // DETAILED RESCHEDULING WORKFLOW
            systemPrompt += `\n\n🔄 RESCHEDULING WORKFLOW - Follow these steps EXACTLY:

STEP 1 - INITIAL REQUEST:
When user asks to reschedule/move/change:
- Respond: "I can help you reschedule your appointment. First, I need to find your current appointment."
- Ask: "What email address did you use when booking?"

STEP 2 - COLLECT EMAIL:
- Wait for email address
- Validate format (should contain @)
- If unclear, ask: "Could you please provide the email address you used for booking?"

STEP 3 - LOOK UP CURRENT APPOINTMENT:
After receiving email:
- Say: "Let me look up your appointments..."
- List all appointments found, formatted like:
  "I found these appointments:

  1. Monday, November 4 at 2:00 PM
  2. Friday, November 8 at 10:00 AM
  
  Which one would you like to reschedule?"

STEP 4 - SELECT APPOINTMENT TO MOVE:
When user selects which appointment:
- Confirm: "I'll help you reschedule your appointment on [DATE] at [TIME]."
- Ask: "What date or time would work better for you? (e.g., 'next Monday', 'tomorrow afternoon')"

STEP 5 - CHECK NEW AVAILABILITY:
After user provides new date/time preference:
- Say: "Let me check availability for that time..."
- IMMEDIATELY check availability (availability data will be provided below)
- Show available slots in the same format as scheduling

STEP 6 - SELECT NEW TIME:
Present available slots:
"I found these available slots:

**Monday, November 11:**
  • 9:00 AM
  • 2:00 PM

**Tuesday, November 12:**
  • 10:00 AM
  • 3:00 PM

Which time works better for you?"

STEP 7 - CONFIRM RESCHEDULING:
When user selects new time:
- Summarize: "Perfect! I'll move your appointment from [OLD DATE] at [OLD TIME] to [NEW DATE] at [NEW TIME]. Does that work for you?"
- Wait for confirmation (yes/confirm/sounds good)

STEP 8 - COMPLETE RESCHEDULING:
After user confirms:
- Respond: "Great! Your appointment has been rescheduled. Your new appointment is on [NEW DATE] at [NEW TIME]. You'll receive updated calendar invites for both the cancellation and new appointment. Is there anything else I can help you with?"
- Note: The actual rescheduling happens via API call from the frontend

RULES:
- Always find current appointment FIRST before checking new availability
- Show both old and new appointment details in confirmation
- Require explicit confirmation before rescheduling
- Be helpful and patient`;
        }
        
        // Prepare messages for OpenAI
        const openAIMessages: Array<{ role: 'system' | 'user' | 'assistant', content: string }> = [
            { role: 'system', content: systemPrompt },
            ...(messages?.filter(m => m.role !== 'system') || [])
        ];

        // Try to use Azure OpenAI if configured
        const openAIClient = getOpenAIClient();
        let reply: string;
        
        // Log OpenAI configuration status
        context.log(`[${requestId}] chatAsk: OpenAI configuration check`, {
            hasEndpoint: !!OPENAI_ENDPOINT,
            hasApiKey: !!OPENAI_API_KEY,
            endpointPrefix: OPENAI_ENDPOINT ? OPENAI_ENDPOINT.substring(0, 20) + '...' : 'missing',
            deploymentName: OPENAI_DEPLOYMENT_NAME,
            clientAvailable: !!openAIClient
        });
        
        if (openAIClient) {
            try {
                context.log(`[${requestId}] chatAsk: Calling Azure OpenAI`, {
                    deployment: OPENAI_DEPLOYMENT_NAME,
                    messageCount: openAIMessages.length
                });
                
                // For scheduling and rescheduling queries, check availability if user mentions dates/times
                let availabilityContext = '';
                
                if ((workflowType === 'schedule' || workflowType === 'reschedule') && !isBookingConfirmation) {
                    try {
                        // Parse date from user text
                        const dateInfo = parseDateFromText(userText);
                        
                        // Default: check next 7 days
                        const startDate = new Date();
                        startDate.setHours(0, 0, 0, 0);
                        const endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + 7);
                        endDate.setHours(23, 59, 59, 999);
                        
                        // If user specified a date, adjust range
                        if (dateInfo.date) {
                            startDate.setTime(dateInfo.date.getTime());
                            endDate.setTime(dateInfo.date.getTime());
                            endDate.setHours(23, 59, 59, 999);
                        }
                        
                        context.log(`[${requestId}] chatAsk: Checking availability`, {
                            startDate: startDate.toISOString(),
                            endDate: endDate.toISOString(),
                            userMentionedDate: dateInfo.hasDate,
                            queryType: workflowType
                        });
                        
                        // Add timeout protection for availability check
                        const availabilityPromise = checkAvailabilityInternal(
                            startDate.toISOString(),
                            endDate.toISOString(),
                            context
                        );
                        
                        // Timeout after 10 seconds
                        const timeoutPromise = new Promise<{ availableSlots: string[]; error?: string }>((resolve) => {
                            setTimeout(() => {
                                context.warn(`[${requestId}] chatAsk: Availability check timed out after 10s`);
                                resolve({ availableSlots: [], error: 'Timeout' });
                            }, 10000);
                        });
                        
                        const availabilityResult = await Promise.race([availabilityPromise, timeoutPromise]);
                        
                        if (availabilityResult.error) {
                            context.warn(`[${requestId}] chatAsk: Availability check failed`, {
                                error: availabilityResult.error
                            });
                            availabilityContext = `\n\nAVAILABILITY CHECK RESULT: Unable to check calendar availability at the moment. Please ask the user for their preferred date and time, and we can proceed with scheduling.`;
                        } else if (availabilityResult.availableSlots.length > 0) {
                            availabilityContext = `\n\nAVAILABLE SLOTS (from calendar check):\n${formatAvailableSlots(availabilityResult.availableSlots)}\n\nUse this EXACT information to show the user available times. Present it in the format specified in the workflow.`;
                        } else {
                            availabilityContext = `\n\nAVAILABILITY CHECK RESULT: No available slots found in the requested time range. Suggest checking a different date or time range, or ask the user for their preferred dates.`;
                        }
                    } catch (availabilityError: any) {
                        context.error(`[${requestId}] chatAsk: Error during availability check`, {
                            errorMessage: availabilityError?.message,
                            errorStack: availabilityError?.stack
                        });
                        availabilityContext = `\n\nAVAILABILITY CHECK RESULT: Unable to check calendar availability at the moment. Please ask the user for their preferred date and time, and we can proceed with scheduling.`;
                    }
                    
                    // Add availability context to system prompt (even if check failed)
                    if (availabilityContext) {
                        openAIMessages[0].content += availabilityContext;
                    }
                }
                
                // For cancel queries, we may need to look up appointments
                if (workflowType === 'cancel') {
                    // Check if user has provided email
                    const emailMatch = userText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                    if (emailMatch) {
                        // Look up appointments for this email
                        // This would need to call listBookings, but for now we'll let OpenAI guide the conversation
                        context.log(`[${requestId}] chatAsk: User provided email for cancellation lookup`, { email: emailMatch[0] });
                    }
                }
                
                // Add timeout protection for OpenAI call
                const openAIPromise = openAIClient.chat.completions.create({
                    model: OPENAI_DEPLOYMENT_NAME,
                    messages: openAIMessages,
                    temperature: 0.7,
                    max_tokens: 600 // Increased for longer booking responses
                });
                
                // Timeout after 30 seconds
                const openAITimeoutPromise = new Promise<{ choices: Array<{ message: { content: string } }> }>((resolve) => {
                    setTimeout(() => {
                        context.warn(`[${requestId}] chatAsk: OpenAI call timed out after 30s`);
                        resolve({ 
                            choices: [{ 
                                message: { 
                                    content: 'I apologize, but I\'m experiencing some delays. Let me help you schedule an appointment. What date and time would work best for you?' 
                                } 
                            }] 
                        });
                    }, 30000);
                });
                
                const response = await Promise.race([openAIPromise, openAITimeoutPromise]);
                
                reply = response.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try asking again.';
                
                // Ensure we always have a response
                if (!reply || reply.trim().length === 0) {
                    reply = 'I\'d be happy to help you schedule an appointment! What date and time would work best for you?';
                }
                
                const duration = Date.now() - startTime;
                context.log(`[${requestId}] chatAsk: Successfully generated response`, {
                    responseLength: reply.length,
                    durationMs: duration,
                    tokensUsed: (response as any).usage?.total_tokens || 'unknown'
                });
            } catch (openAIError: any) {
                context.error(`[${requestId}] chatAsk: Azure OpenAI error`, {
                    errorMessage: openAIError?.message,
                    errorCode: openAIError?.code,
                    errorStack: openAIError?.stack
                });
                // Fallback to stub if OpenAI fails
                reply = userText
                    ? `I apologize, but I'm having trouble processing your request right now. Please try again. I can help you schedule, cancel, or reschedule appointments.`
                    : 'Hi! I can help you schedule, cancel, or reschedule appointments. What would you like to do?';
            }
        } else {
            // Fallback if OpenAI not configured
            context.warn(`[${requestId}] chatAsk: Azure OpenAI not configured`, {
                missingEndpoint: !OPENAI_ENDPOINT,
                missingApiKey: !OPENAI_API_KEY
            });
            
            // Provide helpful responses even without OpenAI
            if (workflowType === 'schedule') {
                reply = `I'd be happy to help you schedule an appointment! Let me check the calendar for available slots. What date or time range works best for you?`;
            } else if (workflowType === 'cancel') {
                reply = `I can help you cancel your appointment. To find your appointment, I'll need your email address. What email address did you use when booking?`;
            } else if (workflowType === 'reschedule') {
                reply = `I can help you reschedule your appointment. First, I need to find your current appointment. What email address did you use when booking?`;
            } else {
                reply = `I'm here to help you with appointments only. I can help you schedule, cancel, or reschedule an appointment. What would you like to do?`;
            }
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
    const requestId = context.invocationId;
    const startTime = Date.now();
    
    try {
        context.log(`[${requestId}] sendEmail: Starting email send request`);
        
        const connectionString = process.env.ACS_CONNECTION_STRING;
        if (!connectionString) {
            context.error(`[${requestId}] sendEmail: ACS connection string not configured`);
            return { status: 500, jsonBody: { error: "ACS connection not configured" } };
        }

        const body = (await req.json().catch((parseError) => {
            context.error(`[${requestId}] sendEmail: Failed to parse request body`, parseError);
            throw parseError;
        })) as {
            to: string;
            subject?: string;
            html?: string;
            from?: string;
        };
        
        const to = body.to;
        const subject = body.subject ?? "Message from Wellness Practice";
        const html = body.html ?? "<p>Hello from Azure Functions.</p>";
        const sender = body.from ?? process.env.ACS_SENDER;

        context.log(`[${requestId}] sendEmail: Email details`, {
            to,
            sender,
            hasSubject: !!subject,
            hasHtml: !!html
        });

        if (!to || !sender) {
            context.warn(`[${requestId}] sendEmail: Missing required fields`, {
                hasTo: !!to,
                hasSender: !!sender
            });
            return { status: 400, jsonBody: { error: "Missing 'to' or configured 'from' sender" } };
        }

        context.log(`[${requestId}] sendEmail: Creating EmailClient`);
        const emailClient = new EmailClient(connectionString);
        
        context.log(`[${requestId}] sendEmail: Sending email`, {
            senderAddress: sender,
            to: to,
            subject: subject
        });
        
        const poller = await emailClient.beginSend({
            senderAddress: sender,
            content: { subject, html },
            recipients: { to: [{ address: to }] }
        });
        
        context.log(`[${requestId}] sendEmail: Waiting for email send to complete`);
        const result = await poller.pollUntilDone();

        const duration = Date.now() - startTime;
        context.log(`[${requestId}] sendEmail: Email sent successfully`, {
            messageId: result?.id,
            status: result?.status,
            durationMs: duration
        });

        return {
            status: 200,
            jsonBody: {
                messageId: result?.id ?? null,
                status: result?.status ?? 'Unknown'
            }
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;
        const errorDetails = {
            requestId,
            errorMessage: error?.message || 'Unknown error',
            errorCode: error?.code || error?.statusCode || 'UNKNOWN',
            errorStack: error?.stack || 'No stack trace',
            durationMs: duration
        };
        
        context.error(`[${requestId}] sendEmail: Error sending email`, errorDetails);
        context.error(`[${requestId}] sendEmail: Full error object`, error);
        
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
// Trigger deployment
