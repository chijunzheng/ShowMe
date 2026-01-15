/**
 * Logger Utility (F076)
 *
 * A backend logger with styled terminal output using ANSI escape codes.
 * Supports:
 * - Four log levels: debug, info, warn, error
 * - Category-based filtering (API, WS, GEMINI, STATE, GENERATION)
 * - Environment variable configuration: LOG_LEVEL, LOG_CATEGORIES
 * - Performance timing with time/timeEnd methods
 * - Automatic file logging to /tmp/showme-server.log
 *
 * Usage:
 *   const logger = require('./utils/logger.js')
 *   logger.debug('API', 'Processing request', { path: '/api/generate' })
 *   logger.info('GEMINI', 'Calling STT API', { size: 1024 })
 *   logger.warn('WS', 'Client disconnected', { id: 'abc123' })
 *   logger.error('API', 'Request failed', { error: err.message })
 *
 * Performance Timing:
 *   logger.time('API', 'generate-request')
 *   // ... operation ...
 *   logger.timeEnd('API', 'generate-request')
 *
 * Environment Variables:
 *   LOG_LEVEL=debug|info|warn|error|none
 *   LOG_CATEGORIES=API,WS,GEMINI (or * for all)
 *   LOG_FILE=/path/to/file.log (default: /tmp/showme-server.log)
 */

import fs from 'fs'
import path from 'path'

// Log file configuration
const LOG_FILE_PATH = process.env.LOG_FILE || '/tmp/showme-server.log'
let logFileStream = null

/**
 * Initialize the log file stream
 * Creates or appends to the log file
 */
function initLogFile() {
  if (logFileStream) return logFileStream

  try {
    // Ensure directory exists
    const dir = path.dirname(LOG_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Create write stream in append mode
    logFileStream = fs.createWriteStream(LOG_FILE_PATH, { flags: 'a' })

    // Write session header
    const sessionHeader = `\n${'='.repeat(60)}\n[SESSION START] ${new Date().toISOString()}\n${'='.repeat(60)}\n`
    logFileStream.write(sessionHeader)

    console.log(`[Logger] Writing logs to: ${LOG_FILE_PATH}`)
    return logFileStream
  } catch (error) {
    console.error(`[Logger] Failed to create log file: ${error.message}`)
    return null
  }
}

/**
 * Write a plain text log entry to the file (no ANSI colors)
 * @param {string} level - Log level
 * @param {string} category - Log category
 * @param {string} message - Log message
 * @param {any} context - Optional context object
 */
function writeToFile(level, category, message, context) {
  const stream = initLogFile()
  if (!stream) return

  const timestamp = new Date().toISOString()
  const levelUpper = level.toUpperCase().padEnd(5)
  const categoryUpper = category.toUpperCase()

  let line = `[${timestamp}] ${levelUpper} [${categoryUpper}] ${message}\n`

  if (context !== undefined && context !== null) {
    try {
      const contextStr = context instanceof Error
        ? context.stack || context.message
        : JSON.stringify(context, null, 2)
      line += `  └─ ${contextStr.replace(/\n/g, '\n     ')}\n`
    } catch {
      line += `  └─ ${String(context)}\n`
    }
  }

  stream.write(line)
}

// ANSI escape codes for terminal styling
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright foreground colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
}

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
    icon: '\u{1F50D}', // Magnifying glass
    color: ANSI.brightBlack,
    method: 'debug',
  },
  info: {
    icon: '\u{2139}\u{FE0F}', // Information
    color: ANSI.blue,
    method: 'info',
  },
  warn: {
    icon: '\u{26A0}\u{FE0F}', // Warning
    color: ANSI.yellow,
    method: 'warn',
  },
  error: {
    icon: '\u{274C}', // Cross mark
    color: ANSI.red,
    method: 'error',
  },
}

// Category color mapping for visual distinction
const CATEGORY_COLORS = {
  API: ANSI.cyan,
  WS: ANSI.green,
  GEMINI: ANSI.magenta,
  STATE: ANSI.blue,
  GENERATION: ANSI.brightMagenta,
  PERF: ANSI.brightGreen,
}

// Default category color for unknown categories
const DEFAULT_CATEGORY_COLOR = ANSI.brightBlack

/**
 * Get the current log level from environment variables
 * Default: 'info' in development, 'warn' in production
 * @returns {string} Current log level
 */
function getCurrentLogLevel() {
  // Check environment variable
  if (process.env.LOG_LEVEL) {
    const level = process.env.LOG_LEVEL.toLowerCase()
    if (LOG_LEVELS[level] !== undefined) {
      return level
    }
  }

  // Default: 'warn' in production, 'info' in development
  return process.env.NODE_ENV === 'production' ? 'warn' : 'info'
}

/**
 * Get the allowed categories from environment variables
 * @returns {string[]} Array of allowed category names or ['*'] for all
 */
function getAllowedCategories() {
  // Check environment variable (comma-separated string)
  if (process.env.LOG_CATEGORIES) {
    const categories = process.env.LOG_CATEGORIES.split(',').map(c => c.trim().toUpperCase())
    return categories.length > 0 ? categories : ['*']
  }

  // Default: allow all categories
  return ['*']
}

