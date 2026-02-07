import { Firestore } from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from '../utils/logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DEFAULT_LOCAL_STORIES_FILE = path.resolve(__dirname, '..', '..', '.data', 'stories.json')
const LOCAL_STORIES_FILE = process.env.SHOWME_LOCAL_STORIES_FILE || DEFAULT_LOCAL_STORIES_FILE
const LOCAL_STORIES_SAVE_DEBOUNCE_MS = process.env.NODE_ENV === 'test' ? 0 : 300

const COLLECTION_NAME = 'stories'
const STORY_ITEMS_SUBCOLLECTION = 'items'
const URL_EXPIRY_MS = 24 * 60 * 60 * 1000

let db = null
let firestoreUnavailable = false
let warnedLocalFallback = false

const storage = new Storage()

const localStories = new Map()
let localStoriesLoaded = false
let localStoriesSaveTimer = null

function toStringOrEmpty(value, maxLen = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLen)
}

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_\-:.]/g, '_')
}

function getBucketName() {
  return process.env.SHOWME_GCS_BUCKET || ''
}

function getBucket() {
  const bucketName = getBucketName()
  if (!bucketName) return null
  return storage.bucket(bucketName)
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
    logger.warn('STORIES', 'Falling back to local story store', { error: error?.message })
  }
}

function shouldUseLocalStorage() {
  if (process.env.SHOWME_LOCAL_STORIES === '1') return true
  if (process.env.NODE_ENV === 'production') return false
  if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT) return true
  return firestoreUnavailable
}

function getFirestore() {
  if (db) return db

  try {
    db = new Firestore({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    })
    logger.info('STORIES', 'Firestore connected')
    return db
  } catch (error) {
    markFirestoreUnavailable(error)
    logger.error('STORIES', 'Failed to connect to Firestore', { error: error.message })
    return null
  }
}

function loadLocalStoriesFromDisk() {
  if (localStoriesLoaded) return
  localStoriesLoaded = true

  try {
    if (!LOCAL_STORIES_FILE || !fs.existsSync(LOCAL_STORIES_FILE)) {
      return
    }

    const raw = fs.readFileSync(LOCAL_STORIES_FILE, 'utf8')
    if (!raw) return

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return

    Object.entries(parsed).forEach(([clientId, stories]) => {
      if (!clientId || !Array.isArray(stories)) return
      localStories.set(clientId, stories)
    })
  } catch (error) {
    logger.warn('STORIES', 'Failed to load local stories from disk', { error: error.message })
  }
}

function writeLocalStoriesToDisk() {
  try {
    if (!LOCAL_STORIES_FILE) return
    const dir = path.dirname(LOCAL_STORIES_FILE)
    fs.mkdirSync(dir, { recursive: true })
    const payload = Object.fromEntries(localStories.entries())
    fs.writeFileSync(LOCAL_STORIES_FILE, JSON.stringify(payload, null, 2), 'utf8')
  } catch (error) {
    logger.warn('STORIES', 'Failed to persist local stories', { error: error.message })
  }
}

function scheduleLocalStoriesSave() {
  if (!LOCAL_STORIES_FILE) return

  if (LOCAL_STORIES_SAVE_DEBOUNCE_MS === 0) {
    writeLocalStoriesToDisk()
    return
  }

  if (localStoriesSaveTimer) {
    clearTimeout(localStoriesSaveTimer)
  }

  localStoriesSaveTimer = setTimeout(() => {
    localStoriesSaveTimer = null
    writeLocalStoriesToDisk()
  }, LOCAL_STORIES_SAVE_DEBOUNCE_MS)
}

function getLocalStories(clientId) {
  loadLocalStoriesFromDisk()
  const stories = localStories.get(clientId) || []
  return [...stories].sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0))
}

