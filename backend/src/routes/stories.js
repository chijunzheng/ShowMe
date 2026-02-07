/**
 * Story Persistence API Routes
 * CRUD operations for completed Story Studio stories.
 *
 * Endpoints:
 * - GET  /api/stories          - List stories for a client
 * - POST /api/stories/save     - Save (upsert) a story
 * - POST /api/stories/delete   - Delete a story by id
 */

import { Router } from 'express'
import { getStories, saveStory, deleteStory } from '../services/storyStorage.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * GET /api/stories?clientId=xxx
 *
 * Retrieve all saved stories for a client.
 *
 * Query params:
 * - clientId: string (required)
 *
 * Response:
 * - stories: array of story objects
 */
router.get('/', async (req, res) => {
  const { clientId } = req.query

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' })
  }

  try {
    const { stories, error } = await getStories(clientId)
    if (error) {
      return res.status(500).json({ error })
    }
    res.json({ stories })
  } catch (error) {
    logger.error('STORIES', 'Failed to get stories', { error: error.message })
    res.status(500).json({ error: 'Failed to get stories' })
  }
})

/**
 * POST /api/stories/save
 *
 * Save or update a completed story.
 *
 * Request body:
 * - clientId: string (required)
 * - story: object with id field (required)
 *
 * Response:
 * - story: the persisted story object
 */
router.post('/save', async (req, res) => {
  const { clientId, story } = req.body

  if (!clientId) {
    return res.status(400).json({ error: 'clientId is required' })
  }

  if (!story?.id) {
    return res.status(400).json({ error: 'story with id is required' })
  }

  try {
    const { story: saved, error } = await saveStory(clientId, story)
    if (error) {
      return res.status(500).json({ error })
    }
    res.json({ story: saved })
  } catch (error) {
    logger.error('STORIES', 'Failed to save story', { error: error.message })
    res.status(500).json({ error: 'Failed to save story' })
  }
})

/**
 * POST /api/stories/delete
 *
 * Delete a story by id. Uses POST instead of DELETE to avoid CORS issues
 * (the CORS config only allows GET, POST, OPTIONS methods).
 *
 * Request body:
 * - clientId: string (required)
 * - storyId: string (required)
 *
 * Response:
 * - success: boolean
 */
router.post('/delete', async (req, res) => {
  const { clientId, storyId } = req.body

  if (!clientId || !storyId) {
    return res.status(400).json({ error: 'clientId and storyId required' })
  }

  try {
    const { success, error } = await deleteStory(clientId, storyId)
    if (error) {
      return res.status(500).json({ error })
    }
    res.json({ success })
  } catch (error) {
    logger.error('STORIES', 'Failed to delete story', { error: error.message })
    res.status(500).json({ error: 'Failed to delete story' })
  }
})

export default router
