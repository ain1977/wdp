# Update Email Sender Address

## Current Issue
The ACS_SENDER setting needs to be updated to use the verified domain.

## Manual Update via Azure Portal

1. Go to Azure Portal → Function App (`func-xob7nugiarm7e`)
2. Navigate to **Configuration** → **Application settings**
3. Find `ACS_SENDER` setting
4. Click **Edit** and change value to:
   ```
   donotreply@6609e33d-b3d3-444f-9d8a-9f59c3bb43f4.azurecomm.net
   ```
5. Click **OK** → **Save**
6. Restart the Function App

## Or Update via Azure CLI

```bash
az functionapp config appsettings set \
  --name func-xob7nugiarm7e \
  --resource-group wdp-rg \
  --settings ACS_SENDER="donotreply@6609e33d-b3d3-444f-9d8a-9f59c3bb43f4.azurecomm.net"
```

Then restart:
```bash
az functionapp restart --name func-xob7nugiarm7e --resource-group wdp-rg
```

## Test After Update

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

