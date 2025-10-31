# Azure Static Web App Authentication Setup (Simplified)

This guide explains the simplest way to configure Azure AD authentication for the Static Web App.

## Quick Setup (3 Steps)

### 1. Enable Authentication in Azure Portal

1. Go to your **Static Web App** in [Azure Portal](https://portal.azure.com)
2. Navigate to **Authentication** → **Add identity provider**
3. Select **Microsoft**
4. Choose **Create new app registration** (simplest option)
5. Name it (e.g., "La Cura Web App")
6. Click **Add**

Azure will automatically create the App Registration for you.

### 2. Restrict Access to Specific Email

1. In your Static Web App → **Authentication**
2. Click on the **Microsoft** provider you just added
3. Go to **Restrict access** → **Require assignment**
4. Click **Save**

Then:
1. Go to **Azure Active Directory** → **Enterprise applications**
2. Find your app (filter by name)
3. Go to **Users and groups**
4. Click **Add user/group**
5. Add only `andrea@liveraltravel.com`
6. Click **Assign**

### 3. Deploy

The `staticwebapp.config.json` is already configured in the repo. It will:
- Require authentication for all routes
- Redirect unauthenticated users to Microsoft login
- Work automatically once authentication is enabled in Azure Portal

## That's It!

After completing steps 1-2:
- Deploy your app
- Visit your Static Web App URL
- You'll be redirected to Microsoft login
- Only `andrea@liveraltravel.com` will be able to access the site

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

