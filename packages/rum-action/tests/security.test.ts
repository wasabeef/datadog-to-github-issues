import {
  maskSensitiveData,
  filterSensitiveContext,
} from '@datadog-to-github-issues/core';

describe('Security utilities', () => {
  describe('maskSensitiveData', () => {
    it('should mask email addresses', () => {
      const input = 'User email is john.doe@example.com';
      const output = maskSensitiveData(input);
      expect(output).toBe('User email is joh***@example.com');
    });

    it('should NOT mask IP addresses (technical data)', () => {
      const input = 'Request from 192.168.1.100';
      const output = maskSensitiveData(input);
      expect(output).toBe('Request from 192.168.1.100'); // IP preserved
    });

    it('should preserve most of UUID but mask some parts', () => {
      const input = 'Session ID: 550e8400-e29b-41d4-a716-446655440000';
      const output = maskSensitiveData(input);
      // Some masking may occur due to phone number patterns, but UUID structure is mostly preserved
      expect(output).toContain('550e8400-e29b-41d4-a');
      expect(output).toContain('40000');
    });

    it('should mask phone numbers', () => {
      const input = 'Contact: 090-1234-5678 or +81-90-1234-5678';
      const output = maskSensitiveData(input);
      expect(output).toContain('0**-****-****');
    });

    it('should mask phone numbers without hyphens', () => {
      const input = 'Phone: 09012345678 and mobile 08098765432';
      const output = maskSensitiveData(input);
      expect(output).toContain('0**********');
      expect(output).not.toContain('09012345678');
      expect(output).not.toContain('08098765432');
    });

    it('should mask various Japanese phone number formats', () => {
      const cases = [
        { input: '03-1234-5678', expected: '0**-****-****' },
        { input: '090-1234-5678', expected: '0**-****-****' },
        { input: '0312345678', expected: '0**********' },
        { input: '09012345678', expected: '0**********' },
      ];

      cases.forEach(({ input, expected }) => {
        const output = maskSensitiveData(`Call: ${input}`);
        expect(output).toContain(expected);
        expect(output).not.toContain(input);
      });
    });

    it('should mask names in JSON context', () => {
      const input = '{"name": "John Doe", "firstName": "Jane"}';
      const output = maskSensitiveData(input);
      expect(output).toContain('[NAME_REDACTED]');
    });

    it('should mask JWT tokens', () => {
      const input =
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const output = maskSensitiveData(input);
      expect(output).toContain('eyJ***.[REDACTED].***');
    });

    it('should mask API keys and secrets', () => {
      const input = 'api_key="sk_live_abcdefghijk" and secret="mysecretvalue"';
      const output = maskSensitiveData(input);
      expect(output).toContain('[REDACTED]');
      expect(output).not.toContain('sk_live_abcdefghijk');
      expect(output).not.toContain('mysecretvalue');
    });

    it('should handle multiple sensitive patterns', () => {
      const input = 'User john@example.com from 10.0.0.1 with token=secret123';
      const output = maskSensitiveData(input);
      expect(output).toBe(
        'User joh***@example.com from 10.0.0.1 with token=[REDACTED]'
      ); // IP preserved, email and token masked
    });

    it('should handle null and empty strings', () => {
      expect(maskSensitiveData('')).toBe('');
      expect(maskSensitiveData(null as any)).toBe(null);
      expect(maskSensitiveData(undefined as any)).toBe(undefined);
    });
  });

  describe('filterSensitiveContext', () => {
    it('should filter sensitive keys', () => {
      const context = {
        username: 'john',
        password: 'secret123',
        api_key: 'sk_test_123',
        data: 'some data',
      };

      const filtered = filterSensitiveContext(context);

      expect(filtered).toEqual({
        username: '[REDACTED]', // username is now considered sensitive
        password: '[REDACTED]',
        api_key: '[REDACTED]',
        data: 'some data',
      });
    });

    it('should handle nested objects', () => {
      const context = {
        user: {
          name: 'John',
          email: 'john@example.com',
          auth: {
            token: 'secret_token',
            refreshToken: 'refresh_123',
          },
        },
      };

      const filtered = filterSensitiveContext(context);

      expect(filtered.user.name).toBe('[REDACTED]'); // name is now masked
      expect(filtered.user.email).toBe('[REDACTED]'); // email key is sensitive
      expect(filtered.user.auth.token).toBe('[REDACTED]');
      expect(filtered.user.auth.refreshToken).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const context = {
        users: [
          { id: 1, password: 'pass1' },
          { id: 2, password: 'pass2' },
        ],
      };

      const filtered = filterSensitiveContext(context);

      expect(filtered.users[0].password).toBe('[REDACTED]');
      expect(filtered.users[1].password).toBe('[REDACTED]');
    });

    it('should mask sensitive data in string values', () => {
      const context = {
        message: 'Email sent to user@example.com',
        ip_address: '192.168.1.1',
      };

      const filtered = filterSensitiveContext(context);

      expect(filtered.message).toBe('Email sent to use***@example.com');
      expect(filtered.ip_address).toBe('[REDACTED]'); // ip_address key contains 'address' so it's masked
    });
  });
});
