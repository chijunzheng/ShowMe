/**
 * Storage Service
 * Unified storage layer for topic metadata (Firestore) and full topic data (GCS)
 *
 * This service provides:
 * - Firestore storage for topic metadata (id, name, icon, category, slideCount, etc.)
 * - GCS storage for full topic data including slides array
 * - Graceful fallback to in-memory storage when cloud services are unavailable
 *
 * Environment Variables:
 * - GOOGLE_CLOUD_PROJECT: GCP project ID (required for cloud storage)
 * - GCS_BUCKET_NAME: GCS bucket for topic data storage
 *
 * Collection Structure (Firestore):
 * - topics/{clientId}/items/{topicId} - Topic metadata
 *
 * GCS Structure:
 * - {bucket}/topics/{clientId}/{topicId}.json - Full topic data
 */

import { Firestore } from '@google-cloud/firestore'
import { Storage } from '@google-cloud/storage'
import logger from '../utils/logger.js'

// Storage mode constants
const STORAGE_MODE = {
  CLOUD: 'cloud',
  MEMORY: 'memory'
}

// Singleton instances
let firestoreInstance = null
let storageInstance = null
let currentMode = null

// In-memory storage for development/fallback
const memoryStore = {
  // Map<clientId, Map<topicId, TopicMetadata>>
  metadata: new Map(),
  // Map<clientId, Map<topicId, FullTopicData>>
  fullData: new Map()
}

/**
 * Initialize Firestore client
 * @returns {Firestore|null} Firestore instance or null if unavailable
 */
function initFirestore() {
  if (firestoreInstance) return firestoreInstance

  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  if (!projectId) {
    logger.warn('STORAGE', 'GOOGLE_CLOUD_PROJECT not configured, Firestore unavailable')
    return null
  }

  try {
    firestoreInstance = new Firestore({ projectId })
    logger.info('STORAGE', 'Firestore initialized', { projectId })
    return firestoreInstance
  } catch (error) {
    logger.error('STORAGE', 'Failed to initialize Firestore', { error: error.message })
    return null
  }
}

/**
 * Initialize GCS client
 * @returns {Storage|null} Storage instance or null if unavailable
 */
function initGCS() {
  if (storageInstance) return storageInstance

  const bucketName = process.env.GCS_BUCKET_NAME
  if (!bucketName) {
    logger.warn('STORAGE', 'GCS_BUCKET_NAME not configured, GCS unavailable')
    return null
  }

  try {
    storageInstance = new Storage()
    logger.info('STORAGE', 'GCS initialized', { bucket: bucketName })
    return storageInstance
  } catch (error) {
    logger.error('STORAGE', 'Failed to initialize GCS', { error: error.message })
    return null
  }
}

/**
 * Get the GCS bucket instance
 * @returns {import('@google-cloud/storage').Bucket|null}
 */
function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME
  if (!bucketName) return null

  const storage = initGCS()
  if (!storage) return null

  return storage.bucket(bucketName)
}

/**
 * Determine the current storage mode based on available services
 * @returns {string} 'cloud' or 'memory'
 */
function getStorageMode() {
  if (currentMode) return currentMode

  const firestore = initFirestore()
  const bucket = getBucket()

  if (firestore && bucket) {
    currentMode = STORAGE_MODE.CLOUD
    logger.info('STORAGE', 'Using cloud storage mode (Firestore + GCS)')
  } else {
    currentMode = STORAGE_MODE.MEMORY
    logger.info('STORAGE', 'Using in-memory storage mode (development fallback)')
  }

  return currentMode
}

/**
 * Sanitize a path segment to prevent path traversal
 * @param {string} value - Value to sanitize
 * @returns {string} Sanitized value
 */
function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * Get the GCS path for a topic's full data
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {string} GCS object path
 */
function getGCSPath(clientId, topicId) {
  const safeClientId = sanitizeSegment(clientId)
  const safeTopicId = sanitizeSegment(topicId)
  return `topics/${safeClientId}/${safeTopicId}.json`
}

