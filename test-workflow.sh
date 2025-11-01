#!/bin/bash
# Quick test script for workflow testing

FUNCTION_APP_URL="${FUNCTION_APP_URL:-https://func-xob7nugiarm7e.azurewebsites.net}"
TEST_MESSAGE="${1:-hi}"

echo "🧪 Testing workflow with message: '$TEST_MESSAGE'"
echo ""

# Create a simple conversation
curl -X POST "${FUNCTION_APP_URL}/api/chat/ask" \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [
      { \"role\": \"assistant\", \"content\": \"Hi! I can help you schedule, cancel, or reschedule appointments. What would you like to do?\" },
      { \"role\": \"user\", \"content\": \"${TEST_MESSAGE}\" }
    ]
  }" 2>/dev/null | python3 -m json.tool

echo ""
echo "✅ Test complete!"
echo ""
echo "💡 Tip: To test different messages, run:"
echo "   ./test-workflow.sh 'your message here'"

