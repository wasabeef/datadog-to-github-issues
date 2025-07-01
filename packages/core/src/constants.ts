/**
 * Shared constants across the application
 */

// API Limits
export const API_LIMITS = {
  RUM_EVENTS_PER_PAGE: 100,
  MAX_PAGES: 10,
  GITHUB_SEARCH_PER_PAGE: 10,
  MAX_STORED_OCCURRENCES: 100,
} as const;

// Time Intervals (in milliseconds)
export const TIME_INTERVALS = {
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

// Error Analysis Thresholds
export const ERROR_THRESHOLDS = {
  NEW_ERROR_WINDOW: 24 * 60 * 60 * 1000, // 24 hours
  RESOLVED_THRESHOLD: 7 * 24 * 60 * 60 * 1000, // 7 days
  OLD_ERROR_THRESHOLD: 30 * 24 * 60 * 60 * 1000, // 30 days
  QUIET_PERIOD: 3 * 24 * 60 * 60 * 1000, // 3 days
  RECENT_SPIKE_COUNT: 10,
  RARE_ERROR_COUNT: 5,
} as const;

// Issue Management
export const ISSUE_MANAGEMENT = {
  REOPEN_WINDOW_DAYS: 7,
  AUTO_CLOSE_DAYS: 30,
  STALE_ISSUE_DAYS: 90,
  MAX_ISSUES_PER_RUN_DEFAULT: 10,
  MAX_ISSUES_PER_RUN_LIMIT: 100,
} as const;

// Stack Trace Analysis
export const STACK_TRACE = {
  MAX_FRAMES_TO_DISPLAY: 3,
  NORMALIZATION_LINES: 5,
} as const;

// UI Display Limits
export const DISPLAY_LIMITS = {
  MAX_URLS_TO_SHOW: 5,
  MAX_USER_IDS_TO_SHOW: 5,
  MAX_COUNTRIES_TO_SHOW: 5,
  MAX_OS_TO_SHOW: 5,
  TIMELINE_HOURS: 24,
  ERROR_TIMELINE_BAR_WIDTH: 20,
} as const;

// Sensitive Data Patterns
export const SENSITIVE_DATA = {
  MAX_PHONE_DIGITS_TO_SHOW: 2,
  MASKED_EMAIL_PREFIX_LENGTH: 3,
} as const;
