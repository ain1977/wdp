# Appointment Booking Workflow Guide

## Overview
The booking workflow is designed to guide users through scheduling appointments in a conversational, step-by-step manner. The assistant checks calendar availability in real-time and presents options clearly.

## Workflow Steps

### Step 1: Initial Request
**User:** "I want to schedule an appointment" or clicks "📅 Schedule an appointment"

**Assistant Response:**
- "I'd be happy to help you schedule an appointment! Let me check the calendar for available slots."
- "What date or time range works best for you? (e.g., 'tomorrow', 'next Monday', 'this week')"

**Behind the scenes:**
- The system automatically checks availability for the next 7 days
- Parses user input for date preferences (tomorrow, Monday, next week, etc.)

### Step 2: Show Availability
**Assistant Response:**
- "I found these available 30-minute slots:
  
  **Monday, November 4:**
    • 9:00 AM
    • 2:00 PM
    • 4:30 PM
  
  **Tuesday, November 5:**
    • 10:00 AM
    • 3:00 PM
  
  Which time works best for you?"

**Features:**
- Slots are grouped by date
- Times are formatted in 12-hour format (AM/PM)
- Clear, easy-to-read format
- If no slots found, suggests alternative dates

### Step 3: Collect Details
**User:** Selects a time (e.g., "Monday at 2:00 PM" or "That time works")

**Assistant Response:**
- "Great! I have Monday, November 4 at 2:00 PM available."
- "What's your email address so I can send you the calendar invite?"

**What happens:**
- Assistant confirms the selected time
- Asks for email address
- Waits for user to provide email

### Step 4: Final Confirmation
**User:** Provides email (e.g., "myemail@example.com")

**Assistant Response:**
- "Perfect! I'm booking a 30-minute session for Monday, November 4 at 2:00 PM and sending the invite to myemail@example.com. Does that sound good?"

**User:** Confirms (e.g., "Yes", "Sounds good", "Confirm")

**Final Step:**
- Assistant guides user to confirm booking
- Booking is created via API call (`/api/booking/create`)
- Calendar invite is sent to user's email

## Technical Implementation

### Date Parsing
The system recognizes:
- Relative dates: "tomorrow", "next week"
- Day names: "Monday", "Tuesday", etc.
- Time preferences: "morning", "afternoon", "evening", "9 AM", "2 PM"

### Availability Checking
- Checks Microsoft 365 calendar via Graph API
- Generates 30-minute slots
- Filters out busy times
- Returns available slots grouped by date

### Conversation Flow
- Uses OpenAI to maintain natural conversation
- Follows structured workflow but feels conversational
- Handles variations in user input
- Confirms details before booking

## Example Conversation Flow

```
User: I want to schedule an appointment

Assistant: I'd be happy to help you schedule an appointment! Let me check the calendar for available slots.
           What date or time range works best for you?

User: Tomorrow

Assistant: I found these available 30-minute slots:

          **Friday, November 1:**
            • 9:00 AM
            • 11:00 AM
            • 2:00 PM
            • 4:00 PM

          Which time works best for you?

User: 2:00 PM works

Assistant: Great! I have Friday, November 1 at 2:00 PM available.
           What's your email address so I can send you the calendar invite?

User: andrea@example.com

Assistant: Perfect! I'm booking a 30-minute session for Friday, November 1 at 2:00 PM 
           and sending the invite to andrea@example.com. Does that sound good?

User: Yes

Assistant: [Booking created] Your appointment is confirmed! You'll receive a calendar invite 
           shortly. Looking forward to our session!
```

## Error Handling

- **No availability:** Suggests alternative dates or times
- **Invalid date/time:** Asks for clarification
- **Missing email:** Prompts again
- **Booking conflicts:** Checks availability again before confirming

## Future Enhancements

- Allow users to specify preferred time ranges (e.g., "morning only")
- Support recurring appointments
- Send confirmation emails
- Allow rescheduling directly in chat
- Show calendar conflicts and suggest alternatives

