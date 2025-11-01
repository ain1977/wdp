# Workflow Feedback & Iteration Log

## Quick Start 🚀

**Just copy this template and paste your feedback:**

```
### Issue #[NUMBER]
**What I typed:** "[exact text]"
**What happened:** "[assistant's response]"
**What I expected:** "[what should happen]"
**Context:** [1st/2nd/3rd message, etc.]
```

Then I'll fix it and tell you what changed!

---

## Feedback Template

Copy this template for each issue:

```markdown
### Issue #[NUMBER]
**Date:** [Date]
**Test Case:** [Brief description]
**User Input:** "[exact text you typed]"
**Expected Behavior:** [what should happen]
**Actual Behavior:** [what actually happened]
**Messages into conversation:** [1st, 2nd, 3rd, etc.]
**Workflow Type:** [schedule/cancel/reschedule]
**Additional Context:** [any other relevant info]
```

---

## Current Issues & Status

### Issue #1
**Status:** ⏳ Pending / ✅ Fixed / 🔄 In Progress

[Your feedback here]

---

## Test Scenarios

### Scenario 1: Initial Greeting
- **Input:** "hi"
- **Expected:** Greet back, start scheduling workflow
- **Status:** [ ] Pass / [ ] Fail

### Scenario 2: Direct Scheduling Request
- **Input:** "I want to schedule an appointment"
- **Expected:** Check availability, show slots
- **Status:** [ ] Pass / [ ] Fail

### Scenario 3: Cancel Request
- **Input:** "I need to cancel"
- **Expected:** Ask for email, look up appointments
- **Status:** [ ] Pass / [ ] Fail

---

## Common Patterns to Test

- [ ] Simple greetings ("hi", "hello", "hey")
- [ ] Scheduling requests ("book", "schedule", "appointment")
- [ ] With dates ("tomorrow", "Monday", "next week")
- [ ] Cancel requests ("cancel", "remove", "delete")
- [ ] Reschedule requests ("move", "change", "reschedule")
- [ ] Email input (valid and invalid)
- [ ] Confirmation responses ("yes", "confirm", "sounds good")
- [ ] Edge cases (empty input, unclear requests)

---

## Notes

Add any general observations or suggestions here:

