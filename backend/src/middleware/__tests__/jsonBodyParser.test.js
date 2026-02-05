/**
 * JSON Body Parser Middleware Tests
 *
 * NOTE: This test avoids binding to network ports. In this environment,
 * listening sockets are not permitted, so we directly exercise the body parser
 * middleware using a stream-backed mock request.
 *
 * Validates that the route-aware JSON body parser enforces:
 * - Small default limit for most /api/* routes (10kb)
 * - Larger limit for /api/learn/* routes (2mb)
 */

import { describe, it, expect } from 'vitest'
import { PassThrough } from 'stream'
import { createJsonBodyParserMiddleware } from '../jsonBodyParser.js'

async function runParser({ path, bodyObject }) {
  const body = JSON.stringify(bodyObject)
  const middleware = createJsonBodyParserMiddleware()

  const req = new PassThrough()
  req.method = 'POST'
  req.url = path
  req.path = path
  req.headers = {
    'content-type': 'application/json',
    'content-length': String(Buffer.byteLength(body)),
  }

  const res = {}

  const result = await new Promise((resolve) => {
    middleware(req, res, (err) => resolve({ err, req }))
    req.end(body)
  })

  return result
}

describe('jsonBodyParser', () => {
  it('accepts payloads >10kb for /api/learn/*', async () => {
    const largeText = 'a'.repeat(20_000) // ~20kb
    const { err, req } = await runParser({ path: '/api/learn/test', bodyObject: { text: largeText } })

    expect(err).toBeFalsy()
    expect(typeof req.body?.text).toBe('string')
    expect(req.body.text.length).toBe(20_000)
  })

  it('rejects payloads >10kb for non-learn /api/* routes', async () => {
    const largeText = 'a'.repeat(20_000) // ~20kb
    const { err } = await runParser({ path: '/api/other/test', bodyObject: { text: largeText } })

    expect(err?.type).toBe('entity.too.large')
    expect(err?.status).toBe(413)
  })
})
