# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this GitHub Action, please send an email to the maintainer. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to include in your report

- A description of the vulnerability
- Steps to reproduce the issue
- Possible impact of the vulnerability
- Any suggested fixes (if available)

### Response timeline

- **Initial response**: Within 48 hours
- **Status update**: Within 7 days
- **Resolution**: Varies based on complexity

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
- **IP Address Masking**: `192.168.1.100` → `xxx.xxx.xxx.xxx`
- **UUID Partial Masking**: Partially masks UUIDs to prevent correlation
- **Token Redaction**: API keys and tokens shown as `[REDACTED]`
- **Stack Trace Sanitization**: Removes sensitive paths and data

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
   - Monitor security advisories
   - Review changes in new releases

## Known Security Considerations

While this action implements comprehensive security measures, users should be aware of:

- **Error Context**: Datadog RUM errors may contain user data or system information
- **Stack Traces**: May reveal application structure or sensitive paths
- **URL Parameters**: May contain user IDs or sensitive query parameters
- **Session Data**: May include user session information

**All of these are mitigated through our security utilities**, but users should:

- Review generated issues periodically
- Ensure repository visibility matches data sensitivity
- Consider using private repositories for sensitive applications
- Implement additional access controls if needed

## Security Testing

The action includes comprehensive security tests:

```bash
# Run security-specific tests
bun run test tests/security.test.ts

# Verify masking functionality
node tests/local-runner.js
```

These tests verify that sensitive data is properly masked in various scenarios.
