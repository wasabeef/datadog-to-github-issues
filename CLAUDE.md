# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Action project that automatically creates GitHub Issues from Datadog RUM (Real User Monitoring) errors. The project is currently in the planning phase with a comprehensive implementation plan documented in `plan.md`.

## Project Structure

```
.github/
├── workflows/
│   └── datadog-to-github-issues.yml    # GitHub Actions workflow definition
├── actions/
│   └── datadog-to-github-issues/
│       ├── action.yml                  # Custom action definition
│       ├── package.json                # Node.js dependencies
│       ├── index.js                    # Main implementation
│       └── lib/
│           ├── datadog-client.js       # Datadog API client
│           ├── github-client.js        # GitHub API client
│           ├── error-processor.js      # Error processing logic
│           └── utils.js                # Utility functions
```

## Commands

### Initial Setup

```bash
# Create directory structure
mkdir -p .github/workflows .github/actions/datadog-to-github-issues/lib

# Initialize package in the action directory
cd .github/actions/datadog-to-github-issues
bun install
```

### Development

```bash
# Run local tests (requires .env file with credentials)
cd .github/actions/datadog-to-github-issues
bun run test

# Build the action
bun run build

# Run linting
bun run lint
```

### Testing

```bash
# Test the action locally
bun run tests/local-runner.js

# Test Datadog API connection
curl -X POST "https://api.datadoghq.com/api/v2/rum/events/search" \
  -H "DD-API-KEY: ${DATADOG_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"from": "now-1h", "to": "now", "query": "@type:error"}, "page": {"limit": 1}}'
```

## Architecture

### Core Components

1. **Datadog RUM Integration**

   - Uses Datadog RUM API v2 to fetch frontend errors
   - Handles pagination for large datasets
   - Supports filtering by service, date range, and custom queries
   - API endpoints vary by Datadog site (US1, EU, US3, US5, AP1, US1-FED)

2. **Error Processing**

   - Groups similar errors using hash generation
   - Normalizes stack traces for consistent grouping
   - Preserves full stack traces for debugging
   - Tracks error occurrences, affected users, and URLs

3. **GitHub Issue Creation**
   - Creates structured issues with comprehensive error details
   - Prevents duplicates using error hash in HTML comments
   - Applies automatic labeling based on error characteristics
   - Includes links to Datadog session replays and error tracking

### Key Technical Details

- **Node.js 20** runtime for GitHub Actions
- **Error Hash Generation**: Uses SHA256 hash of normalized error components (type, message, source, stack trace first 5 lines)
- **Stack Trace Processing**:
  - Full stack traces are preserved for display
  - Normalization removes variable elements (line numbers, IDs, timestamps) for grouping
  - Analysis separates application frames from vendor/library frames
- **API Rate Limits**:
  - Datadog: 300 requests/hour, 1000 requests/minute
  - GitHub: 5000 requests/hour (authenticated)
- **Issue Body Limit**: GitHub issues support up to 65,536 characters

### Data Flow

1. GitHub Action triggers (scheduled or manual)
2. Fetch RUM errors from Datadog API with filters
3. Group errors by normalized hash
4. Check for existing GitHub issues
5. Create new issues for ungrouped errors
6. Apply labels and formatting

## Important Implementation Notes

1. **Security**:

   - Never log API keys or sensitive data
   - Use GitHub Secrets for credentials
   - Sanitize user data in issue content

2. **Error Handling**:

   - Implement retry logic for API rate limits
   - Handle pagination for large result sets
   - Validate all input parameters

3. **Performance**:

   - Process errors in batches to avoid rate limits
   - Cache existing issues to reduce API calls
   - Use parallel processing where appropriate

4. **Stack Trace Handling**:
   - Always preserve complete stack traces
   - Separate normalization logic (for hashing) from display logic
   - Detect minified code and suggest source map uploads

## Environment Configuration

Required GitHub Secrets:

- `DATADOG_API_KEY`: Datadog API Key
- `DATADOG_APP_KEY`: Datadog Application Key

Optional GitHub Variables:

- `DATADOG_SITE`: Datadog site (default: `datadoghq.com`)

## Testing Strategy

1. **Unit Tests**: Test hash generation, stack trace normalization, query building
2. **Integration Tests**: Test API connections, end-to-end workflow
3. **Local Development**: Use environment variables and mock data for testing

## Common Tasks

### Adding a New Filter Parameter

1. Update `action.yml` to add the new input
2. Modify query builder in `datadog-client.js`
3. Update workflow file to expose the parameter

### Debugging API Issues

1. Check API credentials and permissions
2. Verify Datadog site configuration matches your region
3. Use curl commands to test API endpoints directly
4. Check rate limit headers in responses

### Modifying Issue Format

1. Edit `generateIssueBody()` in `error-processor.js`
2. Update label generation logic if needed
3. Test with mock data to verify formatting
