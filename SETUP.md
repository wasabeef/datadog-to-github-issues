# Datadog to GitHub Issues Setup Guide

## Quick Setup

1. Create Datadog API and Application keys from [Datadog Organization Settings](https://app.datadoghq.com/organization-settings/api-keys).
2. Add `DATADOG_API_KEY` and `DATADOG_APP_KEY` as secrets in your GitHub repository (`Settings > Secrets and variables > Actions`).
3. Add `.github/workflows/datadog-to-github-issues.yml` to your repository.
4. The Action will automatically create GitHub Issues from your Datadog RUM errors based on the configured schedule.

## Detailed Setup

For complete setup instructions including API key permissions, workflow configuration, and troubleshooting, see [README.md](README.md).
