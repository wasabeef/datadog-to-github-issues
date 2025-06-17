import {
  maskSensitiveData,
  filterSensitiveContext,
} from '../src/utils/security';

describe('Security utilities', () => {
  describe('maskSensitiveData', () => {
    it('should mask email addresses', () => {
      const input = 'User email is john.doe@example.com';
      const output = maskSensitiveData(input);
      expect(output).toBe('User email is joh***@example.com');
    });

    it('should mask IP addresses', () => {
      const input = 'Request from 192.168.1.100';
      const output = maskSensitiveData(input);
      expect(output).toBe('Request from xxx.xxx.xxx.xxx');
    });

    it('should mask UUIDs partially', () => {
      const input = 'User ID: 550e8400-e29b-41d4-a716-446655440000';
      const output = maskSensitiveData(input);
      expect(output).toBe('User ID: 550e8400-****-****-****-4466****');
    });

    it('should mask JWT tokens', () => {
      const input =
        'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const output = maskSensitiveData(input);
      expect(output).toContain('eyJ***.[REDACTED].***');
    });

    it('should mask API keys and secrets', () => {
      const input = 'api_key=sk_test_123456789 and secret_token: abc123xyz';
      const output = maskSensitiveData(input);
      expect(output).toBe('api_key=[REDACTED] and secret_token: [REDACTED]');
    });

    it('should handle multiple sensitive patterns', () => {
      const input = 'User john@example.com from 10.0.0.1 with token=secret123';
      const output = maskSensitiveData(input);
      expect(output).toBe(
        'User joh***@example.com from xxx.xxx.xxx.xxx with token=[REDACTED]'
      );
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
        username: 'john',
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

      expect(filtered.user.name).toBe('John');
      expect(filtered.user.email).toBe('joh***@example.com');
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
      expect(filtered.ip_address).toBe('xxx.xxx.xxx.xxx');
    });
  });
});
