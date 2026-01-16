/**
 * Logger Utility (F061)
 *
 * A frontend logger with styled Chrome console output, supporting:
 * - Four log levels: debug, info, warn, error
 * - Category-based filtering
 * - Runtime configuration via window.LOG_LEVEL and window.LOG_CATEGORIES
 * - Environment-based defaults (disabled in production)
 *
 * Usage:
 *   import logger from './utils/logger'
 *   logger.debug('AUDIO', 'Starting audio capture', { sampleRate: 44100 })
 *   logger.info('API', 'Request completed')
 *   logger.warn('WS', 'Connection unstable')
 *   logger.error('STATE', 'Failed to update', { error: err })
 *
 * Runtime Configuration:
 *   window.LOG_LEVEL = 'debug' | 'info' | 'warn' | 'error' | 'none'
 *   window.LOG_CATEGORIES = ['API', 'WS'] or ['*'] for all
 *   window.enableLogging() // Enable debug-level logging for all categories
 */

// Log level hierarchy (lower number = more verbose)
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
}

// Log level styling configuration with icons and colors
const LEVEL_CONFIG = {
  debug: {
    icon: '\uD83D\uDD0D', // Magnifying glass
    color: '#9CA3AF',    // Gray
    method: 'debug',
  },
  info: {
    icon: '\u2139\uFE0F', // Information
    color: '#3B82F6',    // Blue
    method: 'info',
  },
  warn: {
    icon: '\u26A0\uFE0F', // Warning
    color: '#F59E0B',    // Orange
    method: 'warn',
  },
  error: {
    icon: '\u274C',      // Cross mark
    color: '#EF4444',    // Red
    method: 'error',
  },
}

// Category color mapping for visual distinction
const CATEGORY_COLORS = {
  AUDIO: '#8B5CF6',      // Purple
  API: '#06B6D4',        // Cyan
  WS: '#10B981',         // Green
  STATE: '#6366F1',      // Indigo
  GENERATION: '#EC4899', // Pink
  UI: '#F59E0B',         // Amber
  PERF: '#059669',       // Emerald
  STORAGE: '#14B8A6',    // Teal (CORE027)
}

// Default category color for unknown categories
const DEFAULT_CATEGORY_COLOR = '#6B7280' // Gray-500

/**
 * Get the current log level from window or environment
 * Priority: window.LOG_LEVEL > VITE_LOG_LEVEL > default based on environment
 * @returns {string} Current log level
 */
function getCurrentLogLevel() {
  // Check runtime override first
  if (typeof window !== 'undefined' && window.LOG_LEVEL) {
    return window.LOG_LEVEL
  }

  // Check environment variable (set at build time)
  if (import.meta.env.VITE_LOG_LEVEL) {
    return import.meta.env.VITE_LOG_LEVEL
  }

  // Default: disabled in production, 'info' in development
  return import.meta.env.PROD ? 'none' : 'info'
}

/**
 * Get the current allowed categories from window or environment
 * Priority: window.LOG_CATEGORIES > VITE_LOG_CATEGORIES > '*' (all)
 * @returns {string[]} Array of allowed category names or ['*'] for all
 */
function getAllowedCategories() {
  // Check runtime override first
  if (typeof window !== 'undefined' && Array.isArray(window.LOG_CATEGORIES)) {
    return window.LOG_CATEGORIES
  }

  // Check environment variable (comma-separated string)
  if (import.meta.env.VITE_LOG_CATEGORIES) {
    const categories = import.meta.env.VITE_LOG_CATEGORIES.split(',').map(c => c.trim())
    return categories.length > 0 ? categories : ['*']
  }

  // Default: allow all categories
  return ['*']
}

/**
 * Check if a log should be output based on level and category filters
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} category - Log category (AUDIO, API, WS, etc.)
 * @returns {boolean} Whether the log should be output
 */
function shouldLog(level, category) {
  const currentLevel = getCurrentLogLevel()
  const allowedCategories = getAllowedCategories()

  // Check if level is allowed
  const currentLevelValue = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.warn
  const targetLevelValue = LOG_LEVELS[level] ?? LOG_LEVELS.info

  if (targetLevelValue < currentLevelValue) {
    return false
  }

  // Check if category is allowed
  if (!allowedCategories.includes('*') && !allowedCategories.includes(category)) {
    return false
  }

  return true
}

/**
 * Format timestamp in HH:MM:SS.mmm format
 * @returns {string} Formatted timestamp
 */
function formatTimestamp() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  const millis = String(now.getMilliseconds()).padStart(3, '0')
  return `${hours}:${minutes}:${seconds}.${millis}`
}

/**
 * Get color for a category, with fallback for unknown categories
 * @param {string} category - Category name
 * @returns {string} Hex color code
 */
function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_CATEGORY_COLOR
}

/**
 * Create a log function for a specific level
 * @param {string} level - Log level (debug, info, warn, error)
 * @returns {Function} Log function that accepts (category, message, context?)
 */
