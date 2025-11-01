# Appointment Assistant Architecture

## Overview

The Appointment Assistant is a conversational AI agent built for La Cura that helps users schedule, cancel, and reschedule appointments. It combines **rule-based logic** for reliability with **LLM-based conversation** for natural language understanding.

---

## High-Level Architecture

```
┌─────────────────┐
│   Frontend      │  Next.js React App (Static Web App)
│   (User UI)     │  - Chat Widget Component
└────────┬────────┘  - Conversational Interface
         │
         │ HTTP POST /api/chat/ask
         │
         ▼
┌─────────────────────────────────────────────────┐
│   Azure Functions (Backend API)                 │
│   ┌──────────────────────────────────────────┐ │
│   │  chatAsk Function                         │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ 1. Input Processing                 │  │ │
│   │  │    - Parse user message             │  │ │
│   │  │    - Detect intent (schedule/       │  │ │
│   │  │      cancel/reschedule)             │  │ │
│   │  │    - Check conversation context      │  │ │
│   │  └────────────────────────────────────┘  │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ 2. Availability Check (if needed)   │  │ │
│   │  │    - Call Microsoft Graph API       │  │ │
│   │  │    - Get free/busy times             │  │ │
│   │  │    - Generate 30-min slots          │  │ │
│   │  │    - Filter business hours          │  │ │
│   │  └────────────────────────────────────┘  │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ 3. LLM Processing                  │  │ │
│   │  │    - Build system prompt            │  │ │
│   │  │    - Add workflow instructions     │  │ │
│   │  │    - Add availability data         │  │ │
│   │  │    - Call Azure OpenAI             │  │ │
│   │  │    - Generate natural response     │  │ │
│   │  └────────────────────────────────────┘  │ │
│   │  ┌────────────────────────────────────┐  │ │
│   │  │ 4. Response Generation             │  │ │
│   │  │    - Format response               │  │ │
│   │  │    - Add error handling            │  │ │
│   │  │    - Return to frontend            │  │ │
│   │  └────────────────────────────────────┘  │ │
│   └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Azure OpenAI │    │ Microsoft    │    │ Application  │
│ (GPT-4)      │    │ Graph API    │    │ Insights     │
│              │    │ (Calendar)   │    │ (Logging)    │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## Component Breakdown

### 1. Frontend Layer (`apps/web/`)

**Technology:** Next.js 14 (React), TypeScript

**Components:**
- **AssistantWidget** (`app/page.tsx`)
  - Chat UI component (fixed bottom-right)
  - Manages conversation state (`messages` array)
  - Sends messages to `/api/chat/ask`
  - Displays responses in chat bubbles

**Key Features:**
- Real-time conversation interface
- Message history persistence (in-memory)
- Loading states
- Error handling

**API Integration:**
```typescript
POST /api/chat/ask
Body: { messages: [{ role, content }] }
Response: { message: { role: 'assistant', content: string } }
```

---

### 2. Backend API Layer (`api/functions/`)

**Technology:** Azure Functions (Node.js 22, TypeScript)

**Main Function: `chatAsk`**

#### Request Flow:

```
User Message
    ↓
1. Input Processing
   ├─ Extract user text
   ├─ Detect conversation context (in workflow?)
   ├─ Classify intent (schedule/cancel/reschedule)
   └─ Check for dangerous/unrelated queries
    ↓
2. Availability Check (if scheduling/rescheduling)
   ├─ Parse date preferences
   ├─ Call Microsoft Graph API (getFreeBusy)
   ├─ Generate 30-minute slots (9 AM - 6 PM, weekdays)
   ├─ Filter out busy times
   └─ Format slots for display
    ↓
3. LLM Processing
   ├─ Build system prompt with workflow instructions
   ├─ Add availability context
   ├─ Add conversation history
   ├─ Call Azure OpenAI (GPT-4)
   └─ Generate natural language response
    ↓
4. Response & Error Handling
   ├─ Validate response
   ├─ Add fallbacks if needed
   ├─ Log to Application Insights
   └─ Return to frontend
```

---

## Core Components

### 1. Intent Detection (Rule-Based)

**Purpose:** Quick classification before LLM processing

**Detection Logic:**
```typescript
// Scheduling keywords
isScheduleQuery = includes('schedule', 'book', 'appointment', 'meet', 'see you', ...)

// Canceling keywords  
isCancelQuery = includes('cancel', 'remove', 'delete', "can't make it", ...)

// Rescheduling keywords
isRescheduleQuery = includes('reschedule', 'move', 'change', 'different time', ...)

