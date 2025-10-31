# Booking Workflow - 30 Minute Appointments

## Overview
Design for booking, canceling, and rescheduling 30-minute appointments for La Cura personal chef service.

## User Journey

### 1. Booking an Appointment

**Flow:**
1. User interacts with "Your Gut Assistant" (chat widget)
2. User expresses intent: "I'd like to book a session" / "Schedule an appointment"
3. Assistant asks for:
   - Preferred date
   - Preferred time (30-minute slots)
   - Location (client's home/kitchen)
   - Special dietary requirements/notes
4. Assistant checks availability (query calendar/storage)
5. Confirm or suggest alternatives
6. User confirms booking
7. System creates appointment
8. Send confirmation (email/in-app notification)

**Questions to Consider:**
- What time slots are available? (e.g., 9 AM - 6 PM, hourly/half-hourly?)
- How far in advance can bookings be made?
- What's the cancellation policy timeframe?
- Do we need to collect payment at booking or later?

### 2. Canceling an Appointment

**Flow:**
1. User: "I need to cancel my appointment" / "Cancel my booking"
2. Assistant retrieves user's upcoming appointments
3. List appointments (if multiple)
4. User selects which to cancel
5. Confirm cancellation
6. Check cancellation policy (refund/penalty?)
7. Process cancellation
8. Send cancellation confirmation
9. Free up the time slot

**Questions to Consider:**
- How far in advance must cancellation be? (e.g., 24 hours, 48 hours)
- Full refund, partial refund, or no refund?
- Can users cancel via chat, or do they need to call/email?

### 3. Rescheduling an Appointment

**Flow:**
1. User: "I need to reschedule" / "Change my appointment"
2. Assistant retrieves user's upcoming appointments
3. User selects appointment to move
4. Ask for new preferred date/time
5. Check availability for new slot
6. If available:
   - Confirm old slot is freed
   - Book new slot
   - Send confirmation
7. If not available:
   - Suggest alternatives
   - User selects or cancels

**Questions to Consider:**
- Is rescheduling treated as cancel + rebook, or a single operation?
- How many times can a user reschedule?
- Same cancellation policy applies?

## Technical Architecture

### Microsoft 365 Calendar as Source of Truth ✅

**Why use 365 Calendar:**
- ✅ No database to manage
- ✅ Single source of truth
- ✅ Native calendar interface for viewing/managing
- ✅ Syncs with Outlook/Teams automatically
- ✅ Can view appointments in existing calendar apps
- ✅ Already authenticated via Azure AD

**How it works:**
- All appointments stored as calendar events in 365
- Microsoft Graph API for read/write operations
- Azure Functions use Graph API to interact with calendar
- Your Gut Assistant queries calendar for availability

### Calendar Event Structure

Each appointment = Calendar Event with:
```typescript
{
  subject: "La Cura Session - [Client Name]",
  start: { dateTime: "2024-03-15T14:00:00", timeZone: "UTC" },
  end: { dateTime: "2024-03-15T14:30:00", timeZone: "UTC" },
  location: { displayName: "Client Address" },
  body: {
    contentType: "text",
    content: "Dietary notes: [notes]\nClient: [email]"
  },
  attendees: [
    { emailAddress: { address: "client@email.com" } }
  ],
  categories: ["La Cura Booking"],
  extensions: {
    // Custom metadata if needed
    clientEmail: "client@email.com",
    bookingStatus: "confirmed"
  }
}
```

### No Database Needed! 🎉

- **Availability checking** → Query calendar events via Graph API
- **Booking** → Create calendar event via Graph API
- **Cancellation** → Delete/update calendar event
- **Rescheduling** → Update calendar event start/end times
- **List user appointments** → Query calendar events filtered by attendee email

### API Endpoints Needed

**Azure Functions (using Microsoft Graph API):**
- `POST /api/bookings/create` - Create calendar event via Graph API
- `GET /api/bookings/list` - Query calendar events for user via Graph API
- `GET /api/bookings/availability` - Query calendar for free time slots
- `POST /api/bookings/cancel` - Delete calendar event via Graph API
- `POST /api/bookings/reschedule` - Update calendar event via Graph API
- `GET /api/bookings/{id}` - Get calendar event by ID via Graph API

**Microsoft Graph API Endpoints Used:**
- `GET /me/calendar/events` - List events
- `POST /me/calendar/events` - Create event
- `GET /me/calendar/freeBusy` - Check availability
- `PATCH /me/calendar/events/{id}` - Update event
- `DELETE /me/calendar/events/{id}` - Delete event

### Integration Points

1. **Microsoft Graph API** (Primary Integration)
   - Authentication: Use Managed Identity or App Registration
   - Permissions needed:
     - `Calendars.ReadWrite` - Full calendar access
     - `User.Read` - Basic user info
   - Access calendar for: booking, availability, cancellation, rescheduling

2. **AI Assistant (Your Gut Assistant)**
   - Natural language understanding for booking intent
   - Extract date/time from user messages
   - Query Graph API for availability
   - Create/update/delete calendar events via API
   - Present options and confirmations

3. **Email Service** (already have ACS)
   - Send booking confirmations (calendar events already send invites, but can supplement)
   - Send cancellation confirmations
   - Send reminders (24 hours before?)

4. **Azure Search** (optional)
   - Index booking FAQs
   - Help assistant answer booking questions

## Workflow Scenarios

### Scenario 1: Standard Booking
```
User: "I'd like to book a session for next Tuesday"
Assistant: "What time works best for you? I have slots at 10 AM, 2 PM, and 4 PM."
User: "2 PM works"
Assistant: "Perfect! I've booked you for Tuesday at 2 PM. You'll receive a confirmation email shortly."
```

### Scenario 2: No Availability
```
User: "Book me for tomorrow at 3 PM"
Assistant: "I'm sorry, tomorrow at 3 PM is already booked. I have slots at 11 AM, 1 PM, or 5 PM. Would any of these work?"
```

### Scenario 3: Cancellation
```
User: "I need to cancel my appointment"
Assistant: "I found your appointment on March 15th at 2 PM. Would you like to cancel this one?"
User: "Yes"
Assistant: "Your appointment has been cancelled. Since it's more than 24 hours away, you'll receive a full refund."
```

### Scenario 4: Rescheduling
```
User: "Can I move my Tuesday appointment to Wednesday?"
Assistant: "I can move your Tuesday 2 PM appointment. What time on Wednesday works for you?"
User: "Same time, 2 PM"
Assistant: "Wednesday at 2 PM is available. I've rescheduled your appointment. You'll receive a confirmation email."
```

## Business Rules

### Availability
- Operating hours: [TBD - e.g., Monday-Friday 9 AM - 6 PM]
- Time slots: Every 30 minutes (9:00, 9:30, 10:00, etc.)
- Buffer time: [TBD - e.g., 15 minutes between appointments for travel]

### Booking Rules
- Advance booking: [TBD - e.g., up to 4 weeks in advance]
- Same-day booking: [TBD - allowed or not?]
- Minimum notice: [TBD - e.g., 24 hours]

### Cancellation Policy
- Full refund if cancelled > 24 hours before
- 50% refund if cancelled 12-24 hours before
- No refund if cancelled < 12 hours before
- Free cancellation (full refund) if cancelled > 48 hours before

### Rescheduling Policy
- Allowed up to 24 hours before appointment
- No fee for first reschedule
- [TBD - fee for subsequent reschedules?]

## Next Steps

1. **Define availability window** - When are appointments available?
2. **Set time slots** - Confirm 30-minute slots, what times?
3. **Set up Microsoft Graph API** - Configure App Registration with calendar permissions
4. **Design API contracts** - Define request/response formats for booking endpoints
5. **Implement Graph API integration** - Build functions to interact with 365 Calendar
6. **Implement availability checking** - Query calendar for free slots via Graph API
7. **Integrate with AI assistant** - Connect booking flows to calendar operations
8. **Add email notifications** - Confirmations and reminders (calendar events send invites automatically)
9. **Build admin interface** - View/manage appointments (can use calendar directly or Graph API)

## Microsoft Graph API Setup

**Required Permissions:**
- `Calendars.ReadWrite` - Read and write calendar events
- `User.Read` - Read user profile

**Authentication Options:**
1. **Managed Identity** (Recommended for Azure Functions)
   - Function App gets identity automatically
   - Assign permissions to Function App identity

2. **App Registration** (Alternative)
   - Use existing App Registration (e276d260-a10a-43a4-aefa-dccaaace3d23)
   - Add calendar permissions
   - Use client credentials flow

**Implementation:**
- Use `@microsoft/microsoft-graph-client` npm package
- Or use REST API directly with fetch
- Handle authentication tokens automatically

## Questions to Answer

- [ ] What are the operating hours/days?
- [ ] How far in advance can appointments be booked?
- [ ] Can users book same-day appointments?
- [ ] What's the exact cancellation policy?
- [ ] Do we need payment integration now or later?
- [ ] Should there be a maximum number of appointments per user per week/month?
- [ ] Do we need to handle recurring appointments?
- [ ] Should admin be able to block certain time slots?

