# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing GitHub Actions that integrate Datadog with GitHub Issues:

- **rum-action**: Creates issues from Datadog RUM (Real User Monitoring) errors
- **monitor-action**: Creates issues from Datadog Monitor alerts (placeholder, not yet implemented)

The project uses Turborepo for managing the monorepo structure and Bun as the package manager.

## Commands

### Development

```bash
# Install dependencies
bun install

# Run all tests
bun test

# Run tests for a specific package
cd packages/rum-action && bun test

# Run a single test file
bun test tests/error-processor.test.ts

# Build all packages (required before committing)
bun run build

# Build and check output
bun run build:check

# Lint all packages
bun lint

# Format all packages
bun format

# Generate release notes (uses git-cliff)
bun run release-notes
```

### Testing Locally

```bash
# Test RUM action with local runner (requires .env file in project root)
bun local:rum

# Test Monitor action (coming soon)
bun local:monitor

# Alternative: run from package directory
cd packages/rum-action && bun run local

# Test Datadog API connection
curl -X POST "https://api.datadoghq.com/api/v2/rum/events/search" \
  -H "DD-API-KEY: ${DATADOG_API_KEY}" \
  -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"filter": {"from": "now-1h", "to": "now", "query": "@type:error"}, "page": {"limit": 1}}'
```

### Release Process

```bash
# Create a release by pushing a tag
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions will automatically:
# 1. Run CI tests
# 2. Build packages with ncc
# 3. Copy dist files to rum/dist and monitor/dist
# 4. Generate release notes with git-cliff
# 5. Create GitHub release with built artifacts
```

## Architecture

### Monorepo Structure

```
datadog-to-github-issues/
├── packages/
│   ├── core/          # Shared utilities and types
│   ├── rum-action/    # RUM error monitoring action
│   └── monitor-action/# Monitor alert action (not implemented)
├── rum/               # Action entry point for wasabeef/datadog-to-github-issues/rum@v1
├── monitor/           # Action entry point for wasabeef/datadog-to-github-issues/monitor@v1
├── turbo.json         # Turborepo configuration
└── .github/
    ├── cliff.toml     # git-cliff configuration for release notes
    └── workflows/
        ├── ci.yml     # Continuous integration
        ├── release.yml # Tag-based automatic release
        └── build-preview.yml # PR preview builds
```

### Core Components

1. **`packages/rum-action/src/index.ts`** - Entry point that orchestrates the workflow:
   - Validates inputs and environment
   - Fetches errors from Datadog
   - Groups similar errors
   - Creates/updates GitHub Issues

2. **`packages/rum-action/src/datadog-client.ts`** - Datadog API integration:
   - Uses `@datadog/datadog-api-client` v2 API
   - Handles pagination and rate limiting
   - Supports multiple Datadog sites (US1, EU, etc.)
   - Builds complex RUM queries with filters

3. **`packages/rum-action/src/error-processor.ts`** - Error grouping and fingerprinting:
   - Groups errors by normalized hash (SHA256)
   - Normalizes stack traces for consistent grouping
   - Tracks error statistics (occurrences, users, URLs)
   - Filters noise errors (ChunkLoadError, ResizeObserver, etc.)

4. **`packages/core/src/github-client.ts`** - GitHub Issues management:
   - Creates issues with error hash in HTML comments
   - Updates existing issues with status comments
   - Handles issue reopening logic
   - Manages label assignment

5. **`packages/rum-action/src/issue-formatter.ts`** - Issue content generation:
   - Supports English and Japanese (with JST timestamps)
   - Generates rich markdown with error analysis
   - Creates timeline visualizations
   - Masks sensitive data in output

6. **`packages/core/src/utils/security.ts`** - Data protection:
   - Masks emails, phone numbers, names, addresses
   - Redacts API keys, tokens, passwords
   - Preserves technical data (IPs, UUIDs) for debugging

### Key Technical Details

- **TypeScript** with strict type checking
- **Bun** as package manager and test runner
- **Turborepo** for monorepo task orchestration with caching
- **@vercel/ncc** for bundling into single `dist/index.js`
- **Error Hash**: SHA256 of normalized (type + message + source + stack first 5 lines)
- **Stack Normalization**: Removes line numbers, IDs, timestamps for grouping
- **Issue Identification**: Uses `<!-- error-hash: {hash} -->` in issue body
- **Status Updates**: Single pinned comment with `<!-- status-update-comment -->`
- **Browser Distribution**: Conditionally rendered (hidden for mobile apps without browser data)

### Configuration Flow

1. Action inputs → Environment variables (`INPUT_*`)
2. `DatadogClient` reads site-specific configuration
3. `IssueFormatter` uses language settings for localization
4. `GitHubClient` applies label configuration

## Important Implementation Notes

### Datadog API Specifics

- Site configuration affects both API endpoint and web URLs
- RUM API requires both API Key and Application Key
- Query syntax: `@type:error AND service:myapp`
- Pagination: 1000 events per page maximum
- Rate limits: 300/hour, 1000/minute

### GitHub Issue Management

- Issues are never deleted, only closed/reopened
- Duplicate prevention via error hash lookup
- Status comment is updated (not appended) to avoid clutter
- Reopening logic based on days closed and error severity

### Security Patterns

```typescript
// Sensitive data is masked before display
const maskedData = maskSensitiveData(rawData);

// Context objects are filtered recursively
const filteredContext = filterSensitiveContext(errorContext);
```

### Testing Approach

- Unit tests mock external APIs
- Integration tests use real API calls (requires credentials)
- Local runner simulates GitHub Actions environment
- Test data includes various error types and edge cases
- Monitor action tests use `--passWithNoTests` flag (not yet implemented)

## Environment Configuration

For local testing, copy the appropriate example file to `.env` in the project root:

```bash
# For RUM testing
cp .env.rum.example .env

# For Monitor testing (coming soon)
cp .env.monitor.example .env
```

Required for production:
- `DATADOG_API_KEY`
- `DATADOG_APP_KEY`
- `GITHUB_TOKEN` (provided by Actions)

Optional configuration:
- `DATADOG_SITE` (default: datadoghq.com)
- `DATADOG_WEB_URL` (default: https://app.datadoghq.com)
- See `.env.rum.example` or `.env.monitor.example` for all available options

## Recent Changes

- **Browser Distribution Hiding**: Browser distribution section is now hidden for mobile app errors (Swift, Kotlin, Flutter) when no browser data is available
- **Monorepo Migration**: Restructured from single action to monorepo supporting multiple action types
- **git-cliff Integration**: Release notes are now automatically generated from conventional commits