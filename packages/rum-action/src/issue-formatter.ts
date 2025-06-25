import {
  maskSensitiveData,
  filterSensitiveContext,
} from '@datadog-to-github-issues/core';
import { ErrorGroup } from './error-processor';
import { translations } from './translations';

/**
 * Formats error data into GitHub Issues with rich markdown content
 */
export class IssueFormatter {
  private getDatadogWebUrl(): string {
    return process.env['INPUT_DATADOG-WEB-URL'] || 'https://app.datadoghq.com';
  }

  private getLanguage(): string {
    const lang = process.env['INPUT_LANGUAGE'] || 'en';
    return lang;
  }

  private getTitlePrefix(): string {
    return process.env['INPUT_TITLE-PREFIX'] || '';
  }

  private formatDate(date: string | Date | number): string {
    const d =
      typeof date === 'string'
        ? new Date(date)
        : typeof date === 'number'
          ? new Date(date)
          : date;
    const lang = this.getLanguage();

    if (lang === 'ja') {
      // Convert to JST (UTC+9) for Japanese
      const jstDate = new Date(d.getTime() + 9 * 60 * 60 * 1000);
      const year = jstDate.getUTCFullYear();
      const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(jstDate.getUTCDate()).padStart(2, '0');
      const hours = String(jstDate.getUTCHours()).padStart(2, '0');
      const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
      const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} JST`;
    }

    return d.toISOString();
  }

  private t(key: string): string {
    const lang = this.getLanguage();
    return translations[lang]?.[key] || translations['en'][key] || key;
  }

  /**
   * Generates a formatted issue title
   * @param errorGroup - Grouped error data
   * @returns Formatted issue title with prefix and error details
   */
  generateIssueTitle(errorGroup: ErrorGroup): string {
    const error = errorGroup.representative.attributes.attributes.error;

    let message = error.message || 'Unknown Error';

    // Simplify URLs and file paths first
    message = message
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      .replace(/\/[^\s]+\.(js|ts|jsx|tsx)+/g, '[FILE]');

    const prefix = this.getTitlePrefix();
    const errorType = error.type ? `${error.type}: ` : '';

    // Calculate available space for message (max 80 chars total)
    const prefixLength = prefix ? prefix.length + 1 : 0; // Add space after prefix if exists
    const maxMessageLength = 80 - prefixLength - errorType.length;

    // Truncate message if necessary
    if (message.length > maxMessageLength) {
      message = message.substring(0, maxMessageLength - 3) + '...';
    }

    return prefix
      ? `${prefix} ${errorType}${message}`
      : `${errorType}${message}`;
  }

  /**
   * Generates comprehensive issue body with error details, statistics, and analysis
   * @param errorGroup - Grouped error data with aggregated information
   * @returns Formatted markdown content for GitHub issue body
   */
  generateIssueBody(errorGroup: ErrorGroup): string {
    const error = errorGroup.representative.attributes.attributes.error;
    const view = errorGroup.representative.attributes.attributes.view;
    const session = errorGroup.representative.attributes.attributes.session;
    const context = errorGroup.representative.attributes.attributes.context;

    const stackAnalysis = this.analyzeStackTrace(error.stack);
    const timeline = this.generateErrorTimeline(errorGroup.occurrences);

    // Build related links
    const relatedLinks = [];
    if (errorGroup.hasReplay && session?.id) {
      relatedLinks.push(
        `- [${this.t('view_session_replay')}](${this.getDatadogWebUrl()}/rum/replay/sessions/${session.id})`
      );
    }
    if (error?.id) {
      relatedLinks.push(
        `- [${this.t('view_rum_explorer')}](${this.getDatadogWebUrl()}/rum/explorer?query=@error.id:${error.id})`
      );
    }
    if (error?.fingerprint) {
      relatedLinks.push(
        `- [${this.t('view_error_tracking')}](${this.getDatadogWebUrl()}/rum/error-tracking?query=@error.fingerprint:${error.fingerprint})`
      );
    }

    const relatedLinksSection =
      relatedLinks.length > 0
        ? `## ${this.t('related_links')}

${relatedLinks.join('\n')}

`
        : '';

    return `<!-- error-hash: ${errorGroup.hash} -->

## ${this.t('error_summary')}

**${this.t('error_type')}:** ${error.type || this.t('unknown_error')}
**${this.t('first_detected')}:** ${this.formatDate(errorGroup.firstSeen)}
**${this.t('last_detected')}:** ${this.formatDate(errorGroup.lastSeen)}
**${this.t('total_occurrences')}:** ${errorGroup.count}
**${this.t('affected_users')}:** ${errorGroup.affectedUsers.size}
**${this.t('session_replay_available')}:** ${errorGroup.hasReplay ? `✅ ${this.t('yes')}` : `❌ ${this.t('no')}`}

## ${this.t('error_details')}

### ${this.t('message')}
\`\`\`
${maskSensitiveData(error.message || this.t('unknown_error'))}
\`\`\`

### ${this.t('stack_trace')}
\`\`\`javascript
${error.stack ? maskSensitiveData(error.stack) : this.t('no_stack_trace')}
\`\`\`

${stackAnalysis ? this.formatStackAnalysis(stackAnalysis) : ''}

### ${this.t('error_context')}
- **${this.t('source')}:** ${error.source || 'unknown'}
- **${this.t('handling')}:** ${error.handling || 'unknown'}
- **${this.t('fingerprint')}:** ${error.fingerprint || 'N/A'}
${error.is_crash !== undefined ? `- **${this.t('is_crash')}:** ${error.is_crash ? `⚠️ ${this.t('yes')}` : `✅ ${this.t('no')}`}` : ''}
${error.id ? `- **${this.t('error_id')}:** ${error.id}` : ''}

## ${this.t('environment_info')}

### ${this.t('page_context')}
| ${this.t('property')} | ${this.t('value')} |
|----------|-------|
| **${this.t('url')}** | ${view?.url ? maskSensitiveData(view.url) : 'N/A'} |
| **${this.t('referrer')}** | ${view?.referrer ? maskSensitiveData(view.referrer) : 'N/A'} |
| **${this.t('view_name')}** | ${view?.name || 'N/A'} |

### ${this.t('affected_urls')}
${this.formatAffectedUrls(errorGroup)}

## ${this.t('user_impact')}

### ${this.t('affected_users')}
- ${this.t('total_affected_users')}: **${errorGroup.affectedUsers.size} ${this.t('unique_users')}**
${this.formatAffectedUsers(errorGroup)}

### ${this.t('geographic_distribution')}
${this.formatGeographicDistribution(errorGroup)}

## ${this.t('technical_info')}

${
  errorGroup.browsers.size > 0
    ? `### ${this.t('browser_distribution')}
${this.formatBrowserDistribution(errorGroup)}

`
    : ''
}### ${this.t('operating_systems')}
${this.formatOSDistribution(errorGroup)}

### ${this.t('device_types')}
${this.formatDeviceDistribution(errorGroup)}

${context ? this.formatAdditionalContext(context) : ''}

### ${this.t('service_information')}
- **${this.t('service')}:** ${errorGroup.representative.attributes.service || 'N/A'}
- **${this.t('environment')}:** ${this.extractTag(errorGroup.representative.attributes.tags, 'env') || 'N/A'}
- **${this.t('version')}:** ${this.extractTag(errorGroup.representative.attributes.tags, 'version') || 'N/A'}

## ${this.t('error_timeline')}

\`\`\`
${timeline}
\`\`\`

${relatedLinksSection}## ${this.t('json_info')}

<details>
<summary>${this.t('raw_error_data')} (${this.t('click_to_expand')})</summary>

\`\`\`json
${JSON.stringify(filterSensitiveContext(errorGroup.representative), null, 2)}
\`\`\`

</details>

---
*${this.t('auto_created')} ${this.formatDate(new Date())}*`;
  }

