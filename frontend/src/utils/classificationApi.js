/**
 * Classification API utilities
 * Functions for classifying queries and handling chitchat responses
 */
import logger from './logger.js'
import { UI_STATE } from '../constants/appConfig.js'

/**
 * Classify a query to determine if it's a follow-up, new topic, slide question, or chitchat
 * @param {Object} params - Classification parameters
 * @param {string} params.query - The user's question
 * @param {AbortSignal} params.signal - AbortController signal for cancellation
 * @param {Object|null} params.activeTopic - Current active topic
 * @param {Array} params.topics - All topics
 * @param {string} params.uiState - Current UI state
 * @param {Array} params.visibleSlides - Currently visible slides
 * @param {number} params.currentIndex - Current slide index
 * @returns {Promise<{classification: string, shouldEvictOldest: boolean, evictTopicId: string|null, responseText?: string, complexity?: string}>}
 */
export async function classifyQuery({
  query,
  signal,
  activeTopic,
  topics,
  uiState,
  visibleSlides,
  currentIndex,
}) {
  const activeTopicId = activeTopic?.id || null

  logger.time('API', 'classify-request')
  logger.info('API', 'POST /api/classify', {
    endpoint: '/api/classify',
    method: 'POST',
    activeTopicId,
  })

  // Get current slide context for slide_question detection
  const currentSlide = uiState === UI_STATE.SLIDESHOW &&
    activeTopic &&
    visibleSlides[currentIndex] &&
    visibleSlides[currentIndex].type !== 'header'
    ? {
        subtitle: visibleSlides[currentIndex].subtitle || '',
        topicName: activeTopic.name,
      }
    : null

  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        activeTopicId,
        activeTopic: activeTopic
          ? {
              name: activeTopic.name,
              icon: activeTopic.icon,
            }
          : null,
        conversationHistory: [],
        topicCount: topics.length,
        oldestTopicId: topics.length > 0 ? topics[0].id : null,
        currentSlide,
      }),
      signal,
    })

    logger.timeEnd('API', 'classify-request')

    if (!response.ok) {
      logger.error('API', 'Classify request failed', {
        endpoint: '/api/classify',
        status: response.status,
      })
      throw new Error(`Classify API failed: ${response.status}`)
    }

    const result = await response.json()
    logger.info('API', 'Classify response received', {
      classification: result.classification,
      status: response.status,
    })

    return result
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.debug('API', 'Classify request aborted by user')
      throw error
    }
    logger.error('API', 'Classification request failed', {
      endpoint: '/api/classify',
      error: error.message,
    })
    return {
      classification: 'new_topic',
      shouldEvictOldest: false,
      evictTopicId: null,
    }
  }
}

/**
 * Request a short chitchat response from the backend.
 * @param {Object} params - Chitchat parameters
 * @param {string} params.query - The user's message
 * @param {AbortSignal} params.signal - AbortController signal for cancellation
 * @param {string} params.activeTopicName - Name of the active topic
 * @returns {Promise<{responseText: string}|null>}
 */
export async function requestChitchatResponse({ query, signal, activeTopicName }) {
  logger.time('API', 'chitchat-request')
  logger.info('API', 'POST /api/chitchat', {
    endpoint: '/api/chitchat',
    method: 'POST',
  })

  try {
    const response = await fetch('/api/chitchat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        activeTopicName: activeTopicName || '',
      }),
      signal,
    })

    logger.timeEnd('API', 'chitchat-request')

    if (!response.ok) {
      logger.warn('API', 'Chitchat request failed', {
        status: response.status,
      })
      return null
    }

    const result = await response.json()
    logger.info('API', 'Chitchat response received', {
      status: response.status,
    })

    return result
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.debug('API', 'Chitchat request aborted by user')
      throw error
    }
    logger.warn('API', 'Chitchat request failed', {
      error: error.message,
    })
    return null
  }
}