/**
 * Get Firestore document reference for topic metadata
 * @param {Firestore} firestore - Firestore instance
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {FirebaseFirestore.DocumentReference}
 */
function getMetadataDocRef(firestore, clientId, topicId) {
  return firestore
    .collection('topics')
    .doc(clientId)
    .collection('items')
    .doc(topicId)
}

/**
 * Extract metadata from a full topic object
 * @param {Object} topic - Full topic object
 * @param {string} gcsPath - GCS path where full data is stored
 * @returns {Object} Topic metadata
 */
function extractMetadata(topic, gcsPath) {
  return {
    id: topic.id,
    name: topic.name,
    icon: topic.icon || null,
    category: topic.category || 'General',
    createdAt: topic.createdAt || new Date(),
    updatedAt: new Date(),
    slideCount: Array.isArray(topic.slides) ? topic.slides.length : 0,
    gcsPath
  }
}

// ============================================================================
// In-Memory Storage Operations
// ============================================================================

/**
 * Get or create the metadata map for a client
 * @param {string} clientId - Client identifier
 * @returns {Map<string, Object>}
 */
function getClientMetadataMap(clientId) {
  if (!memoryStore.metadata.has(clientId)) {
    memoryStore.metadata.set(clientId, new Map())
  }
  return memoryStore.metadata.get(clientId)
}

/**
 * Get or create the full data map for a client
 * @param {string} clientId - Client identifier
 * @returns {Map<string, Object>}
 */
function getClientDataMap(clientId) {
  if (!memoryStore.fullData.has(clientId)) {
    memoryStore.fullData.set(clientId, new Map())
  }
  return memoryStore.fullData.get(clientId)
}

/**
 * Save topic to in-memory storage
 * @param {string} clientId - Client identifier
 * @param {Object} topic - Full topic object with slides
 * @returns {Promise<boolean>}
 */
async function saveTopicMemory(clientId, topic) {
  try {
    const topicId = topic.id
    const gcsPath = getGCSPath(clientId, topicId)
    const metadata = extractMetadata(topic, gcsPath)

    // Store metadata
    const metadataMap = getClientMetadataMap(clientId)
    metadataMap.set(topicId, metadata)

    // Store full data
    const dataMap = getClientDataMap(clientId)
    dataMap.set(topicId, {
      ...topic,
      updatedAt: new Date()
    })

    logger.debug('STORAGE', 'Topic saved to memory', { clientId, topicId })
    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to save topic to memory', {
      clientId,
      topicId: topic?.id,
      error: error.message
    })
    return false
  }
}

/**
 * Get full topic from in-memory storage
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {Promise<Object|null>}
 */
async function getTopicMemory(clientId, topicId) {
  try {
    const dataMap = getClientDataMap(clientId)
    return dataMap.get(topicId) || null
  } catch (error) {
    logger.error('STORAGE', 'Failed to get topic from memory', {
      clientId,
      topicId,
      error: error.message
    })
    return null
  }
}

/**
 * Get topics list from in-memory storage
 * @param {string} clientId - Client identifier
 * @returns {Promise<Object[]>}
 */
async function getTopicsListMemory(clientId) {
  try {
    const metadataMap = getClientMetadataMap(clientId)
    return Array.from(metadataMap.values())
  } catch (error) {
    logger.error('STORAGE', 'Failed to get topics list from memory', {
      clientId,
      error: error.message
    })
    return []
  }
}

/**
 * Delete topic from in-memory storage
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {Promise<boolean>}
 */
async function deleteTopicMemory(clientId, topicId) {
  try {
    const metadataMap = getClientMetadataMap(clientId)
    const dataMap = getClientDataMap(clientId)

    metadataMap.delete(topicId)
    dataMap.delete(topicId)

    logger.debug('STORAGE', 'Topic deleted from memory', { clientId, topicId })
    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to delete topic from memory', {
      clientId,
      topicId,
      error: error.message
    })
    return false
  }
}