  generateUpdateComment(errorGroup: ErrorGroup, previousData: any): string {
    const newOccurrences = errorGroup.count;
    const totalOccurrences = previousData.occurrences + newOccurrences;

    return `## 🔄 ${this.t('error_recurrence_update')}

**${this.t('new_occurrences')}:** ${newOccurrences} ${this.t('since_last_update')}
**${this.t('total_occurrences')}:** ${totalOccurrences}
**${this.t('latest_detection')}:** ${this.formatDate(errorGroup.lastSeen)}

### 📊 ${this.t('latest_statistics')}

#### ${this.t('affected_users_new')}
- **${errorGroup.affectedUsers.size}** ${this.t('unique_users_affected_period')}

${
  errorGroup.browsers.size > 0
    ? `#### ${this.t('browser_distribution_latest')}
${this.formatBrowserDistribution(errorGroup)}
`
    : ''
}

#### ${this.t('geographic_distribution_latest')}
${this.formatGeographicDistribution(errorGroup)}

### 📈 ${this.t('error_timeline_recent')}

\`\`\`
${this.generateErrorTimeline(errorGroup.occurrences)}
\`\`\`

${errorGroup.hasReplay ? `### 🎥 ${this.t('session_replays_available')}\n${this.t('session_replays_debug_message')}` : ''}

### 🔧 Json Information (Latest)

<details>
<summary>Raw Error Data Sample (Click to expand)</summary>

\`\`\`json
${JSON.stringify(filterSensitiveContext(errorGroup.representative), null, 2)}
\`\`\`

</details>

---
*${this.t('auto_updated')} ${this.formatDate(new Date())}*`;
  }

