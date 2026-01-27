import { Firestore } from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage'
import fs from 'fs/promises'
import path from 'path'
import logger from '../utils/logger.js'

const SLIDE_COLLECTION = 'clients'
const URL_EXPIRY_MS = 24 * 60 * 60 * 1000

const firestore = new Firestore()
const storage = new Storage()
const LOCAL_SLIDES_DIR = process.env.SHOWME_LOCAL_SLIDES_DIR
  || path.join(process.cwd(), 'data', 'slides')
const LOCAL_SLIDES_ENABLED = process.env.SHOWME_LOCAL_SLIDES === '1'
  || (process.env.NODE_ENV !== 'production' && !process.env.SHOWME_GCS_BUCKET)

function getBucketName() {
  return process.env.SHOWME_GCS_BUCKET || ''
}

function getBucket() {
  const bucketName = getBucketName()
  if (!bucketName) {
    logger.error('STORAGE', 'Missing SHOWME_GCS_BUCKET env var')
    return null
  }
  return storage.bucket(bucketName)
}

function normalizeVersionId(versionId) {
  if (typeof versionId === 'string' && versionId.trim()) {
    return versionId.trim()
  }
  return 'legacy'
}

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_')
}

function useLocalSlidesStore() {
  return LOCAL_SLIDES_ENABLED
}

function getLocalSlidesPath({ clientId, topicId, versionId }) {
  const normalizedVersionId = normalizeVersionId(versionId)
  const safeClientId = sanitizeSegment(clientId)
  const safeTopicId = sanitizeSegment(topicId)
  const safeVersionId = sanitizeSegment(normalizedVersionId)
  return path.join(LOCAL_SLIDES_DIR, safeClientId, safeTopicId, `${safeVersionId}.json`)
}

async function saveSlidesLocal({ clientId, topicId, versionId, slides }) {
  try {
    const filePath = getLocalSlidesPath({ clientId, topicId, versionId })
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    const normalizedVersionId = normalizeVersionId(versionId)
    const payload = {
      slides,
      topicId,
      versionId: normalizedVersionId,
      updatedAt: Date.now(),
    }
    await fs.writeFile(filePath, JSON.stringify(payload), 'utf8')
    return true
  } catch (error) {
    logger.warn('STORAGE', 'Failed to persist slides to local store', {
      error: error.message,
      clientId,
      topicId,
      versionId,
    })
    return false
  }
}

async function loadSlidesLocal({ clientId, topicId, versionId }) {
  try {
    const filePath = getLocalSlidesPath({ clientId, topicId, versionId })
    const raw = await fs.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed?.slides) ? parsed.slides : null
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('STORAGE', 'Failed to load slides from local store', {
        error: error.message,
        clientId,
        topicId,
        versionId,
      })
    }
    return null
  }
}

async function loadLatestSlidesLocal({ clientId, topicId }) {
  const safeClientId = sanitizeSegment(clientId)
  const safeTopicId = sanitizeSegment(topicId)
  const dirPath = path.join(LOCAL_SLIDES_DIR, safeClientId, safeTopicId)

  try {
    const entries = await fs.readdir(dirPath)
    let latest = null

    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const filePath = path.join(dirPath, entry)
      let parsed
      try {
        const raw = await fs.readFile(filePath, 'utf8')
        parsed = JSON.parse(raw)
      } catch {
        continue
      }
      if (!Array.isArray(parsed?.slides)) continue
      const updatedAt = typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0
      if (!latest || updatedAt > latest.updatedAt) {
        latest = {
          slides: parsed.slides,
          versionId: parsed.versionId || entry.replace(/\.json$/, ''),
          updatedAt,
        }
      }
    }

    return latest
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn('STORAGE', 'Failed to load latest slides from local store', {
        error: error.message,
        clientId,
        topicId,
      })
    }
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
  // Image types
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('jpeg')) return 'jpg'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('svg')) return 'svg'
  // Audio types
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3'
  if (contentType.includes('wav')) return 'wav'
  if (contentType.includes('ogg')) return 'ogg'
  if (contentType.includes('webm')) return 'webm'
  return 'bin'
}

