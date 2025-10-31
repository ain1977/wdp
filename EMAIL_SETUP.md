# Email Setup Instructions

## Current Issue
The email function is working, but Azure Communication Services requires domain verification before sending emails.

**Error:** `DomainNotLinked: The specified sender domain has not been linked.`

## Setup Options

### Option 1: Use Azure Communication Services Domain (Quick Test)

1. Go to Azure Portal → Azure Communication Services (`acs-xob7nugiarm7e`)
2. Navigate to **Email** → **Domains**
3. You should see `azurecomm.net` domain
4. Click on it and verify/link the domain
5. Wait for verification to complete (can take a few minutes)

### Option 2: Use Your Own Domain (Production)

1. Go to Azure Portal → Azure Communication Services → **Email** → **Domains**
2. Click **Add domain**
3. Enter your domain (e.g., `liveraltravel.com`)
4. Add the DNS records shown in Azure Portal to your domain's DNS settings:
   - SPF record
   - DKIM records (2 CNAME records)
   - DMARC record (optional but recommended)
5. Wait for verification (can take up to 48 hours)
6. Update `ACS_SENDER` in Function App settings to use your verified domain

### Option 3: Use Azure Communication Services Email Resource (Newer Approach)

Azure Communication Services Email might require creating a separate Email resource. Check if you need to:

1. Create an Email Communication Service resource
2. Link it to your Communication Services
3. Verify domains there

## Current Configuration

- **ACS Connection String:** ✅ Configured
- **ACS Sender:** `DoNotReply@acs-xob7nugiarm7e.azurecomm.net`
- **Function:** `/api/email/send` ✅ Working (waiting for domain verification)

## Test Once Domain is Verified

```bash
curl -X POST https://func-xob7nugiarm7e.azurewebsites.net/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "andrea@liveraltravel.com",
    "subject": "Test Email from La Cura",
    "html": "<h1>Test Email</h1><p>This is a test email from your La Cura Function App.</p>"
  }'
```

Or use the test script:
```bash
./test-email.sh andrea@liveraltravel.com
```

## Next Steps

1. Verify/link the domain in Azure Portal
2. Once verified, test the email function again
3. The email should be sent successfully

