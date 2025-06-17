import { IssueFormatter } from '../src/issue-formatter';
import { ErrorGroup } from '../src/error-processor';
import { RUMError } from '../src/datadog-client';

describe('IssueFormatter', () => {
  let formatter: IssueFormatter;

  beforeEach(() => {
    formatter = new IssueFormatter();
  });

  describe('generateIssueTitle', () => {
    it('should include service name and error type', () => {
      const errorGroup = createMockErrorGroup({
        service: 'frontend-app',
        error: {
          type: 'TypeError',
          message: 'Cannot read property x of undefined',
        },
      });

      const title = formatter.generateIssueTitle(errorGroup);

      expect(title).toBe('TypeError: Cannot read property x of undefined');
    });

    it('should truncate long error messages', () => {
      const longMessage = 'A'.repeat(100);
      const errorGroup = createMockErrorGroup({
        error: {
          message: longMessage,
        },
      });

      const title = formatter.generateIssueTitle(errorGroup);

      expect(title.length).toBeLessThanOrEqual(80 + 10); // Allow for prefix
      expect(title).toContain('...');
    });

    it('should simplify URLs in error messages', () => {
      const errorGroup = createMockErrorGroup({
        error: {
          message: 'Failed to fetch https://api.example.com/users/123',
        },
      });

      const title = formatter.generateIssueTitle(errorGroup);

      expect(title).toContain('[URL]');
      expect(title).not.toContain('https://api.example.com');
    });
  });

  describe('generateIssueBody', () => {
    it('should include error hash comment', () => {
      const errorGroup = createMockErrorGroup();
      const body = formatter.generateIssueBody(errorGroup);

      expect(body).toContain(`<!-- error-hash: ${errorGroup.hash} -->`);
    });

    it('should include error summary', () => {
      const errorGroup = createMockErrorGroup({
        error: {
          type: 'TypeError',
          message: 'Test error message',
        },
      });

      const body = formatter.generateIssueBody(errorGroup);

      expect(body).toContain('Error Type:** TypeError');
      expect(body).toContain('Test error message');
      expect(body).toContain(`Total Occurrences:** ${errorGroup.count}`);
      expect(body).toContain(
        `Affected Users:** ${errorGroup.affectedUsers.size}`
      );
    });

    it('should include session replay link when available', () => {
      const errorGroup = createMockErrorGroup({}, { hasReplay: true });
      const body = formatter.generateIssueBody(errorGroup);

      expect(body).toContain('Session Replay Available:** ✅ Yes');
      expect(body).toContain('[View Session Replay]');
    });

    it('should format browser distribution table', () => {
      const errorGroup = createMockErrorGroup();
      errorGroup.browsers.set('Chrome', 10);
      errorGroup.browsers.set('Safari', 5);

      const body = formatter.generateIssueBody(errorGroup);

      expect(body).toContain('| Browser | Count | Percentage |');
      expect(body).toContain('| Chrome | 10 |');
      expect(body).toContain('| Safari | 5 |');
    });

    it('should mask sensitive data in error messages', () => {
      const errorGroup = createMockErrorGroup({
        error: {
          message: 'User john@example.com failed authentication',
        },
      });

      const body = formatter.generateIssueBody(errorGroup);

      expect(body).toContain('joh***@example.com');
      expect(body).not.toContain('john@example.com');
    });
  });

  describe('generateUpdateComment', () => {
    it('should show new and total occurrences', () => {
      const errorGroup = createMockErrorGroup();
      errorGroup.count = 10;

      const previousData = { occurrences: 5 };
      const comment = formatter.generateUpdateComment(errorGroup, previousData);

      expect(comment).toContain('New Occurrences:** 10');
      expect(comment).toContain('Total Occurrences:** 15');
    });

    it('should include latest statistics', () => {
      const errorGroup = createMockErrorGroup();
      errorGroup.affectedUsers.add('user1');
      errorGroup.affectedUsers.add('user2');

      const comment = formatter.generateUpdateComment(errorGroup, {
        occurrences: 0,
      });

      expect(comment).toContain('**2** unique users affected');
    });
  });

  describe('generateReopenComment', () => {
    it('should explain why issue was reopened', () => {
      const errorGroup = createMockErrorGroup();
      const closedIssue = {
        closed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      };

      const comment = formatter.generateReopenComment(errorGroup, closedIssue);

      expect(comment).toContain('Issue Reopened - Error Recurred');
      expect(comment).toContain('Closed:** 3 days ago');
      expect(comment).toContain('New Occurrences:** 1');
    });
  });
});

function createMockErrorGroup(
  overrides: any = {},
  additionalProps: any = {}
): ErrorGroup {
  const representative: RUMError = {
    id: 'test-id',
    type: 'rum',
    attributes: {
      timestamp: Date.now(),
      service: overrides.service || 'test-service',
      tags: ['env:test'],
      attributes: {
        date: Date.now(),
        service: overrides.service || 'test-service',
        error: {
          message: 'Test error',
          type: 'Error',
          source: 'source',
          handling: 'unhandled',
          ...overrides.error,
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
      },
    },
  };

  return {
    hash: 'testhash123',
    representative,
    occurrences: [representative],
    count: 1,
    firstSeen: Date.now() - 1000 * 60 * 60,
    lastSeen: Date.now(),
    affectedUsers: new Set(),
    affectedUrls: new Set(['https://example.com/test']),
    browsers: new Map(),
    operatingSystems: new Map(),
    devices: new Map(),
    countries: new Map(),
    services: new Set(['test-service']),
    hasReplay: additionalProps.hasReplay || false,
  };
}
