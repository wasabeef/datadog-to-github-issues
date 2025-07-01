import * as crypto from 'crypto';
import { RUMError } from './datadog-client';
import { API_LIMITS, STACK_TRACE } from '@datadog-to-github-issues/core';

/**
 * Grouped error data with aggregated statistics
 */
export interface ErrorGroup {
  hash: string;
  representative: RUMError;
  occurrences: RUMError[];
  count: number;
  firstSeen: number;
  lastSeen: number;
  affectedUsers: Set<string>;
  affectedUrls: Set<string>;
  browsers: Map<string, number>;
  operatingSystems: Map<string, number>;
  devices: Map<string, number>;
  countries: Map<string, number>;
  services: Set<string>;
  hasReplay: boolean;
}

/**
 * Processes and groups RUM errors for GitHub issue creation
 *
 * @remarks
 * This processor groups similar errors together using a normalized hash based on:
 * - Error type
 * - Error message (normalized)
 * - Error source
 * - Stack trace (first 5 lines, normalized)
 *
 * The normalization process removes variable parts like IDs, timestamps, and line numbers
 * to ensure similar errors are grouped together even if they occur in different contexts.
 *
 * @example
 * ```typescript
 * const processor = new ErrorProcessor();
 * const errorGroups = processor.groupErrors(rumErrors);
 *
 * // Process each error group
 * for (const [hash, group] of errorGroups) {
 *   console.log(`Error ${hash}: ${group.count} occurrences`);
 * }
 * ```
 */
export class ErrorProcessor {
  /**
   * Groups similar errors together based on error characteristics
   *
   * @param errors - Array of RUM errors to process
   * @returns Map of error hash to grouped error data
   *
   * @example
   * ```typescript
   * const errors = await datadogClient.fetchRUMErrors(query, from, to);
   * const groups = processor.groupErrors(errors);
   * console.log(`Found ${groups.size} unique error types`);
   * ```
   *
   * @remarks
   * The grouping process:
   * 1. Generates a normalized hash for each error
   * 2. Groups errors with the same hash
   * 3. Aggregates statistics (count, users, browsers, etc.)
   * 4. Tracks first and last occurrence times
   */
  groupErrors(errors: RUMError[]): Map<string, ErrorGroup> {
    const groups = new Map<string, ErrorGroup>();

    for (const error of errors) {
      const errorData = error.attributes?.attributes?.error;
      if (!errorData) continue;

      const hash = this.generateErrorHash(errorData);

      if (!groups.has(hash)) {
        groups.set(hash, {
          hash,
          representative: error,
          occurrences: [],
          count: 0,
          firstSeen: error.attributes.timestamp,
          lastSeen: error.attributes.timestamp,
          affectedUsers: new Set(),
          affectedUrls: new Set(),
          browsers: new Map(),
          operatingSystems: new Map(),
          devices: new Map(),
          countries: new Map(),
          services: new Set(),
          hasReplay: false,
        });
      }

      const group = groups.get(hash)!;
      this.updateGroup(group, error);
    }

    return groups;
  }

  /**
   * Generates a unique hash for error grouping
   * @param error - Error data from RUM event
   * @returns 16-character hash string
   */
  private generateErrorHash(error: any): string {
    // Use Datadog fingerprint if available
    if (error.fingerprint) {
      return error.fingerprint;
    }

    // Generate hash from error characteristics
    const message = error.message || '';
    const type = error.type || '';
    const source = error.source || '';
    const normalizedStack = this.normalizeStackTrace(error.stack);

    const hashInput = `${type}:${message}:${source}:${normalizedStack}`;
    return crypto
      .createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Normalizes stack traces for consistent grouping
   * @param stack - Raw stack trace string
   * @returns Normalized stack trace with variable elements removed
   */
  private normalizeStackTrace(stack: string | undefined): string {
    if (!stack) return '';

    return (
      stack
        // Remove line and column numbers
        .replace(/:\d+:\d+/g, ':*:*')
        // Remove query parameters
        .replace(/\?[a-zA-Z0-9_\-=&]+/g, '')
        // Remove bundle hashes
        .replace(/\.[a-f0-9]{8,}\./g, '.*.')
        // Remove UUIDs
        .replace(
          /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g,
          '*'
        )
        // Remove timestamps
        .replace(/\d{13,}/g, '*')
        // Take only first 5 lines for hashing
        .split('\n')
        .slice(0, 5)
        .join('\n')
    );
  }

  private updateGroup(group: ErrorGroup, error: RUMError): void {
    // Limit stored occurrences to prevent memory issues
    const MAX_STORED_OCCURRENCES = API_LIMITS.MAX_STORED_OCCURRENCES;
    if (group.occurrences.length < MAX_STORED_OCCURRENCES) {
      group.occurrences.push(error);
    } else if (Math.random() < 0.1) {
      // Randomly replace an old occurrence to maintain sample diversity
      const randomIndex = Math.floor(Math.random() * MAX_STORED_OCCURRENCES);
      group.occurrences[randomIndex] = error;
    }

    group.count++;
    group.lastSeen = Math.max(group.lastSeen, error.attributes.timestamp);
    group.firstSeen = Math.min(group.firstSeen, error.attributes.timestamp);

    const attrs = error.attributes.attributes;

    // Collect unique user IDs
    if (attrs.usr?.id) {
      group.affectedUsers.add(attrs.usr.id);
    }

    // Collect unique URLs
    if (attrs.view?.url) {
      group.affectedUrls.add(attrs.view.url);
    }

    // Track browser distribution
    if (attrs.browser?.name) {
      const count = group.browsers.get(attrs.browser.name) || 0;
      group.browsers.set(attrs.browser.name, count + 1);
    }

    // Track OS distribution
    if (attrs.os?.name) {
      const count = group.operatingSystems.get(attrs.os.name) || 0;
      group.operatingSystems.set(attrs.os.name, count + 1);
    }

    // Track device types
    if (attrs.device?.type) {
      const count = group.devices.get(attrs.device.type) || 0;
      group.devices.set(attrs.device.type, count + 1);
    }

    // Track countries
    if (attrs.geo?.country) {
      const count = group.countries.get(attrs.geo.country) || 0;
      group.countries.set(attrs.geo.country, count + 1);
    }

    // Track services
    if (error.attributes.service) {
      group.services.add(error.attributes.service);
    }

    // Check for session replay
    if (attrs.session?.has_replay) {
      group.hasReplay = true;
    }
  }
}