function setLocalStories(clientId, stories) {
  localStories.set(clientId, stories)
  scheduleLocalStoriesSave()
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

function normalizeStory(storyData) {
  const storyId = toStringOrEmpty(storyData?.id, 200)
  const topicName = toStringOrEmpty(storyData?.topicName, 240)
  const parsedDateMs = Number.isFinite(Number(storyData?.createdAt))
    ? Number(storyData.createdAt)
    : Date.parse(storyData?.createdAt || '')

  const createdAtMs = Number.isFinite(parsedDateMs)
    ? parsedDateMs
    : Date.now()

  const createdAt = typeof storyData?.createdAt === 'string'
    ? storyData.createdAt
    : new Date(createdAtMs).toISOString()

  const scenes = Array.isArray(storyData?.scenes)
    ? storyData.scenes.filter((scene) => scene && typeof scene === 'object').slice(0, 60)
    : []

  const conceptsFound = Array.isArray(storyData?.conceptsFound)
    ? storyData.conceptsFound
      .filter((concept) => typeof concept === 'string')
      .map((concept) => concept.trim())
      .filter(Boolean)
      .slice(0, 200)
    : Number.isFinite(Number(storyData?.conceptsFound))
      ? Number(storyData.conceptsFound)
      : 0

  const totalConcepts = Number.isFinite(Number(storyData?.totalConcepts))
    ? Number(storyData.totalConcepts)
    : 0

  const xpEarned = Number.isFinite(Number(storyData?.xpEarned))
    ? Number(storyData.xpEarned)
    : 0

  return {
    ...storyData,
    id: storyId,
    topicName,
    createdAt,
    createdAtMs,
    scenes,
    conceptsFound,
    totalConcepts,
    xpEarned,
    version: Number.isFinite(Number(storyData?.version)) ? Number(storyData.version) : 1,
  }
}

async function materializeStoryForStorage(clientId, story) {
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
        'stories',
        sanitizeSegment(clientId),
        sanitizeSegment(story.id),
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
        logger.warn('STORIES', 'Failed to upload story asset', {
          error: error.message,
          objectPath,
          storyId: story.id,
        })
        return value
      }
    }

    return value
  }

  return walk(story)
}

async function hydrateStoryForClient(story) {
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
          logger.warn('STORIES', 'Failed to sign story asset URL', {
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

  return walk(story)
}

function getStoryDocRef(firestore, clientId, storyId) {
  return firestore
    .collection(COLLECTION_NAME)
    .doc(clientId)
    .collection(STORY_ITEMS_SUBCOLLECTION)
    .doc(storyId)
}

async function getLegacyStoriesFromFirestore(firestore, clientId) {
  try {
    const legacyDocRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const legacyDoc = await legacyDocRef.get()
    if (!legacyDoc.exists) return []

    const legacyStories = Array.isArray(legacyDoc.data()?.stories)
      ? legacyDoc.data().stories
      : []

    const normalizedLegacy = legacyStories
      .map((story) => normalizeStory(story))
      .filter((story) => story.id)
      .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0))

    return normalizedLegacy
  } catch (error) {
    logger.warn('STORIES', 'Failed to load legacy story document', {
      error: error.message,
      clientId,
    })
    return []
  }
}

export async function getStories(clientIdInput) {
  const clientId = toStringOrEmpty(clientIdInput, 240)
  if (!clientId) {
    return { stories: [], error: 'clientId is required' }
  }

  if (shouldUseLocalStorage()) {
    const stories = getLocalStories(clientId)
    return {
      stories: await Promise.all(stories.map((story) => hydrateStoryForClient(story))),
      error: null,
    }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      const stories = getLocalStories(clientId)
      return {
        stories: await Promise.all(stories.map((story) => hydrateStoryForClient(story))),
        error: null,
      }
    }
    return { stories: [], error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const snapshot = await firestore
      .collection(COLLECTION_NAME)
      .doc(clientId)
      .collection(STORY_ITEMS_SUBCOLLECTION)
      .orderBy('createdAtMs', 'desc')
      .limit(100)
      .get()

    let stories = snapshot.docs
      .map((doc) => normalizeStory(doc.data()))
      .filter((story) => story.id)

    if (stories.length === 0) {
      stories = await getLegacyStoriesFromFirestore(firestore, clientId)
    }

    const hydratedStories = await Promise.all(stories.map((story) => hydrateStoryForClient(story)))

    return {
      stories: hydratedStories,
      error: null,
    }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalStorage()) {
      const stories = getLocalStories(clientId)
      return {
        stories: await Promise.all(stories.map((story) => hydrateStoryForClient(story))),
        error: null,
      }
    }

    logger.error('STORIES', 'Failed to get stories', { clientId, error: error.message })
    return { stories: [], error: error.message }
  }
}

