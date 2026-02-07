import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/modeSessionStorage.js', () => ({
  saveModeSession: vi.fn(),
  loadLatestModeSession: vi.fn(),
  listModeSessions: vi.fn(),
}))

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import modesRouter from '../modes.js'
import {
  saveModeSession,
  loadLatestModeSession,
  listModeSessions,
} from '../../services/modeSessionStorage.js'

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      this.__done?.resolve()
      return this
    },
  }

  res.__done = {}
  res.__done.promise = new Promise((resolve, reject) => {
    res.__done.resolve = resolve
    res.__done.reject = reject
  })

  return res
}

async function testRequest(method, path, { body = null } = {}) {
  const req = {
    method,
    url: path,
    body,
  }

  const res = createMockRes()

  modesRouter.handle(req, res, (error) => {
    if (error) {
      res.__done.reject(error)
    } else {
      res.__done.resolve()
    }
  })

  await res.__done.promise
  return res
}

describe('Modes Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('POST /save returns 400 for missing required fields', async () => {
    const res = await testRequest('POST', '/save', {
      body: { clientId: 'abc' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('clientId, mode, and topicId are required')
    expect(saveModeSession).not.toHaveBeenCalled()
  })

  it('POST /save persists a mode session', async () => {
    saveModeSession.mockResolvedValueOnce({ success: true, error: null })

    const res = await testRequest('POST', '/save', {
      body: {
        clientId: '  c1  ',
        mode: '  wonder ',
        topicId: ' t1 ',
        topicName: ' Ocean Currents ',
        versionId: ' v1 ',
        session: { completedAt: 123 },
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(saveModeSession).toHaveBeenCalledWith({
      clientId: 'c1',
      mode: 'wonder',
      topicId: 't1',
      topicName: 'Ocean Currents',
      versionId: 'v1',
      completedAt: undefined,
      session: { completedAt: 123 },
    })
  })

  it('POST /latest returns 400 for missing required fields', async () => {
    const res = await testRequest('POST', '/latest', {
      body: { clientId: 'c1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('clientId and mode are required')
    expect(loadLatestModeSession).not.toHaveBeenCalled()
  })

  it('POST /latest returns latest session payload', async () => {
    const mockSession = { mode: 'mystery', completedAt: 1000, session: { xpEarned: 45 } }
    loadLatestModeSession.mockResolvedValueOnce({ session: mockSession, error: null })

    const res = await testRequest('POST', '/latest', {
      body: {
        clientId: ' c1 ',
        mode: ' mystery ',
        topicId: ' t1 ',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ session: mockSession })
  })

  it('POST /list requires clientId', async () => {
    const res = await testRequest('POST', '/list', {
      body: { mode: 'mystery' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('clientId is required')
    expect(listModeSessions).not.toHaveBeenCalled()
  })
})
