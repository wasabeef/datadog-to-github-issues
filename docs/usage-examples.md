# Usage Examples

## Quick Start

This repository uses a monorepo structure with multiple GitHub Actions:

```yaml
# For RUM errors
- uses: wasabeef/datadog-to-github-issues/rum@v1

# For Monitor alerts (coming soon)
- uses: wasabeef/datadog-to-github-issues/monitor@v1
```

## Basic RUM Error Monitoring

### Minimal Configuration

```yaml
name: Monitor Frontend Errors

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch: # Allow manual runs

jobs:
  sync-errors:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: wasabeef/datadog-to-github-issues/rum@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Service-Specific Monitoring

```yaml
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    service: 'frontend-app'
    labels: 'rum-error,frontend'
```

## Advanced Configurations

### Critical Error Monitoring with Custom Labels

```yaml
name: Monitor Critical Errors

on:
  schedule:
    - cron: '0 */2 * * *' # Every 2 hours for critical errors

jobs:
  sync-critical-errors:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    
    steps:
      - uses: wasabeef/datadog-to-github-issues/rum@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          service: 'production-app'
          date-from: 'now-2h'
          error-handling: 'unhandled'
          exclude-noise: true
          max-issues-per-run: 5
          labels: 'critical,rum-error'
          title-prefix: '[🚨 CRITICAL]'
          fatal-labels: 'fatal,crash,p0'
          non-fatal-labels: 'non-fatal,p1'
```

### Japanese Language Support

```yaml
name: Monitor Errors (Japanese)

on:
  schedule:
    - cron: '0 0 * * *' # Daily at midnight UTC (9 AM JST)

jobs:
  sync-errors-ja:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    
    steps:
      - uses: wasabeef/datadog-to-github-issues/rum@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          language: 'ja'
          title-prefix: '[エラー]'
          labels: 'rum-error,フロントエンド'
          fatal-labels: '致命的,クラッシュ'
```

### Multi-Service Monitoring

```yaml
name: Monitor All Services

on:
  schedule:
    - cron: '0 */8 * * *' # Every 8 hours

jobs:
  sync-errors:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    
    strategy:
      matrix:
        service:
          - name: 'web-app'
            prefix: '[WEB]'
            labels: 'web'
          - name: 'mobile-app'
            prefix: '[MOBILE]'
            labels: 'mobile'
          - name: 'dashboard'
            prefix: '[DASH]'
            labels: 'dashboard'
    
    steps:
      - uses: wasabeef/datadog-to-github-issues/rum@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          service: ${{ matrix.service.name }}
          title-prefix: ${{ matrix.service.prefix }}
          labels: 'rum-error,${{ matrix.service.labels }}'
```

## Development and Testing

### Testing with Pull Request Branches

When developing features, you can test branches directly:

```yaml
# Test a specific branch
- uses: wasabeef/datadog-to-github-issues/rum@feat/new-feature

# Test a PR
- uses: wasabeef/datadog-to-github-issues/rum@refs/pull/42/head

# Test a specific commit
- uses: wasabeef/datadog-to-github-issues/rum@a1b2c3d
```

### Local Testing

1. **Set up environment**:
   ```bash
   cd packages/rum-action
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Build and test**:
   ```bash
   # Build all packages
   bun run build
   
   # Run local test
   bun run local
   ```

3. **Test with act** (GitHub Actions locally):
   ```bash
   # Install act
   brew install act  # macOS
   
   # Run workflow locally
   act -j sync-errors -s DATADOG_API_KEY=xxx -s DATADOG_APP_KEY=xxx
   ```

## Common Configurations

### Filter by Error Type

```yaml
# Only unhandled errors (default)
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    error-handling: 'unhandled'

# Include all errors
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    error-handling: 'all'

# Only errors from specific source
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    error-source: 'source'  # or 'network', 'console'
```

### Time Range Configuration

```yaml
# Last 24 hours (default)
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    date-from: 'now-24h'
    date-to: 'now'

# Last 2 hours (for more frequent runs)
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    date-from: 'now-2h'

# Specific date range
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    date-from: '2025-01-01T00:00:00Z'
    date-to: '2025-01-02T00:00:00Z'
```

### Noise Filtering

```yaml
# Exclude common noise (default: true)
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    exclude-noise: true

# Include all errors (including noise)
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    exclude-noise: false
```

### Issue Management

```yaml
# Control issue creation/update behavior
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    max-issues-per-run: 10      # Limit issues created per run
    update-existing: true       # Update existing issues (default)
    reopen-closed: true        # Reopen if error recurs (default)
```

## Different Datadog Sites

```yaml
# US1 (default)
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-site: 'datadoghq.com'

# EU
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-site: 'datadoghq.eu'
    datadog-web-url: 'https://app.datadoghq.eu'

# US3
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-site: 'us3.datadoghq.com'
    datadog-web-url: 'https://app.us3.datadoghq.com'

# US5
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-site: 'us5.datadoghq.com'
    datadog-web-url: 'https://app.us5.datadoghq.com'

# AP1
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    datadog-site: 'ap1.datadoghq.com'
    datadog-web-url: 'https://app.ap1.datadoghq.com'
```

## Troubleshooting

### No Errors Found

```yaml
# Expand time range and include all error types
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    date-from: 'now-48h'        # Look back 48 hours
    error-handling: 'all'       # Include handled errors
    exclude-noise: false        # Include all errors
```

### Too Many Issues Created

```yaml
# Limit and filter more aggressively
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    max-issues-per-run: 3       # Create max 3 issues
    exclude-noise: true         # Filter noise
    error-handling: 'unhandled' # Only critical errors
```

### Rate Limiting

```yaml
# Reduce API usage
- uses: wasabeef/datadog-to-github-issues/rum@v1
  with:
    max-issues-per-run: 5       # Fewer issues = fewer API calls
    date-from: 'now-6h'         # Smaller time window
```

## Security Considerations

The action automatically masks sensitive data in issues:

- Email addresses: `john@example.com` → `joh***@example.com`
- Phone numbers: `090-1234-5678` → `0**-****-****`
- API keys and tokens: `[REDACTED]`
- Credit card numbers: `****-****-****-****`

Technical data preserved for debugging:
- IP addresses
- UUIDs (partially masked)
- Error stack traces

## Monitor Action (Coming Soon)

The monitor action will support Datadog Monitor alerts:

```yaml
# Example usage (not yet available)
- uses: wasabeef/datadog-to-github-issues/monitor@v1
  with:
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    monitor-tags: 'env:production,team:frontend'
```

## Best Practices

1. **Use scheduled workflows** for regular monitoring
2. **Set appropriate time ranges** based on your error volume
3. **Use labels** to organize and filter issues
4. **Enable noise filtering** to reduce false positives
5. **Monitor API usage** to avoid rate limits
6. **Test with branches** before deploying to production
7. **Use environment-specific configurations** for staging/production

For more details, see the [code documentation](./code-documentation.md).