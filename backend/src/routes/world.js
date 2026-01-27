/**
 * World Routes
 * WB006: World state initialization and management
 * WB007: Topic to zone mapping for World Builder gamification
 * WB008: World piece prompt generation
 * WB009: World piece image generation
 * WB014: XP and tier progression for World Builder gamification
 * WB015: Quick mode XP (no world piece)
 *
 * GET /api/world - Get user's world state
 * POST /api/world/piece - Add a new piece (after quiz pass)
 * POST /api/world/piece/generate - Generate a world piece (prompt + image)
 * POST /api/world/xp - Add XP (returns tier upgrade info)
 * POST /api/world/award-xp - Award XP for quiz completion (WB014)
 * POST /api/world/quick-xp - Award XP for quick mode (WB015)
 * GET /api/world/tiers - Get tier definitions
 * POST /api/world/classify-zone - Classify a topic into a world zone
 */

import express from 'express'
import logger from '../utils/logger.js'
import { sanitizeQuery, sanitizeId } from '../utils/sanitize.js'
import { isGeminiAvailable, classifyTopicZone, generateWorldPiecePrompt, generateWorldPieceImage } from '../services/gemini.js'
import {
  getWorldState,
  addWorldPiece,
  addXP,
  awardQuizXP,
  awardQuickModeXP,
  xpToNextTier,
  getTierDefinitions,
  XP_REWARDS,
  TIER_THRESHOLDS
} from '../services/worldState.js'

const router = express.Router()

/**
 * GET /api/world
 * Get user's world state
 *
 * Query params:
 * - clientId: string - The client identifier
 *
 * Response:
 * - worldState: Object with pieces, totalXP, tier, streak, etc.
 * - tiers: Object with tier definitions for UI display
 */
