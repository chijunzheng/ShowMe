import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/slideStore.js', () => ({
  saveSlides: vi.fn(),
}))

vi.mock('../../services/storyStorage.js', () => ({
  saveStory: vi.fn(),
}))

vi.mock('../../services/graphStorage.js', () => ({
  saveGraphState: vi.fn(),
}))

vi.mock('../../services/modeSessionStorage.js', () => ({
  saveModeSession: vi.fn(),
}))

vi.mock('../../services/migrationStore.js', () => ({
  getMigrationMarker: vi.fn(),
  setMigrationMarker: vi.fn(),
}))

vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import migrationRouter from '../migration.js'
import { saveSlides } from '../../services/slideStore.js'
import { saveStory } from '../../services/storyStorage.js'
import { saveGraphState } from '../../services/graphStorage.js'
import { saveModeSession } from '../../services/modeSessionStorage.js'
import { getMigrationMarker, setMigrationMarker } from '../../services/migrationStore.js'

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

  migrationRouter.handle(req, res, (error) => {
    if (error) {
      res.__done.reject(error)
    } else {
      res.__done.resolve()
    }
  })

  await res.__done.promise
  return res
}

describe('Migration Routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getMigrationMarker.mockResolvedValue(null)
    setMigrationMarker.mockResolvedValue({ success: true, error: null })
    saveSlides.mockResolvedValue(true)
    saveStory.mockResolvedValue({ story: { id: 's1' }, error: null })
    saveGraphState.mockResolvedValue({ success: true, error: null })
    saveModeSession.mockResolvedValue({ success: true, error: null })
  })

  it('POST /import-local returns 400 for missing required fields', async () => {
    const res = await testRequest('POST', '/import-local', {
      body: { clientId: 'c1' },
    })

    expect(res.statusCode).toBe(400)
    expect(res.body?.error).toBe('clientId, migrationVersion, and checksum are required')
  })

  it('POST /import-local returns alreadyImported when checksum matches marker', async () => {
    getMigrationMarker.mockResolvedValueOnce({
      checksum: 'same-checksum',
      summary: { topicsImported: 2 },
    })

    const res = await testRequest('POST', '/import-local', {
      body: {
        clientId: 'client-a',
        migrationVersion: 'v1',
        checksum: 'same-checksum',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({
      success: true,
      imported: false,
      alreadyImported: true,
      summary: { topicsImported: 2 },
    })
    expect(saveGraphState).not.toHaveBeenCalled()
    expect(setMigrationMarker).not.toHaveBeenCalled()
  })

  it('POST /import-local imports graph/topics/stories/modes and marks migration', async () => {
    const res = await testRequest('POST', '/import-local', {
      body: {
        clientId: 'client-a',
        migrationVersion: 'v1',
        checksum: 'checksum-1',
        graph: { nodes: [{ id: 'n1' }] },
        topics: [
          {
            id: 'topic-1',
            versions: [
              { id: 'v_1', slides: [{ id: 'slide-1', subtitle: 'S1' }] },
            ],
          },
        ],
        stories: [{ id: 'story-1', topicName: 'Ocean' }],
        modeSessions: [{ mode: 'wonder', topicId: 'topic-1', session: { xpEarned: 30 } }],
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body?.success).toBe(true)
    expect(res.body?.imported).toBe(true)
    expect(res.body?.alreadyImported).toBe(false)

    expect(saveGraphState).toHaveBeenCalledWith('client-a', { nodes: [{ id: 'n1' }] })
    expect(saveSlides).toHaveBeenCalledWith({
      clientId: 'client-a',
      topicId: 'topic-1',
      versionId: 'v_1',
      slides: [{ id: 'slide-1', subtitle: 'S1' }],
    })
    expect(saveStory).toHaveBeenCalledWith('client-a', { id: 'story-1', topicName: 'Ocean' })
    expect(saveModeSession).toHaveBeenCalledWith({
      clientId: 'client-a',
      mode: 'wonder',
      topicId: 'topic-1',
      topicName: undefined,
      versionId: undefined,
      completedAt: undefined,
      session: { xpEarned: 30 },
    })

    expect(setMigrationMarker).toHaveBeenCalled()
  })
})