export async function saveStory(clientIdInput, storyData) {
  const clientId = toStringOrEmpty(clientIdInput, 240)
  const normalizedStory = normalizeStory(storyData)

  if (!clientId || !normalizedStory.id) {
    return { story: null, error: 'clientId and story.id are required' }
  }

  const storedStory = await materializeStoryForStorage(clientId, normalizedStory)

  if (shouldUseLocalStorage()) {
    const existing = getLocalStories(clientId)
    const index = existing.findIndex((story) => story.id === storedStory.id)

    const updated = index >= 0
      ? [...existing.slice(0, index), storedStory, ...existing.slice(index + 1)]
      : [storedStory, ...existing]

    setLocalStories(clientId, updated.slice(0, 100))

    return {
      story: await hydrateStoryForClient(storedStory),
      error: null,
    }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      const existing = getLocalStories(clientId)
      const index = existing.findIndex((story) => story.id === storedStory.id)
      const updated = index >= 0
        ? [...existing.slice(0, index), storedStory, ...existing.slice(index + 1)]
        : [storedStory, ...existing]
      setLocalStories(clientId, updated.slice(0, 100))

      return {
        story: await hydrateStoryForClient(storedStory),
        error: null,
      }
    }
    return { story: null, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    const docRef = getStoryDocRef(firestore, clientId, storedStory.id)
    await docRef.set({
      ...storedStory,
      clientId,
      storyId: storedStory.id,
      updatedAt: Date.now(),
    }, { merge: true })

    logger.info('STORIES', 'Story saved', { clientId, storyId: storedStory.id })

    return {
      story: await hydrateStoryForClient(storedStory),
      error: null,
    }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalStorage()) {
      const existing = getLocalStories(clientId)
      const index = existing.findIndex((story) => story.id === storedStory.id)
      const updated = index >= 0
        ? [...existing.slice(0, index), storedStory, ...existing.slice(index + 1)]
        : [storedStory, ...existing]
      setLocalStories(clientId, updated.slice(0, 100))

      return {
        story: await hydrateStoryForClient(storedStory),
        error: null,
      }
    }

    logger.error('STORIES', 'Failed to save story', { clientId, error: error.message })
    return { story: null, error: error.message }
  }
}

export async function deleteStory(clientIdInput, storyIdInput) {
  const clientId = toStringOrEmpty(clientIdInput, 240)
  const storyId = toStringOrEmpty(storyIdInput, 240)

  if (!clientId || !storyId) {
    return { success: false, error: 'clientId and storyId are required' }
  }

  if (shouldUseLocalStorage()) {
    const existing = getLocalStories(clientId)
    setLocalStories(clientId, existing.filter((story) => story.id !== storyId))
    return { success: true, error: null }
  }

  const firestore = getFirestore()
  if (!firestore) {
    if (process.env.NODE_ENV !== 'production') {
      firestoreUnavailable = true
      const existing = getLocalStories(clientId)
      setLocalStories(clientId, existing.filter((story) => story.id !== storyId))
      return { success: true, error: null }
    }
    return { success: false, error: 'FIRESTORE_NOT_AVAILABLE' }
  }

  try {
    await getStoryDocRef(firestore, clientId, storyId).delete()

    // Backward compatibility: also remove from legacy stories array doc if it exists.
    const legacyDocRef = firestore.collection(COLLECTION_NAME).doc(clientId)
    const legacyDoc = await legacyDocRef.get()
    if (legacyDoc.exists && Array.isArray(legacyDoc.data()?.stories)) {
      const filtered = legacyDoc.data().stories.filter((story) => story?.id !== storyId)
      await legacyDocRef.set({ stories: filtered }, { merge: true })
    }

    logger.info('STORIES', 'Story deleted', { clientId, storyId })
    return { success: true, error: null }
  } catch (error) {
    markFirestoreUnavailable(error)
    if (shouldUseLocalStorage()) {
      const existing = getLocalStories(clientId)
      setLocalStories(clientId, existing.filter((story) => story.id !== storyId))
      return { success: true, error: null }
    }

    logger.error('STORIES', 'Failed to delete story', { clientId, error: error.message })
    return { success: false, error: error.message }
  }
}

export default {
  getStories,
  saveStory,
  deleteStory,
}
