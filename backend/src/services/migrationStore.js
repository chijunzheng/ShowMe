import { Firestore } from '@google-cloud/firestore'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_LOCAL_FILE = path.resolve(__dirname, '..', '..', '.data', 'migrationMarkers.json')
const LOCAL_FILE = process.env.SHOWME_LOCAL_MIGRATIONS_FILE || DEFAULT_LOCAL_FILE
const COLLECTION_NAME = 'migrationImports'

let db = null
let firestoreUnavailable = false
let warnedLocalFallback = false

const localMarkers = new Map()
let localLoaded = false

function toStringOrEmpty(value, maxLen = 240) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

function sanitizeId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_\-:.]/g, '_')
}

function buildMarkerId(clientId, migrationVersion) {
  return `${sanitizeId(clientId)}__${sanitizeId(migrationVersion)}`
}

function loadLocalMarkers() {
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

    Object.entries(parsed).forEach(([key, marker]) => {
      if (!key || !marker || typeof marker !== 'object') return
      localMarkers.set(key, marker)
    })
  } catch (error) {
    logger.warn('MIGRATION', 'Failed to load local migration markers', { error: error.message })
  }
}

function writeLocalMarkers() {
  try {
    if (!LOCAL_FILE) return
    const dir = path.dirname(LOCAL_FILE)
    fs.mkdirSync(dir, { recursive: true })
    const payload = Object.fromEntries(localMarkers.entries())
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(payload, null, 2), 'utf8')
  } catch (error) {
    logger.warn('MIGRATION', 'Failed to persist local migration markers', { error: error.message })
  }
}

function shouldUseLocalStorage() {
  if (process.env.SHOWME_LOCAL_MIGRATIONS === '1') return true
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
    logger.warn('MIGRATION', 'Falling back to local migration markers', { error: error?.message })
  }
}

function getFirestore() {
  if (db) return db

  try {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    })
    logger.info('MIGRATION', 'Firestore connected')
    return db
  } catch (error) {
    markFirestoreUnavailable(error)
    logger.error('MIGRATION', 'Failed to connect to Firestore', { error: error.message })
    return null
  }
}

export async function getMigrationMarker(clientIdInput, migrationVersionInput) {
  const clientId = toStringOrEmpty(clientIdInput, 240)
  const migrationVersion = toStringOrEmpty(migrationVersionInput, 120)
  if (!clientId || !migrationVersion) return null

  const markerId = buildMarkerId(clientId, migrationVersion)

  if (shouldUseLocalStorage()) {
    loadLocalMarkers()
    return localMarkers.get(markerId) || null
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      loadLocalMarkers()
      return localMarkers.get(markerId) || null
    }
    return null
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(markerId)
    const snapshot = await docRef.get()
    if (!snapshot.exists) return null
    return snapshot.data() || null
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalStorage()) {
      loadLocalMarkers()
      return localMarkers.get(markerId) || null
    }
    logger.error('MIGRATION', 'Failed to read migration marker', {
      error: error.message,
      clientId,
      migrationVersion,
    })
    return null
  }
}

export async function setMigrationMarker({ clientId: clientIdInput, migrationVersion: migrationVersionInput, checksum: checksumInput, summary }) {
  const clientId = toStringOrEmpty(clientIdInput, 240)
  const migrationVersion = toStringOrEmpty(migrationVersionInput, 120)
  const checksum = toStringOrEmpty(checksumInput, 200)

  if (!clientId || !migrationVersion || !checksum) {
    return { success: false, error: 'clientId, migrationVersion, checksum are required' }
  }

  const markerId = buildMarkerId(clientId, migrationVersion)
  const payload = {
    id: markerId,
    clientId,
    migrationVersion,
    checksum,
    summary: summary && typeof summary === 'object' ? summary : {},
    updatedAt: Date.now(),
  }

  if (shouldUseLocalStorage()) {
    loadLocalMarkers()
    localMarkers.set(markerId, payload)
    writeLocalMarkers()
    return { success: true, error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      loadLocalMarkers()
      localMarkers.set(markerId, payload)
      writeLocalMarkers()
      return { success: true, error: null }
    }
    return { success: false, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = firestore.collection(COLLECTION_NAME).doc(markerId)
    await docRef.set(payload, { merge: true })
    return { success: true, error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalStorage()) {
      loadLocalMarkers()
      localMarkers.set(markerId, payload)
      writeLocalMarkers()
      return { success: true, error: null }
    }
    logger.error('MIGRATION', 'Failed to persist migration marker', {
      error: error.message,
      clientId,
      migrationVersion,
    })
    return { success: false, error: error.message }
  }
}

export default {
  getMigrationMarker,
  setMigrationMarker,
}
