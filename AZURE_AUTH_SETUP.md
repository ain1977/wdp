# Azure Static Web App Authentication Setup (Simplified)

This guide explains the simplest way to configure Azure AD authentication for the Static Web App.

## Quick Setup (3 Steps)

### 1. Configure App Registration Settings

Since you've already created an App Registration, configure it in your Static Web App:

1. Go to your **Static Web App** in [Azure Portal](https://portal.azure.com)
2. Navigate to **Configuration** → **Application settings**
3. Add the following settings:
   - `AZURE_CLIENT_ID`: `e276d260-a10a-43a4-aefa-dccaaace3d23`
   - `AZURE_CLIENT_SECRET`: [Create a client secret in App Registration → Certificates & secrets, then add it here]
   - `AZURE_TENANT_ID`: `a14e016d-a648-4e3a-a17b-821109ccfd0a` (optional, already in config)
4. Click **Save**

**To create the client secret:**
1. Go to **Azure Active Directory** → **App registrations** → Find your app
2. Go to **Certificates & secrets**
3. Click **New client secret**
4. Add description and expiration
5. Copy the secret value (you'll only see it once)
6. Add it to `AZURE_CLIENT_SECRET` in Static Web App Configuration

### 2. Enable Authentication in Azure Portal

1. In your **Static Web App** → **Authentication** → **Add identity provider**
2. Select **Microsoft**
3. Choose **Use an existing app registration**
4. Select your app registration (Client ID: `e276d260-a10a-43a4-aefa-dccaaace3d23`)
5. Click **Add**

### 3. Restrict Access to Your Entra ID Tenant Only

**Important:** This restricts access to ONLY users from your Entra ID tenant.

1. In your Static Web App → **Authentication**
2. Click on the **Microsoft** provider you just added
3. Under **Supported account types**, ensure **Accounts in this organizational directory only** is selected
   - This restricts access to only users in your tenant
4. Go to **Restrict access** → **Require assignment**
5. Click **Save**

### 4. Restrict Access to Specific Email (Optional)

If you want to restrict to only `andrea@liveraltravel.com`:

1. Go to **Azure Active Directory** → **Enterprise applications**
2. Find your app (filter by name)
3. Go to **Users and groups**
4. Click **Add user/group**
5. Add only `andrea@liveraltravel.com`
6. Click **Assign**

**Note:** Step 3 (tenant restriction) is required. Step 4 (specific email) is optional if you want to restrict further.

### 5. Deploy

The `staticwebapp.config.json` is already configured in the repo. It will:
- Require authentication for all routes
- Redirect unauthenticated users to Microsoft login
- Work automatically once authentication is enabled in Azure Portal
- Only allow users from your Entra ID tenant (configured in step 2)

## That's It!

After completing steps 1-4:
- Deploy your app
- Visit your Static Web App URL
- You'll be redirected to Microsoft login
- Only users from your Entra ID tenant can access (if step 3 is done, only `andrea@liveraltravel.com`)

## Configuration File

The `staticwebapp.config.json` file is minimal and requires no manual editing:

```json
{
  "routes": [
    { "route": "/*", "allowedRoles": ["authenticated"] }
  ],
  "responseOverrides": {
    "401": { "redirect": "/.auth/login/aad", "statusCode": 302 }
  },
  "navigationFallback": { "rewrite": "index.html" }
}
```

## Notes

- No App Registration setup needed - Azure creates it automatically
- No application settings needed - Azure manages them
- User restriction is done via Azure AD user assignment
- The config file is already in the repo and ready to use

