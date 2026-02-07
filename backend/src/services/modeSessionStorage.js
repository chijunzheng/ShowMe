import { Firestore } from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_LOCAL_FILE = path.resolve(__dirname, '..', '..', '.data', 'modeSessions.json')
const LOCAL_FILE = process.env.SHOWME_LOCAL_MODE_SESSIONS_FILE || DEFAULT_LOCAL_FILE
const LOCAL_SAVE_DEBOUNCE_MS = process.env.NODE_ENV === 'test' ? 0 : 300

const COLLECTION_NAME = 'modeSessions'
const MAX_SESSIONS_PER_KEY = 20
const URL_EXPIRY_MS = 24 * 60 * 60 * 1000

let db = null
let firestoreUnavailable = false
let warnedLocalFallback = false

const storage = new Storage()

const localDocs = new Map()
let localLoaded = false
let localSaveTimer = null

function toStringOrEmpty(value, maxLen = 300) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_\-:.]/g, '_')
}

function normalizeMode(mode) {
  const value = toStringOrEmpty(mode, 20).toLowerCase()
  if (value === 'whatif') return 'wonder'
  return ['mystery', 'wonder', 'story'].includes(value) ? value : ''
}

function getBucketName() {
  return process.env.SHOWME_GCS_BUCKET || ''
}

function getBucket() {
  const bucketName = getBucketName()
  if (!bucketName) return null
  return storage.bucket(bucketName)
}

function buildCompositeKey({ clientId, mode, topicId, versionId }) {
  return [clientId, mode, topicId || 'topic', versionId || 'latest']
    .map((value) => sanitizeSegment(value))
    .join('__')
}

function loadLocalDocsFromDisk() {
  if (localLoaded) return
  localLoaded = true

  try {
    if (!LOCAL_FILE || !fs.existsSync(LOCAL_FILE)) {
      return
    }

    const raw = fs.readFileSync(LOCAL_FILE, 'utf8')
    if (!raw) return

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return

    Object.entries(parsed).forEach(([key, value]) => {
      if (!key || !value || typeof value !== 'object') return
      localDocs.set(key, value)
    })
  } catch (error) {
    logger.warn('MODES', 'Failed to load local mode sessions', { error: error.message })
  }
}

function writeLocalDocsToDisk() {
  try {
    if (!LOCAL_FILE) return
    const dir = path.dirname(LOCAL_FILE)
    fs.mkdirSync(dir, { recursive: true })
    const payload = Object.fromEntries(localDocs.entries())
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(payload, null, 2), 'utf8')
  } catch (error) {
    logger.warn('MODES', 'Failed to persist local mode sessions', { error: error.message })
  }
}

function scheduleLocalSave() {
  if (!LOCAL_FILE) return

  if (LOCAL_SAVE_DEBOUNCE_MS === 0) {
    writeLocalDocsToDisk()
    return
  }

  if (localSaveTimer) {
    clearTimeout(localSaveTimer)
  }

  localSaveTimer = setTimeout(() => {
    localSaveTimer = null
    writeLocalDocsToDisk()
  }, LOCAL_SAVE_DEBOUNCE_MS)
}

function shouldUseLocalStorage() {
  if (process.env.SHOWME_LOCAL_MODE_SESSIONS === '1') return true
  if (process.env.NODE_ENV === 'production') return false
  if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT) return true
  return firestoreUnavailable
}

function isFirestoreUnavailableError(error) {
  if (!error) return false
  if (typeof error.code === 'number' && [5, 7, 14, 16].includes(error.code)) return true
  const message = String(error.message || '')
  return /NOT_FOUND|PERMISSION_DENIED|UNAUTHENTICATED|UNAVAILABLE|credentials|default credentials|Unable to detect a Project Id|Project Id|ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/i.test(message)
}

function markFirestoreUnavailable(error) {
  if (process.env.NODE_ENV === 'production') return
  if (!isFirestoreUnavailableError(error)) return
  if (!firestoreUnavailable) {
    firestoreUnavailable = true
  }
  if (!warnedLocalFallback) {
    warnedLocalFallback = true
    logger.warn('MODES', 'Falling back to local mode session store', { error: error?.message })
  }
}

function getFirestore() {
  if (db) return db

  try {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    })
    logger.info('MODES', 'Firestore connected')
    return db
  } catch (error) {
    markFirestoreUnavailable(error)
    logger.error('MODES', 'Failed to connect to Firestore', { error: error.message })
    return null
  }
}

function isDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:')
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return null
  return {
    contentType: match[1],
    base64Data: match[2],
  }
}

function getExtensionFromContentType(contentType) {
  if (!contentType) return 'bin'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('jpeg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('svg')) return 'svg'
  return 'bin'
}

async function uploadDataUrl({ bucket, dataUrl, objectPath }) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null

  const buffer = Buffer.from(parsed.base64Data, 'base64')
  await bucket.file(objectPath).save(buffer, {
    resumable: false,
    contentType: parsed.contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  })

  return objectPath
}

function normalizeSession(session) {
  if (!session || typeof session !== 'object') {
    return {}
  }

  return session
}

