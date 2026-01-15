/**
 * Request Logging Middleware (F077)
 *
 * Express middleware that logs all incoming requests with:
 * - Request method and path
 * - Request timing using logger.time/timeEnd
 * - Response status code
 * - Client ID if present in headers
 *
 * Usage:
 *   import requestLogger from './middleware/requestLogger.js'
 *   app.use(requestLogger)
 */

import logger from '../utils/logger.js'

/**
 * Generate a unique request ID for tracking
 * Format: req-<timestamp>-<random>
 * @returns {string} Unique request identifier
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `req-${timestamp}-${random}`
}

/**
 * Get the client ID from request headers
 * Checks common header names for client identification
 * @param {import('express').Request} req - Express request object
 * @returns {string|null} Client ID or null if not present
 */
function getClientId(req) {
  // Check common header names for client identification
  return (
    req.headers['x-client-id'] ||
    req.headers['client-id'] ||
    req.headers['x-request-id'] ||
    null
  )
}

/**
 * Format HTTP status code with color indicator
 * @param {number} statusCode - HTTP status code
 * @returns {string} Status code description
 */
function getStatusDescription(statusCode) {
  if (statusCode >= 500) {
    return 'error'
  } else if (statusCode >= 400) {
    return 'client error'
  } else if (statusCode >= 300) {
    return 'redirect'
  } else if (statusCode >= 200) {
    return 'success'
  }
  return 'info'
}

/**
 * Request logging middleware
 * Logs incoming requests and their completion with timing information
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
function requestLogger(req, res, next) {
  // Generate a unique request ID for this request
  const requestId = generateRequestId()

  // Extract request info
  const method = req.method
  const path = req.originalUrl || req.url
  const clientId = getClientId(req)

  // Build context object for logging
  const requestContext = {
    method,
    path,
    ...(clientId && { clientId }),
  }

  // Log the incoming request
  logger.debug('API', `Incoming ${method} ${path}`, requestContext)

  // Start timing the request
  logger.time('API', requestId)

  // Capture the original end function to log response
  const originalEnd = res.end

  // Override res.end to log when response is sent
  res.end = function(chunk, encoding) {
    // Restore original end function
    res.end = originalEnd

    // Call the original end function
    res.end(chunk, encoding)

    // Get response info
    const statusCode = res.statusCode
    const statusDescription = getStatusDescription(statusCode)

    // Build response context
    const responseContext = {
      method,
      path,
      statusCode,
      status: statusDescription,
      ...(clientId && { clientId }),
    }

    // End timing and log completion
    logger.timeEnd('API', requestId)

    // Log based on status code severity
    if (statusCode >= 500) {
      logger.error('API', `${method} ${path} -> ${statusCode}`, responseContext)
    } else if (statusCode >= 400) {
      logger.warn('API', `${method} ${path} -> ${statusCode}`, responseContext)
    } else {
      logger.info('API', `${method} ${path} -> ${statusCode}`, responseContext)
    }
  }

  next()
}

export default requestLogger
