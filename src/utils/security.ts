/**
 * Security utilities for masking sensitive data
 */

const SENSITIVE_PATTERNS = [
  // Email addresses
  {
    pattern:
      /([a-zA-Z0-9._%+-]{3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replacement: '$1***@$2',
  },
  // IP addresses
  {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: 'xxx.xxx.xxx.xxx',
  },
  // UUIDs (partial masking)
  {
    pattern:
      /([a-f0-9]{8})-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-([a-f0-9]{4})[a-f0-9]{8}/gi,
    replacement: '$1-****-****-****-$2****',
  },
  // JWT tokens
  {
    pattern: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
    replacement: 'eyJ***.[REDACTED].***',
  },
  // API keys and secrets
  {
    pattern:
      /([a-zA-Z_-]*(?:key|token|secret|password|auth|api_key|apikey)[a-zA-Z_-]*\s*[:=]\s*)([^\s,;}"']+)/gi,
    replacement: '$1[REDACTED]',
  },
  // Credit card numbers
  {
    pattern: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
    replacement: '****-****-****-****',
  },
  // Social Security Numbers
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: 'XXX-XX-XXXX',
  },
];

export function maskSensitiveData(text: string): string {
  if (!text) return text;

  let maskedText = text;

  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    maskedText = maskedText.replace(pattern, replacement);
  }

  return maskedText;
}

const SENSITIVE_CONTEXT_KEYS = [
  'password',
  'secret',
  'token',
  'key',
  'auth',
  'authorization',
  'api_key',
  'apikey',
  'private_key',
  'credit_card',
  'ssn',
  'social_security',
];

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