async function materializeSessionForStorage(session, context) {
  const bucket = getBucket()
  let assetCounter = 0

  async function walk(value) {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => walk(item)))
    }

    if (value && typeof value === 'object') {
      const output = {}
      const entries = Object.entries(value)
      for (const [key, child] of entries) {
        output[key] = await walk(child)
      }
      return output
    }

    if (isDataUrl(value)) {
      if (!bucket) {
        return value
      }
      const parsed = parseDataUrl(value)
      if (!parsed) return value

      assetCounter += 1
      const extension = getExtensionFromContentType(parsed.contentType)
      const objectPath = [
        'modes',
        sanitizeSegment(context.clientId),
        sanitizeSegment(context.mode),
        sanitizeSegment(context.topicId || 'topic'),
        sanitizeSegment(context.versionId || 'latest'),
        sanitizeSegment(context.sessionId),
        `asset_${assetCounter}.${extension}`,
      ].join('/')

      try {
        const storedPath = await uploadDataUrl({ bucket, dataUrl: value, objectPath })
        if (!storedPath) return value
        return {
          __showmeAsset: 'gcs',
          path: storedPath,
        }
      } catch (error) {
        logger.warn('MODES', 'Failed to upload mode session data URL to GCS', {
          error: error.message,
          objectPath,
        })
        return value
      }
    }

    return value
  }

  return walk(normalizeSession(session))
}

async function hydrateSessionForClient(session) {
  const bucket = getBucket()

  async function walk(value) {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => walk(item)))
    }

    if (value && typeof value === 'object') {
      if (value.__showmeAsset === 'gcs' && value.path) {
        if (!bucket) return null
        try {
          const [signedUrl] = await bucket.file(value.path).getSignedUrl({
            action: 'read',
            expires: Date.now() + URL_EXPIRY_MS,
          })
          return signedUrl
        } catch (error) {
          logger.warn('MODES', 'Failed to sign mode session asset URL', {
            error: error.message,
            path: value.path,
          })
          return null
        }
      }

      const output = {}
      for (const [key, child] of Object.entries(value)) {
        output[key] = await walk(child)
      }
      return output
    }

    return value
  }

  return walk(session)
}

function normalizeRecordInput(input) {
  const clientId = toStringOrEmpty(input?.clientId, 200)
  const mode = normalizeMode(input?.mode)
  const topicId = toStringOrEmpty(input?.topicId, 200)
  const topicName = toStringOrEmpty(input?.topicName, 200)
  const versionId = toStringOrEmpty(input?.versionId, 200)
  const completedAt = Number.isFinite(Number(input?.completedAt))
    ? Number(input.completedAt)
    : Date.now()

  return {
    clientId,
    mode,
    topicId,
    topicName,
    versionId,
    completedAt,
  }
}

function getLocalRecords(filters) {
  loadLocalDocsFromDisk()
  const docs = [...localDocs.values()]
  return docs.filter((doc) => {
    if (doc.clientId !== filters.clientId) return false
    if (filters.mode && doc.mode !== filters.mode) return false
    if (filters.topicId && doc.topicId !== filters.topicId) return false
    if (filters.versionId && doc.versionId !== filters.versionId) return false
    return true
  })
}

function sortSessionEntries(entries) {
  return [...entries].sort((a, b) => (Number(b.completedAt || 0) - Number(a.completedAt || 0)))
}

function buildSessionSummary(doc, entry) {
  return {
    mode: doc.mode,
    topicId: doc.topicId,
    topicName: doc.topicName,
    versionId: doc.versionId,
    completedAt: entry.completedAt,
    session: entry.session,
  }
}