/**
 * Save all topics to in-memory storage
 * @param {string} clientId - Client identifier
 * @param {Object[]} topics - Array of full topic objects
 * @returns {Promise<boolean>}
 */
async function saveAllTopicsMemory(clientId, topics) {
  try {
    for (const topic of topics) {
      await saveTopicMemory(clientId, topic)
    }
    logger.debug('STORAGE', 'All topics saved to memory', { clientId, count: topics.length })
    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to save all topics to memory', {
      clientId,
      error: error.message
    })
    return false
  }
}

// ============================================================================
// Cloud Storage Operations
// ============================================================================

/**
 * Save topic to cloud storage (Firestore + GCS)
 * @param {string} clientId - Client identifier
 * @param {Object} topic - Full topic object with slides
 * @returns {Promise<boolean>}
 */
async function saveTopicCloud(clientId, topic) {
  const firestore = initFirestore()
  const bucket = getBucket()

  if (!firestore || !bucket) {
    logger.error('STORAGE', 'Cloud storage not available for save')
    return false
  }

  const topicId = topic.id
  const gcsPath = getGCSPath(clientId, topicId)

  try {
    // Save full data to GCS
    const fullData = {
      ...topic,
      updatedAt: new Date().toISOString()
    }
    const file = bucket.file(gcsPath)
    await file.save(JSON.stringify(fullData), {
      contentType: 'application/json',
      resumable: false,
      metadata: {
        cacheControl: 'private, max-age=0'
      }
    })

    logger.debug('STORAGE', 'Topic data saved to GCS', { clientId, topicId, gcsPath })

    // Save metadata to Firestore
    const metadata = extractMetadata(topic, gcsPath)
    const docRef = getMetadataDocRef(firestore, clientId, topicId)
    await docRef.set({
      ...metadata,
      createdAt: metadata.createdAt instanceof Date
        ? Firestore.Timestamp.fromDate(metadata.createdAt)
        : metadata.createdAt,
      updatedAt: Firestore.Timestamp.fromDate(metadata.updatedAt)
    })

    logger.debug('STORAGE', 'Topic metadata saved to Firestore', { clientId, topicId })
    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to save topic to cloud', {
      clientId,
      topicId,
      error: error.message
    })
    return false
  }
}

/**
 * Get full topic from cloud storage (GCS)
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {Promise<Object|null>}
 */
async function getTopicCloud(clientId, topicId) {
  const bucket = getBucket()

  if (!bucket) {
    logger.error('STORAGE', 'GCS not available for get')
    return null
  }

  const gcsPath = getGCSPath(clientId, topicId)

  try {
    const file = bucket.file(gcsPath)
    const [exists] = await file.exists()

    if (!exists) {
      logger.debug('STORAGE', 'Topic not found in GCS', { clientId, topicId, gcsPath })
      return null
    }

    const [contents] = await file.download()
    const topic = JSON.parse(contents.toString('utf8'))

    logger.debug('STORAGE', 'Topic loaded from GCS', { clientId, topicId })
    return topic
  } catch (error) {
    logger.error('STORAGE', 'Failed to get topic from GCS', {
      clientId,
      topicId,
      error: error.message
    })
    return null
  }
}

/**
 * Get topics list from cloud storage (Firestore)
 * @param {string} clientId - Client identifier
 * @returns {Promise<Object[]>}
 */
async function getTopicsListCloud(clientId) {
  const firestore = initFirestore()

  if (!firestore) {
    logger.error('STORAGE', 'Firestore not available for list')
    return []
  }

  try {
    const collectionRef = firestore
      .collection('topics')
      .doc(clientId)
      .collection('items')

    const snapshot = await collectionRef.orderBy('createdAt', 'desc').get()

    if (snapshot.empty) {
      logger.debug('STORAGE', 'No topics found for client', { clientId })
      return []
    }

    const topics = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt
      }
    })

    logger.debug('STORAGE', 'Topics list loaded from Firestore', {
      clientId,
      count: topics.length
    })
    return topics
  } catch (error) {
    logger.error('STORAGE', 'Failed to get topics list from Firestore', {
      clientId,
      error: error.message
    })
    return []
  }
}

