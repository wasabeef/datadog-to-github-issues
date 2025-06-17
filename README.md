# Datadog to GitHub Issues

[![GitHub release](https://img.shields.io/github/release/wasabeef/datadog-to-github-issues.svg)](https://github.com/wasabeef/datadog-to-github-issues/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<p align="center">
  <a href="README.ja.md">日本語版</a>
</p>

A collection of GitHub Actions that integrate Datadog with GitHub Issues:

- **RUM Action**: Creates issues from Datadog RUM (Real User Monitoring) errors
- **Monitor Action**: Creates issues from Datadog Monitor alerts (coming soon)

This helps teams track and manage errors and alerts from Datadog directly within their GitHub workflow.

## 🚀 Features

- **Automatic Error Detection**: Fetches and creates GitHub Issues from Datadog RUM errors
- **Smart Grouping & Updates**: Groups similar errors and updates existing issues when they recur
- **Rich Context**: Includes stack traces, user impact, browser distribution, and session replay links
- **Security & Privacy**: Automatically masks sensitive data (emails, IPs, tokens)
- **Flexible Configuration**: Customizable labels, multiple languages (EN/JP), and conditional labeling

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

#### For RUM Error Monitoring

Create `.github/workflows/datadog-rum-errors.yml` in your repository:

```yaml
name: Sync Datadog Errors

on:
  schedule:
    - cron: '0 0 * * *' # Daily at midnight UTC

jobs:
  sync-errors:
    runs-on: ubuntu-latest
    permissions:
      issues: write # Required to create/update issues
      contents: read # Required to read workflow

    steps:
      - uses: actions/checkout@v4

      - uses: wasabeef/datadog-to-github-issues/rum@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          service: 'your-service-name'
```

## 📖 Usage

Once set up, the action will automatically:

1. **Query Datadog RUM** for errors based on your configuration
2. **Group similar errors** using fingerprinting
3. **Create GitHub Issues** for new errors
4. **Update existing issues** with new occurrences
5. **Reopen closed issues** if errors resurface

### Configuration Examples

**Basic Setup:**

```yaml
- uses: wasabeef/datadog-to-github-issues@v1
  with:
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    service: 'your-service-name'
```

**Advanced Setup:**

```yaml
- uses: wasabeef/datadog-to-github-issues@v1
  with:
    datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
    datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    service: 'frontend-app'
    language: 'ja' # or 'en' (default)
    labels: 'datadog'
    fatal-labels: 'critical'
    title-prefix: '[DD]'
```

### Generated Issue Example

<details>
<summary>Click to see full issue example</summary>

```markdown
TypeError: Cannot read property 'user' of undefined

## 🚨 Error Summary

**Error Type:** TypeError | **Occurrences:** 45 | **Users Affected:** 12
**First Seen:** 2025-01-15 14:23:45 UTC | **Last Seen:** 2025-01-15 18:45:12 UTC

## 📊 Error Details

**Stack Trace:**
```

TypeError: Cannot read property 'user' of undefined
at UserProfile (app.bundle.js:4567:23)
at renderWithHooks (vendor.bundle.js:12345:18)

```

**Top Browsers:** Chrome (78%), Safari (18%), Firefox (4%)
**Environment:** Windows (56%), macOS (33%), iOS (11%)

**[View in Datadog RUM](https://app.datadoghq.com/rum/explorer)** | **[Session Replay](https://app.datadoghq.com/rum/replay)**
```

</details>

## 🔧 Configuration

### Required Inputs

| Input             | Description             | Default               |
| ----------------- | ----------------------- | --------------------- |
| `datadog-api-key` | Datadog API Key         | -                     |
| `datadog-app-key` | Datadog Application Key | -                     |
| `github-token`    | GitHub Token            | `${{ github.token }}` |

### Common Options

| Input          | Description                    | Default |
| -------------- | ------------------------------ | ------- |
| `service`      | RUM Service name to filter     | (all)   |
| `language`     | Issue language (`en` or `ja`)  | `en`    |
| `labels`       | Comma-separated labels         | (none)  |
| `fatal-labels` | Labels for crash errors        | (none)  |
| `title-prefix` | Custom prefix for issue titles | (none)  |

<details>
<summary>View all configuration options</summary>

| Input                | Description                                      | Default                     |
| -------------------- | ------------------------------------------------ | --------------------------- |
| `datadog-site`       | Datadog site (datadoghq.com, datadoghq.eu, etc.) | `datadoghq.com`             |
| `datadog-web-url`    | Datadog Web UI URL                               | `https://app.datadoghq.com` |
| `date-from`          | Start date (e.g., `now-24h`)                     | `now-24h`                   |
| `date-to`            | End date                                         | `now`                       |
| `error-handling`     | Filter: `all`, `handled`, `unhandled`            | `unhandled`                 |
| `error-source`       | Filter: `source`, `network`, `console`           | (all)                       |
| `exclude-noise`      | Exclude common noise errors                      | `true`                      |
| `max-issues-per-run` | Maximum issues to create per run                 | `10`                        |
| `update-existing`    | Update existing issues                           | `true`                      |
| `reopen-closed`      | Reopen closed issues if error recurs             | `true`                      |
| `non-fatal-labels`   | Additional labels for non-fatal errors           | (none)                      |

</details>

### Key Features

- **Multiple Languages**: Set `language: 'ja'` for Japanese with JST timestamps
- **Smart Labeling**: Different labels for crashes (`fatal-labels`) vs regular errors (`non-fatal-labels`)
- **Noise Filtering**: Automatically excludes common noise errors (ChunkLoadError, etc.)

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

## 🔒 Security & Privacy

This action implements comprehensive data protection to ensure sensitive information is never exposed in GitHub Issues:

### Automatically Masked Data

**Personal Information:**

- **Email addresses**: `john.doe@example.com` → `joh***@example.com`
- **Phone numbers**: `090-1234-5678` → `0**-****-****` (supports various formats)
- **Names**: Detected in JSON contexts and masked as `[NAME_REDACTED]`
- **Addresses**: Postal codes when found in address contexts

**Authentication & Secrets:**

- JWT tokens → `eyJ***.[REDACTED].***`
- API keys and secrets → `[REDACTED]`
- Passwords and auth tokens → `[REDACTED]`

**Financial Information:**

- Credit card numbers → `****-****-****-****`
- Social Security Numbers → `XXX-XX-XXXX`

### Preserved Technical Data

The following are **NOT** masked to maintain debugging capability:

- IP addresses (for technical debugging)
- UUIDs and technical IDs
- Error stack traces (with sensitive values within them masked)
- System information and browser details

### Security Best Practices

1. **API Keys**: Always use GitHub Secrets for Datadog API credentials
2. **Permissions**: Use minimum required GitHub token permissions
3. **Review**: Periodically review generated issues for any unmasked sensitive data
4. **Updates**: Keep the action updated for latest security improvements

For security concerns or to report vulnerabilities, please see [SECURITY.md](SECURITY.md).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing guidelines, and contribution process.

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/wasabeef/datadog-to-github-issues/issues) page
2. Create a new issue with detailed information
3. Include relevant logs and configuration

## 🙏 Acknowledgments

- [Datadog RUM](https://www.datadoghq.com/product/real-user-monitoring/) for providing comprehensive error monitoring
- GitHub Actions community for inspiration and best practices

