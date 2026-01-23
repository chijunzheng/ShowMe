import { Firestore } from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage'
import logger from '../utils/logger.js'

const SLIDE_COLLECTION = 'clients'
const URL_EXPIRY_MS = 24 * 60 * 60 * 1000

const firestore = new Firestore()
const storage = new Storage()

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

function getFallbackImageUrl(index) {
  const colors = ['6366F1', '818CF8', 'A5B4FC', 'C7D2FE']
  return `https://placehold.co/800x450/${colors[index % colors.length]}/white?text=Slide+${index + 1}`
}

async function uploadDataUrl({ bucket, clientId, topicId, versionId, slideId, dataUrl, index }) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return null

  const extension = getExtensionFromContentType(parsed.contentType)
  const safeClientId = sanitizeSegment(clientId)
  const safeTopicId = sanitizeSegment(topicId)
  const safeVersionId = sanitizeSegment(versionId)
  const safeSlideId = sanitizeSegment(slideId || `slide_${index}`)
  const objectPath = `slides/${safeClientId}/${safeTopicId}/${safeVersionId}/${safeSlideId}.${extension}`

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

    let imageUrl = slide.imageUrl || null
    if (!imageUrl && slide.imagePath) {
      try {
        const [signedUrl] = await bucket.file(slide.imagePath).getSignedUrl({
          action: 'read',
          expires: Date.now() + URL_EXPIRY_MS,
        })
        imageUrl = signedUrl
      } catch (error) {
        logger.warn('STORAGE', 'Failed to sign GCS URL', {
          error: error.message,
          imagePath: slide.imagePath,
        })
      }
    }

    if (!imageUrl) {
      imageUrl = getFallbackImageUrl(index)
    }

    return {
      ...slide,
      imageUrl,
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
    }

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
