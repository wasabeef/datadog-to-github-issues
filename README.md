# Datadog to GitHub Issues

[![GitHub release](https://img.shields.io/github/release/wasabeef/datadog-to-github-issues.svg)](https://github.com/wasabeef/datadog-to-github-issues/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="README.ja.md">日本語版</a>
</p>

A GitHub Action that automatically creates GitHub Issues from Datadog RUM (Real User Monitoring) errors. This helps teams track and manage frontend errors detected by Datadog directly within their GitHub workflow.

## 🚀 Features

- **Automatic Error Detection**: Fetches errors from Datadog RUM API
- **Smart Grouping**: Groups similar errors using fingerprinting
- **Rich Error Context**: Includes stack traces, user impact, browser info, and more
- **Issue Updates**: Updates existing issues when errors recur
- **Auto-Reopen**: Reopens closed issues if errors resurface
- **Security**: Masks sensitive data (emails, IPs, tokens)
- **Session Replay Links**: Direct links to Datadog session replays
- **Flexible Labeling**: Customizable labels for organization

## 💡 Motivation

Frontend errors can happen at any time and often go unnoticed until users complain. This GitHub Action bridges the gap between error monitoring and issue tracking by automatically creating GitHub Issues from Datadog RUM errors.

**Key benefits:**

- **Proactive Error Management**: Catch errors before users report them
- **Centralized Workflow**: Keep error tracking within GitHub
- **Rich Context**: All error details in one place
- **Team Collaboration**: Discuss and assign errors like any other issue

## 📋 Prerequisites

- A Datadog account with RUM enabled
- API and Application keys with RUM read permissions
- GitHub repository with Actions enabled

## 🛠️ Setup

### Step 1: Create Datadog API Keys

1. Go to [Datadog Organization Settings](https://app.datadoghq.com/organization-settings/api-keys)
2. Create a new **API Key**
3. Create a new **Application Key**
4. Ensure the Application Key has `rum_read` permission
5. **Important**: Keep these keys secure - they will be used in GitHub Secrets

### Step 2: Configure GitHub Repository

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:
   - **Name**: `DATADOG_API_KEY`
   - **Value**: Your Datadog API key from Step 1
   - **Name**: `DATADOG_APP_KEY`
   - **Value**: Your Datadog Application key from Step 1

**🔒 Security**: Never commit these keys directly to your repository. Always use GitHub Secrets.

### Step 3: Create Workflow File

Create `.github/workflows/datadog-to-github-issues.yml` in your repository:

```yaml
name: Sync Datadog Errors

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch: # Allow manual runs

jobs:
  sync-errors:
    runs-on: ubuntu-latest
    permissions:
      issues: write # Required to create/update issues
      contents: read # Required to read workflow

    steps:
      - uses: actions/checkout@v4

      - uses: wasabeef/datadog-to-github-issues@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 📖 Usage

Once set up, the action will automatically:

1. **Query Datadog RUM** for errors based on your configuration
2. **Group similar errors** using fingerprinting
3. **Create GitHub Issues** for new errors
4. **Update existing issues** with new occurrences
5. **Reopen closed issues** if errors resurface

### Example Configuration

```yaml
- uses: wasabeef/datadog-to-github-issues@v1
  with:
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    datadog-site: 'datadoghq.eu' # For EU datacenter
    github-token: ${{ secrets.GITHUB_TOKEN }}
    service: 'frontend-app' # Filter by service
    date-from: 'now-24h' # Time range
    date-to: 'now'
    error-handling: 'unhandled' # Only unhandled errors
    error-source: 'source' # Filter by error source
    exclude-noise: true # Exclude common noise
    max-issues-per-run: 10 # Limit issues created
    update-existing: true # Update existing issues
    reopen-closed: true # Reopen if error recurs
    labels: 'rum-error,frontend,production'
```

### Generated Issue

The action creates detailed GitHub Issues like:

```markdown
[frontend-app] TypeError: Cannot read property 'user' of undefined

## 🚨 Error Summary

**Error Type:** TypeError
**Total Occurrences:** 45
**Affected Users:** 12
**First Seen:** 2025-01-15 14:23:45 UTC
**Last Seen:** 2025-01-15 18:45:12 UTC

## 📊 Error Details

### Stack Trace

TypeError: Cannot read property 'user' of undefined
at UserProfile (app.bundle.js:4567:23)
at renderWithHooks (vendor.bundle.js:12345:18)
at mountIndeterminateComponent (vendor.bundle.js:12890:13)

### Error Analysis

This error occurs when attempting to access a 'user' property on an undefined object.
Common causes include:

- Missing null checks before property access
- Asynchronous data not yet loaded
- Component rendering before data is available

## 🌍 Environment Information

### Browsers

- Chrome 120: 35 occurrences (77.8%)
- Safari 17: 8 occurrences (17.8%)
- Firefox 121: 2 occurrences (4.4%)

### Operating Systems

- Windows: 25 (55.6%)
- macOS: 15 (33.3%)
- iOS: 5 (11.1%)

## 🔗 Datadog Links

- [View in RUM Explorer](https://app.datadoghq.com/rum/explorer?...)
- [Session Replay](https://app.datadoghq.com/rum/replay/sessions/...)
```

## 🔧 Configuration

### Inputs

| Input                | Description                                      | Required | Default                  |
| -------------------- | ------------------------------------------------ | -------- | ------------------------ |
| `datadog-api-key`    | Datadog API Key                                  | ✅       | -                        |
| `datadog-app-key`    | Datadog Application Key                          | ✅       | -                        |
| `datadog-site`       | Datadog site (datadoghq.com, datadoghq.eu, etc.) | ❌       | `datadoghq.com`          |
| `github-token`       | GitHub Token                                     | ✅       | `${{ github.token }}`    |
| `service`            | RUM Service name to filter                       | ❌       | -                        |
| `date-from`          | Start date (e.g., `2025-01-01` or `now-24h`)     | ❌       | `now-24h`                |
| `date-to`            | End date                                         | ❌       | `now`                    |
| `error-handling`     | Filter: `all`, `handled`, `unhandled`            | ❌       | `unhandled`              |
| `error-source`       | Filter: `source`, `network`, `console`           | ❌       | -                        |
| `exclude-noise`      | Exclude common noise errors                      | ❌       | `true`                   |
| `max-issues-per-run` | Maximum issues to create per run                 | ❌       | `10`                     |
| `update-existing`    | Update existing issues                           | ❌       | `true`                   |
| `reopen-closed`      | Reopen closed issues if error recurs             | ❌       | `true`                   |
| `labels`             | Comma-separated labels                           | ❌       | `datadog-error,frontend` |

### Noise Filtering

By default, the action filters out common noise errors:

- ChunkLoadError
- ResizeObserver loop limit exceeded
- Non-Error promise rejection
- Network request failed
- Script error
- undefined is not an object

## 🔍 Troubleshooting

### Common Issues

1. **"Failed to fetch RUM events"**

   - Verify your API and Application keys are correct
   - Ensure the Application Key has `rum_read` permission
   - Check if the Datadog site is correct (e.g., `datadoghq.eu` for EU)

2. **"No errors found"**

   - Check your time range (`date-from` and `date-to`)
   - Verify the service name matches your RUM configuration
   - Try setting `error-handling` to `all` to include handled errors

3. **"Insufficient permissions"**
   - Verify GitHub Actions has `issues: write` permission
   - Check if branch protection rules are blocking the action

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guide, release process, and tag management.

### Quick Start

```bash
git clone https://github.com/wasabeef/datadog-to-github-issues.git
cd datadog-to-github-issues
bun install
bun run test
```

### Development & Testing Builds

#### Local Development

```bash
# Run tests
bun run test

# Build and check output
bun run build:check

# Build and see git changes
bun run build:dev
```

#### GitHub CI/CD

This project uses a streamlined workflow for different scenarios:

- **`ci.yml`**: Runs on every push/PR to main - tests, linting, build, and artifacts upload
- **`build-preview.yml`**: Runs on PRs - creates downloadable build artifacts and posts usage instructions
- **`auto-build.yml`**: Runs on ANY feature branch - auto-commits dist/ changes for testing
- **`release.yml`**: Unified release workflow - creates tags and GitHub releases (manual or auto)
- **`test.yml`**: Manual testing only - runs actual Datadog API integration tests

### Simple Development Flow

1. **Create any branch**: `feat-xxx`, `fix-yyy`, `refactor-zzz` - any name works
2. **Push to branch**: `auto-build.yml` automatically builds and commits dist/
3. **Create PR**: `build-preview.yml` shows usage instructions and download links
4. **Test the branch**: Use `@your-branch-name` in other repositories
5. **Merge to main**: After approval and testing
6. **Create release**: Manually run `release.yml` workflow to create tag and release
7. **Done**: Single workflow handles everything!

#### Using Development Branches in Other Repositories

When testing unreleased features, you can reference any branch in your workflows:

```yaml
# Use ANY development branch (auto-builds dist/)
- uses: wasabeef/datadog-to-github-issues@feat-new-feature
- uses: wasabeef/datadog-to-github-issues@fix-bug-123
- uses: wasabeef/datadog-to-github-issues@refactor-core

# Use a specific commit SHA
- uses: wasabeef/datadog-to-github-issues@a1b2c3d4e5f6789

# Use a PR for testing
- uses: wasabeef/datadog-to-github-issues@refs/pull/42/head
```

**The PR comment will show you the exact usage instructions for your branch!**

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/wasabeef/datadog-to-github-issues/issues) page
2. Create a new issue with detailed information
3. Include relevant logs and configuration

## 🙏 Acknowledgments

- [Datadog RUM](https://www.datadoghq.com/product/real-user-monitoring/) for providing comprehensive error monitoring
- GitHub Actions community for inspiration and best practices
