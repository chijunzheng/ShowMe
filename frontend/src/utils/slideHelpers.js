/**
 * Slide helper utilities
 * Functions for creating, building, and managing slides
 */

import { EXPLANATION_LEVEL, TRIVIAL_TRANSCRIPT_TOKENS } from '../constants/appConfig.js'
import { createHeaderSlide } from './topicStorage.js'

/**
 * Create a section divider slide that marks a follow-up section.
 * Displayed as a "chapter card" showing the follow-up question.
 * @param {string} topicId - Parent topic ID
 * @param {string} question - The follow-up question text
 * @returns {Object} Section divider slide object
 */
export function createSectionDivider(topicId, question) {
  return {
    id: `section_${topicId}_${Date.now()}`,
    type: 'section',
    topicId,
    question,
    // Section dividers don't have imageUrl, audioUrl, or duration
    // They are rendered using the SectionDivider component
  }
}

/**
 * Get slides from the current version of a topic.
 * Falls back to topic.slides for backward compatibility.
 * @param {Object|null} topic - Topic object with versions array
 * @returns {Array} Slides for the current version
 */
export function getCurrentVersionSlides(topic) {
  if (!topic) return []

  // Check if topic has versions array
  if (topic.versions && topic.versions.length > 0) {
    const versionIndex = topic.currentVersionIndex ?? 0
    const currentVersion = topic.versions[versionIndex]
    if (currentVersion && currentVersion.slides && currentVersion.slides.length > 0) {
      return currentVersion.slides
    }
  }

  // Fallback to topic-level slides for backward compatibility
  return topic.slides || []
}

/**
 * Get the current version's explanation level.
 * Falls back to topic.explanationLevel or standard for backward compatibility.
 * @param {Object|null} topic - Topic object with versions array
 * @returns {string} Current explanation level
 */
export function getCurrentVersionLevel(topic) {
  if (!topic) return EXPLANATION_LEVEL.STANDARD

  // Check if topic has versions array
  if (topic.versions && topic.versions.length > 0) {
    const versionIndex = topic.currentVersionIndex ?? 0
    const currentVersion = topic.versions[versionIndex]
    if (currentVersion && currentVersion.explanationLevel) {
      return currentVersion.explanationLevel
    }
  }

  // Fallback to topic-level explanationLevel
  return topic.explanationLevel || EXPLANATION_LEVEL.STANDARD
}

/**
 * Build the slide list for a topic, including its header divider.
 * Uses the current version's slides if versions are available.
 * @param {Object|null} topic - Topic object with headerSlide and versions
 * @returns {Array} Slides for the topic in display order
 */
export function buildTopicSlides(topic) {
  if (!topic) return []
  const slides = []
  const headerSlide = topic.headerSlide || createHeaderSlide(topic)
  if (headerSlide) {
    slides.push(headerSlide)
  }

  // Get slides from current version (or fallback to topic.slides)
  const versionSlides = getCurrentVersionSlides(topic)
  if (versionSlides.length > 0) {
    slides.push(...versionSlides)
  }

  // NOTE: Suggestions are now shown in SocraticFeedback instead of as a slide
  // This allows Socratic mode to trigger after the last content slide
  return slides
}

/**
 * Check if a transcription is trivial (filler words, single char noise, etc.)
 * @param {string} text - Transcription text to check
 * @returns {boolean} Whether the transcription is trivial
 */
export function isTrivialTranscription(text) {
  if (!text || typeof text !== 'string') return true
  const cleaned = text.trim().toLowerCase()
  if (!cleaned) return true
  const normalized = cleaned.replace(/[^a-z0-9\s]/g, ' ')
  const tokens = normalized.split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  if (tokens.every((token) => TRIVIAL_TRANSCRIPT_TOKENS.has(token))) return true
  // Only filter single-character transcriptions (likely noise)
  // Allow 2-3 char words as they can be valid acronyms (LLM, API, GPU) or short words
  if (tokens.length === 1 && tokens[0].length <= 1) {
    return true
  }
  return false
}

/**
 * Limit in-memory slides to a recent-access cache to avoid unbounded growth.
 * @param {Array} topicList - Topics to prune
 * @param {string|null} keepTopicId - Topic ID to preserve in cache
 * @param {number} maxCachedTopics - Maximum number of topics to keep slides for
 * @returns {Array} Topics with slides evicted beyond cache size
 */
export function pruneSlideCache(topicList, keepTopicId, maxCachedTopics) {
  const cachedTopics = topicList.filter(
    (topic) => Array.isArray(topic.slides) && topic.slides.length > 0
  )

  if (cachedTopics.length <= maxCachedTopics) {
    return topicList
  }

  const sortedByAccess = [...cachedTopics].sort(
    (a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0)
  )

  const toEvict = new Set()
  const evictCount = cachedTopics.length - maxCachedTopics
  for (const topic of sortedByAccess) {
    if (toEvict.size >= evictCount) break
    if (topic.id === keepTopicId) continue
    toEvict.add(topic.id)
  }

  if (toEvict.size === 0) {
    return topicList
  }

  return topicList.map((topic) =>
    toEvict.has(topic.id)
      ? { ...topic, slides: null }
      : topic
  )
}
