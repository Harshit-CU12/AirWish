/**
 * AirWish Security & Input Sanitization Utilities
 * Prevents Cross-Site Scripting (XSS), prototype pollution, and malformed inputs.
 */

/**
 * Strips HTML tags, trims whitespace, and limits string length to prevent injection attacks.
 */
export function sanitizeInput(input: unknown, maxLength = 300): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[<>"'&]/g, (char) => {
      switch (char) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#x27;';
        case '&':
          return '&amp;';
        default:
          return char;
      }
    })
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and sanitizes a user query before transmitting to AI services.
 */
export function sanitizeAdvisorQuery(query: string): string {
  if (!query) return '';
  // Remove control characters, collapse redundant whitespace
  const cleaned = query
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 400);
}

/**
 * Clamps numeric inputs to safe biological / engineering boundaries.
 */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}