/**
 * Delete topic from cloud storage (Firestore + GCS)
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {Promise<boolean>}
 */
async function deleteTopicCloud(clientId, topicId) {
  const firestore = initFirestore()
  const bucket = getBucket()

  if (!firestore || !bucket) {
    logger.error('STORAGE', 'Cloud storage not available for delete')
    return false
  }

  const gcsPath = getGCSPath(clientId, topicId)

  try {
    // Delete from GCS (ignore if not exists)
    const file = bucket.file(gcsPath)
    try {
      await file.delete()
      logger.debug('STORAGE', 'Topic data deleted from GCS', { clientId, topicId, gcsPath })
    } catch (gcsError) {
      // Ignore 404 errors (file doesn't exist)
      if (gcsError.code !== 404) {
        logger.warn('STORAGE', 'Failed to delete from GCS', {
          clientId,
          topicId,
          error: gcsError.message
        })
      }
    }

    // Delete from Firestore
    const docRef = getMetadataDocRef(firestore, clientId, topicId)
    await docRef.delete()
    logger.debug('STORAGE', 'Topic metadata deleted from Firestore', { clientId, topicId })

    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to delete topic from cloud', {
      clientId,
      topicId,
      error: error.message
    })
    return false
  }
}

/**
 * Save all topics to cloud storage (batch operation)
 * @param {string} clientId - Client identifier
 * @param {Object[]} topics - Array of full topic objects
 * @returns {Promise<boolean>}
 */
async function saveAllTopicsCloud(clientId, topics) {
  const firestore = initFirestore()
  const bucket = getBucket()

  if (!firestore || !bucket) {
    logger.error('STORAGE', 'Cloud storage not available for batch save')
    return false
  }

  try {
    // Save all topics to GCS in parallel
    const gcsPromises = topics.map(async (topic) => {
      const gcsPath = getGCSPath(clientId, topic.id)
      const fullData = {
        ...topic,
        updatedAt: new Date().toISOString()
      }
      const file = bucket.file(gcsPath)
      await file.save(JSON.stringify(fullData), {
        contentType: 'application/json',
        resumable: false,
        metadata: {
          cacheControl: 'private, max-age=0'
        }
      })
      return { topicId: topic.id, gcsPath }
    })

    const gcsResults = await Promise.all(gcsPromises)
    logger.debug('STORAGE', 'All topic data saved to GCS', {
      clientId,
      count: gcsResults.length
    })

    // Batch write metadata to Firestore
    const batch = firestore.batch()
    for (const topic of topics) {
      const gcsPath = getGCSPath(clientId, topic.id)
      const metadata = extractMetadata(topic, gcsPath)
      const docRef = getMetadataDocRef(firestore, clientId, topic.id)
      batch.set(docRef, {
        ...metadata,
        createdAt: metadata.createdAt instanceof Date
          ? Firestore.Timestamp.fromDate(metadata.createdAt)
          : metadata.createdAt,
        updatedAt: Firestore.Timestamp.fromDate(metadata.updatedAt)
      })
    }

    await batch.commit()
    logger.debug('STORAGE', 'All topic metadata saved to Firestore', {
      clientId,
      count: topics.length
    })

    return true
  } catch (error) {
    logger.error('STORAGE', 'Failed to save all topics to cloud', {
      clientId,
      error: error.message
    })
    return false
  }
}

// ============================================================================
// Public API - Automatically routes to cloud or memory storage
// ============================================================================

/**
 * Save a topic (metadata to Firestore, full data to GCS)
 * Falls back to in-memory storage when cloud services are unavailable
 *
 * @param {string} clientId - Client identifier
 * @param {Object} topic - Full topic object including slides array
 * @returns {Promise<boolean>} Success status
 */