function getFallbackImageUrl(index) {
  const colors = ['6366F1', '818CF8', 'A5B4FC', 'C7D2FE']
  return `https://placehold.co/800x450/${colors[index % colors.length]}/white?text=Slide+${index + 1}`
}

async function uploadDataUrl({ bucket, clientId, topicId, versionId, slideId, dataUrl, index, suffix = '' }) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null

  const extension = getExtensionFromContentType(parsed.contentType)
  const safeClientId = sanitizeSegment(clientId)
  const safeTopicId = sanitizeSegment(topicId)
  const safeVersionId = sanitizeSegment(versionId)
  const safeSlideId = sanitizeSegment(slideId || `slide_${index}`)
  const fileName = suffix ? `${safeSlideId}_${suffix}` : safeSlideId
  const objectPath = `slides/${safeClientId}/${safeTopicId}/${safeVersionId}/${fileName}.${extension}`

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

async function hydrateSlides(slides, bucket) {
  if (!Array.isArray(slides)) return null

  const hydrated = await Promise.all(slides.map(async (slide, index) => {
    if (!slide || typeof slide !== 'object') return null

    // Hydrate image URL
    let imageUrl = slide.imageUrl || null
    if (!imageUrl && slide.imagePath) {
      try {
        const [signedUrl] = await bucket.file(slide.imagePath).getSignedUrl({
          action: 'read',
          expires: Date.now() + URL_EXPIRY_MS,
        })
        imageUrl = signedUrl
      } catch (error) {
        logger.warn('STORAGE', 'Failed to sign image GCS URL', {
          error: error.message,
          imagePath: slide.imagePath,
        })
      }
    }

    if (!imageUrl) {
      imageUrl = getFallbackImageUrl(index)
    }

    // Hydrate audio URL
    let audioUrl = slide.audioUrl || null
    if (!audioUrl && slide.audioPath) {
      try {
        const [signedUrl] = await bucket.file(slide.audioPath).getSignedUrl({
          action: 'read',
          expires: Date.now() + URL_EXPIRY_MS,
        })
        audioUrl = signedUrl
      } catch (error) {
        logger.warn('STORAGE', 'Failed to sign audio GCS URL', {
          error: error.message,
          audioPath: slide.audioPath,
        })
      }
    }

    return {
      ...slide,
      imageUrl,
      audioUrl,
    }
  }))

  return hydrated.filter(Boolean)
}

async function buildStoredSlides({ slides, bucket, clientId, topicId, versionId }) {
  const storedSlides = []

  for (let index = 0; index < slides.length; index += 1) {
    const slide = slides[index]
    if (!slide || typeof slide !== 'object') continue

    const stored = {
      id: slide.id,
      subtitle: slide.subtitle || '',
      duration: slide.duration || 5000,
      topicId: slide.topicId || topicId,
      segmentId: slide.segmentId || null,
      isConclusion: !!slide.isConclusion,
      parentId: slide.parentId || null,
    }

    // Upload image to GCS
    const imageUrl = slide.imageUrl
    if (isDataUrl(imageUrl)) {
      try {
        const imagePath = await uploadDataUrl({
          bucket,
          clientId,
          topicId,
          versionId,
          slideId: slide.id,
          dataUrl: imageUrl,
          index,
        })
        if (imagePath) {
          stored.imagePath = imagePath
        } else {
          stored.imageUrl = getFallbackImageUrl(index)
        }
      } catch (error) {
        logger.warn('STORAGE', 'Failed to upload slide image to GCS', {
          error: error.message,
          topicId,
          versionId,
          slideId: slide.id,
        })
        stored.imageUrl = getFallbackImageUrl(index)
      }
    } else if (typeof imageUrl === 'string' && imageUrl.trim()) {
      stored.imageUrl = imageUrl
    } else {
      stored.imageUrl = getFallbackImageUrl(index)
    }

    // Upload audio to GCS
    const audioUrl = slide.audioUrl
    if (isDataUrl(audioUrl)) {
      try {
        const audioPath = await uploadDataUrl({
          bucket,
          clientId,
          topicId,
          versionId,
          slideId: slide.id,
          dataUrl: audioUrl,
          index,
          suffix: 'audio',
        })
        if (audioPath) {
          stored.audioPath = audioPath
        }
      } catch (error) {
        logger.warn('STORAGE', 'Failed to upload slide audio to GCS', {
          error: error.message,
          topicId,
          versionId,
          slideId: slide.id,
        })
        // No fallback for audio - just won't have narration
      }
    } else if (typeof audioUrl === 'string' && audioUrl.trim()) {
      // Keep external audio URL as-is
      stored.audioUrl = audioUrl
    }

    storedSlides.push(stored)
  }

  return storedSlides
}

