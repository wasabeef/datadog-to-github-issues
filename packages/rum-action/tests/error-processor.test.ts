import { ErrorProcessor } from '../src/error-processor';
import { RUMError } from '../src/datadog-client';

describe('ErrorProcessor', () => {
  let processor: ErrorProcessor;

  beforeEach(() => {
    processor = new ErrorProcessor();
  });

  describe('groupErrors', () => {
    it('should group errors by fingerprint when available', () => {
      const errors: RUMError[] = [
        createMockError({ fingerprint: 'abc123' }),
        createMockError({ fingerprint: 'abc123' }),
        createMockError({ fingerprint: 'def456' }),
      ];

      const groups = processor.groupErrors(errors);

      expect(groups.size).toBe(2);
      expect(groups.get('abc123')?.count).toBe(2);
      expect(groups.get('def456')?.count).toBe(1);
    });

    it('should generate hash from error characteristics when fingerprint is missing', () => {
      const errors: RUMError[] = [
        createMockError({
          message: 'Cannot read property x of undefined',
          type: 'TypeError',
          stack:
            'TypeError: Cannot read property x of undefined\n    at test.js:10:5',
        }),
        createMockError({
          message: 'Cannot read property x of undefined',
          type: 'TypeError',
          stack:
            'TypeError: Cannot read property x of undefined\n    at test.js:20:15', // Different line number
        }),
      ];

      const groups = processor.groupErrors(errors);

      // Should be grouped together despite different line numbers
      expect(groups.size).toBe(1);
    });

    it('should track affected users', () => {
      const errors: RUMError[] = [
        createMockError({ fingerprint: 'abc123' }, { userId: 'user1' }),
        createMockError({ fingerprint: 'abc123' }, { userId: 'user2' }),
        createMockError({ fingerprint: 'abc123' }, { userId: 'user1' }), // Duplicate user
      ];

      const groups = processor.groupErrors(errors);
      const group = groups.get('abc123');

      expect(group?.affectedUsers.size).toBe(2);
      expect(group?.affectedUsers.has('user1')).toBe(true);
      expect(group?.affectedUsers.has('user2')).toBe(true);
    });

    it('should track browser distribution', () => {
      const errors: RUMError[] = [
        createMockError({ fingerprint: 'abc123' }, { browser: 'Chrome' }),
        createMockError({ fingerprint: 'abc123' }, { browser: 'Chrome' }),
        createMockError({ fingerprint: 'abc123' }, { browser: 'Safari' }),
      ];

      const groups = processor.groupErrors(errors);
      const group = groups.get('abc123');

      expect(group?.browsers.get('Chrome')).toBe(2);
      expect(group?.browsers.get('Safari')).toBe(1);
    });

    it('should detect session replay availability', () => {
      const errors: RUMError[] = [
        createMockError({ fingerprint: 'abc123' }, { hasReplay: false }),
        createMockError({ fingerprint: 'abc123' }, { hasReplay: true }),
      ];

      const groups = processor.groupErrors(errors);
      const group = groups.get('abc123');

      expect(group?.hasReplay).toBe(true);
    });
  });
});

function createMockError(
  errorProps: any = {},
  additionalProps: any = {}
): RUMError {
  return {
    id: 'test-id',
    type: 'rum',
    attributes: {
      timestamp: Date.now(),
      service: 'test-service',
      tags: ['env:test'],
      attributes: {
        date: Date.now(),
        service: 'test-service',
        error: {
          message: 'Test error',
          type: 'Error',
          source: 'source',
          handling: 'unhandled',
          ...errorProps,
        },
        view: {
          id: 'view-id',
          url: 'https://example.com/test',
        },
        session: {
          id: 'session-id',
          type: 'user',
          has_replay: additionalProps.hasReplay || false,
        },
        usr: additionalProps.userId
          ? { id: additionalProps.userId }
          : undefined,
        browser: additionalProps.browser
          ? { name: additionalProps.browser, version: '100.0' }
          : undefined,
      },
    },
  };
}