/**
 * Check if a log should be output based on level and category filters
 * @param {string} level - Log level (debug, info, warn, error)
 * @param {string} category - Log category (API, WS, GEMINI, etc.)
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
  if (!allowedCategories.includes('*') && !allowedCategories.includes(category.toUpperCase())) {
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
 * @returns {string} ANSI color code
 */
function getCategoryColor(category) {
  return CATEGORY_COLORS[category.toUpperCase()] || DEFAULT_CATEGORY_COLOR
}

/**
 * Format context object for terminal output
 * @param {any} context - Context object to format
 * @returns {string} Formatted context string
 */
function formatContext(context) {
  if (context === undefined || context === null) {
    return ''
  }

  // Handle Error objects specially
  if (context instanceof Error) {
    return context.stack || context.message
  }

  // Try to stringify objects
  try {
    return JSON.stringify(context, null, 2)
  } catch {
    return String(context)
  }
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

    // Format the main log line with ANSI colors
    // Format: [HH:MM:SS.mmm] ICON LEVEL [CATEGORY] message
    const levelStr = `${levelColor}${ANSI.bold}[${timestamp}] ${config.icon} ${level.toUpperCase()}${ANSI.reset}`
    const categoryStr = `${categoryColor}${ANSI.bold}[${category.toUpperCase()}]${ANSI.reset}`

    if (context !== undefined) {
      // Log with context object on separate lines
      consoleMethod(`${levelStr} ${categoryStr} ${message}`)
      // Output context with indentation using dim color
      const formattedContext = formatContext(context)
      if (formattedContext) {
        consoleMethod(`${ANSI.dim}\u2514\u2500 ${formattedContext}${ANSI.reset}`)
      }
    } else {
      // Log without context
      consoleMethod(`${levelStr} ${categoryStr} ${message}`)
    }

    // Also write to log file (plain text, no ANSI colors)
    writeToFile(level, category, message, context)
  }
}

// Performance timing storage
const timers = new Map()

/**
 * Start a performance timer for measuring operation duration
 * @param {string} category - Log category (API, WS, GEMINI, etc.)
 * @param {string} label - Unique label to identify the timing operation
 */
function time(category, label) {
  const key = `${category}:${label}`
  timers.set(key, {
    start: process.hrtime.bigint(),
    category,
    label,
  })
}

/**
 * End a performance timer and log the duration
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

  const endTime = process.hrtime.bigint()
  const durationNs = endTime - timer.start
  const durationMs = Number(durationNs) / 1_000_000
  timers.delete(key)

  // Only log if PERF category is allowed (or using the original category)
  if (!shouldLog('info', category) && !shouldLog('info', 'PERF')) {
    return
  }

  const timestamp = formatTimestamp()
  const perfColor = CATEGORY_COLORS.PERF || ANSI.brightGreen
  const categoryColor = getCategoryColor(category)

  const formattedDuration = durationMs < 1000
    ? `${durationMs.toFixed(2)}ms`
    : `${(durationMs / 1000).toFixed(2)}s`

  const perfStr = `${perfColor}${ANSI.bold}[${timestamp}] \u{23F1}\u{FE0F} PERF${ANSI.reset}`
  const categoryStr = `${categoryColor}${ANSI.bold}[${category.toUpperCase()}]${ANSI.reset}`

  console.info(`${perfStr} ${categoryStr} ${label}: ${formattedDuration}`)

  // Also write to log file
  writeToFile('perf', category, `${label}: ${formattedDuration}`)
}

/**
 * Set log level at runtime (useful for debugging)
 * @param {string} level - Log level (debug, info, warn, error, none)
 */
function setLogLevel(level) {
  if (LOG_LEVELS[level] !== undefined) {
    process.env.LOG_LEVEL = level
    console.info(
      `${ANSI.blue}${ANSI.bold}[Logger] Log level set to: ${level}${ANSI.reset}`
    )
  }
}

/**
 * Set categories at runtime (useful for debugging)
 * @param {string[]} categories - Array of category names or ['*'] for all
 */
function setLogCategories(categories) {
  if (Array.isArray(categories)) {
    process.env.LOG_CATEGORIES = categories.join(',')
    console.info(
      `${ANSI.blue}${ANSI.bold}[Logger] Categories set to: ${categories.join(', ')}${ANSI.reset}`
    )
  }
}

// Create the logger object with methods for each level
const logger = {
  debug: createLogFunction('debug'),
  info: createLogFunction('info'),
  warn: createLogFunction('warn'),
  error: createLogFunction('error'),

  // Performance timing methods
  time,
  timeEnd,

  // Utility methods for runtime configuration
  setLevel: setLogLevel,
  setCategories: setLogCategories,

  // Expose log levels for external use
  LOG_LEVELS,
}

export default logger

// Named exports for granular imports
export const { debug, info, warn, error } = logger
export { time, timeEnd, setLogLevel, setLogCategories, LOG_LEVELS }