// Dangerous/unrelated (explicitly blocked)
isDangerousOrUnrelated = includes('info about', 'nutrition', 'recipe', 'price', ...)
```

**Context Awareness:**
- Checks last assistant message to detect active workflow
- Recognizes continuation phrases ("propose", "suggest", "show me")
- Early conversation handling (first 3 messages more lenient)

---

### 2. Availability Engine

**Purpose:** Real-time calendar slot generation

**Process:**
1. **Query Calendar:** Microsoft Graph API `getFreeBusy`
   ```typescript
   POST /users/{email}/calendar/getFreeBusy
   Body: { schedules: [email], startTime, endTime }
   ```

2. **Generate Slots:**
   - Default: Next 7 days
   - Slots: Every 30 minutes
   - Business hours: 9 AM - 6 PM UTC
   - Weekdays only (Monday-Friday)

3. **Filter Busy Times:**
   - Check slot overlap with calendar events
   - Remove conflicting slots

4. **Format Results:**
   - Group by date
   - Format: "Monday, November 4: • 9:00 AM • 2:00 PM"

**Example:**
```typescript
Input: "tomorrow"
→ Parse: Tomorrow's date
→ Check: Next 7 days availability
→ Generate: 30-min slots (9 AM - 6 PM)
→ Filter: Remove busy times
→ Output: Formatted list of available slots
```

---

### 3. LLM Conversation Engine

**Purpose:** Natural language understanding and response generation

**System Prompt Structure:**
```
1. Role Definition
   "You are an Appointment Assistant for La Cura..."

2. Workflow Instructions (one of):
   - Scheduling Workflow (6 steps)
   - Canceling Workflow (5 steps)  
   - Rescheduling Workflow (8 steps)

3. Context Data
   - Available slots (if checked)
   - Conversation history
   - User preferences

4. Rules & Constraints
   - Be flexible with language
   - Follow workflow steps
   - Require confirmations
```

**LLM Configuration:**
- Model: GPT-4 (configurable via `OPENAI_DEPLOYMENT_NAME`)
- Temperature: 0.7 (balanced creativity/consistency)
- Max Tokens: 600
- Timeout: 30 seconds (with fallback)

---

### 4. Workflow Engine

**Three Detailed Workflows:**

#### A. Scheduling Workflow (6 Steps)
```
1. Initial Request → Check availability
2. Show Availability → Present slots
3. Collect Time Selection → Confirm choice
4. Collect Email → Validate format
5. Final Confirmation → Summarize details
6. Complete Booking → Success message
```

#### B. Canceling Workflow (5 Steps)
```
1. Initial Request → Ask for email
2. Collect Email → Validate
3. Look Up Appointments → List all bookings
4. Confirm Cancellation → Verify selection
5. Complete Cancellation → Success message
```

#### C. Rescheduling Workflow (8 Steps)
```
1. Initial Request → Ask for email
2. Collect Email → Validate
3. Look Up Current Appointment → List bookings
4. Select Appointment → Choose which to move
5. Check New Availability → Get available slots
6. Select New Time → Choose replacement
7. Confirm Rescheduling → Verify change
8. Complete Rescheduling → Success message
```

---

## Data Flow

### Example: Scheduling Flow

```
User: "I want to schedule an appointment"
    ↓
[Frontend] POST /api/chat/ask
    ↓
[Backend] chatAsk function
    ↓
1. Intent Detection
   → isScheduleQuery = true
   → workflowType = 'schedule'
    ↓
2. Availability Check
   → checkAvailabilityInternal()
   → Graph API: getFreeBusy (next 7 days)
   → Generate slots: 9 AM - 6 PM, weekdays
   → Filter busy times
   → Format: "Monday: 9 AM, 2 PM, 4 PM..."
    ↓
3. Build LLM Prompt
   → System: "Scheduling workflow instructions"
   → Context: "Available slots: Monday: 9 AM..."
   → History: Previous messages
    ↓
4. Call OpenAI
   → GPT-4 generates response
   → "I found these available slots..."
    ↓
5. Return Response
   → { message: { content: "..." } }
    ↓
[Frontend] Display in chat
```

---

## Key Design Decisions

### 1. Hybrid Approach (Rules + LLM)

**Why:**
- **Rules** for reliability (intent detection, blocking dangerous queries)
- **LLM** for flexibility (natural language understanding)

**Benefit:** Fast classification + natural conversation

---

### 2. Context-Aware Detection

**Why:** Users don't always use exact keywords

**Example:**
- User says "propose a time" after scheduling request
- System checks: "Is assistant in scheduling flow?"
- Recognizes continuation phrase
- Treats as scheduling query

---

### 3. Flexible by Default

**Approach:** Accept most queries, only block dangerous ones

**Logic:**
```typescript
// OLD: Block unless exact keywords match
if (!hasKeyword) → reject

