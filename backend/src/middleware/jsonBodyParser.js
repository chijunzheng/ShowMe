/**
 * Route-aware JSON body parser middleware
 *
 * Security posture: keep a strict small default limit, and explicitly allow
 * larger payloads only for known routes that require it.
 *
 * Rationale:
 * - Most `/api/*` routes should be protected by a small JSON limit.
 * - `/api/slides/*` and `/api/world/piece/*` can legitimately be large.
 * - `/api/learn/*` includes slide text and can exceed 10kb, but should not
 *   accept unbounded payloads.
 */

import express from 'express'

/**
 * Create a route-aware JSON body parser middleware.
 *
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
export function createJsonBodyParserMiddleware() {
  const smallJson = express.json({ limit: '10kb' })
  const learnJson = express.json({ limit: '2mb' })
  const largeJson = express.json({ limit: '20mb' })

  return function jsonBodyParser(req, res, next) {
    const path = req.path || ''

    if (path.startsWith('/api/slides') || path.startsWith('/api/world/piece')) {
      return largeJson(req, res, next)
    }

    if (path.startsWith('/api/learn')) {
      return learnJson(req, res, next)
    }

    return smallJson(req, res, next)
  }
}

export default createJsonBodyParserMiddleware