  generateStatusUpdateComment(
    errorGroup: ErrorGroup,
    issue: any,
    previousUpdates: Array<{ date: string; occurrences: number; users: number }>
  ): string {
    const currentDate = this.formatDate(new Date());

    // Add current update to history
    const updatedHistory = [
      ...previousUpdates,
      {
        date: currentDate,
        occurrences: errorGroup.count,
        users: errorGroup.affectedUsers.size,
      },
    ];

    // Keep only last 10 updates to prevent history from growing too large
    const recentHistory = updatedHistory.slice(-10);

    return `<!-- status-update-comment -->
## 📊 ${this.t('current_status')}

**${this.t('latest_detection')}:** ${this.formatDate(errorGroup.lastSeen)}
**${this.t('new_occurrences')}:** ${errorGroup.count} ${this.t('since_last_check')}
**${this.t('affected_users')}:** ${errorGroup.affectedUsers.size} ${this.t('unique_users')}

### 🔥 ${this.t('latest_impact')}

${
  errorGroup.browsers.size > 0
    ? `#### ${this.t('browser_distribution')}
${this.formatBrowserDistribution(errorGroup)}

`
    : ''
}#### ${this.t('geographic_distribution')}
${this.formatGeographicDistribution(errorGroup)}

${
  errorGroup.hasReplay
    ? `### 🎥 ${this.t('session_replays_available')}
${this.t('session_replays_debug_message')}`
    : ''
}

<details>
<summary>📈 ${this.t('update_history')} (${recentHistory.length} ${this.t('entries')})</summary>

<!-- update-history-start -->
${recentHistory
  .map(
    (update) =>
      `- **${update.date}**: ${update.occurrences} occurrences, ${update.users} users`
  )
  .join('\n')}
<!-- update-history-end -->

</details>

<details>
<summary>🔧 ${this.t('latest_error_data')}</summary>

\`\`\`json
${JSON.stringify(filterSensitiveContext(errorGroup.representative), null, 2)}
\`\`\`

</details>

---
*${this.t('last_updated')} ${currentDate}*`;
  }

