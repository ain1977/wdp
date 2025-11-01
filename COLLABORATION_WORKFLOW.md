# Our Collaboration Workflow

## Simple Process: Test → Feedback → Fix → Repeat

### Step 1: You Test 🔍
1. **Test the assistant** in your web app
2. **Try different scenarios:**
   - Greetings: "hi", "hello"
   - Scheduling: "I want to book", "schedule appointment"
   - Canceling: "cancel my appointment"
   - Rescheduling: "move my appointment"
   - Edge cases: unclear requests, typos, etc.

### Step 2: You Provide Feedback 📝
**Just copy-paste this format and fill it in:**

```
**What I typed:** [exact text]
**What happened:** [assistant's response]
**What I expected:** [what should have happened]
**Context:** [1st message, 2nd message, etc.]
```

**Example:**
```
**What I typed:** "hi"
**What happened:** "I'm here to help you with appointments only..."
**What I expected:** Should greet me back and start asking about scheduling
**Context:** 1st message after opening chat
```

### Step 3: I Fix & Update Code 🔧
- I'll analyze the issue
- Update the detection logic, prompts, or workflow steps
- Commit and push changes
- Tell you what I changed

### Step 4: You Test Again ✅
- Test the fix
- Confirm it works (or report if it doesn't)
- Move to next issue

---

## Quick Feedback Template

Just copy this and paste your feedback:

```
### Feedback
**User Input:** ""
**Assistant Response:** ""
**Expected:** ""
**Issue:** [Brief description]
```

---

## What I'll Need From You

### Good Feedback Includes:
✅ **Exact text** you typed  
✅ **Exact response** you got  
✅ **Conversation position** (1st, 2nd, 3rd message)  
✅ **What you expected**  

### Optional But Helpful:
- Screenshot of the conversation
- Error messages (if any)
- What workflow you were trying to complete

---

## What I'll Do With Feedback

1. **Identify the issue:**
   - Detection logic problem?
   - Prompt needs improvement?
   - Missing step in workflow?
   - Edge case not handled?

2. **Fix the code:**
   - Update `api/functions/src/functions.ts`
   - Test compilation
   - Commit changes

3. **Tell you what changed:**
   - What I fixed
   - Why it was happening
   - How to test the fix

---

## Testing Tips

### Test These Common Scenarios:
- [ ] Simple "hi" → Should start scheduling flow
- [ ] "I want to schedule" → Should check availability
- [ ] "cancel" → Should ask for email
- [ ] Providing email → Should validate format
- [ ] "yes" / "confirm" → Should proceed with booking
- [ ] Unclear input → Should guide user helpfully

### Edge Cases to Try:
- Very short messages ("hi", "ok")
- Typos ("scedule", "appoitment")
- Unclear requests ("help", "what can you do")
- Multiple intents in one message
- Providing info out of order

---

## Quick Commands for You

```bash
# View recent logs (if you want to debug)
az monitor app-insights query \
  --app func-xob7nugiarm7e202510300620 \
  --resource-group wdp-rg \
  --analytics-query "traces | where timestamp > ago(10m) | where message contains 'chatAsk' | project timestamp, message | order by timestamp desc | take 20"

# Test via command line (alternative to web UI)
./test-workflow.sh "your message here"
```

---

## Our Iteration Cycle

```
┌─────────────┐
│  You Test   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ You Provide │
│  Feedback   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  I Analyze  │
│  & Fix Code │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  I Commit   │
│  & Deploy   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ You Test    │
│ Again ✅    │
└─────────────┘
```

---

## Best Practices

### For You:
- **Be specific** - exact text helps me reproduce
- **One issue at a time** - easier to track and fix
- **Test after each fix** - catch regressions early
- **Share context** - where in conversation helps

### For Me:
- **Quick fixes** - respond fast to your feedback
- **Explain changes** - tell you what I changed and why
- **Log improvements** - add logging to help debug
- **Test before committing** - ensure code compiles

---

## Status Tracking

Use `WORKFLOW_FEEDBACK.md` to track:
- ✅ Fixed issues
- 🔄 In progress
- ⏳ Pending
- 🐛 Bugs found
- 💡 Ideas for improvement

---

## Ready to Start?

1. **Test the assistant now** - try a few scenarios
2. **Report any issues** - use the template above
3. **I'll fix it** - update code and explain changes
4. **You verify** - test the fix works
5. **Repeat** - until it's perfect!

Let's make this assistant work perfectly! 🚀

