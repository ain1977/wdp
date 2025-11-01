# Workflow Testing & Iteration Process

## Quick Test Process

### 1. Test the Assistant
1. Open your web app
2. Click the chat widget
3. Try different conversation flows:
   - **Scheduling**: "Hi", "I want to book", "schedule an appointment"
   - **Canceling**: "I need to cancel", "remove my appointment"
   - **Rescheduling**: "move my appointment", "change time"

### 2. Report Issues
When something doesn't work as expected, provide:
- **What you typed**: Exact user input
- **What happened**: Assistant's response
- **What should happen**: Expected behavior
- **Context**: How many messages into conversation (1st, 2nd, etc.)

### 3. I'll Fix It
I'll update the workflow based on your feedback and:
- Adjust detection logic
- Improve prompts
- Fix step sequences
- Add missing edge cases

## Feedback Format

```
**Test Case:** [Brief description]
**User Input:** "[exact text]"
**Expected:** [what should happen]
**Actual:** [what happened]
**Messages into conversation:** [1, 2, 3, etc.]
**Screenshot/Logs:** [if available]
```

## Example Feedback

```
**Test Case:** User says "hi" but gets rejection message
**User Input:** "hi"
**Expected:** Assistant should greet back and start scheduling workflow
**Actual:** Got "I'm here to help you with appointments only..."
**Messages into conversation:** 1
```

## Testing Checklist

### Scheduling Flow
- [ ] Simple greeting ("hi", "hello")
- [ ] Direct request ("I want to schedule")
- [ ] With date preference ("tomorrow", "next Monday")
- [ ] Email collection
- [ ] Confirmation step
- [ ] Edge cases (invalid email, no availability, etc.)

### Canceling Flow
- [ ] Direct cancel request
- [ ] Email lookup
- [ ] Multiple appointments scenario
- [ ] Confirmation step

### Rescheduling Flow
- [ ] Request to move appointment
- [ ] Email lookup
- [ ] New time selection
- [ ] Confirmation step

## Quick Commands

```bash
# View logs (if deployed)
az monitor app-insights query --app <app-name> --resource-group <rg> --analytics-query "traces | where timestamp > ago(10m) | where message contains 'chatAsk' | project timestamp, message | order by timestamp desc"

# Rebuild after changes
cd api/functions && npm run build

# Check for TypeScript errors
cd api/functions && npx tsc --noEmit
```

