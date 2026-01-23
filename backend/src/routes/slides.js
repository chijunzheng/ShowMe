import express from 'express'
import { loadLatestSlides, loadSlides, saveSlides } from '../services/slideStore.js'
import logger from '../utils/logger.js'

const router = express.Router()

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * POST /api/slides/save
 * Persist slides for a topic/version.
 * Body: { clientId, topicId, versionId?, slides }
 */
router.post('/save', async (req, res) => {
  const { clientId, topicId, versionId, slides } = req.body || {}

  if (!isNonEmptyString(clientId) || !isNonEmptyString(topicId) || !Array.isArray(slides)) {
    return res.status(400).json({
      error: 'Invalid payload',
    })
  }

  const normalizedVersionId = typeof versionId === 'string' ? versionId.trim() : ''
  const saved = await saveSlides({
    clientId: clientId.trim(),
    topicId: topicId.trim(),
    versionId: normalizedVersionId,
    slides,
  })

  if (!saved) {
    return res.status(500).json({
      error: 'Failed to persist slides',
    })
  }

  logger.debug('STORAGE', 'Slides persisted to Firestore', {
    clientId,
    topicId,
    slidesCount: slides.length,
  })

  return res.json({ ok: true })
})

/**
 * POST /api/slides/load
 * Load slides for a topic/version. Falls back to latest version if needed.
 * Body: { clientId, topicId, versionId? }
 */
router.post('/load', async (req, res) => {
  const { clientId, topicId, versionId } = req.body || {}

  if (!isNonEmptyString(clientId) || !isNonEmptyString(topicId)) {
    return res.status(400).json({
      error: 'Invalid payload',
    })
  }

  const normalizedClientId = clientId.trim()
  const normalizedTopicId = topicId.trim()
  const normalizedVersionId = typeof versionId === 'string' ? versionId.trim() : ''
  let slides = await loadSlides({
    clientId: normalizedClientId,
    topicId: normalizedTopicId,
    versionId: normalizedVersionId,
  })
  let resolvedVersionId = normalizedVersionId

  const shouldFallback = !normalizedVersionId
  if (!slides && shouldFallback) {
    const latest = await loadLatestSlides({
      clientId: normalizedClientId,
      topicId: normalizedTopicId,
    })
    if (latest?.slides) {
      slides = latest.slides
      resolvedVersionId = latest.versionId
    }
  }

  return res.json({
    slides: Array.isArray(slides) ? slides : null,
    versionId: resolvedVersionId || null,
  })
})

export default router
