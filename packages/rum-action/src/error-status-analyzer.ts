import { ErrorGroup } from './error-processor';

/**
 * Analyzes error patterns to infer status
 */
export class ErrorStatusAnalyzer {
  /**
   * Infers if an error is likely resolved based on occurrence patterns
   */
  isLikelyResolved(errorGroup: ErrorGroup): boolean {
    const now = Date.now();
    const lastSeenAgo = now - errorGroup.lastSeen;
    const firstSeenAgo = now - errorGroup.firstSeen;
    
    // If error hasn't occurred in 7 days, likely resolved
    const RESOLVED_THRESHOLD = 7 * 24 * 60 * 60 * 1000;
    if (lastSeenAgo > RESOLVED_THRESHOLD) {
      return true;
    }
    
    // If error is old (>30 days) and rare (<5 occurrences), likely resolved
    const OLD_ERROR_THRESHOLD = 30 * 24 * 60 * 60 * 1000;
    if (firstSeenAgo > OLD_ERROR_THRESHOLD && errorGroup.count < 5) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Infers if an error needs review based on patterns
   */
  isForReview(errorGroup: ErrorGroup): boolean {
    const now = Date.now();
    const lastSeenAgo = now - errorGroup.lastSeen;
    const firstSeenAgo = now - errorGroup.firstSeen;
    
    // New error (first seen in last 24h)
    const NEW_ERROR_THRESHOLD = 24 * 60 * 60 * 1000;
    if (firstSeenAgo < NEW_ERROR_THRESHOLD) {
      return true;
    }
    
    // Recent spike (>10 occurrences in last 24h)
    const recentOccurrences = errorGroup.occurrences.filter(
      e => now - e.attributes.timestamp < NEW_ERROR_THRESHOLD
    ).length;
    if (recentOccurrences > 10) {
      return true;
    }
    
    // Regression (was quiet, now active again)
    const QUIET_PERIOD = 3 * 24 * 60 * 60 * 1000; // 3 days
    const wasQuiet = lastSeenAgo > QUIET_PERIOD;
    const isActiveNow = errorGroup.occurrences.some(
      e => now - e.attributes.timestamp < NEW_ERROR_THRESHOLD
    );
    if (wasQuiet && isActiveNow) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Gets inferred status with confidence level
   */
  inferStatus(errorGroup: ErrorGroup): {
    status: 'FOR_REVIEW' | 'LIKELY_RESOLVED' | 'ACTIVE' | 'UNKNOWN';
    confidence: number;
    reason: string;
  } {
    if (this.isLikelyResolved(errorGroup)) {
      return {
        status: 'LIKELY_RESOLVED',
        confidence: 0.8,
        reason: 'No recent occurrences'
      };
    }
    
    if (this.isForReview(errorGroup)) {
      const isNew = Date.now() - errorGroup.firstSeen < 24 * 60 * 60 * 1000;
      return {
        status: 'FOR_REVIEW',
        confidence: 0.9,
        reason: isNew ? 'New error' : 'Recent spike or regression'
      };
    }
    
    // Active but stable
    if (errorGroup.count > 10) {
      return {
        status: 'ACTIVE',
        confidence: 0.7,
        reason: 'Ongoing error with stable pattern'
      };
    }
    
    return {
      status: 'UNKNOWN',
      confidence: 0.3,
      reason: 'Insufficient data to determine status'
    };
  }
}