router.get('/', async (req, res) => {
  try {
    const { clientId } = req.query

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    logger.info('WORLD', 'Getting world state', { clientId: sanitizedId })

    const result = await getWorldState(sanitizedId)

    if (result.error) {
      logger.error('WORLD', 'Failed to get world state', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    return res.json({
      worldState: result.worldState,
      tiers: getTierDefinitions()
    })
  } catch (error) {
    logger.error('WORLD', 'Unexpected error getting world state', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/world/piece
 * Add a new piece to the user's world (after quiz pass)
 *
 * Request body:
 * - clientId: string - The client identifier
 * - piece: Object - The WorldPiece to add
 *   - id: string - Unique piece ID
 *   - topicId: string - ID of the topic
 *   - topicName: string - Name of the topic
 *   - zone: 'nature' | 'civilization' | 'arcane'
 *   - imageUrl: string - URL of the piece image
 *   - prompt: string - Prompt used to generate the image
 *   - position: { x: number, y: number } - Position on the island
 *
 * Response:
 * - worldState: Updated world state object
 * - arcaneUnlocked: boolean - True if arcane was just unlocked
 */
router.post('/piece', async (req, res) => {
  try {
    const { clientId, piece } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    // Validate piece object
    if (!piece || typeof piece !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid piece object',
        field: 'piece'
      })
    }

    // Validate required piece fields
    const requiredFields = ['id', 'topicId', 'topicName', 'zone', 'imageUrl', 'prompt', 'position']
    for (const field of requiredFields) {
      if (!piece[field]) {
        return res.status(400).json({
          error: `Missing required piece field: ${field}`,
          field: `piece.${field}`
        })
      }
    }

    // Validate zone
    const validZones = ['nature', 'civilization', 'arcane']
    if (!validZones.includes(piece.zone)) {
      return res.status(400).json({
        error: `Invalid zone. Must be one of: ${validZones.join(', ')}`,
        field: 'piece.zone'
      })
    }

    // Validate position
    if (typeof piece.position !== 'object' ||
        typeof piece.position.x !== 'number' ||
        typeof piece.position.y !== 'number') {
      return res.status(400).json({
        error: 'Position must be an object with x and y number properties',
        field: 'piece.position'
      })
    }

    logger.info('WORLD', 'Adding world piece', { clientId: sanitizedId, pieceId: piece.id, zone: piece.zone })

    const result = await addWorldPiece(sanitizedId, piece)

    if (result.error) {
      logger.error('WORLD', 'Failed to add world piece', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    return res.json({
      worldState: result.worldState,
      arcaneUnlocked: result.worldState.arcaneUnlocked,
      arcaneJustUnlocked: result.arcaneJustUnlocked || false
    })
  } catch (error) {
    logger.error('WORLD', 'Unexpected error adding world piece', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/world/xp
 * Add XP to the user's world (returns tier upgrade info)
 *
 * Request body:
 * - clientId: string - The client identifier
 * - amount: number - Amount of XP to add
 *
 * Response:
 * - worldState: Updated world state object
 * - tierUpgrade: Object with { upgraded, oldTier, newTier } if tier changed, null otherwise
 */
router.post('/xp', async (req, res) => {
  try {
    const { clientId, amount } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    // Validate amount
    if (typeof amount !== 'number' || amount < 0) {
      return res.status(400).json({
        error: 'Amount must be a non-negative number',
        field: 'amount'
      })
    }

    logger.info('WORLD', 'Adding XP', { clientId: sanitizedId, amount })

    const result = await addXP(sanitizedId, amount)

    if (result.error) {
      logger.error('WORLD', 'Failed to add XP', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    return res.json({
      worldState: result.worldState,
      tierUpgrade: result.tierUpgrade
    })
  } catch (error) {
    logger.error('WORLD', 'Unexpected error adding XP', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/world/award-xp
 * Award XP for quiz completion (WB014)
 *
 * This endpoint awards XP based on quiz performance and automatically
 * calculates tier upgrades.
 *
 * Request body:
 * - clientId: string - The client identifier
 * - score: number - The quiz score achieved (number of correct answers)
 * - maxScore: number - The maximum possible score
 * - streak: number (optional) - Current streak count for bonus XP
 *
 * Response:
 * - xpEarned: number - XP earned from this quiz
 * - totalXP: number - User's total XP after this award
 * - tier: string - Current tier after XP award
 * - tierUpgrade: { from: string, to: string } | null - Tier upgrade info if tier changed
 * - xpToNextTier: number - XP needed to reach next tier
 * - xpRewards: Object - XP reward configuration for client display
 */
router.post('/award-xp', async (req, res) => {
  try {
    const { clientId, score, maxScore, streak = 0 } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    // Validate score
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({
        error: 'Score must be a non-negative number',
        field: 'score'
      })
    }

    // Validate maxScore
    if (typeof maxScore !== 'number' || maxScore < 0) {
      return res.status(400).json({
        error: 'maxScore must be a non-negative number',
        field: 'maxScore'
      })
    }

    // Validate streak if provided
    if (typeof streak !== 'number' || streak < 0) {
      return res.status(400).json({
        error: 'streak must be a non-negative number',
        field: 'streak'
      })
    }

    logger.info('WORLD', 'Awarding quiz XP', {
      clientId: sanitizedId,
      score,
      maxScore,
      streak
    })

    const result = await awardQuizXP(sanitizedId, score, maxScore, streak)

    if (result.error) {
      logger.error('WORLD', 'Failed to award quiz XP', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    // Calculate XP to next tier for the response
    const nextTierInfo = xpToNextTier(result.totalXP)

    return res.json({
      xpEarned: result.newXP,
      totalXP: result.totalXP,
      tier: result.newTier,
      tierUpgrade: result.tierUpgrade,
      xpToNextTier: nextTierInfo.xpNeeded,
      nextTier: nextTierInfo.nextTier,
      xpProgress: nextTierInfo.xpProgress,
      xpProgressTotal: nextTierInfo.xpTotal,
      xpRewards: XP_REWARDS,
      tierThresholds: TIER_THRESHOLDS
    })
  } catch (error) {
    logger.error('WORLD', 'Unexpected error awarding quiz XP', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/world/quick-xp
 * Award XP for quick mode completion (WB015)
 *
 * Quick mode awards a small amount of XP (5 XP) without unlocking
 * a world piece. This encourages users to try Full mode for world growth.
 *
 * Request body:
 * - clientId: string - The client identifier
 *
 * Response:
 * - xpEarned: number - XP earned (always 5 for quick mode)
 * - totalXP: number - User's total XP after this award
 * - tier: string - Current tier after XP award
 * - tierUpgrade: { from: string, to: string } | null - Tier upgrade info if tier changed
 * - message: string - Encouraging message to try full mode
 * - xpRewards: Object - XP reward configuration for client display
 */
router.post('/quick-xp', async (req, res) => {
  try {
    const { clientId } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    logger.info('WORLD', 'Awarding quick mode XP', { clientId: sanitizedId })

    const result = await awardQuickModeXP(sanitizedId)

    if (result.error) {
      logger.error('WORLD', 'Failed to award quick mode XP', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    // Calculate XP to next tier for the response
    const nextTierInfo = xpToNextTier(result.totalXP)

    return res.json({
      xpEarned: result.xpEarned,
      totalXP: result.totalXP,
      tier: result.tier,
      tierUpgrade: result.tierUpgrade,
      message: result.message,
      xpToNextTier: nextTierInfo.xpNeeded,
      nextTier: nextTierInfo.nextTier,
      xpProgress: nextTierInfo.xpProgress,
      xpProgressTotal: nextTierInfo.xpTotal,
      xpRewards: XP_REWARDS
    })
  } catch (error) {
    logger.error('WORLD', 'Unexpected error awarding quick mode XP', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/world/tiers
 * Get tier definitions and thresholds
 *
 * Response:
 * - tiers: Object with tier thresholds keyed by tier name
 * - order: Array of tier names in progression order
 * - arcaneUnlockThreshold: Number of topics required to unlock arcane zone
 */
router.get('/tiers', (req, res) => {
  return res.json(getTierDefinitions())
})

/**
 * POST /api/world/classify-zone
 * Classify a topic into one of three world zones for the World Builder feature
 *
 * Zones:
 * - nature: Animals, plants, geology, weather, oceans, space, biology
 * - civilization: History, cultures, inventions, buildings, people, society
 * - arcane: Math, philosophy, abstract concepts, logic, music theory, language
 *
 * Request body:
 * - topicName (required): The topic name (string)
 * - description (optional): Brief description or slide summary for context
 *
 * Response:
 * - zone: 'nature' | 'civilization' | 'arcane'
 * - confidence: number between 0-1
 *
 * Errors:
 *   - 400: Empty or invalid topicName
 *   - 500: Zone classification failed
 *   - 503: Gemini API not available
 */
router.post('/classify-zone', async (req, res) => {
  logger.time('API', 'world-classify-zone-request')

  try {
    const { topicName, description = '' } = req.body

    // Validate and sanitize the topic name
    const { sanitized: sanitizedTopicName, error: topicError } = sanitizeQuery(topicName)
    if (topicError) {
      logger.warn('API', '[World] Invalid topicName', { error: topicError })
      logger.timeEnd('API', 'world-classify-zone-request')
      return res.status(400).json({
        error: topicError,
        field: 'topicName',
      })
    }

    // Sanitize description if provided (optional, so allow empty)
    let sanitizedDescription = ''
    if (description && typeof description === 'string') {
      const { sanitized } = sanitizeQuery(description)
      sanitizedDescription = sanitized || ''
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      logger.warn('API', '[World] Gemini API not available')
      logger.timeEnd('API', 'world-classify-zone-request')
      return res.status(503).json({
        error: 'Zone classification service temporarily unavailable',
      })
    }

    logger.info('API', '[World] Classifying topic zone', {
      topicName: sanitizedTopicName,
      hasDescription: sanitizedDescription.length > 0,
    })

    // Classify the topic into a zone
    const result = await classifyTopicZone(sanitizedTopicName, sanitizedDescription)

    if (result.error) {
      logger.error('API', '[World] Zone classification failed', {
        error: result.error,
        topicName: sanitizedTopicName,
      })
      logger.timeEnd('API', 'world-classify-zone-request')

      // Map error types to appropriate HTTP status codes
      if (result.error === 'INVALID_TOPIC') {
        return res.status(400).json({
          error: 'Invalid topic name provided',
          field: 'topicName',
        })
      }

      if (result.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          })
      }

      if (result.error === 'INVALID_ZONE_RESPONSE' || result.error === 'PARSE_ERROR') {
        return res.status(500).json({
          error: 'Failed to classify topic zone',
        })
      }

      return res.status(500).json({
        error: 'Zone classification failed',
      })
    }

    logger.info('API', '[World] Zone classification success', {
      topicName: sanitizedTopicName,
      zone: result.zone,
      confidence: result.confidence,
    })
    logger.timeEnd('API', 'world-classify-zone-request')

    // Return the classified zone
    res.json({
      zone: result.zone,
      confidence: result.confidence,
    })
  } catch (error) {
    logger.error('API', '[World] Request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'world-classify-zone-request')

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * POST /api/world/piece/generate
 * Generate a world piece image for a completed topic
 * WB008 + WB009: World piece prompt and image generation
 *
 * This endpoint generates both the image prompt and the actual image
 * for a world piece that the user earns after passing a quiz.
 *
 * Request body:
 * - topicName (required): The topic learned (string)
 * - zone (required): 'nature' | 'civilization' | 'arcane'
 * - summary (optional): Brief topic summary from slides for context
 *
 * Response:
 * - prompt: string - The generated image prompt
 * - elements: string[] - Key visual elements in the image
 * - imageUrl: string - Base64 data URL of the generated image
 * - piece: Object - WorldPiece data ready to be added to world state
 *   - id: string - Generated unique piece ID
 *   - topicName: string - The topic name
 *   - zone: string - The zone category
 *   - imageUrl: string - The generated image URL
 *   - prompt: string - The prompt used to generate the image
 *
 * Errors:
 *   - 400: Invalid topicName or zone
 *   - 429: Rate limited
 *   - 500: Generation failed
 *   - 503: Gemini API not available
 */
router.post('/piece/generate', async (req, res) => {
  logger.time('API', 'world-piece-generate-request')

  try {
    const { topicName, zone, summary = '' } = req.body

    // Validate topicName
    if (!topicName || typeof topicName !== 'string') {
      logger.warn('API', '[World] Missing topicName for piece generation')
      logger.timeEnd('API', 'world-piece-generate-request')
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName',
      })
    }

    const { sanitized: sanitizedTopicName, error: topicError } = sanitizeQuery(topicName)
    if (topicError) {
      logger.warn('API', '[World] Invalid topicName', { error: topicError })
      logger.timeEnd('API', 'world-piece-generate-request')
      return res.status(400).json({
        error: topicError,
        field: 'topicName',
      })
    }

    // Validate zone
    const validZones = ['nature', 'civilization', 'arcane']
    if (!zone || !validZones.includes(zone)) {
      logger.warn('API', '[World] Invalid zone for piece generation', { zone })
      logger.timeEnd('API', 'world-piece-generate-request')
      return res.status(400).json({
        error: `Invalid zone. Must be one of: ${validZones.join(', ')}`,
        field: 'zone',
      })
    }

    // Sanitize summary if provided
    let sanitizedSummary = ''
    if (summary && typeof summary === 'string') {
      const { sanitized } = sanitizeQuery(summary)
      sanitizedSummary = sanitized || ''
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      logger.warn('API', '[World] Gemini API not available for piece generation')
      logger.timeEnd('API', 'world-piece-generate-request')
      return res.status(503).json({
        error: 'World piece generation service temporarily unavailable',
      })
    }

    logger.info('API', '[World] Generating world piece', {
      topicName: sanitizedTopicName,
      zone,
      hasSummary: sanitizedSummary.length > 0,
    })

    // Step 1: Generate the image prompt
    const promptResult = await generateWorldPiecePrompt(sanitizedTopicName, zone, sanitizedSummary)

    if (promptResult.error) {
      logger.error('API', '[World] Prompt generation failed', {
        error: promptResult.error,
        topicName: sanitizedTopicName,
      })
      logger.timeEnd('API', 'world-piece-generate-request')

      if (promptResult.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          })
      }

      return res.status(500).json({
        error: 'Failed to generate world piece prompt',
      })
    }

    logger.info('API', '[World] Prompt generated', {
      topicName: sanitizedTopicName,
      elements: promptResult.elements,
    })

    // Step 2: Generate the image from the prompt
    const imageResult = await generateWorldPieceImage(promptResult.prompt)

    if (imageResult.error) {
      logger.error('API', '[World] Image generation failed', {
        error: imageResult.error,
        topicName: sanitizedTopicName,
      })
      logger.timeEnd('API', 'world-piece-generate-request')

      if (imageResult.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          })
      }

      if (imageResult.error === 'CONTENT_FILTERED') {
        return res.status(400).json({
          error: 'Image generation was filtered. Please try a different topic.',
        })
      }

      return res.status(500).json({
        error: 'Failed to generate world piece image',
      })
    }

    // Generate a unique piece ID
    const pieceId = `piece_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    logger.info('API', '[World] World piece generation complete', {
      topicName: sanitizedTopicName,
      zone,
      pieceId,
    })
    logger.timeEnd('API', 'world-piece-generate-request')

    // Return the complete piece data
    res.json({
      prompt: promptResult.prompt,
      elements: promptResult.elements,
      imageUrl: imageResult.imageUrl,
      piece: {
        id: pieceId,
        topicName: sanitizedTopicName,
        zone,
        imageUrl: imageResult.imageUrl,
        prompt: promptResult.prompt,
      },
    })
  } catch (error) {
    logger.error('API', '[World] Piece generation request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'world-piece-generate-request')

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

export default router
