# GitHub Deployment Setup Guide

This guide will help you set up automated deployment from GitHub to both your Azure Function App and Static Web App.

## Prerequisites

1. **GitHub Repository**: You need a GitHub repository with your code
2. **Azure Resources**: Function App (`func-xob7nugiarm7e`) and Static Web App (`swa-xob7nugiarm7e`) already exist
3. **GitHub Access**: You need admin access to the repository

## Step 1: Create GitHub Repository (if not exists)

If you don't have a GitHub repository yet:

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository (replace YOUR_USERNAME with your GitHub username)
gh repo create wdp --public --source=. --remote=origin --push
```

## Step 2: Configure Function App for GitHub Deployment

### Option A: Using Azure Portal (Recommended)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Function App: `func-xob7nugiarm7e`
3. Go to **Deployment Center** in the left menu
4. Select **GitHub** as source
5. Authorize Azure to access your GitHub account
6. Select your repository: `YOUR_USERNAME/wdp`
7. Select branch: `main`
8. Set build path: `api/functions`
9. Click **Save**

### Option B: Using Azure CLI

```bash
# First, get the deployment token
az functionapp deployment source config --name func-xob7nugiarm7e --resource-group wdp-rg --repo-url https://github.com/YOUR_USERNAME/wdp --branch main --manual-integration

# Or use GitHub Actions (recommended)
az functionapp deployment github-actions add --name func-xob7nugiarm7e --resource-group wdp-rg --repo https://github.com/YOUR_USERNAME/wdp --branch main --build-path api/functions
```

## Step 3: Configure Static Web App for GitHub Deployment

### Option A: Using Azure Portal (Recommended)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Static Web App: `swa-xob7nugiarm7e`
3. Go to **Deployment** in the left menu
4. Click **Manage deployment token**
5. Copy the deployment token
6. Go to your GitHub repository
7. Go to **Settings** > **Secrets and variables** > **Actions**
8. Add a new secret: `AZURE_STATIC_WEB_APPS_API_TOKEN` with the deployment token value

### Option B: Using Azure CLI

```bash
# Get the deployment token
az staticwebapp secrets list --name swa-xob7nugiarm7e --resource-group wdp-rg

# The token will be displayed - copy it to GitHub Secrets
```

## Step 4: Create GitHub Actions Workflows

### Function App Workflow

Create `.github/workflows/azure-functions-deploy.yml`:

```yaml
name: Deploy Azure Functions

on:
  push:
    branches: [ main ]
    paths: [ 'api/functions/**' ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - name: 'Checkout GitHub Action'
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
        cache: 'npm'
        cache-dependency-path: api/functions/package-lock.json

    - name: Install dependencies
      run: |
        cd api/functions
        npm ci

    - name: Build
      run: |
        cd api/functions
        npm run build

    - name: Deploy to Azure Functions
      uses: Azure/functions-action@v1
      with:
        app-name: 'func-xob7nugiarm7e'
        package: 'api/functions'
        publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
```

### Static Web App Workflow

Create `.github/workflows/azure-static-web-apps-deploy.yml`:

```yaml
name: Deploy Static Web App

on:
  push:
    branches: [ main ]
    paths: [ 'web/**', '!api/**' ]
  workflow_dispatch:

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    name: Build and Deploy Job
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          lfs: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: |
          cd web
          npm ci

      - name: Build
        run: |
          cd web
          npm run build

      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "web"
          output_location: "out"
```

## Step 5: Set Required Secrets

In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions** and add:

1. `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` - Get this from Function App > Get publish profile
2. `AZURE_STATIC_WEB_APPS_API_TOKEN` - Get this from Static Web App > Manage deployment token

## Step 6: Test Deployment

1. Make a small change to your code
2. Commit and push to the main branch
3. Check the Actions tab in GitHub to see the deployment progress
4. Verify your apps are updated

## Directory Structure

Your repository should have this structure:

```
wdp/
├── .github/
│   └── workflows/
│       ├── azure-functions-deploy.yml
│       └── azure-static-web-apps-deploy.yml
├── api/
│   └── functions/
│       ├── src/
│       │   └── functions.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── host.json
├── web/
│   ├── src/
│   ├── package.json
│   └── next.config.js
└── infra/
    └── main.bicep
```

## Troubleshooting

### Function App Issues
- Check that the build path is correct (`api/functions`)
- Verify Node.js version matches (22)
- Check Function App logs in Azure Portal

### Static Web App Issues
- Verify the deployment token is correct
- Check that the app_location and output_location paths are correct
- Ensure the build command produces files in the output directory

### GitHub Actions Issues
- Check the Actions tab for detailed error logs
- Verify all secrets are set correctly
- Ensure the repository has the correct permissions

## Benefits of GitHub Deployment

1. **Automated Deployments**: Code changes automatically trigger deployments
2. **Version Control**: Full history of deployments
3. **Rollback Capability**: Easy to revert to previous versions
4. **Environment Consistency**: Same deployment process for all environments
5. **Team Collaboration**: Multiple developers can deploy safely
