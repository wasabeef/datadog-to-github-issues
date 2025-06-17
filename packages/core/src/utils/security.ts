/**
 * Security utilities for masking sensitive data
 */

const SENSITIVE_PATTERNS = [
  // Email addresses
  {
    pattern:
      /([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replacement: '$1***@$2',
  },
  // Phone numbers (Japanese format with hyphens) - check first
  {
    pattern: /\b0\d{1,4}-\d{1,4}-\d{4}\b/g,
    replacement: '0**-****-****',
  },
  // Phone numbers (Japanese format without hyphens - 10-11 digits starting with 0)
  {
    pattern: /\b0\d{9,10}\b/g,
    replacement: '0**********',
  },
  // Phone numbers (various international formats) - check after Japanese formats
  {
    pattern: /(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g,
    replacement: '***-***-****',
  },
  // Names (Japanese and Western patterns in specific contexts)
  {
    pattern:
      /("(?:name|fullName|firstName|lastName|displayName|userName)"\s*:\s*")([^"]+)"/gi,
    replacement: '$1[NAME_REDACTED]"',
  },
  // Address patterns (Japanese postal codes - in address context only)
  {
    pattern: /(住所|郵便番号|postal|zip).*?[〒]?(\d{3}-?\d{4})/gi,
    replacement: '$1 〒***-****',
  },
  // Address patterns (US ZIP codes - in address context only)
  {
    pattern: /\b(zip|postal|postcode)[:\s]+(\d{5}(-\d{4})?)\b/gi,
    replacement: '$1: *****$3',
  },
  // Credit card numbers
  {
    pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    replacement: '****-****-****-****',
  },
  // JWT tokens
  {
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    replacement: 'eyJ***.[REDACTED].***',
  },
  // API keys and secrets in key-value pairs
  {
    pattern:
      /(["']?(?:key|token|secret|password|auth|api_key|apikey)["']?\s*[:=]\s*["']?)([a-zA-Z0-9_\-/+]{8,})["']?/gi,
    replacement: '$1[REDACTED]',
  },
];

/**
 * Masks sensitive data patterns in text content
 * @param text - Text content to mask
 * @returns Text with sensitive patterns replaced
 */
export function maskSensitiveData(text: string): string {
  if (!text) return text;

  let maskedText = text;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    maskedText = maskedText.replace(pattern, replacement);
  }

  return maskedText;
}

const SENSITIVE_CONTEXT_KEYS = [
  // Authentication & API related (keep these)
  'password',
  'secret',
  'token',
  'api_key',
  'apikey',
  'private_key',
  'auth',
  'authorization',

  // Personal information (main focus)
  'email',
  'mail',
  'name',
  'fullname',
  'firstname',
  'lastname',
  'displayname',
  'username',
  'realname',
  'phone',
  'telephone',
  'mobile',
  'address',
  'street',
  'city',
  'zip',
  'postal',
  'postcode',

  // Financial information
  'credit_card',
  'creditcard',
  'card_number',
  'ssn',
  'social_security',
];

/**
 * Filters sensitive keys from context objects recursively
 * @param context - Object context to filter
 * @returns Filtered context with sensitive data masked or removed
 */
export function filterSensitiveContext(context: any): any {
  if (!context || typeof context !== 'object') {
    return context;
  }

  if (Array.isArray(context)) {
    return context.map((item) => filterSensitiveContext(item));
  }

  const filtered: any = {};

  for (const [key, value] of Object.entries(context)) {
    const lowerKey = key.toLowerCase();

    // Check if key contains sensitive terms
    const isSensitive = SENSITIVE_CONTEXT_KEYS.some((term) =>
      lowerKey.includes(term)
    );

    if (isSensitive) {
      if (typeof value === 'object' && value !== null) {
        // For sensitive objects, recursively process but mark sensitive keys as redacted
        filtered[key] = filterSensitiveContext(value);
      } else {
        filtered[key] = '[REDACTED]';
      }
    } else if (typeof value === 'string') {
      filtered[key] = maskSensitiveData(value);
    } else if (typeof value === 'object') {
      filtered[key] = filterSensitiveContext(value);
    } else {
      filtered[key] = value;
    }
  }

  return filtered;
}

export function secureLog(message: string): string {
  return maskSensitiveData(message);
}