function getVersionDocRef(clientId, topicId, versionId) {
  return firestore
    .collection(SLIDE_COLLECTION)
    .doc(clientId)
    .collection('topics')
    .doc(topicId)
    .collection('versions')
    .doc(versionId)
}

export async function saveSlides({ clientId, topicId, versionId, slides }) {
  if (!clientId || !topicId || !Array.isArray(slides)) {
    return false
  }

  if (useLocalSlidesStore()) {
    return saveSlidesLocal({ clientId, topicId, versionId, slides })
  }

  const bucket = getBucket()
  if (!bucket) return false

  try {
    const normalizedVersionId = normalizeVersionId(versionId)
    const storedSlides = await buildStoredSlides({
      slides,
      bucket,
      clientId,
      topicId,
      versionId: normalizedVersionId,
    })

    const docRef = getVersionDocRef(clientId, topicId, normalizedVersionId)
    await docRef.set({
      slides: storedSlides,
      topicId,
      versionId: normalizedVersionId,
      updatedAt: Date.now(),
    }, { merge: true })

    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to persist slides to Firestore', {
      error: error.message,
      clientId,
      topicId,
      versionId,
    })
    return false
  }
}

export async function loadSlides({ clientId, topicId, versionId }) {
  if (!clientId || !topicId) {
    return null
  }

  if (useLocalSlidesStore()) {
    return loadSlidesLocal({ clientId, topicId, versionId })
  }

  const bucket = getBucket()
  if (!bucket) return null

  try {
    const normalizedVersionId = normalizeVersionId(versionId)
    const docRef = getVersionDocRef(clientId, topicId, normalizedVersionId)
    const snapshot = await docRef.get()

    if (!snapshot.exists) {
      return null
    }

    const data = snapshot.data()
    return await hydrateSlides(data?.slides || [], bucket)
  } catch (error) {
    logger.warn('STORAGE', 'Failed to load slides from Firestore', {
      error: error.message,
      clientId,
      topicId,
      versionId,
    })
    return null
  }
}

export async function loadLatestSlides({ clientId, topicId }) {
  if (!clientId || !topicId) {
    return null
  }

  if (useLocalSlidesStore()) {
    return loadLatestSlidesLocal({ clientId, topicId })
  }

  const bucket = getBucket()
  if (!bucket) return null

  try {
    const versionsRef = firestore
      .collection(SLIDE_COLLECTION)
      .doc(clientId)
      .collection('topics')
      .doc(topicId)
      .collection('versions')

    const snapshot = await versionsRef
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get()

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()
    const slides = await hydrateSlides(data?.slides || [], bucket)
    return {
      slides,
      versionId: doc.id,
      updatedAt: data?.updatedAt || null,
    }
  } catch (error) {
    logger.warn('STORAGE', 'Failed to load latest slides from Firestore', {
      error: error.message,
      clientId,
      topicId,
    })
    return null
  }
}