export async function saveModeSession(input) {
  const record = normalizeRecordInput(input)

  if (!record.clientId || !record.mode || !record.topicId) {
    return { success: false, error: 'clientId, mode, topicId are required' }
  }

  const sessionId = sanitizeSegment(input?.sessionId || `${record.completedAt}_${Math.random().toString(36).slice(2, 10)}`)
  const normalizedSession = normalizeSession(input?.session)
  const storedSession = await materializeSessionForStorage(normalizedSession, {
    clientId: record.clientId,
    mode: record.mode,
    topicId: record.topicId,
    versionId: record.versionId,
    sessionId,
  })

  const key = buildCompositeKey(record)

  if (shouldUseLocalStorage()) {
    loadLocalDocsFromDisk()
    const existing = localDocs.get(key)
    const existingSessions = Array.isArray(existing?.sessions) ? existing.sessions : []

    const sessions = sortSessionEntries([
      ...existingSessions,
      {
        id: sessionId,
        completedAt: record.completedAt,
        createdAt: Date.now(),
        session: storedSession,
      },
    ]).slice(0, MAX_SESSIONS_PER_KEY)

    localDocs.set(key, {
      id: key,
      clientId: record.clientId,
      mode: record.mode,
      topicId: record.topicId,
      topicName: record.topicName,
      versionId: record.versionId,
      sessions,
      updatedAt: Date.now(),
    })
    scheduleLocalSave()
    return { success: true, error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      return saveModeSession(input)
    }
    return { success: false, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(key)
    const existingDoc = await docRef.get()
    const existingSessions = existingDoc.exists && Array.isArray(existingDoc.data()?.sessions)
      ? existingDoc.data().sessions
      : []

    const sessions = sortSessionEntries([
      ...existingSessions,
      {
        id: sessionId,
        completedAt: record.completedAt,
        createdAt: Date.now(),
        session: storedSession,
      },
    ]).slice(0, MAX_SESSIONS_PER_KEY)

    await docRef.set({
      id: key,
      clientId: record.clientId,
      mode: record.mode,
      topicId: record.topicId,
      topicName: record.topicName,
      versionId: record.versionId,
      sessions,
      updatedAt: Date.now(),
    }, { merge: true })

    return { success: true, error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalStorage()) {
      return saveModeSession(input)
    }
    logger.error('MODES', 'Failed to save mode session', {
      error: error.message,
      clientId: record.clientId,
      mode: record.mode,
      topicId: record.topicId,
    })
    return { success: false, error: error.message }
  }
}

export async function loadLatestModeSession(filters) {
  const normalized = normalizeRecordInput(filters)

  if (!normalized.clientId || !normalized.mode) {
    return { session: null, error: 'clientId and mode are required' }
  }

  try {
    let records = []

    if (shouldUseLocalStorage()) {
      records = getLocalRecords(normalized)
    } else {
      const firestore = getFirestore()
      if (!firestore) {
        if (process.env.NODE_ENV !== 'production') {
          firestoreUnavailable = true
          records = getLocalRecords(normalized)
        } else {
          return { session: null, error: 'FIRESTORE_NOT_AVAILABLE' }
        }
      } else {
        let query = firestore.collection(COLLECTION_NAME).where('clientId', '==', normalized.clientId)
        query = query.where('mode', '==', normalized.mode)
        if (normalized.topicId) {
          query = query.where('topicId', '==', normalized.topicId)
        }
        if (normalized.versionId) {
          query = query.where('versionId', '==', normalized.versionId)
        }

        const snapshot = await query.get()
        records = snapshot.docs.map((doc) => doc.data())
      }
    }

    const flattened = []
    for (const record of records) {
      const sessions = Array.isArray(record?.sessions) ? record.sessions : []
      for (const entry of sessions) {
        if (!entry || typeof entry !== 'object') continue
        flattened.push(buildSessionSummary(record, entry))
      }
    }

    if (flattened.length === 0) {
      return { session: null, error: null }
    }

    flattened.sort((a, b) => Number(b.completedAt || 0) - Number(a.completedAt || 0))
    const latest = flattened[0]
    const hydrated = await hydrateSessionForClient(latest.session)

    return {
      session: {
        ...latest,
        session: hydrated,
      },
      error: null,
    }
  } catch (error) {
    markFirestoreUnavailable(error)
    logger.error('MODES', 'Failed to load latest mode session', {
      error: error.message,
      clientId: normalized.clientId,
      mode: normalized.mode,
      topicId: normalized.topicId,
    })
    return { session: null, error: error.message }
  }
}

export async function listModeSessions(filters) {
  const normalized = normalizeRecordInput(filters)
  const limit = Number.isFinite(Number(filters?.limit))
    ? Math.max(1, Math.min(100, Math.trunc(Number(filters.limit))))
    : 20

  if (!normalized.clientId) {
    return { sessions: [], error: 'clientId is required' }
  }

  try {
    let records = []

    if (shouldUseLocalStorage()) {
      records = getLocalRecords(normalized)
    } else {
      const firestore = getFirestore()
      if (!firestore) {
        if (process.env.NODE_ENV !== 'production') {
          firestoreUnavailable = true
          records = getLocalRecords(normalized)
        } else {
          return { sessions: [], error: 'FIRESTORE_NOT_AVAILABLE' }
        }
      } else {
        let query = firestore.collection(COLLECTION_NAME).where('clientId', '==', normalized.clientId)
        if (normalized.mode) query = query.where('mode', '==', normalized.mode)
        if (normalized.topicId) query = query.where('topicId', '==', normalized.topicId)
        if (normalized.versionId) query = query.where('versionId', '==', normalized.versionId)

        const snapshot = await query.get()
        records = snapshot.docs.map((doc) => doc.data())
      }
    }

    const flattened = []
    for (const record of records) {
      const sessions = Array.isArray(record?.sessions) ? record.sessions : []
      for (const entry of sessions) {
        if (!entry || typeof entry !== 'object') continue
        flattened.push(buildSessionSummary(record, entry))
      }
    }

    flattened.sort((a, b) => Number(b.completedAt || 0) - Number(a.completedAt || 0))

    const sliced = flattened.slice(0, limit)
    const hydratedSessions = await Promise.all(sliced.map(async (item) => ({
      ...item,
      session: await hydrateSessionForClient(item.session),
    })))

    return { sessions: hydratedSessions, error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    logger.error('MODES', 'Failed to list mode sessions', {
      error: error.message,
      clientId: normalized.clientId,
      mode: normalized.mode,
      topicId: normalized.topicId,
    })
    return { sessions: [], error: error.message }
  }
}

export default {
  saveModeSession,
  loadLatestModeSession,
  listModeSessions,
}
