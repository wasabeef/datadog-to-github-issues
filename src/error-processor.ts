import * as crypto from 'crypto';
import { RUMError } from './datadog-client';

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

export class ErrorProcessor {
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
    group.occurrences.push(error);
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
