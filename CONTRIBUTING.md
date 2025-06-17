# Contributing to Datadog to GitHub Issues

🎉 **Contributions are welcome!** Please feel free to submit a Pull Request.

## 🛠️ Development Setup

### Prerequisites

- [Bun](https://bun.sh/) installed
- Node.js 18+ (compatible with Bun)
- Git

### Quick Start

```bash
git clone https://github.com/wasabeef/datadog-to-github-issues.git
cd datadog-to-github-issues
bun install
bun run test
```

### Development Environment Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/wasabeef/datadog-to-github-issues.git
   cd datadog-to-github-issues
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Build the project**:

   ```bash
   bun run build
   ```

4. **Run tests**:

   ```bash
   bun run test
   ```

5. **Run linter**:

   ```bash
   bun run lint
   ```

## 📁 Project Structure

```text
datadog-to-github-issues/
├── src/
│   ├── index.ts             # Main entry point
│   ├── datadog-client.ts    # Datadog RUM API integration
│   ├── github-client.ts     # GitHub API integration
│   ├── error-processor.ts   # Error processing and grouping
│   ├── issue-formatter.ts   # GitHub issue formatting
│   └── utils/
│       └── security.ts      # Security utilities (masking sensitive data)
├── tests/
│   ├── error-processor.test.ts  # Unit tests
│   ├── issue-formatter.test.ts  # Unit tests
│   ├── security.test.ts         # Security tests
│   └── local-runner.js          # Local testing script
├── .github/
│   └── workflows/
│       ├── ci.yml           # CI pipeline (test, lint, build)
│       ├── test.yml         # Action testing workflow
│       └── release.yml      # Release automation
├── dist/                    # Built JavaScript files (generated on release)
├── action.yml               # GitHub Action metadata
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── README.md                # Project documentation
```

## 🔄 Development Workflow

### 1. Feature Development

1. **Create branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Develop and test**:

   ```bash
   bun run test     # Run tests
   bun run lint     # Check code quality
   bun run format   # Format code
   bun run build    # Verify build
   ```

3. **Create Pull Request**: Create PR on GitHub

### 2. Testing

- **Unit Tests**: Test error processing and formatting logic with `bun run test`
- **Integration Tests**: Test actual Action behavior with `.github/workflows/test.yml`
- **Local Testing**: Use `tests/local-runner.js` for local development
- **CI Tests**: Automated CI pipeline runs on all pull requests

### 3. Code Quality

- **TypeScript**: Fix type errors to maintain type safety
- **ESLint**: Check code style with `bun run lint`
- **Prettier**: Consistent code formatting
- **Security**: Ensure sensitive data is properly masked

## 🏷️ Release Process & Tagging

This project adopts **release-time automation**.

### Release Flow

1. **Development complete**: Merge changes to `main` branch
2. **Create tag**: Create and push version tag
3. **Automated execution**: GitHub Actions automatically:
   - Build TypeScript and generate `dist/` files
   - Commit `dist/` files to the tag
   - Automatically publish GitHub Release

### Tagging Rules

#### Regular Release

```bash
# Example: v1.2.3
git tag v1.2.3
git push origin v1.2.3
```

#### Pre-release (Auto-detection)

```bash
# Tags containing hyphens are automatically published as pre-releases
git tag v1.2.3-beta.1
git push origin v1.2.3-beta.1

git tag v1.2.3-alpha.2
git push origin v1.2.3-alpha.2
```

#### Major Version Tags

```bash
# For convenience when using GitHub Actions
git tag v1  # Points to latest v1.x.x
git push origin v1
```

### `dist/` Directory Management

- **During development**: `dist/` is excluded by `.gitignore`, not managed
- **During release**: Release workflow automatically builds & commits
- **Benefits**:
  - Avoid merge conflicts during development
  - Simplified CI
  - Follows GitHub Action best practices

### Versioning Rules

Follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`v2.0.0`): Breaking changes
- **MINOR** (`v1.1.0`): Backward-compatible new features
- **PATCH** (`v1.0.1`): Backward-compatible bug fixes

## 🧪 Testing Guidelines

### Unit Tests

```bash
# Error processing and formatting tests
bun run test
```

### Local Testing

```bash
# Test with actual Datadog API (requires API keys)
node tests/local-runner.js
```

### Integration Tests

```bash
# Manual testing with GitHub Actions
gh workflow run test.yml
```

### Testing New Features

1. **Add Unit Tests**: Add appropriate tests in the `tests/` directory
2. **Integration Test**: Verify Action behavior with actual Datadog RUM data
3. **Edge Cases**: Test error handling scenarios
4. **Security Tests**: Ensure sensitive data is properly masked

## 📝 Pull Request Guidelines

### When Creating PRs

1. **Clear description**: Describe changes and reasoning
2. **Related Issues**: Reference related issues if any
3. **Tests**: Include appropriate tests
4. **Breaking Changes**: Clearly mark any breaking changes
5. **Security**: Ensure no sensitive data is exposed

### PR Example

```markdown
## Overview

Add support for new Datadog RUM error types

## Changes

- Add support for console errors
- Improve error classification logic
- Add new test cases
- Update security masking patterns

## Testing

- [x] Unit tests pass
- [x] Integration tests pass
- [x] Local testing completed
- [x] Security tests pass

## Breaking Changes

None
```

## 🐛 Issue Reporting

When reporting bugs or suggesting improvements:

1. **Check existing issues**: Avoid duplicates by checking existing issues
2. **Detailed information**: Include reproduction steps, expected vs actual behavior
3. **Environment details**: OS, Node.js/Bun versions, Datadog configuration
4. **Logs**: Include relevant error logs or screenshots (with sensitive data masked)

## 🔒 Security Guidelines

- **Never commit API keys or secrets**
- **Use GitHub Secrets for sensitive data**
- **Mask sensitive information in logs and issues**
- **Review security utilities before modifying**
- **Test security masking with real data**

## 🙏 Code of Conduct

To maintain a respectful environment for everyone participating:

- Provide constructive feedback
- Respect diversity
- Communicate kindly and politely
- Foster an environment for learning and growth

## 📦 Development & Testing Builds

### Local Development

```bash
# Run tests
bun run test

# Build and check output
bun run build:check

# Build and see git changes
bun run build:dev
```

### GitHub CI/CD

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

### Using Development Branches in Other Repositories

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

## 🎯 Development Roadmap

Planned developments:

- [ ] Support for more Datadog RUM error types
- [ ] Performance optimizations for large error volumes
- [ ] Custom issue templates
- [ ] Advanced filtering and grouping options
- [ ] Integration with other monitoring tools

If you have questions or need support, please feel free to create an [Issue](https://github.com/wasabeef/datadog-to-github-issues/issues)!
