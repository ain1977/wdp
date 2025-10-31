# Application Insights Diagnostic Queries

Use these queries in Azure Portal → Application Insights → Logs to troubleshoot issues.

## Recent Errors (Last 30 minutes)

```kql
traces
| where timestamp > ago(30m)
| where severityLevel >= 3  // Warning or Error
| where message contains "chatAsk" or message contains "error"
| project timestamp, message, severityLevel, customDimensions
| order by timestamp desc
```

## Chat Function Errors

```kql
traces
| where timestamp > ago(1h)
| where message contains "chatAsk" and (message contains "error" or message contains "Error")
| project timestamp, message, customDimensions
| order by timestamp desc
| take 50
```

## OpenAI Configuration Status

```kql
traces
| where timestamp > ago(1h)
| where message contains "OpenAI configuration check"
| project timestamp, message, customDimensions
| order by timestamp desc
```

## All Chat Function Logs (with Request IDs)

```kql
traces
| where timestamp > ago(1h)
| where message contains "chatAsk"
| project timestamp, message, severityLevel, customDimensions
| order by timestamp desc
| take 100
```

## Exceptions

```kql
exceptions
| where timestamp > ago(1h)
| where outerMessage contains "chatAsk" or type contains "chatAsk"
| project timestamp, type, outerMessage, outerMethod, details
| order by timestamp desc
| take 50
```

## Request Failures

```kql
requests
| where timestamp > ago(1h)
| where success == false
| where url contains "chat"
| project timestamp, url, resultCode, duration, operation_Name
| order by timestamp desc
```

## Function Execution Summary

```kql
traces
| where timestamp > ago(1h)
| where message startswith "["
| summarize 
    count() by bin(timestamp, 5m), message
| order by timestamp desc
```

## Check for Missing Environment Variables

```kql
traces
| where timestamp > ago(1h)
| where message contains "Azure OpenAI not configured"
| project timestamp, message, customDimensions
| order by timestamp desc
```

## Complete Request Flow (by Request ID)

Replace `YOUR_REQUEST_ID` with an actual request ID from the logs:

```kql
traces
| where timestamp > ago(1h)
| where message contains "YOUR_REQUEST_ID"
| project timestamp, message, severityLevel
| order by timestamp asc
```

## OpenAI API Call Failures

```kql
traces
| where timestamp > ago(1h)
| where message contains "Azure OpenAI error"
| project timestamp, message, customDimensions
| order by timestamp desc
```