  generateReopenComment(errorGroup: ErrorGroup, closedIssue: any): string {
    const closedAt = new Date(closedIssue.closed_at);
    const daysSinceClosed = Math.floor(
      (Date.now() - closedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return `## 🚨 ${this.t('issue_reopened_title')}

${this.t('issue_reopened_description')}

**${this.t('closed')}:** ${daysSinceClosed} ${this.t('days_ago')} (${this.formatDate(closedAt)})
**${this.t('new_occurrences')}:** ${errorGroup.count}
**${this.t('affected_users')}:** ${errorGroup.affectedUsers.size}

### 📊 Recurrence Summary

The error that was previously resolved has occurred again. This may indicate:
- The fix was incomplete or didn't cover all edge cases
- The fix was not deployed to all environments
- A regression was introduced in a recent deployment
- New conditions are triggering the same error

### 📋 Recommended Actions

1. Review the original fix and verify it was properly deployed
2. Check recent deployments for potential regressions
3. Analyze the new error occurrences for different patterns
4. Consider adding additional error handling or validation

${errorGroup.hasReplay ? '### 🎥 Session Replays Available\nNew session replays are available that may help identify the root cause.' : ''}

### 🔧 Json Information (Recurrence)

<details>
<summary>Raw Error Data Sample (Click to expand)</summary>

\`\`\`json
${JSON.stringify(filterSensitiveContext(errorGroup.representative), null, 2)}
\`\`\`

</details>

---
*${this.t('auto_reopened')} ${this.formatDate(new Date())}*`;
  }

  private analyzeStackTrace(stack?: string): any {
    if (!stack) return null;

    const lines = stack.split('\n');
    const frames = lines
      .map((line) => {
        const match = line.match(/at\s+([^\s]+)\s+\(([^)]+)\)/);
        if (match) {
          return {
            function: match[1],
            location: match[2],
            isVendor:
              match[2].includes('vendor') || match[2].includes('node_modules'),
          };
        }
        return null;
      })
      .filter(Boolean) as Array<{
      function: string;
      location: string;
      isVendor: boolean;
    }>;

    const appFrames = frames.filter((f) => f && !f.isVendor);
    const vendorFrames = frames.filter((f) => f && f.isVendor);

    return {
      totalFrames: frames.length,
      appFrames,
      vendorFrames,
      topFrame: frames[0],
      errorLocation: frames[0]?.location,
    };
  }

  private formatStackAnalysis(analysis: any): string {
    return `### ${this.t('stack_trace_analysis')}
- **${this.t('total_stack_frames')}:** ${analysis.totalFrames}
- **${this.t('application_frames')}:** ${analysis.appFrames.length} (${analysis.appFrames
      .map((f: any) => f.function)
      .slice(0, 3)
      .join(', ')}${analysis.appFrames.length > 3 ? '...' : ''})
- **${this.t('vendor_library_frames')}:** ${analysis.vendorFrames.length}
- **${this.t('error_location')}:** \`${analysis.errorLocation || this.t('unknown')}\`
- **${this.t('root_function')}:** \`${analysis.topFrame?.function || this.t('unknown')}\``;
  }

  private formatAffectedUrls(errorGroup: ErrorGroup): string {
    const urls = Array.from(errorGroup.affectedUrls).slice(0, 5);
    return (
      urls
        .map((url) => {
          const count = errorGroup.occurrences.filter(
            (e) => e.attributes?.attributes?.view?.url === url
          ).length;
          return `- ${maskSensitiveData(url)} (${count} ${this.t('occurrences')})`;
        })
        .join('\n') || `- ${this.t('no_url_information')}`
    );
  }

  private formatAffectedUsers(errorGroup: ErrorGroup): string {
    if (errorGroup.affectedUsers.size === 0) {
      return `- ${this.t('no_user_information')}`;
    }

    const userIds = Array.from(errorGroup.affectedUsers).slice(0, 5);
    return `- ${this.t('sample_user_ids')}: ${userIds.map((id) => `\`${maskSensitiveData(id)}\``).join(', ')}${errorGroup.affectedUsers.size > 5 ? ' ...' : ''}`;
  }

  private formatGeographicDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.countries.size === 0) {
      return `- ${this.t('no_geographic_information')}`;
    }

    const sorted = Array.from(errorGroup.countries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted
      .map(([country, count]) => {
        const flag = this.getCountryFlag(country);
        return `- ${flag} ${country}: ${count} ${this.t('occurrences')}`;
      })
      .join('\n');
  }

  private formatBrowserDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.browsers.size === 0) {
      return `| ${this.t('browser')} | ${this.t('count')} | ${this.t('percentage')} |\n|---------|-------|------------|\n| ${this.t('no_data')} | - | - |`;
    }

    const total = errorGroup.count;
    const sorted = Array.from(errorGroup.browsers.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const rows = sorted.map(([browser, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      return `| ${browser} | ${count} | ${percentage}% |`;
    });

    return `| ${this.t('browser')} | ${this.t('count')} | ${this.t('percentage')} |
|---------|-------|------------|
${rows.join('\n')}`;
  }

  private formatOSDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.operatingSystems.size === 0) {
      return `- ${this.t('no_os_information')}`;
    }

    const sorted = Array.from(errorGroup.operatingSystems.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted
      .map(([os, count]) => `- ${os}: ${count} ${this.t('occurrences')}`)
      .join('\n');
  }

  private formatDeviceDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.devices.size === 0) {
      return `- ${this.t('no_device_information')}`;
    }

    const total = errorGroup.count;
    return Array.from(errorGroup.devices.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([device, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        return `- ${device}: ${count} (${percentage}%)`;
      })
      .join('\n');
  }

  private formatAdditionalContext(context: any): string {
    const filtered = this.filterSensitiveContext(context);
    if (Object.keys(filtered).length === 0) {
      return '';
    }

    return `## ${this.t('additional_context')}

\`\`\`json
${JSON.stringify(filtered, null, 2)}
\`\`\``;
  }

  private filterSensitiveContext(context: any): any {
    // Implementation would filter out sensitive keys
    return context;
  }

  private generateErrorTimeline(occurrences: any[]): string {
    // Group by hour
    const hourlyGroups = new Map<string, number>();
    const lang = this.getLanguage();

    occurrences.forEach((error) => {
      const date = new Date(error.attributes.timestamp);
      let hourKey: string;

      if (lang === 'ja') {
        // Convert to JST for Japanese
        const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(jstDate.getUTCDate()).padStart(2, '0');
        const hour = String(jstDate.getUTCHours()).padStart(2, '0');
        hourKey = `${month}/${day} ${hour}:00`;
      } else {
        hourKey = `${date.toISOString().slice(0, 13)}:00`;
      }

      hourlyGroups.set(hourKey, (hourlyGroups.get(hourKey) || 0) + 1);
    });

    // Get last 24 hours
    const sorted = Array.from(hourlyGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-24);

    if (sorted.length === 0) return this.t('no_timeline_data');

    const maxCount = Math.max(...sorted.map(([, count]) => count));

    return sorted
      .map(([hour, count]) => {
        const barLength = Math.round((count / maxCount) * 20);
        const bar = '█'.repeat(barLength);
        const displayHour = lang === 'ja' ? hour : hour.slice(11, 16);
        return `${displayHour} | ${bar} ${count}`;
      })
      .join('\n');
  }

  private extractTag(tags: string[], prefix: string): string | null {
    const tag = tags.find((t) => t.startsWith(`${prefix}:`));
    return tag ? tag.split(':')[1] : null;
  }

  private getCountryFlag(countryCode: string): string {
    // Simple country code to flag emoji mapping
    const flags: Record<string, string> = {
      US: '🇺🇸',
      GB: '🇬🇧',
      JP: '🇯🇵',
      DE: '🇩🇪',
      FR: '🇫🇷',
      CA: '🇨🇦',
      AU: '🇦🇺',
      CN: '🇨🇳',
      IN: '🇮🇳',
      BR: '🇧🇷',
    };
    return flags[countryCode] || '🌍';
  }
}
