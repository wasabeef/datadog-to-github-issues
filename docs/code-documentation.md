# Code Documentation

## Overview

This document provides comprehensive documentation for the datadog-to-github-issues monorepo codebase. The project consists of GitHub Actions that integrate Datadog with GitHub Issues:

- **RUM Action**: Fetches errors from Datadog RUM (Real User Monitoring) and creates GitHub Issues
- **Monitor Action**: Creates issues from Datadog Monitor alerts (coming soon)

## Monorepo Architecture

### Project Structure

```
datadog-to-github-issues/
├── packages/
│   ├── core/               # Shared utilities and types
│   │   ├── src/
│   │   │   ├── utils/
│   │   │   │   └── security.ts
│   │   │   ├── types.ts
│   │   │   ├── constants.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── rum-action/         # RUM error monitoring action
│   │   ├── src/
│   │   │   ├── datadog-client.ts
│   │   │   ├── error-processor.ts
│   │   │   ├── github-client.ts
│   │   │   ├── issue-formatter.ts
│   │   │   ├── translations.ts
│   │   │   ├── error-status-analyzer.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   └── monitor-action/     # Monitor alert action (placeholder)
│       ├── src/
│       └── package.json
├── rum/                    # Stub for rum action usage
│   └── action.yml
├── monitor/                # Stub for monitor action usage
│   └── action.yml
├── turbo.json             # Turborepo configuration
└── package.json           # Root package.json
```

### Build System

The project uses:
- **Turborepo** for monorepo management and task orchestration
- **Bun** as the package manager
- **@vercel/ncc** for bundling actions into single files
- **TypeScript** for type safety

## Core Components

### 1. Core Package (`packages/core`)

Shared utilities and types used across all actions.

#### Security Utilities (`src/utils/security.ts`)

Comprehensive data masking and security functions:

- **Email Masking**: `john.doe@example.com` → `joh***@example.com`
- **Phone Number Masking**: Various formats including Japanese numbers
- **JWT Token Redaction**: `eyJ...` → `eyJ***.[REDACTED].***`
- **API Key Masking**: Detects and masks various API key patterns
- **Financial Data**: Credit cards, SSNs
- **Preserves Technical Data**: IPs, UUIDs (for debugging)

#### Types (`src/types.ts`)

Common TypeScript interfaces and types shared across actions.

### 2. RUM Action (`packages/rum-action`)

#### Entry Point (`src/index.ts`)

The main GitHub Action entry point that orchestrates the workflow:

1. Parse GitHub Action inputs (API keys, configuration)
2. Fetch RUM error events from Datadog
3. Process errors (grouping, filtering, masking)
4. Format error data for GitHub Issues
5. Create or update GitHub Issues

#### Datadog Client (`src/datadog-client.ts`)

Handles all Datadog RUM API interactions:

**Key Features:**
- Uses `@datadog/datadog-api-client` v2 API
- Supports multiple Datadog sites (US1, EU, etc.)
- Pagination handling (up to 1000 events per page)
- Rate limiting awareness
- Comprehensive error filtering

**Main Methods:**
```typescript
fetchRUMErrors(query: string, dateFrom: string, dateTo: string): Promise<RUMError[]>
```

#### Error Processor (`src/error-processor.ts`)

Core processing engine for error grouping and analysis:

**Key Features:**
- **Fingerprinting**: SHA256 hash of normalized error characteristics
- **Stack Normalization**: Removes line numbers, IDs for consistent grouping
- **Noise Filtering**: Excludes common non-actionable errors
- **Statistics Tracking**: Occurrences, affected users, browsers

**Error Grouping:**
```typescript
interface ErrorGroup {
  hash: string;                    // SHA256 fingerprint
  count: number;                   // Total occurrences
  representative: RUMError;        // First error instance
  occurrences: RUMError[];         // All error instances
  affectedUsers: Set<string>;      // Unique user IDs
  affectedUrls: Set<string>;       // URLs where error occurred
  browsers: Map<string, number>;   // Browser distribution
  // ... more statistics
}
```

#### Issue Formatter (`src/issue-formatter.ts`)

Transforms error data into rich GitHub Issues:

**Features:**
- **Internationalization**: English and Japanese support
- **Timezone Handling**: JST conversion for Japanese locale
- **Rich Markdown**: Comprehensive error details, statistics
- **Timeline Generation**: Hourly error distribution
- **Session Replay Links**: Direct links to Datadog RUM
- **Smart Truncation**: Ensures titles fit GitHub limits

**Issue Structure:**
1. Error summary with key metrics
2. Detailed stack trace and analysis
3. Environment information
4. User impact statistics
5. Browser/OS distribution
6. Error timeline
7. Direct Datadog links

#### GitHub Client (`src/github-client.ts`)

Manages GitHub Issues API operations:

