@description('Azure region')
param location string = resourceGroup().location

@description('Static Web App name')
param swaName string = 'swa-${uniqueString(resourceGroup().id)}'

@description('Application Insights name')
param appInsightsName string = 'appi-${uniqueString(resourceGroup().id)}'

@description('Key Vault name (must be globally unique)')
param keyVaultName string = 'kv${uniqueString(resourceGroup().id)}'

@description('Storage account for content and chat history')
param storageAccountName string = 'st${uniqueString(resourceGroup().id)}'

@description('Azure OpenAI service name')
param openAiName string = 'oai-${uniqueString(resourceGroup().id)}'

// Static Web App (Free SKU by default)
resource swa 'Microsoft.Web/staticSites@2022-09-01' = {
  name: swaName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryToken: '' // CI will handle; left empty for azd deploy
  }
}

// Application Insights
resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
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

@description('Outputs')
output staticWebAppId string = swa.id
output appInsightsConnectionString string = appi.properties.ConnectionString
output keyVaultUri string = kv.properties.vaultUri
output storageAccountName string = storageAccount.name
output openAiEndpoint string = openAi.properties.endpoint