function createLogFunction(level) {
  const config = LEVEL_CONFIG[level]

  return function(category, message, context) {
    // Skip if logging is filtered out
    if (!shouldLog(level, category)) {
      return
    }

    const timestamp = formatTimestamp()
    const levelColor = config.color
    const categoryColor = getCategoryColor(category)
    const consoleMethod = console[config.method] || console.log

    // Format the main log line with CSS styling
    // We use two %c markers: one for level styling, one for category
    // Format: [HH:MM:SS.mmm] ICON LEVEL [CATEGORY] message
    const formattedPrefix = `%c[${timestamp}] ${config.icon} ${level.toUpperCase()}%c [${category}]`

    if (context !== undefined) {
      // Log with context object on a new line with tree-like formatting
      consoleMethod(
        `${formattedPrefix} ${message}`,
        `color: ${levelColor}; font-weight: bold`,
        `color: ${categoryColor}; font-weight: bold`
      )
      // Output context with indentation to show hierarchy
      consoleMethod(
        '%c\u2514\u2500',
        'color: #9CA3AF',
        context
      )
    } else {
      // Log without context
      consoleMethod(
        `${formattedPrefix} ${message}`,
        `color: ${levelColor}; font-weight: bold`,
        `color: ${categoryColor}; font-weight: bold`
      )
    }
  }
}

/**
 * Enable logging helper function - sets log level to debug for all categories
 * Exposed on window for runtime debugging
 */
function enableLogging() {
  if (typeof window !== 'undefined') {
    window.LOG_LEVEL = 'debug'
    window.LOG_CATEGORIES = ['*']
    console.info(
      '%c[Logger] Logging enabled: level=debug, categories=*',
      'color: #3B82F6; font-weight: bold'
    )
  }
}

/**
 * Disable logging helper function - sets log level to none
 * Exposed on window for runtime control
 */
function disableLogging() {
  if (typeof window !== 'undefined') {
    window.LOG_LEVEL = 'none'
    console.info(
      '%c[Logger] Logging disabled',
      'color: #9CA3AF; font-weight: bold'
    )
  }
}

/**
 * Set specific log level at runtime
 * @param {string} level - Log level (debug, info, warn, error, none)
 */
function setLogLevel(level) {
  if (typeof window !== 'undefined' && LOG_LEVELS[level] !== undefined) {
    window.LOG_LEVEL = level
    console.info(
      `%c[Logger] Log level set to: ${level}`,
      'color: #3B82F6; font-weight: bold'
    )
  }
}

/**
 * Set specific categories at runtime
 * @param {string[]} categories - Array of category names or ['*'] for all
 */
function setLogCategories(categories) {
  if (typeof window !== 'undefined' && Array.isArray(categories)) {
    window.LOG_CATEGORIES = categories
    console.info(
      `%c[Logger] Categories set to: ${categories.join(', ')}`,
      'color: #3B82F6; font-weight: bold'
    )
  }
}

// Performance timing storage
const timers = new Map()

/**
 * Start a performance timer for measuring operation duration (F067)
 * @param {string} category - Log category (AUDIO, API, WS, etc.)
 * @param {string} label - Unique label to identify the timing operation
 */
function time(category, label) {
  const key = `${category}:${label}`
  timers.set(key, {
    start: performance.now(),
    category,
    label,
  })
}

/**
 * End a performance timer and log the duration (F067)
 * @param {string} category - Log category (must match time() call)
 * @param {string} label - Label used in time() call
 */
function timeEnd(category, label) {
  const key = `${category}:${label}`
  const timer = timers.get(key)

  if (!timer) {
    console.warn(`[Logger] Timer not found: ${key}`)
    return
  }

  const duration = performance.now() - timer.start
  timers.delete(key)

  // Use the PERF category color for timing logs
  const perfColor = CATEGORY_COLORS.PERF || '#059669'
  const categoryColor = getCategoryColor(category)

  // Only log if PERF category is allowed (or using the original category)
  if (!shouldLog('info', category) && !shouldLog('info', 'PERF')) {
    return
  }

  const timestamp = formatTimestamp()
  const formattedDuration = duration < 1000
    ? `${duration.toFixed(2)}ms`
    : `${(duration / 1000).toFixed(2)}s`

  console.info(
    `%c[${timestamp}] ⏱️ PERF%c [${category}] ${label}: ${formattedDuration}`,
    `color: ${perfColor}; font-weight: bold`,
    `color: ${categoryColor}; font-weight: bold`
  )
}

// Create the logger object with methods for each level
const logger = {
  debug: createLogFunction('debug'),
  info: createLogFunction('info'),
  warn: createLogFunction('warn'),
  error: createLogFunction('error'),

  // Performance timing methods (F067)
  time,
  timeEnd,

  // Utility methods for runtime configuration
  enable: enableLogging,
  disable: disableLogging,
  setLevel: setLogLevel,
  setCategories: setLogCategories,
}

// Expose helper functions on window for console access during development
if (typeof window !== 'undefined') {
  window.enableLogging = enableLogging
  window.disableLogging = disableLogging
  window.setLogLevel = setLogLevel
  window.setLogCategories = setLogCategories
}

export default logger

// Named exports for granular imports
export const { debug, info, warn, error } = logger
