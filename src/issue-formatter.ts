import { ErrorGroup } from './error-processor';
import { maskSensitiveData } from './utils/security';

export class IssueFormatter {
  generateIssueTitle(errorGroup: ErrorGroup): string {
    const error = errorGroup.representative.attributes.attributes.error;
    const service = errorGroup.representative.attributes.service;

    let message = error.message || 'Unknown Error';

    // Simplify URLs and file paths first
    message = message
      .replace(/https?:\/\/[^\s]+/g, '[URL]')
      .replace(/\/[^\s]+\.(js|ts|jsx|tsx)+/g, '[FILE]');

    const prefix = service ? `[${service}] ` : '';
    const errorType = error.type ? `${error.type}: ` : '';

    // Calculate available space for message (max 80 chars total)
    const prefixLength = prefix.length + errorType.length;
    const maxMessageLength = 80 - prefixLength;

    // Truncate message if necessary
    if (message.length > maxMessageLength) {
      message = message.substring(0, maxMessageLength - 3) + '...';
    }

    return `${prefix}${errorType}${message}`;
  }

  generateIssueBody(errorGroup: ErrorGroup): string {
    const error = errorGroup.representative.attributes.attributes.error;
    const view = errorGroup.representative.attributes.attributes.view;
    const session = errorGroup.representative.attributes.attributes.session;
    const context = errorGroup.representative.attributes.attributes.context;

    const stackAnalysis = this.analyzeStackTrace(error.stack);
    const timeline = this.generateErrorTimeline(errorGroup.occurrences);

    return `<!-- error-hash: ${errorGroup.hash} -->

## 🚨 Error Summary

**Error Type:** ${error.type || 'Unknown'}
**First Detected:** ${new Date(errorGroup.firstSeen).toISOString()}
**Last Detected:** ${new Date(errorGroup.lastSeen).toISOString()}
**Total Occurrences:** ${errorGroup.count}
**Affected Users:** ${errorGroup.affectedUsers.size}
**Session Replay Available:** ${errorGroup.hasReplay ? '✅ Yes' : '❌ No'}

## 📊 Error Details

### Message
\`\`\`
${maskSensitiveData(error.message || 'No error message')}
\`\`\`

### Stack Trace
\`\`\`javascript
${error.stack ? maskSensitiveData(error.stack) : 'No stack trace available'}
\`\`\`

${stackAnalysis ? this.formatStackAnalysis(stackAnalysis) : ''}

### Error Context
- **Source:** ${error.source || 'unknown'}
- **Handling:** ${error.handling || 'unknown'}
- **Fingerprint:** ${error.fingerprint || 'N/A'}
${error.id ? `- **Error ID:** ${error.id}` : ''}

## 🌍 Environment Information

### Page Context
| Property | Value |
|----------|-------|
| **URL** | ${view?.url || 'N/A'} |
| **Referrer** | ${view?.referrer || 'N/A'} |
| **View Name** | ${view?.name || 'N/A'} |

### Affected URLs
${this.formatAffectedUrls(errorGroup)}

## 👤 User Impact

### Affected Users
- Total: **${errorGroup.affectedUsers.size} unique users**
${this.formatAffectedUsers(errorGroup)}

### Geographic Distribution
${this.formatGeographicDistribution(errorGroup)}

## 💻 Technical Information

### Browser Distribution
${this.formatBrowserDistribution(errorGroup)}

### Operating Systems
${this.formatOSDistribution(errorGroup)}

### Device Types
${this.formatDeviceDistribution(errorGroup)}

${context ? this.formatAdditionalContext(context) : ''}

### Service Information
- **Service:** ${errorGroup.representative.attributes.service || 'N/A'}
- **Environment:** ${this.extractTag(errorGroup.representative.attributes.tags, 'env') || 'N/A'}
- **Version:** ${this.extractTag(errorGroup.representative.attributes.tags, 'version') || 'N/A'}

## 📈 Error Timeline

\`\`\`
${timeline}
\`\`\`

## 🔗 Related Links

${session?.id ? `- [View Session Replay](https://app.datadoghq.com/rum/replay/sessions/${session.id})` : ''}
${error?.id ? `- [View in RUM Explorer](https://app.datadoghq.com/rum/explorer?query=@error.id:${error.id})` : ''}
${error?.fingerprint ? `- [View Error Tracking](https://app.datadoghq.com/rum/error-tracking?query=@error.fingerprint:${error.fingerprint})` : ''}

---
*This issue was automatically created by Datadog Error Tracking integration on ${new Date().toISOString()}*`;
  }

  generateUpdateComment(errorGroup: ErrorGroup, previousData: any): string {
    const newOccurrences = errorGroup.count;
    const totalOccurrences = previousData.occurrences + newOccurrences;

    return `## 🔄 Error Recurrence Update

**New Occurrences:** ${newOccurrences} (Since last update)
**Total Occurrences:** ${totalOccurrences}
**Latest Detection:** ${new Date(errorGroup.lastSeen).toISOString()}

### 📊 Latest Statistics

#### Affected Users (New)
- **${errorGroup.affectedUsers.size}** unique users affected in this period

#### Browser Distribution (Latest)
${this.formatBrowserDistribution(errorGroup)}

#### Geographic Distribution (Latest)
${this.formatGeographicDistribution(errorGroup)}

### 📈 Error Timeline (Recent)

\`\`\`
${this.generateErrorTimeline(errorGroup.occurrences)}
\`\`\`

${errorGroup.hasReplay ? '### 🎥 Session Replays Available\nSome of these errors have session replays available for debugging.' : ''}

---
*Updated at ${new Date().toISOString()}*`;
  }

  generateReopenComment(errorGroup: ErrorGroup, closedIssue: any): string {
    const closedAt = new Date(closedIssue.closed_at);
    const daysSinceClosed = Math.floor(
      (Date.now() - closedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return `## 🚨 Issue Reopened - Error Recurred

This issue has been automatically reopened due to error recurrence.

**Closed:** ${daysSinceClosed} days ago (${closedAt.toISOString()})
**New Occurrences:** ${errorGroup.count}
**Affected Users:** ${errorGroup.affectedUsers.size}

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

---
*This issue was automatically reopened at ${new Date().toISOString()}*`;
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
    return `### Stack Trace Analysis
- **Total Stack Frames:** ${analysis.totalFrames}
- **Application Frames:** ${analysis.appFrames.length} (${analysis.appFrames
      .map((f: any) => f.function)
      .slice(0, 3)
      .join(', ')}${analysis.appFrames.length > 3 ? '...' : ''})
- **Vendor/Library Frames:** ${analysis.vendorFrames.length}
- **Error Location:** \`${analysis.errorLocation || 'Unknown'}\`
- **Root Function:** \`${analysis.topFrame?.function || 'Unknown'}\``;
  }

  private formatAffectedUrls(errorGroup: ErrorGroup): string {
    const urls = Array.from(errorGroup.affectedUrls).slice(0, 5);
    return (
      urls
        .map((url) => {
          const count = errorGroup.occurrences.filter(
            (e) => e.attributes?.attributes?.view?.url === url
          ).length;
          return `- ${url} (${count} occurrences)`;
        })
        .join('\n') || '- No URL information available'
    );
  }

  private formatAffectedUsers(errorGroup: ErrorGroup): string {
    if (errorGroup.affectedUsers.size === 0) {
      return '- No user information available';
    }

    const userIds = Array.from(errorGroup.affectedUsers).slice(0, 5);
    return `- Sample User IDs: ${userIds.map((id) => `\`${maskSensitiveData(id)}\``).join(', ')}${errorGroup.affectedUsers.size > 5 ? ' ...' : ''}`;
  }

  private formatGeographicDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.countries.size === 0) {
      return '- No geographic information available';
    }

    const sorted = Array.from(errorGroup.countries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted
      .map(([country, count]) => {
        const flag = this.getCountryFlag(country);
        return `- ${flag} ${country}: ${count} occurrences`;
      })
      .join('\n');
  }

  private formatBrowserDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.browsers.size === 0) {
      return '| Browser | Count | Percentage |\n|---------|-------|------------|\n| No data | - | - |';
    }

    const total = errorGroup.count;
    const sorted = Array.from(errorGroup.browsers.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    const rows = sorted.map(([browser, count]) => {
      const percentage = ((count / total) * 100).toFixed(1);
      return `| ${browser} | ${count} | ${percentage}% |`;
    });

    return `| Browser | Count | Percentage |
|---------|-------|------------|
${rows.join('\n')}`;
  }

  private formatOSDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.operatingSystems.size === 0) {
      return '- No OS information available';
    }

    const sorted = Array.from(errorGroup.operatingSystems.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted
      .map(([os, count]) => `- ${os}: ${count} occurrences`)
      .join('\n');
  }

  private formatDeviceDistribution(errorGroup: ErrorGroup): string {
    if (errorGroup.devices.size === 0) {
      return '- No device information available';
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

    return `## 🔍 Additional Context

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

    occurrences.forEach((error) => {
      const date = new Date(error.attributes.timestamp);
      const hourKey = `${date.toISOString().slice(0, 13)}:00`;
      hourlyGroups.set(hourKey, (hourlyGroups.get(hourKey) || 0) + 1);
    });

    // Get last 24 hours
    const sorted = Array.from(hourlyGroups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-24);

    if (sorted.length === 0) return 'No timeline data available';

    const maxCount = Math.max(...sorted.map(([, count]) => count));

    return sorted
      .map(([hour, count]) => {
        const barLength = Math.round((count / maxCount) * 20);
        const bar = '█'.repeat(barLength);
        return `${hour.slice(11, 16)} | ${bar} ${count}`;
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
