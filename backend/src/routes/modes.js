import { Router } from 'express'
import {
  saveModeSession,
  loadLatestModeSession,
  listModeSessions,
} from '../services/modeSessionStorage.js'
import logger from '../utils/logger.js'

const router = Router()

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

router.post('/save', async (req, res) => {
  const {
    clientId,
    mode,
    topicId,
    topicName,
    versionId,
    completedAt,
    session,
  } = req.body || {}

  if (!isNonEmptyString(clientId) || !isNonEmptyString(mode) || !isNonEmptyString(topicId)) {
    return res.status(400).json({
      error: 'clientId, mode, and topicId are required',
    })
  }

  try {
    const { success, error } = await saveModeSession({
      clientId: clientId.trim(),
      mode: mode.trim(),
      topicId: topicId.trim(),
      topicName: isNonEmptyString(topicName) ? topicName.trim() : '',
      versionId: isNonEmptyString(versionId) ? versionId.trim() : '',
      completedAt,
      session,
    })

    if (!success) {
      return res.status(500).json({
        error: error || 'Failed to save mode session',
      })
    }

    return res.json({ success: true })
  } catch (error) {
    logger.error('MODES', 'Failed to save mode session', { error: error.message })
    return res.status(500).json({ error: 'Failed to save mode session' })
  }
})

router.post('/latest', async (req, res) => {
  const { clientId, mode, topicId, versionId } = req.body || {}

  if (!isNonEmptyString(clientId) || !isNonEmptyString(mode)) {
    return res.status(400).json({
      error: 'clientId and mode are required',
    })
  }

  try {
    const { session, error } = await loadLatestModeSession({
      clientId: clientId.trim(),
      mode: mode.trim(),
      topicId: isNonEmptyString(topicId) ? topicId.trim() : '',
      versionId: isNonEmptyString(versionId) ? versionId.trim() : '',
    })

    if (error) {
      return res.status(500).json({ error })
    }

    return res.json({ session })
  } catch (error) {
    logger.error('MODES', 'Failed to load latest mode session', { error: error.message })
    return res.status(500).json({ error: 'Failed to load latest mode session' })
  }
})

router.post('/list', async (req, res) => {
  const { clientId, mode, topicId, versionId, limit } = req.body || {}

  if (!isNonEmptyString(clientId)) {
    return res.status(400).json({
      error: 'clientId is required',
    })
  }

  try {
    const { sessions, error } = await listModeSessions({
      clientId: clientId.trim(),
      mode: isNonEmptyString(mode) ? mode.trim() : '',
      topicId: isNonEmptyString(topicId) ? topicId.trim() : '',
      versionId: isNonEmptyString(versionId) ? versionId.trim() : '',
      limit,
    })

    if (error) {
      return res.status(500).json({ error })
    }

    return res.json({ sessions })
  } catch (error) {
    logger.error('MODES', 'Failed to list mode sessions', { error: error.message })
    return res.status(500).json({ error: 'Failed to list mode sessions' })
  }
})

export default router