// NEW: Accept unless dangerous
if (!isDangerous) → accept → let LLM interpret
```

**Benefit:** Handles natural language variations

---

### 4. Timeout Protection

**Why:** External APIs (Graph API, OpenAI) can hang

**Implementation:**
- Availability check: 10s timeout
- OpenAI call: 30s timeout
- Always return a response (even if degraded)

**Benefit:** Never hangs, always responds

---

### 5. Business Hours Filtering

**Why:** Don't show slots at 2 AM

**Implementation:**
- Only generate slots: 9 AM - 6 PM UTC
- Skip weekends
- 30-minute intervals

**Benefit:** Only relevant times shown

---

## Integration Points

### Microsoft Graph API

**Authentication:** Managed Identity (`DefaultAzureCredential`)

**Endpoints Used:**
- `POST /users/{email}/calendar/getFreeBusy` - Check availability
- `POST /users/{email}/calendar/events` - Create booking
- `GET /users/{email}/calendar/events` - List bookings
- `DELETE /users/{email}/calendar/events/{id}` - Cancel booking
- `PATCH /users/{email}/calendar/events/{id}` - Reschedule booking

**Permissions Required:**
- `Calendars.ReadWrite`
- `User.Read`

---

### Azure OpenAI

**Endpoint:** `{resource}.openai.azure.com`

**Deployment:** Configurable (default: `gpt-4o-mini`)

**Usage:**
- Chat completions API
- System prompts for workflow guidance
- Natural language generation

---

### Azure Application Insights

**Purpose:** Logging and monitoring

**What's Logged:**
- Request IDs for tracing
- Intent detection results
- Availability check results
- OpenAI response times
- Errors and warnings

**Query Example:**
```kusto
traces 
| where timestamp > ago(10m) 
| where message contains 'chatAsk'
| project timestamp, message, severityLevel
```

---

## Security & Authentication

### Frontend
- Azure Static Web Apps authentication
- Azure AD integration
- Tenant-restricted access

### Backend
- Managed Identity for Graph API
- API keys for OpenAI (environment variables)
- No user authentication on Functions (handled by SWA)

---

## Environment Variables

### Function App Settings:
```
OPENAI_ENDPOINT=https://...
OPENAI_API_KEY=...
OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

CALENDAR_OWNER_EMAIL=andrea@liveraltravel.com

AI_SEARCH_ENDPOINT=https://...
AI_SEARCH_API_KEY=...
AI_SEARCH_INDEX=content

ACS_CONNECTION_STRING=endpoint=...
ACS_SENDER=donotreply@...
```

---

## Error Handling Strategy

### 1. Availability Check Fails
- **Action:** Log error, continue without slots
- **Response:** "Unable to check availability. What date/time works for you?"

### 2. OpenAI Fails/Timeout
- **Action:** Fallback response
- **Response:** Generic helpful message based on workflow type

### 3. Graph API Fails
- **Action:** Log error, don't block conversation
- **Response:** Ask user for preferred time

### 4. Invalid Input
- **Action:** LLM handles interpretation
- **Response:** Ask for clarification

---

## Scalability Considerations

### Current Architecture:
- **Stateless:** Each request is independent
- **Serverless:** Azure Functions scale automatically
- **No Session Storage:** Conversation history in request body

### Limitations:
- No persistent conversation state
- No user context across sessions
- Limited to in-memory message history

### Future Enhancements:
- Store conversation state in Cosmos DB
- Add user profiles/preferences
- Multi-turn conversation persistence

---

## Deployment Architecture

```
GitHub Repository
    ↓
GitHub Actions Workflows
    ├─ azure-static-web-apps.yml → Deploy Frontend
    └─ unc-xob7nugiarm7e.yml → Deploy Functions
    ↓
Azure Resources
    ├─ Static Web App (Frontend)
    ├─ Function App (Backend)
    ├─ Application Insights (Monitoring)
    └─ Managed Identity (Auth)
```

---

## Monitoring & Debugging

### Application Insights Queries

**Recent Chat Requests:**
```kusto
traces 
| where timestamp > ago(10m) 
| where message contains 'chatAsk'
| project timestamp, message
```

**Error Tracking:**
```kusto
exceptions 
| where timestamp > ago(1h)
| project timestamp, type, message
```

**Performance:**
```kusto
traces 
| where message contains 'Successfully generated response'
| project durationMs, responseLength
| summarize avg(durationMs), max(durationMs)
```

---

## Summary

**Architecture Pattern:** Hybrid Conversational Agent
- **Frontend:** React chat interface (Next.js)
- **Backend:** Azure Functions with rule-based + LLM processing
- **Integrations:** Microsoft Graph (calendar), Azure OpenAI (conversation)
- **Key Feature:** Flexible intent detection + structured workflows
- **Design:** Accept by default, block only dangerous queries
- **Reliability:** Timeout protection, error handling, always responds

The system balances **reliability** (rules) with **flexibility** (LLM) to create a natural yet structured appointment booking experience.

