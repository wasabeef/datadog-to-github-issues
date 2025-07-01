# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this GitHub Action, please create a private security advisory via GitHub's Security tab or email security@wasabeef.jp.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to include in your report

- A description of the vulnerability
- Steps to reproduce the issue
- Possible impact of the vulnerability
- Any suggested fixes (if available)

### Response timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Resolution**: Critical issues within 14 days, others within 30 days

## Security Considerations

This GitHub Action:

- Only reads from Datadog RUM API (no write operations)
- Requires API and Application keys with read-only permissions
- Uses GitHub's built-in token for repository operations
- Implements comprehensive data masking for sensitive information
- Does not store or transmit sensitive data beyond the GitHub issue content

## Security Features

### Data Protection

- **Sensitive Data Masking**: Automatically masks emails, IP addresses, UUIDs, and API keys
- **Secure Token Storage**: API keys stored as GitHub Secrets, never in code
- **No Data Persistence**: No sensitive data is stored or cached

### Input Validation

- **Input Sanitization**: All inputs are validated and sanitized
- **Query Parameter Escaping**: Prevents injection attacks
- **Error Boundary**: Graceful error handling without data exposure

### API Security

- **Read-Only Operations**: Only performs read operations on Datadog RUM API
- **Rate Limiting**: Implements proper rate limiting to prevent abuse
- **Secure Communication**: Uses HTTPS for all API communications

### Information Disclosure Prevention

- **Email Masking**: `john.doe@example.com` → `joh***@example.com`
- **Phone Numbers**: `090-1234-5678` → `0**-****-****`
- **IP Preservation**: IP addresses are NOT masked (required for debugging)
- **Token Redaction**: API keys and tokens shown as `[REDACTED]`
- **Credit Cards**: `1234-5678-9012-3456` → `****-****-****-****`

## Best Practices

When using this action:

1. **Datadog API Keys**

   - Store as repository secrets, never in plain text
   - Use keys with minimal required permissions (`rum_read` only)
   - Rotate keys regularly and monitor usage
   - Use different keys for different environments

2. **GitHub Permissions**

   - Only grant `issues: write` permission
   - Review repository access permissions
   - Use least-privilege principle

3. **Configuration Security**

   - Enable noise filtering to reduce information exposure
   - Limit `max-issues-per-run` to prevent flooding
   - Review generated issues before making repositories public
   - Use specific service filters to limit data scope

4. **Regular Updates**
   - Keep the action updated to the latest version
   - Monitor GitHub security advisories and CVE database
   - Test updates in staging environment before production

## Known Security Considerations

The action masks most sensitive data automatically, but be aware of:

- **Error Context**: Datadog RUM errors may contain user data or system information
- **Stack Traces**: May reveal application structure or sensitive paths
- **URL Parameters**: May contain user IDs or sensitive query parameters
- **Session Data**: May include user session information

To minimize risk:

- Review generated issues periodically
- Ensure repository visibility matches data sensitivity
- Consider using private repositories for sensitive applications
- Implement additional access controls if needed

## Security Testing

The action includes comprehensive security tests:

```bash
# Run security-specific tests
bun run test packages/core/tests/security.test.ts

# Test with real data (requires .env)
bun local:rum
```

Security tests cover email masking, phone number redaction, API key detection, and credit card filtering across 20+ test cases.
