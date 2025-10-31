@description('Azure region')
param location string = resourceGroup().location

@description('Static Web App name')
param swaName string = 'swa-${uniqueString(resourceGroup().id)}'

@description('Application Insights name (existing)')
param appInsightsName string = 'func-xob7nugiarm7e202510300620'

@description('Key Vault name (must be globally unique)')
param keyVaultName string = 'kv${uniqueString(resourceGroup().id)}'

@description('Storage account for content and chat history')
param storageAccountName string = 'st${uniqueString(resourceGroup().id)}'

@description('Azure OpenAI service name')
param openAiName string = 'oai-${uniqueString(resourceGroup().id)}'

@description('Azure Communication Services name')
param acsName string = 'acs-${uniqueString(resourceGroup().id)}'

@description('Azure AI Search service name')
param aiSearchName string = 'search-${uniqueString(resourceGroup().id)}'

// Static Web App (Free SKU by default)
resource swa 'Microsoft.Web/staticSites@2022-09-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryToken: '' // Will be configured manually for GitHub deployment
    allowConfigFileUpdates: true
  }
  tags: {
    'azd-service-name': 'web'
  }
}

// Static Web App Auth Configuration
// Note: Azure AD authentication must be configured in Azure Portal after deployment
// Steps:
// 1. Go to Static Web App -> Authentication -> Add identity provider
// 2. Select Microsoft identity provider
// 3. Create or select an App Registration
// 4. Set "Supported account types" to "Accounts in this organizational directory only" (tenant restriction)
// 5. Enable "Require assignment" to restrict access further if needed
// 6. Optionally assign specific users (e.g., andrea@liveraltravel.com) in Enterprise Applications

// Microsoft Graph API Permissions (for Calendar access)
// Note: Must be configured in Azure Portal after deployment
// Steps:
// 1. Go to App Registration (e276d260-a10a-43a4-aefa-dccaaace3d23) -> API permissions
// 2. Add Microsoft Graph API -> Application permissions (not Delegated)
// 3. Search for "Calendar" (singular) and select:
//    - Calendar.ReadWrite (Application permission) - for Function App to access calendar
//    - OR Calendars.ReadWrite if Calendar.ReadWrite is not available
// 4. Grant admin consent for the permissions
// 5. Function App will use Managed Identity to authenticate to Graph API

// Application Insights - reference existing instance
// Note: Application Insights already exists: func-xob7nugiarm7e202510300620
// Using reference to get connection string and instrumentation key
resource appi 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

// Storage Account for content, chat history, and social media assets
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

// Azure OpenAI Service
resource openAi 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: openAiName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'OpenAI'
  properties: {
    customSubDomainName: openAiName
    publicNetworkAccess: 'Enabled'
  }
}

// GPT-4 Deployment
// NOTE: Deploy manually via Azure AI Studio/AI Foundry if Bicep deployment fails due to SKU/region restrictions
// Then this resource will reference the existing deployment or can be commented out
// To deploy manually:
// 1. Go to Azure Portal → Your OpenAI resource → Deployments
// 2. Click "Create" and select a model (e.g., gpt-35-turbo, gpt-4o, etc.)
// 3. Name it 'gpt-4' to match OPENAI_DEPLOYMENT_NAME setting
// 4. Choose appropriate SKU/capacity based on what's available in West Europe
// 
// Uncomment below if you want Bicep to manage the deployment:
// resource gpt4Deployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
//   parent: openAi
//   name: 'gpt-4'
//   properties: {
//     model: {
//       format: 'OpenAI'
//       name: 'gpt-35-turbo'  // Use gpt-35-turbo as fallback - more widely supported
//       version: '1106'
//     }
//     raiPolicyName: 'Microsoft.Default'
//     versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
//   }
// }

// Azure Communication Services
resource acs 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: acsName
  location: 'Global'
  properties: {
    dataLocation: 'United States'
  }
}

// Azure AI Search (Cognitive Search)
resource aiSearch 'Microsoft.Search/searchServices@2020-08-01' = {
  name: aiSearchName
  location: location
  sku: {
    name: 'basic'
  }
  properties: {
    hostingMode: 'default'
    networkRuleSet: {
      ipRules: []
    }
    publicNetworkAccess: 'enabled'
    replicaCount: 1
    partitionCount: 1
  }
}

// Key Vault
resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableSoftDelete: true
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: true
    accessPolicies: [] // Managed Identity binding is added post-provision by azd
    softDeleteRetentionInDays: 30
    publicNetworkAccess: 'Enabled'
  }
}

@description('Function App name')
param functionAppName string = 'func-${uniqueString(resourceGroup().id)}'

@description('Function App hosting plan name')
param hostingPlanName string = 'plan-${uniqueString(resourceGroup().id)}'

// GitHub configuration removed - will be configured manually

// Consumption plan for Functions (Dynamic Y1) - Linux
resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: hostingPlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

// Function App (Node 22, Linux consumption)
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'node|22'
      appSettings: [
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~22'
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: 'func-xob7nugiarm7e'
        }
        {
          name: 'AI_SEARCH_ENDPOINT'
          value: 'https://${aiSearch.name}.search.windows.net'
        }
        {
          name: 'AI_SEARCH_API_KEY'
          value: listAdminKeys(aiSearch.id, '2020-08-01').primaryKey
        }
        {
          name: 'AI_SEARCH_INDEX'
          value: 'content'
        }
        {
          name: 'AI_ASSISTANT_SYSTEM_PROMPT'
          value: 'You are Your Gut Assistant, a helpful assistant for La Cura, a personal chef service focused on healing and wellness through Mediterranean nutrition. You are warm, knowledgeable, and supportive. Help users with questions about services, bookings, nutrition, and wellness. Be concise and friendly.'
        }
        {
          name: 'AI_ASSISTANT_TONE'
          value: 'warm, supportive, knowledgeable'
        }
        {
          name: 'CALENDAR_OWNER_EMAIL'
          value: 'andrea@liveraltravel.com'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appi.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appi.properties.ConnectionString
        }
        {
          name: 'OPENAI_ENDPOINT'
          value: 'https://${openAi.name}.openai.azure.com'
        }
        {
          name: 'OPENAI_API_KEY'
          value: openAi.listKeys().key1
        }
        {
          name: 'OPENAI_DEPLOYMENT_NAME'
          value: 'gpt-4o-mini'
        }
        {
          name: 'ACS_CONNECTION_STRING'
          value: acs.listKeys().primaryConnectionString
        }
        {
          name: 'ACS_SENDER'
          value: 'DoNotReply@${acs.name}.azurecomm.net'
        }
      ]
    }
  }
  tags: {
    'azd-service-name': 'api'
  }
}

// Note: GitHub Actions deployment configured manually via Azure CLI
// This avoids Bicep template issues with GitHub integration

@description('Outputs')
output staticWebAppId string = swa.id
output appInsightsConnectionString string = appi.properties.ConnectionString
output appInsightsInstrumentationKey string = appi.properties.InstrumentationKey
output keyVaultUri string = kv.properties.vaultUri
output storageAccountName string = storageAccount.name
output openAiEndpoint string = openAi.properties.endpoint
output functionAppId string = functionApp.id
output acsName string = acs.name
output aiSearchEndpoint string = 'https://${aiSearch.name}.search.windows.net'


