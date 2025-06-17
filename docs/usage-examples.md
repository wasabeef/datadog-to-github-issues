# Usage Examples for Development and Testing

## Streamlined Development Flow

This action supports **any branch naming convention**! Whether you use `feat-`, `fix-`, `refactor-`, or any other pattern, the workflow automatically builds `dist/` files for testing.

## Using Development Branches in GitHub Actions

### 1. Testing Your Changes in Another Repository

When you're developing new features in this action, you can test them in other repositories before releasing:

```yaml
# In your other repository's .github/workflows/test-dev.yml
name: Test Development Action

on:
  workflow_dispatch:
    inputs:
      action_ref:
        description: 'Branch/tag/SHA of the action to test'
        required: true
        default: 'main'

jobs:
  test-dev-action:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      # Use your development branch
      - name: Test Datadog to GitHub Issues
        uses: wasabeef/datadog-to-github-issues@${{ github.event.inputs.action_ref }}
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Any Branch Naming Convention Works

```yaml
# Conventional commit style
- uses: wasabeef/datadog-to-github-issues@feat-add-error-grouping
- uses: wasabeef/datadog-to-github-issues@fix-api-timeout
- uses: wasabeef/datadog-to-github-issues@refactor-error-processor

# GitHub Flow style
- uses: wasabeef/datadog-to-github-issues@feature/new-feature
- uses: wasabeef/datadog-to-github-issues@bugfix/fix-issue-123

# Issue-based style
- uses: wasabeef/datadog-to-github-issues@issue-123-fix-timeout
- uses: wasabeef/datadog-to-github-issues@gh-456-add-masking

# Your own style
- uses: wasabeef/datadog-to-github-issues@my-awesome-branch
- uses: wasabeef/datadog-to-github-issues@test-new-api

# Stable versions
- uses: wasabeef/datadog-to-github-issues@v1.1.0 # Specific tag
- uses: wasabeef/datadog-to-github-issues@main # Latest stable

# Specific commits
- uses: wasabeef/datadog-to-github-issues@a1b2c3d4e5f6789
- uses: wasabeef/datadog-to-github-issues@refs/pull/42/head
```

### 3. Simple Development Workflow

```bash
# 1. Create ANY branch (naming convention doesn't matter!)
git checkout -b feat-my-awesome-feature
# OR: git checkout -b fix-bug-123
# OR: git checkout -b refactor-core
# OR: git checkout -b anything-you-want

# 2. Make your changes and push
# Make your changes...
git add .
git commit -m "Add awesome feature"
git push origin feat-my-awesome-feature

# 3. auto-build.yml AUTOMATICALLY builds and commits dist/
# No manual steps needed!

# 4. Create PR - build-preview.yml shows usage instructions

# 5. Test in another repository using the branch name:
# uses: wasabeef/datadog-to-github-issues@feat-my-awesome-feature

# 6. Merge to main when ready

# 7. Create release via GitHub Actions
# Go to Actions → "Create Release" → Run workflow
# Enter version (v1.2.0) and optional release notes
# Single workflow creates tag + GitHub release
```

### 4. Best Practices for Development Testing

#### A. Use Separate Test Repository

Create a dedicated test repository to avoid polluting your main projects:

```bash
# Create test repo
mkdir test-datadog-action
cd test-datadog-action
git init
# Add a simple workflow that uses your development branch
```

#### B. Use Branch Protection

In your main repository using the action:

```yaml
# .github/workflows/production.yml (protected)
- uses: wasabeef/datadog-to-github-issues@v1.1.0 # Use stable version

# .github/workflows/staging.yml (for testing)
- uses: wasabeef/datadog-to-github-issues@develop # Use latest dev
```

#### C. Environment-based Configuration

```yaml
jobs:
  sync-errors:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [staging, production]
    steps:
      - uses: actions/checkout@v4

      - name: Use appropriate action version
        uses: wasabeef/datadog-to-github-issues@${{ matrix.environment == 'production' && 'v1.1.0' || 'develop' }}
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          service: ${{ matrix.environment == 'production' && 'frontend-prod' || 'frontend-staging' }}
```

## Configuration Examples

### Basic Error Monitoring

```yaml
name: Monitor Frontend Errors

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours

jobs:
  sync-errors:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      contents: read
    steps:
      - uses: wasabeef/datadog-to-github-issues@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Advanced Configuration with Filtering

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
      - uses: wasabeef/datadog-to-github-issues@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          service: 'frontend-app'
          date-from: 'now-2h'
          error-handling: 'unhandled'
          exclude-noise: true
          max-issues-per-run: 5
          labels: 'critical,rum-error,frontend'
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
        service: ['frontend-web', 'mobile-app', 'dashboard']
    steps:
      - uses: wasabeef/datadog-to-github-issues@v1
        with:
          datadog-api-key: ${{ secrets.DATADOG_API_KEY }}
          datadog-app-key: ${{ secrets.DATADOG_APP_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          service: ${{ matrix.service }}
          labels: 'rum-error,${{ matrix.service }}'
```

## Download and Test Locally

### From GitHub Actions Artifacts

1. Go to [Actions tab](../../actions)
2. Click on any workflow run (CI, Build Preview, etc.)
3. Download the `dist-*` or `build-preview-*` artifact
4. Extract to your local `dist/` folder:

```bash
# Download artifact.zip from GitHub Actions
unzip artifact.zip -d dist/
# Now you have the built action files locally

# Test it in a local GitHub Actions runner (using act)
act -j test-action
```

### Using GitHub CLI

```bash
# List recent workflow runs
gh run list

# Download artifacts from a specific run
gh run download RUN_ID --name dist-COMMIT_SHA

# Or download all artifacts
gh run download RUN_ID
```

## Debugging Failed Actions

### Check Action Logs

```bash
# View logs for a specific workflow run
gh run view RUN_ID --log

# Follow logs in real-time
gh run watch RUN_ID
```

### Test Action Locally

```bash
# Install act (GitHub Actions local runner)
# macOS: brew install act
# Then run specific job locally
act -j sync-errors -s DATADOG_API_KEY=your_api_key -s DATADOG_APP_KEY=your_app_key

# Test with local script
cd tests
node local-runner.js
```

## Troubleshooting Common Issues

### 1. No Errors Found

```yaml
# Try expanding the time range
- uses: wasabeef/datadog-to-github-issues@v1
  with:
    date-from: 'now-24h' # Expand from default 24h
    error-handling: 'all' # Include handled errors
```

### 2. Too Many Issues Created

```yaml
# Limit and filter more aggressively
- uses: wasabeef/datadog-to-github-issues@v1
  with:
    max-issues-per-run: 3
    exclude-noise: true
    error-handling: 'unhandled' # Only unhandled errors
```

### 3. Datadog API Rate Limits

```yaml
# Reduce frequency and add delays
- uses: wasabeef/datadog-to-github-issues@v1
  with:
    max-issues-per-run: 5 # Reduce API calls
# And adjust cron schedule to less frequent
```
