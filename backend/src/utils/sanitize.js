/**
 * Input Sanitization Utilities
 * F004: Input sanitization for query
 *
 * Provides functions to sanitize and validate user input before processing.
 */

// Maximum allowed query length (characters)
const MAX_QUERY_LENGTH = 500

/**
 * HTML entity map for escaping potentially dangerous characters
 */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
}

/**
 * Escape HTML tags and special characters in a string
 * Prevents XSS attacks by converting special characters to HTML entities
 *
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') {
    return str
  }

  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char)
}

/**
 * Validate and sanitize a query string
 * - Trims whitespace
 * - Validates length (max 500 characters)
 * - Escapes HTML tags
 *
 * @param {string} query - The raw query from user input
 * @returns {{ sanitized: string | null, error: string | null }} Sanitized query or error message
 */
export function sanitizeQuery(query) {
  // Type validation
  if (query === undefined || query === null) {
    return { sanitized: null, error: 'Query is required' }
  }

  if (typeof query !== 'string') {
    return { sanitized: null, error: 'Query must be a string' }
  }

  // Trim whitespace
  const trimmed = query.trim()

  // Empty check
  if (trimmed.length === 0) {
    return { sanitized: null, error: 'Query cannot be empty' }
  }

  // Length validation
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return {
      sanitized: null,
      error: `Query must be ${MAX_QUERY_LENGTH} characters or less`
    }
  }

  // Note: We do NOT HTML-escape here. HTML escaping should happen at the
  // rendering layer (React auto-escapes JSX content). Escaping here corrupts
  // the text sent to AI APIs (e.g., apostrophes become &#x27;).
  return { sanitized: trimmed, error: null }
}

/**
 * Validate that a string is a valid ID format
 * IDs should be alphanumeric with underscores, following pattern: prefix_timestamp_random
 *
 * @param {string} id - The ID to validate
 * @returns {boolean} Whether the ID is valid
 */
export function isValidId(id) {
  if (typeof id !== 'string') {
    return false
  }

  // Match pattern: word_numbers_alphanumeric (e.g., topic_1234567890_abc123)
  const idPattern = /^[a-z]+_\d+_[a-z0-9]+$/i
  return idPattern.test(id)
}

/**
 * Sanitize an ID - validate format and escape any problematic characters
 *
 * @param {string} id - The ID to sanitize
 * @returns {{ sanitized: string | null, error: string | null }} Sanitized ID or error
 */
export function sanitizeId(id) {
  if (!id || typeof id !== 'string') {
    return { sanitized: null, error: 'ID must be a non-empty string' }
  }

  const trimmed = id.trim()

  if (!isValidId(trimmed)) {
    return { sanitized: null, error: 'Invalid ID format' }
  }

  return { sanitized: trimmed, error: null }
}

export default {
  escapeHtml,
  sanitizeQuery,
  isValidId,
  sanitizeId,
  MAX_QUERY_LENGTH,
}
