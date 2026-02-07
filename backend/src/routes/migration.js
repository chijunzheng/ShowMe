import { Router } from 'express'
import { saveSlides } from '../services/slideStore.js'
import { saveStory } from '../services/storyStorage.js'
import { saveGraphState } from '../services/graphStorage.js'
import { saveModeSession } from '../services/modeSessionStorage.js'
import { getMigrationMarker, setMigrationMarker } from '../services/migrationStore.js'
import logger from '../utils/logger.js'

const router = Router()

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeTopicVersions(topic) {
  if (!topic || typeof topic !== 'object') return []
  const versions = Array.isArray(topic.versions) ? topic.versions : []

  if (versions.length > 0) {
    return versions
      .filter((version) => version && typeof version === 'object')
      .map((version) => ({
        id: isNonEmptyString(version.id) ? version.id.trim() : 'legacy',
        slides: Array.isArray(version.slides) ? version.slides : [],
      }))
  }

  if (Array.isArray(topic.slides) && topic.slides.length > 0) {
    return [{ id: 'legacy', slides: topic.slides }]
  }

  return []
}

router.post('/import-local', async (req, res) => {
  const {
    clientId,
    topics,
    graph,
    stories,
    modeSessions,
    migrationVersion,
    checksum,
  } = req.body || {}

  if (!isNonEmptyString(clientId) || !isNonEmptyString(migrationVersion) || !isNonEmptyString(checksum)) {
    return res.status(400).json({
      error: 'clientId, migrationVersion, and checksum are required',
    })
  }

  const normalizedClientId = clientId.trim()
  const normalizedVersion = migrationVersion.trim()
  const normalizedChecksum = checksum.trim()

  try {
    const existingMarker = await getMigrationMarker(normalizedClientId, normalizedVersion)
    if (existingMarker?.checksum === normalizedChecksum) {
      return res.json({
        success: true,
        imported: false,
        alreadyImported: true,
        summary: existingMarker.summary || {},
      })
    }

    const summary = {
      graphImported: false,
      topicsImported: 0,
      topicVersionsImported: 0,
      storiesImported: 0,
      modeSessionsImported: 0,
      failures: [],
    }

    if (graph && typeof graph === 'object') {
      const graphResult = await saveGraphState(normalizedClientId, graph)
      if (graphResult.success) {
        summary.graphImported = true
      } else if (graphResult.error) {
        summary.failures.push(`graph:${graphResult.error}`)
      }
    }

    if (Array.isArray(topics)) {
      for (const topic of topics) {
        if (!topic || typeof topic !== 'object') continue
        if (!isNonEmptyString(topic.id)) continue

        const topicId = topic.id.trim()
        const versions = normalizeTopicVersions(topic)
        if (versions.length === 0) continue

        summary.topicsImported += 1

        for (const version of versions) {
          if (!Array.isArray(version.slides) || version.slides.length === 0) continue

          const saved = await saveSlides({
            clientId: normalizedClientId,
            topicId,
            versionId: version.id,
            slides: version.slides,
          })

          if (saved) {
            summary.topicVersionsImported += 1
          } else {
            summary.failures.push(`slides:${topicId}:${version.id}`)
          }
        }
      }
    }

    if (Array.isArray(stories)) {
      for (const story of stories) {
        if (!story || typeof story !== 'object' || !isNonEmptyString(story.id)) continue

        const { error } = await saveStory(normalizedClientId, story)
        if (error) {
          summary.failures.push(`story:${story.id}:${error}`)
          continue
        }

        summary.storiesImported += 1
      }
    }

    if (Array.isArray(modeSessions)) {
      for (const entry of modeSessions) {
        if (!entry || typeof entry !== 'object') continue

        const result = await saveModeSession({
          clientId: normalizedClientId,
          mode: entry.mode,
          topicId: entry.topicId,
          topicName: entry.topicName,
          versionId: entry.versionId,
          completedAt: entry.completedAt,
          session: entry.session,
        })

        if (!result.success) {
          summary.failures.push(`mode:${entry.mode || 'unknown'}:${result.error || 'save failed'}`)
          continue
        }

        summary.modeSessionsImported += 1
      }
    }

    const markerResult = await setMigrationMarker({
      clientId: normalizedClientId,
      migrationVersion: normalizedVersion,
      checksum: normalizedChecksum,
      summary,
    })

    if (!markerResult.success) {
      logger.warn('MIGRATION', 'Migration marker save failed', {
        clientId: normalizedClientId,
        migrationVersion: normalizedVersion,
        error: markerResult.error,
      })
    }

    return res.json({
      success: true,
      imported: true,
      alreadyImported: false,
      summary,
    })
  } catch (error) {
    logger.error('MIGRATION', 'Failed to import local data', {
      error: error.message,
      clientId: normalizedClientId,
      migrationVersion: normalizedVersion,
    })

    return res.status(500).json({
      error: 'Failed to import local data',
    })
  }
})

export default router