**Key Features:**
- **Issue Identification**: Uses error hash in HTML comments
- **Smart Updates**: Single pinned status comment
- **Reopen Logic**: Based on days closed and severity
- **Label Management**: Conditional labeling for fatal/non-fatal
- **Update History**: Tracks occurrences over time

#### Translations (`src/translations.ts`)

Centralized translation system:

```typescript
translations = {
  en: { /* English translations */ },
  ja: { /* Japanese translations */ }
}
```

### 3. Monitor Action (`packages/monitor-action`)

Placeholder for future Datadog Monitor alert integration.

## Configuration

### Required Inputs

| Input | Description | Required |
|-------|-------------|----------|
| `datadog-api-key` | Datadog API Key | Yes |
| `datadog-app-key` | Datadog Application Key | Yes |
| `github-token` | GitHub Token | Yes |

### RUM Action Specific Options

| Input | Description | Default |
|-------|-------------|---------|
| `service` | RUM Service name filter | (all) |
| `date-from` | Start date (e.g., `now-24h`) | `now-24h` |
| `date-to` | End date | `now` |
| `error-handling` | Filter: `all`, `handled`, `unhandled` | `unhandled` |
| `error-source` | Filter: `source`, `network`, `console` | (all) |
| `exclude-noise` | Exclude common noise errors | `true` |
| `max-issues-per-run` | Maximum issues to create | `10` |
| `update-existing` | Update existing issues | `true` |
| `reopen-closed` | Reopen if error recurs | `true` |
| `language` | Issue language (`en`, `ja`) | `en` |
| `labels` | Base labels (comma-separated) | (none) |
| `fatal-labels` | Labels for crash errors | (none) |
| `non-fatal-labels` | Labels for non-fatal errors | (none) |
| `title-prefix` | Custom issue title prefix | (none) |

## Security Considerations

### Data Protection Pipeline

1. **Raw Data Fetching**: Datadog API returns raw error data
2. **Initial Filtering**: Noise patterns removed
3. **Security Masking**: Multiple passes to mask sensitive data
4. **Context Filtering**: Recursive filtering of nested objects
5. **Final Validation**: Ensure no sensitive data remains

### Masked Patterns

- Email addresses (partial masking)
- Phone numbers (various formats)
- JWT tokens and API keys
- Credit card numbers
- Social Security Numbers
- Names in JSON contexts
- Addresses and postal codes

### Preserved Data

For debugging purposes, these are NOT masked:
- IP addresses
- UUIDs (partial masking only)
- Technical error details
- Stack traces (with sensitive values within masked)

## Testing Strategy

### Test Structure

```
packages/rum-action/tests/
├── error-processor.test.ts    # Error grouping and processing
├── issue-formatter.test.ts    # Issue formatting and i18n
├── security.test.ts          # Security masking validation
└── local-runner.js           # Local development testing
```

### Local Testing

```bash
cd packages/rum-action
cp .env.example .env
# Edit .env with your credentials
bun run build
bun run local
```

## Performance Considerations

### API Efficiency

- **Batch Processing**: Handles up to 1000 errors per API call
- **Smart Querying**: Optimized Datadog query construction
- **Parallel Operations**: GitHub API calls when possible
- **Memory Efficient**: Streaming processing for large datasets

### Rate Limiting

- Datadog: 300 requests/hour, 1000/minute
- GitHub: Standard API limits apply
- Built-in retry logic and error handling

## CI/CD Pipeline

### GitHub Workflows

1. **CI** (`ci.yml`): Runs on all pushes and PRs
   - Tests, linting, building
   - Uploads artifacts

2. **Build Preview** (`build-preview.yml`): PR-specific
   - Builds and prepares dist files
   - Comments on PR with usage instructions
   - Enables branch testing

3. **Release** (`release.yml`): Tag-triggered
   - Builds all packages
   - Copies dist files to action directories
   - Creates GitHub release with git-cliff notes
   - Publishes ready-to-use actions

## Future Enhancements

### Planned Features

1. **Monitor Action Implementation**
   - Datadog Monitor alert integration
   - Alert grouping and deduplication
   - Rich context from monitor metadata

2. **Enhanced Error Analysis**
   - ML-based error similarity detection
   - Trend analysis and predictions
   - Root cause suggestions

3. **Additional Integrations**
   - Slack notifications
   - Custom webhooks
   - JIRA integration option

### Extension Points

- Additional data sources beyond RUM
- Custom error processors
- Pluggable formatters
- Additional language support

## Maintenance Guidelines

### Code Quality

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting
- Comprehensive test coverage

### Security Updates

- Regular dependency updates
- Security audit of masking patterns
- Vulnerability scanning in CI

### Documentation

- Keep code documentation in sync
- Update examples with new features
- Maintain comprehensive test cases

This documentation provides a complete overview of the monorepo architecture and implementation details. For specific usage examples, see [usage-examples.md](./usage-examples.md).