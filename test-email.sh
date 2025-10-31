#!/bin/bash
# Test email sending function

# Configuration
FUNCTION_APP_URL="https://func-xob7nugiarm7e.azurewebsites.net"
TO_EMAIL="${1:-andrea@liveraltravel.com}"  # Default to your email, or pass as first argument

echo "Testing email function..."
echo "Sending to: $TO_EMAIL"
echo ""

curl -X POST "${FUNCTION_APP_URL}/api/email/send" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"${TO_EMAIL}\",
    \"subject\": \"Test Email from La Cura\",
    \"html\": \"<h1>Test Email</h1><p>This is a test email from your La Cura Function App.</p><p>If you received this, the email service is working correctly!</p>\"
  }" | python3 -m json.tool

echo ""
echo "Check your email inbox for the test message."

