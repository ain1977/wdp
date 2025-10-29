# Azure Functions Deployment Guide

This guide explains how to deploy the Azure Functions for the Wellness Digital Platform using different deployment methods.

## Prerequisites

- Azure CLI installed and configured
- Node.js 22.x installed
- Azure subscription with appropriate permissions
- Function App already created (func-xob7nugiarm7e)

## Deployment Methods

### 1. Manual Deployment (Recommended for Development)

Use the provided deployment script for quick manual deployments:

```bash
# Make the script executable (if not already done)
chmod +x scripts/deploy-functions.sh

# Run the deployment script
./scripts/deploy-functions.sh
```

The script will:
- Build TypeScript to JavaScript
- Create a deployment package
- Upload to Azure Storage
- Configure Function App to run from package
- Test the deployed functions

### 2. GitHub Actions (Recommended for Production)

The project includes a GitHub Actions workflow (`.github/workflows/deploy-functions.yml`) that automatically deploys when you push to the main or develop branches.

#### Setup GitHub Actions

1. **Create Azure Service Principal:**
   ```bash
   az ad sp create-for-rbac --name "wdp-github-actions" --role contributor --scopes /subscriptions/{subscription-id}/resourceGroups/wdp-rg --sdk-auth
   ```

2. **Add GitHub Secrets:**
   - `AZURE_CREDENTIALS`: The JSON output from the service principal creation
   - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: Download from Function App → Get publish profile

3. **Push to trigger deployment:**
   ```bash
   git add .
   git commit -m "Deploy functions"
   git push origin main
   ```

### 3. Azure DevOps Pipeline

The project includes an Azure DevOps pipeline configuration (`azure-pipelines.yml`).

#### Setup Azure DevOps

1. **Create Service Connection:**
   - Go to Azure DevOps → Project Settings → Service Connections
   - Create new Azure Resource Manager connection
   - Name it `wdp-connection`

2. **Create Pipeline:**
   - Go to Pipelines → New Pipeline
   - Select your repository
   - Choose "Existing Azure Pipelines YAML file"
   - Select `azure-pipelines.yml`

### 4. Azure Developer CLI (azd)

For full infrastructure and application deployment:

```bash
# Deploy everything
azd up

# Deploy only functions
azd deploy --service api
```

## Function Structure

The functions use the Azure Functions v4 programming model with TypeScript:

```
api/functions/
├── ChatAsk/           # AI chat endpoint
├── SendEmail/         # Email sending endpoint  
├── ContentGenerator/  # AI content generation
├── SubstackSync/      # Substack integration
├── dist/             # Compiled JavaScript
├── host.json         # Function App configuration
└── package.json      # Dependencies
```

## Function Endpoints

After deployment, the following endpoints will be available:

- **Chat**: `https://func-xob7nugiarm7e.azurewebsites.net/api/chat/ask`
- **Email**: `https://func-xob7nugiarm7e.azurewebsites.net/api/email/send`
- **Content**: `https://func-xob7nugiarm7e.azurewebsites.net/api/content/generate`
- **Substack**: `https://func-xob7nugiarm7e.azurewebsites.net/api/substack/sync`

## Troubleshooting

### Functions Not Loading

1. **Check Function App logs:**
   ```bash
   az functionapp log tail --name func-xob7nugiarm7e --resource-group wdp-rg
   ```

2. **Verify package deployment:**
   ```bash
   az functionapp config appsettings list --name func-xob7nugiarm7e --resource-group wdp-rg --query "[?name=='WEBSITE_RUN_FROM_PACKAGE'].value"
   ```

3. **Check function list:**
   ```bash
   az functionapp function list --name func-xob7nugiarm7e --resource-group wdp-rg
   ```

### Build Issues

1. **Clear node_modules and reinstall:**
   ```bash
   cd api/functions
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Check TypeScript compilation:**
   ```bash
   cd api/functions
   npx tsc --noEmit
   ```

### Deployment Issues

1. **Check Azure CLI login:**
   ```bash
   az account show
   ```

2. **Verify resource group and function app:**
   ```bash
   az functionapp show --name func-xob7nugiarm7e --resource-group wdp-rg
   ```

## Environment Variables

The following environment variables need to be configured in the Function App:

- `ACS_CONNECTION_STRING`: Azure Communication Services connection string
- `ACS_SENDER`: Default sender email address
- `AzureWebJobsStorage`: Storage account connection string

## Monitoring

- **Application Insights**: Monitor function execution and performance
- **Logs**: View real-time logs in Azure Portal or via CLI
- **Metrics**: Monitor function invocations, errors, and duration

## Security

- Functions use different authentication levels:
  - Chat: Anonymous (public)
  - Email: Function key required
  - Content: Function key required  
  - Substack: Function key required

- Function keys can be retrieved via:
  ```bash
  az functionapp keys list --name func-xob7nugiarm7e --resource-group wdp-rg
  ```
