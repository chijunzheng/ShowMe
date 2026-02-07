/**
 * Story storage utilities
 * Handles localStorage persistence for completed Story Studio stories.
 *
 * Storage layout:
 * - STORAGE_KEYS.STORIES -> { version, stories: [metadata], savedAt }
 * - STORAGE_KEYS.STORY_CONTENT_PREFIX + id -> { version, story: fullContent, savedAt }
 *
 * Metadata shape (lightweight, for list rendering):
 * { id, topicName, createdAt, conceptCount, totalConcepts, xpEarned, firstSceneImageUrl }
 *
 * Full content shape:
 * { id, topicName, createdAt, scenes, conceptsFound, totalConcepts, xpEarned, storySetup, version }
 * scene shape includes: { imageUrl, sceneDescription, panelCaptions?, narrativeText, chapterTitle }
 */

import logger from './logger.js'
import {
  STORAGE_KEYS,
  STORAGE_VERSIONS,
  STORAGE_LIMITS,
} from '../constants/appConfig.js'

function canUseLocalStorage() {
  return (
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function' &&
    typeof localStorage.removeItem === 'function'
  )
}

/**
 * Extract lightweight metadata from a full story document for list storage.
 * Keeps only the fields needed for rendering story cards.
 * @param {Object} story - Full story document
 * @returns {Object} Metadata subset for list storage
 */
function buildStoryMetadata(story) {
  return {
    id: story.id,
    topicName: story.topicName,
    createdAt: story.createdAt,
    conceptCount: Array.isArray(story.conceptsFound) ? story.conceptsFound.length : 0,
    totalConcepts: story.totalConcepts || 0,
    xpEarned: story.xpEarned || 0,
    firstSceneImageUrl: story.scenes?.[0]?.imageUrl || null,
  }
}

/**
 * Load the story metadata list from localStorage.
 * Returns an empty array on parse failure or version mismatch.
 * @returns {Array} Array of story metadata objects
 */
export function loadStoriesFromStorage() {
  if (!canUseLocalStorage()) return []
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STORIES)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!parsed || parsed.version > STORAGE_VERSIONS.STORIES) return []

    return Array.isArray(parsed.stories) ? parsed.stories : []
  } catch (error) {
    logger.warn('STORY_STORAGE', 'Failed to load stories', { error: error.message })
    return []
  }
}

/**
 * Persist the story metadata list to localStorage.
 * Wraps the list with version and timestamp for schema tracking.
 * @param {Array} stories - Array of story metadata objects
 */
function saveMetadataList(stories) {
  if (!canUseLocalStorage()) return
  try {
    const payload = {
      version: STORAGE_VERSIONS.STORIES,
      stories,
      savedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(payload))
  } catch (error) {
    logger.warn('STORY_STORAGE', 'Failed to save stories metadata', { error: error.message })
  }
}

/**
 * Save full story content to its own localStorage key.
 * Each story gets a dedicated key to avoid loading all content at once.
 * @param {Object} story - Full story document
 */
function saveStoryContent(story) {
  if (!canUseLocalStorage()) return
  try {
    const key = `${STORAGE_KEYS.STORY_CONTENT_PREFIX}${story.id}`
    const payload = {
      version: STORAGE_VERSIONS.STORIES,
      story,
      savedAt: Date.now(),
    }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch (error) {
    logger.warn('STORY_STORAGE', 'Failed to save story content', {
      error: error.message,
      storyId: story.id,
    })
  }
}

/**
 * Evict the oldest stories beyond the configured limit.
 * Removes both metadata entries and their content keys from localStorage.
 * @param {Array} stories - Current metadata list (may exceed limit)
 * @returns {Array} Trimmed metadata list within the limit
 */
function evictOldStories(stories) {
  if (!canUseLocalStorage()) return stories.slice(0, STORAGE_LIMITS.MAX_CACHED_STORIES)
  const max = STORAGE_LIMITS.MAX_CACHED_STORIES
  if (stories.length <= max) return stories

  // Sort by createdAt descending to keep the newest stories
  const sorted = [...stories].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const kept = sorted.slice(0, max)
  const evicted = sorted.slice(max)

  // Remove content keys for evicted stories
  evicted.forEach((s) => {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.STORY_CONTENT_PREFIX}${s.id}`)
    } catch {
      // Ignore removal errors for evicted content
    }
  })

  return kept
}

/**
 * Save a complete story (metadata list entry + full content).
 * Replaces existing entry if the same ID is found, otherwise prepends.
 * Automatically evicts old stories beyond the configured limit.
 * @param {Object} story - Full story document with at minimum an `id` field
 */
export function saveStoryToStorage(story) {
  if (!story?.id) return

  const metadata = buildStoryMetadata(story)
  const existing = loadStoriesFromStorage()

  // Remove any existing entry with the same ID, then prepend the new one
  const filtered = existing.filter((s) => s.id !== story.id)
  const updated = evictOldStories([metadata, ...filtered])

  saveMetadataList(updated)
  saveStoryContent(story)

  logger.debug('STORY_STORAGE', 'Story saved', {
    storyId: story.id,
    topicName: story.topicName,
  })
}

/**
 * Load full story content by ID from its dedicated localStorage key.
 * @param {string} id - Story ID
 * @returns {Object|null} Full story document or null when unavailable
 */
export function loadStoryContent(id) {
  if (!id) return null
  if (!canUseLocalStorage()) return null

  try {
    const key = `${STORAGE_KEYS.STORY_CONTENT_PREFIX}${id}`
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    if (!parsed || parsed.version > STORAGE_VERSIONS.STORIES) return null

    return parsed.story || null
  } catch (error) {
    logger.warn('STORY_STORAGE', 'Failed to load story content', {
      error: error.message,
      storyId: id,
    })
    return null
  }
}

/**
 * Delete a story by removing both its metadata entry and content key.
 * @param {string} id - Story ID to delete
 */
export function deleteStoryFromStorage(id) {
  if (!id) return
  if (!canUseLocalStorage()) return

  const existing = loadStoriesFromStorage()
  const filtered = existing.filter((s) => s.id !== id)
  saveMetadataList(filtered)

  try {
    localStorage.removeItem(`${STORAGE_KEYS.STORY_CONTENT_PREFIX}${id}`)
  } catch {
    // Ignore removal errors for content key
  }

  logger.debug('STORY_STORAGE', 'Story deleted', { storyId: id })
}