export async function saveTopic(clientId, topic) {
  if (!clientId || !topic?.id) {
    logger.error('STORAGE', 'Invalid parameters for saveTopic', {
      hasClientId: !!clientId,
      hasTopicId: !!topic?.id
    })
    return false
  }

  const mode = getStorageMode()

  if (mode === STORAGE_MODE.CLOUD) {
    return saveTopicCloud(clientId, topic)
  } else {
    return saveTopicMemory(clientId, topic)
  }
}

/**
 * Get full topic data (from GCS or memory)
 *
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {Promise<Object|null>} Full topic object or null if not found
 */
export async function getTopic(clientId, topicId) {
  if (!clientId || !topicId) {
    logger.error('STORAGE', 'Invalid parameters for getTopic', {
      hasClientId: !!clientId,
      hasTopicId: !!topicId
    })
    return null
  }

  const mode = getStorageMode()

  if (mode === STORAGE_MODE.CLOUD) {
    return getTopicCloud(clientId, topicId)
  } else {
    return getTopicMemory(clientId, topicId)
  }
}

/**
 * Get list of topic metadata (from Firestore or memory)
 *
 * @param {string} clientId - Client identifier
 * @returns {Promise<Object[]>} Array of topic metadata objects
 */
export async function getTopicsList(clientId) {
  if (!clientId) {
    logger.error('STORAGE', 'Invalid parameters for getTopicsList', {
      hasClientId: !!clientId
    })
    return []
  }

  const mode = getStorageMode()

  if (mode === STORAGE_MODE.CLOUD) {
    return getTopicsListCloud(clientId)
  } else {
    return getTopicsListMemory(clientId)
  }
}

/**
 * Delete a topic (from both Firestore and GCS, or memory)
 *
 * @param {string} clientId - Client identifier
 * @param {string} topicId - Topic identifier
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTopic(clientId, topicId) {
  if (!clientId || !topicId) {
    logger.error('STORAGE', 'Invalid parameters for deleteTopic', {
      hasClientId: !!clientId,
      hasTopicId: !!topicId
    })
    return false
  }

  const mode = getStorageMode()

  if (mode === STORAGE_MODE.CLOUD) {
    return deleteTopicCloud(clientId, topicId)
  } else {
    return deleteTopicMemory(clientId, topicId)
  }
}

/**
 * Batch save multiple topics
 *
 * @param {string} clientId - Client identifier
 * @param {Object[]} topics - Array of full topic objects
 * @returns {Promise<boolean>} Success status
 */
export async function saveAllTopics(clientId, topics) {
  if (!clientId || !Array.isArray(topics)) {
    logger.error('STORAGE', 'Invalid parameters for saveAllTopics', {
      hasClientId: !!clientId,
      isTopicsArray: Array.isArray(topics)
    })
    return false
  }

  // Filter out topics without IDs
  const validTopics = topics.filter(t => t?.id)
  if (validTopics.length === 0) {
    logger.warn('STORAGE', 'No valid topics to save', { clientId })
    return true // Not an error, just nothing to do
  }

  const mode = getStorageMode()

  if (mode === STORAGE_MODE.CLOUD) {
    return saveAllTopicsCloud(clientId, validTopics)
  } else {
    return saveAllTopicsMemory(clientId, validTopics)
  }
}

/**
 * Get the current storage mode
 * @returns {string} 'cloud' or 'memory'
 */
export function getCurrentStorageMode() {
  return getStorageMode()
}

/**
 * Check if cloud storage is available
 * @returns {boolean}
 */
export function isCloudStorageAvailable() {
  return getStorageMode() === STORAGE_MODE.CLOUD
}

/**
 * Clear in-memory storage (for testing)
 * Only works in memory mode
 */
export function clearMemoryStore() {
  memoryStore.metadata.clear()
  memoryStore.fullData.clear()
  logger.debug('STORAGE', 'In-memory store cleared')
}

// Default export for convenience
export default {
  saveTopic,
  getTopic,
  getTopicsList,
  deleteTopic,
  saveAllTopics,
  getCurrentStorageMode,
  isCloudStorageAvailable,
  clearMemoryStore
}
