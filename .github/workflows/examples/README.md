# Workflow Examples

This directory contains example GitHub Actions workflows for using Datadog to GitHub Issues actions.

## Available Examples

### 1. Basic Usage (`basic-usage.yml`)
- Minimal configuration
- Daily scheduled run
- Single service monitoring

### 2. Advanced Usage (`advanced-usage.yml`)
- Multiple trigger options (schedule + manual)
- Comprehensive configuration
- Custom labels and filtering

### 3. Japanese Usage (`japanese-usage.yml`)
- Japanese language output
- JST timezone scheduling
- Japanese labels

### 4. Full Configuration (`datadog-to-github-issues.yml`)
- Complete example with all options
- Manual workflow dispatch with inputs
- Comprehensive error filtering

## Usage

1. Copy the desired example to your repository's `.github/workflows/` directory
2. Configure your Datadog API credentials in GitHub Secrets:
   - `DATADOG_API_KEY`
   - `DATADOG_APP_KEY`
3. Customize the configuration as needed
4. Commit and push to enable the workflow

## Configuration Notes

- All examples use `wasabeef/datadog-to-github-issues/rum@v1`
- Ensure your GitHub token has `issues: write` permission
- Adjust scheduling and filtering based on your needs