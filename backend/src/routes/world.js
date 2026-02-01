/**
 * World Routes
 * WB006: World state initialization and management
 * WB007: Topic to zone mapping for World Builder gamification
 * WB008: World piece prompt generation
 * WB009: World piece image generation
 * WB014: XP and tier progression for World Builder gamification
 * WB015: Quick mode XP (no world piece)
 * WB020: Piece Evolution
 * WB021: Pocket Connection Scenes
 * WB022: Quick Review Mode - Review tracking for spaced repetition
 * WB023: Living World - Continuous landscape evolution
 *
 * GET /api/world - Get user's world state
 * POST /api/world/piece - Add a new piece (after quiz pass)
 * POST /api/world/piece/generate - Generate a world piece (prompt + image)
 * POST /api/world/piece/review - Record a review quiz completion (WB022)
 * POST /api/world/xp - Add XP (returns tier upgrade info)
 * POST /api/world/award-xp - Award XP for quiz completion (WB014)
 * POST /api/world/quick-xp - Award XP for quick mode (WB015)
 * GET /api/world/tiers - Get tier definitions
 * POST /api/world/classify-zone - Classify a topic into a world zone
 * POST /api/world/check-evolution - Check and process piece evolutions (WB020)
 * POST /api/world/pocket/generate-scene - Generate connection scene for pocket (WB021)
 * GET /api/world/evolution-tiers - Get evolution tier definitions (WB020)
 * GET /api/world/scene-levels - Get scene evolution level definitions (WB021)
 * GET /api/world/pieces/needing-review - Get pieces that need review (WB022)
 *
 * Living World Endpoints (WB023):
 * POST /api/world/living/initialize - Initialize barren world for new user
 * POST /api/world/living/evolve - Evolve world with a learned topic
 * GET /api/world/living - Get current living world state
 */

import express from 'express'
import logger from '../utils/logger.js'
import { sanitizeQuery, sanitizeId } from '../utils/sanitize.js'
import {
  isGeminiAvailable,
  classifyTopicZone,
  generateWorldPiecePrompt,
  generateWorldPieceImage,
  generateLivingWorldEvolutionPlan,
  generateLivingWorldImage,
} from '../services/gemini.js'
import {
  getWorldState,
  addWorldPiece,
  addXP,
  awardQuizXP,
  awardQuickModeXP,
  xpToNextTier,
  getTierDefinitions,
  evolvePiece,
  updatePocketScene,
  getPocket,
  recordReview,
  getPiecesNeedingReview,
  XP_REWARDS,
  TIER_THRESHOLDS
} from '../services/worldState.js'
import {
  findRelatedTopics,
  checkPieceEvolutions,
  getTierDisplayInfo,
  EVOLUTION_TIERS
} from '../services/topicRelations.js'
import {
  generateConnectionScene,
  getSceneEvolutionLevel,
  getSceneLevelDisplayInfo,
  shouldRegenerateScene,
  SCENE_EVOLUTION_LEVELS
} from '../services/connectionScene.js'
import {
  createInitialWorldState,
  calculateTier,
  evolveWorld,
  getEvolutionWorldState,
  setEvolutionWorldState,
  resetEvolutionWorldState,
} from '../services/worldEvolution.js'
import { buildBaseWorldPrompt, buildEvolutionPrompt } from '../services/worldPromptBuilder.js'
import { loadLivingWorldState, saveLivingWorldState } from '../services/livingWorldStore.js'

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

    // Validate required piece fields (imageUrl is optional if icon is provided)
    const requiredFields = ['id', 'topicId', 'topicName', 'zone', 'position']
    for (const field of requiredFields) {
      if (!piece[field]) {
        return res.status(400).json({
          error: `Missing required piece field: ${field}`,
          field: `piece.${field}`
        })
      }
    }

    // Either imageUrl or icon must be provided for display
    if (!piece.imageUrl && !piece.icon) {
      return res.status(400).json({
        error: 'Either imageUrl or icon must be provided',
        field: 'piece.imageUrl'
      })
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
    // Note: topicId is not available here - it must be provided by the caller when storing
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

/**
 * POST /api/world/piece/review
 * Record a review quiz completion for a piece
 * WB022: Quick Review Mode
 *
 * This endpoint records when a user completes a review quiz for a piece
 * they've previously unlocked. It updates review tracking fields and
 * awards XP based on the score.
 *
 * Request body:
 * - clientId (required): string - The client identifier
 * - pieceId (required): string - The ID of the piece being reviewed
 * - score (required): number - The review score (0-100)
 * - questionCount (optional): number - Total questions in the quiz
 * - correctCount (optional): number - Number of correct answers
 *
 * Response:
 * - piece: Updated piece object with review data
 * - xpAwarded: number - XP earned from the review (10 for pass 66%+, 15 for perfect 100%)
 * - refreshed: boolean - Whether the review successfully refreshed the piece
 * - totalXP: number - User's total XP after this review
 * - tierUpgrade: { from: string, to: string } | null - Tier upgrade info if applicable
 * - message: string - Feedback message for the user
 *
 * Errors:
 *   - 400: Invalid clientId, pieceId, or score
 *   - 404: Piece not found
 *   - 500: Internal server error
 */
router.post('/piece/review', async (req, res) => {
  logger.time('API', 'world-piece-review-request')

  try {
    const { clientId, pieceId, score, questionCount, correctCount } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      logger.warn('API', '[World] Missing clientId for piece review')
      logger.timeEnd('API', 'world-piece-review-request')
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId',
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      logger.timeEnd('API', 'world-piece-review-request')
      return res.status(400).json({
        error: idError,
        field: 'clientId',
      })
    }

    // Validate pieceId
    if (!pieceId || typeof pieceId !== 'string') {
      logger.warn('API', '[World] Missing pieceId for piece review')
      logger.timeEnd('API', 'world-piece-review-request')
      return res.status(400).json({
        error: 'Missing or invalid pieceId',
        field: 'pieceId',
      })
    }

    // Validate score
    if (typeof score !== 'number' || score < 0 || score > 100) {
      logger.warn('API', '[World] Invalid score for piece review', { score })
      logger.timeEnd('API', 'world-piece-review-request')
      return res.status(400).json({
        error: 'Score must be a number between 0 and 100',
        field: 'score',
      })
    }

    logger.info('API', '[World] Recording piece review', {
      clientId: sanitizedId,
      pieceId,
      score,
      questionCount,
      correctCount,
    })

    const result = await recordReview(sanitizedId, pieceId, score)

    if (result.error) {
      logger.error('API', '[World] Failed to record piece review', {
        error: result.error,
        pieceId,
      })
      logger.timeEnd('API', 'world-piece-review-request')

      if (result.error === 'PIECE_NOT_FOUND') {
        return res.status(404).json({
          error: 'Piece not found',
          field: 'pieceId',
        })
      }

      return res.status(500).json({ error: result.error })
    }

    // Calculate XP to next tier for the response
    const nextTierInfo = xpToNextTier(result.totalXP)

    logger.info('API', '[World] Piece review recorded', {
      clientId: sanitizedId,
      pieceId,
      score,
      xpAwarded: result.xpAwarded,
      refreshed: result.refreshed,
    })
    logger.timeEnd('API', 'world-piece-review-request')

    res.json({
      piece: result.piece,
      xpAwarded: result.xpAwarded,
      refreshed: result.refreshed,
      totalXP: result.totalXP,
      tierUpgrade: result.tierUpgrade,
      message: result.message,
      xpToNextTier: nextTierInfo.xpNeeded,
      nextTier: nextTierInfo.nextTier,
      xpProgress: nextTierInfo.xpProgress,
      xpProgressTotal: nextTierInfo.xpTotal,
      xpRewards: XP_REWARDS,
    })
  } catch (error) {
    logger.error('API', '[World] Piece review request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'world-piece-review-request')

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * GET /api/world/pieces/needing-review
 * Get pieces that need review based on time threshold
 * WB022: Quick Review Mode
 *
 * Returns all pieces that haven't been reviewed within the specified
 * time threshold, sorted by staleness (oldest first).
 *
 * Query params:
 * - clientId (required): string - The client identifier
 * - daysThreshold (optional): number - Days after which a piece needs review (default 7)
 *
 * Response:
 * - pieces: Array of piece objects with daysSinceReview field added
 * - count: number - Total count of pieces needing review
 *
 * Errors:
 *   - 400: Invalid clientId or daysThreshold
 *   - 500: Internal server error
 */
router.get('/pieces/needing-review', async (req, res) => {
  try {
    const { clientId, daysThreshold } = req.query

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId',
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      return res.status(400).json({
        error: idError,
        field: 'clientId',
      })
    }

    // Parse and validate daysThreshold if provided
    let threshold = 7 // Default
    if (daysThreshold !== undefined) {
      threshold = parseInt(daysThreshold, 10)
      if (isNaN(threshold) || threshold < 0) {
        return res.status(400).json({
          error: 'daysThreshold must be a non-negative number',
          field: 'daysThreshold',
        })
      }
    }

    logger.info('API', '[World] Getting pieces needing review', {
      clientId: sanitizedId,
      daysThreshold: threshold,
    })

    const result = await getPiecesNeedingReview(sanitizedId, threshold)

    if (result.error) {
      logger.error('API', '[World] Failed to get pieces needing review', {
        error: result.error,
      })
      return res.status(500).json({ error: result.error })
    }

    return res.json({
      pieces: result.pieces,
      count: result.count,
    })
  } catch (error) {
    logger.error('API', '[World] Unexpected error getting pieces needing review', {
      error: error.message,
    })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/world/check-evolution
 * Check and process piece evolutions after a new piece is unlocked
 * WB020: Piece Evolution
 *
 * This endpoint:
 * 1. Finds topics related to the new piece
 * 2. Checks if any existing pieces should evolve
 * 3. Updates all affected pieces with new evolution states
 * 4. Returns evolution results for UI celebration
 *
 * Request body:
 * - clientId (required): string - The client identifier
 * - newPiece (required): Object - The newly unlocked piece
 *   - id: string - Piece ID
 *   - topicName: string - Topic name
 *
 * Response:
 * - newPieceRelations: { relatedTopics: string[], category: string, evolutionTier: string }
 * - evolutions: Array of { pieceId, topicName, oldTier, newTier }
 * - evolutionTiers: Configuration info for UI
 */
router.post('/check-evolution', async (req, res) => {
  logger.time('API', 'world-check-evolution-request')

  try {
    const { clientId, newPiece } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      logger.warn('API', '[World] Missing clientId for evolution check')
      logger.timeEnd('API', 'world-check-evolution-request')
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId',
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      logger.timeEnd('API', 'world-check-evolution-request')
      return res.status(400).json({
        error: idError,
        field: 'clientId',
      })
    }

    // Validate newPiece
    if (!newPiece || !newPiece.id || !newPiece.topicName) {
      logger.warn('API', '[World] Invalid newPiece for evolution check')
      logger.timeEnd('API', 'world-check-evolution-request')
      return res.status(400).json({
        error: 'Missing or invalid newPiece (requires id and topicName)',
        field: 'newPiece',
      })
    }

    logger.info('API', '[World] Checking piece evolutions', {
      clientId: sanitizedId,
      newPieceId: newPiece.id,
      topicName: newPiece.topicName,
    })

    // Get current world state to access all pieces
    const worldStateResult = await getWorldState(sanitizedId)
    if (worldStateResult.error) {
      logger.error('API', '[World] Failed to get world state for evolution check', {
        error: worldStateResult.error,
      })
      logger.timeEnd('API', 'world-check-evolution-request')
      return res.status(500).json({ error: worldStateResult.error })
    }

    const allPieces = worldStateResult.worldState?.pieces || []

    // Check for evolutions
    const evolutionResult = await checkPieceEvolutions(newPiece, allPieces)

    if (evolutionResult.error) {
      // Non-fatal error - return partial results
      logger.warn('API', '[World] Evolution check had errors', {
        error: evolutionResult.error,
      })
    }

    // Process any detected evolutions
    const processedEvolutions = []
    for (const evolution of evolutionResult.evolutions || []) {
      const evolveResult = await evolvePiece(
        sanitizedId,
        evolution.pieceId,
        evolution.newTier,
        evolution.newRelatedTopics
      )

      if (!evolveResult.error) {
        processedEvolutions.push({
          pieceId: evolution.pieceId,
          topicName: evolution.topicName,
          oldTier: evolution.oldTier,
          newTier: evolution.newTier,
          tierInfo: getTierDisplayInfo(evolution.newTier),
        })
      }
    }

    // Update the new piece with its relations (if it exists in the world state)
    if (evolutionResult.newPieceRelations) {
      const newPieceInState = allPieces.find(p => p.id === newPiece.id)
      if (newPieceInState) {
        await evolvePiece(
          sanitizedId,
          newPiece.id,
          evolutionResult.newPieceRelations.evolutionTier,
          evolutionResult.newPieceRelations.relatedTopics
        )
      }
    }

    logger.info('API', '[World] Evolution check complete', {
      clientId: sanitizedId,
      newPieceId: newPiece.id,
      evolutionCount: processedEvolutions.length,
    })
    logger.timeEnd('API', 'world-check-evolution-request')

    res.json({
      newPieceRelations: evolutionResult.newPieceRelations ? {
        relatedTopics: evolutionResult.newPieceRelations.relatedTopics,
        category: evolutionResult.newPieceRelations.category,
        evolutionTier: evolutionResult.newPieceRelations.evolutionTier,
        tierInfo: getTierDisplayInfo(evolutionResult.newPieceRelations.evolutionTier),
      } : null,
      evolutions: processedEvolutions,
      evolutionTiers: EVOLUTION_TIERS,
    })
  } catch (error) {
    logger.error('API', '[World] Evolution check request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'world-check-evolution-request')

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * POST /api/world/pocket/generate-scene
 * Generate a connection scene for a pocket of related pieces
 * WB021: Pocket Connection Scenes
 *
 * This endpoint generates an AI-created scene showing multiple related
 * topics interacting together. Requires at least 3 related pieces.
 *
 * Request body:
 * - clientId (required): string - The client identifier
 * - pocketId (required): string - Unique pocket identifier
 * - pocket (required): Object - The pocket data
 *   - zone: 'nature' | 'civilization' | 'arcane'
 *   - pieces: Array<{ id: string, topicName: string }>
 * - forceRegenerate (optional): boolean - Force regeneration even if scene exists
 *
 * Response:
 * - scene: { imageUrl, prompt, description, evolutionLevel, pieceCount, generatedAt }
 * - pocket: Updated pocket object with connection scene
 * - sceneLevels: Configuration info for UI
 */
router.post('/pocket/generate-scene', async (req, res) => {
  logger.time('API', 'world-generate-scene-request')

  try {
    const { clientId, pocketId, pocket, forceRegenerate = false } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      logger.warn('API', '[World] Missing clientId for scene generation')
      logger.timeEnd('API', 'world-generate-scene-request')
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId',
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      logger.timeEnd('API', 'world-generate-scene-request')
      return res.status(400).json({
        error: idError,
        field: 'clientId',
      })
    }

    // Validate pocketId
    if (!pocketId || typeof pocketId !== 'string') {
      logger.warn('API', '[World] Missing pocketId for scene generation')
      logger.timeEnd('API', 'world-generate-scene-request')
      return res.status(400).json({
        error: 'Missing or invalid pocketId',
        field: 'pocketId',
      })
    }

    // Validate pocket
    if (!pocket || !pocket.zone || !Array.isArray(pocket.pieces)) {
      logger.warn('API', '[World] Invalid pocket for scene generation')
      logger.timeEnd('API', 'world-generate-scene-request')
      return res.status(400).json({
        error: 'Missing or invalid pocket (requires zone and pieces array)',
        field: 'pocket',
      })
    }

    // Validate zone
    const validZones = ['nature', 'civilization', 'arcane']
    if (!validZones.includes(pocket.zone)) {
      logger.timeEnd('API', 'world-generate-scene-request')
      return res.status(400).json({
        error: `Invalid zone. Must be one of: ${validZones.join(', ')}`,
        field: 'pocket.zone',
      })
    }

    // Validate minimum pieces
    if (pocket.pieces.length < 3) {
      logger.warn('API', '[World] Insufficient pieces for scene generation', {
        pieceCount: pocket.pieces.length,
      })
      logger.timeEnd('API', 'world-generate-scene-request')
      return res.status(400).json({
        error: 'At least 3 related pieces are required for a connection scene',
        field: 'pocket.pieces',
        minRequired: 3,
        provided: pocket.pieces.length,
      })
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      logger.warn('API', '[World] Gemini API not available for scene generation')
      logger.timeEnd('API', 'world-generate-scene-request')
      return res.status(503).json({
        error: 'Scene generation service temporarily unavailable',
      })
    }

    logger.info('API', '[World] Generating connection scene', {
      clientId: sanitizedId,
      pocketId,
      zone: pocket.zone,
      pieceCount: pocket.pieces.length,
      forceRegenerate,
    })

    // Check if we should regenerate (unless forced)
    if (!forceRegenerate) {
      const existingPocket = await getPocket(sanitizedId, pocketId)
      if (existingPocket.pocket?.connectionScene) {
        const { shouldRegenerate, reason } = shouldRegenerateScene(
          pocket,
          existingPocket.pocket.connectionScene
        )

        if (!shouldRegenerate) {
          logger.info('API', '[World] Using existing scene', {
            pocketId,
            reason: 'no_regeneration_needed',
          })
          logger.timeEnd('API', 'world-generate-scene-request')

          return res.json({
            scene: existingPocket.pocket.connectionScene,
            pocket: existingPocket.pocket,
            sceneLevels: SCENE_EVOLUTION_LEVELS,
            cached: true,
          })
        }

        logger.info('API', '[World] Regenerating scene', { pocketId, reason })
      }
    }

    // Generate the scene
    const sceneResult = await generateConnectionScene(pocket)

    if (sceneResult.error) {
      logger.error('API', '[World] Scene generation failed', {
        error: sceneResult.error,
        pocketId,
      })
      logger.timeEnd('API', 'world-generate-scene-request')

      if (sceneResult.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60,
          })
      }

      if (sceneResult.error === 'CONTENT_FILTERED') {
        return res.status(400).json({
          error: 'Scene generation was filtered. Please try different topics.',
        })
      }

      return res.status(500).json({
        error: 'Failed to generate connection scene',
      })
    }

    // Save the scene to the pocket
    const pieceIds = pocket.pieces.map(p => p.id)
    const pocketUpdateResult = await updatePocketScene(
      sanitizedId,
      pocketId,
      { zone: pocket.zone, pieceIds },
      {
        imageUrl: sceneResult.imageUrl,
        pieceCountAtGeneration: sceneResult.pieceCount,
        evolutionLevel: sceneResult.evolutionLevel,
      }
    )

    if (pocketUpdateResult.error) {
      logger.warn('API', '[World] Failed to save pocket scene', {
        error: pocketUpdateResult.error,
        pocketId,
      })
      // Non-fatal - still return the generated scene
    }

    logger.info('API', '[World] Connection scene generated', {
      clientId: sanitizedId,
      pocketId,
      evolutionLevel: sceneResult.evolutionLevel,
      pieceCount: sceneResult.pieceCount,
    })
    logger.timeEnd('API', 'world-generate-scene-request')

    res.json({
      scene: {
        imageUrl: sceneResult.imageUrl,
        prompt: sceneResult.prompt,
        description: sceneResult.description,
        evolutionLevel: sceneResult.evolutionLevel,
        evolutionLevelInfo: getSceneLevelDisplayInfo(sceneResult.evolutionLevel),
        pieceCount: sceneResult.pieceCount,
        generatedAt: sceneResult.generatedAt,
      },
      pocket: pocketUpdateResult.pocket || {
        id: pocketId,
        zone: pocket.zone,
        pieceIds,
      },
      sceneLevels: SCENE_EVOLUTION_LEVELS,
      cached: false,
    })
  } catch (error) {
    logger.error('API', '[World] Scene generation request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'world-generate-scene-request')

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

/**
 * GET /api/world/evolution-tiers
 * Get evolution tier definitions for UI display
 *
 * Response:
 * - tiers: Object with tier thresholds
 * - tierOrder: Array of tier names in order
 * - tierInfo: Object with display info for each tier
 */
router.get('/evolution-tiers', (req, res) => {
  const tierInfo = {}
  for (const tier of ['seedling', 'growing', 'flourishing', 'legendary']) {
    tierInfo[tier] = getTierDisplayInfo(tier)
  }

  res.json({
    tiers: EVOLUTION_TIERS,
    tierOrder: ['seedling', 'growing', 'flourishing', 'legendary'],
    tierInfo,
  })
})

/**
 * GET /api/world/scene-levels
 * Get scene evolution level definitions for UI display
 *
 * Response:
 * - levels: Object with level thresholds
 * - levelInfo: Object with display info for each level
 */
router.get('/scene-levels', (req, res) => {
  const levelInfo = {}
  for (const level of ['initial', 'enhanced', 'legendary']) {
    levelInfo[level] = getSceneLevelDisplayInfo(level)
  }

  res.json({
    levels: SCENE_EVOLUTION_LEVELS,
    levelInfo,
  })
})

// ============================================================================
// Living World Endpoints (WB023)
// ============================================================================

async function hydrateLivingWorldState(clientId) {
  const cached = getEvolutionWorldState(clientId).worldState
  if (cached) return cached

  const stored = await loadLivingWorldState(clientId)
  if (stored) {
    setEvolutionWorldState(clientId, stored)
    return stored
  }

  return null
}

function getLivingWorldElements(worldState) {
  const MAX_ELEMENTS = 12
  const elements = []

  // Prefer Gemini-chosen element descriptions stored per evolution.
  try {
    const evolutions = worldState?.evolutions
    if (Array.isArray(evolutions) && evolutions.length > 0) {
      const seen = new Set()
      for (const evo of evolutions) {
        const element = typeof evo?.elementAdded === 'string' ? evo.elementAdded.trim() : ''
        if (!element) continue
        const key = element.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        elements.push(element)
      }

      if (elements.length > 0) {
        return elements.slice(-MAX_ELEMENTS)
      }
    }
  } catch (error) {
    // Fall back to older persisted states below.
  }

  // Backward-compat: older persisted states stored `elementAdded` on topics in `compositionMap`.
  try {
    const compositionMap = worldState?.compositionMap
    if (compositionMap && typeof compositionMap === 'object') {
      const candidates = []
      for (const layerName of ['sky', 'background', 'midground', 'foreground']) {
        const layer = compositionMap?.[layerName]
        const topics = layer?.topics
        if (!Array.isArray(topics)) continue

        for (const topic of topics) {
          const elementAdded = topic?.elementAdded
          if (typeof elementAdded !== 'string' || !elementAdded.trim()) continue

          let timestamp = 0
          const rawAddedAt = topic?.addedAt
          if (rawAddedAt instanceof Date) {
            timestamp = rawAddedAt.getTime()
          } else if (typeof rawAddedAt === 'string' || typeof rawAddedAt === 'number') {
            const parsed = new Date(rawAddedAt).getTime()
            timestamp = Number.isFinite(parsed) ? parsed : 0
          }

          candidates.push({ element: elementAdded.trim(), timestamp })
        }
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => a.timestamp - b.timestamp)
        const seen = new Set()
        for (const { element } of candidates) {
          const key = element.toLowerCase()
          if (seen.has(key)) continue
          seen.add(key)
          elements.push(element)
        }

        if (elements.length > 0) {
          return elements.slice(-MAX_ELEMENTS)
        }
      }
    }
  } catch (error) {
    // ignore
  }

  return []
}

/**
 * GET /api/world/living
 * Get current living world state for a user
 *
 * Query params:
 * - clientId (required): string - The client identifier
 *
 * Response:
 * - worldState: WorldState object or null for new users
 * - worldImageUrl: string or null
 */
router.get('/living', async (req, res) => {
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

    logger.info('WORLD', 'Getting living world state', { clientId: sanitizedId })

    const worldState = await hydrateLivingWorldState(sanitizedId)
    if (!worldState) {
      return res.status(404).json({
        worldState: null,
        worldImageUrl: null,
      })
    }

    return res.json({
      worldState,
      worldImageUrl: worldState?.worldImageUrl || null
    })
  } catch (error) {
    logger.error('WORLD', 'Unexpected error getting living world state', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/world/living/initialize
 * Initialize a new barren world for a user
 *
 * Request body:
 * - clientId (required): string - The client identifier
 *
 * Response:
 * - worldState: Initial WorldState object
 * - worldImageUrl: string - Generated barren world image
 * - success: boolean
 */
router.post('/living/initialize', async (req, res) => {
  logger.time('API', 'world-living-initialize-request')

  try {
    const { clientId } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      logger.warn('API', '[World] Missing clientId for living world init')
      logger.timeEnd('API', 'world-living-initialize-request')
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      logger.timeEnd('API', 'world-living-initialize-request')
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    // If the world already exists, return it (idempotent init).
    // This avoids accidentally resetting a user's world when they click the CTA again.
    const existingState = await hydrateLivingWorldState(sanitizedId)
    if (existingState?.worldImageUrl) {
      logger.info('API', '[World] Living world already initialized (skipping re-init)', {
        clientId: sanitizedId,
        tier: existingState.tier,
      })
      logger.timeEnd('API', 'world-living-initialize-request')

      return res.json({
        worldState: existingState,
        worldImageUrl: existingState.worldImageUrl,
        success: true,
      })
    }

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      logger.warn('API', '[World] Gemini API not available for living world init')
      logger.timeEnd('API', 'world-living-initialize-request')
      return res.status(503).json({
        error: 'World generation service temporarily unavailable'
      })
    }

    logger.info('API', '[World] Initializing living world', { clientId: sanitizedId })

    // Create initial world state
    const worldState = existingState || createInitialWorldState(sanitizedId)

    // Generate base world prompt and panoramic image
    const basePrompt = buildBaseWorldPrompt()
    const imageResult = await generateLivingWorldImage(basePrompt, {
      aspectRatio: '16:9',
      resolution: '2k',
    })

    if (imageResult.error) {
      logger.error('API', '[World] Base world image generation failed', {
        error: imageResult.error,
        clientId: sanitizedId
      })
      logger.timeEnd('API', 'world-living-initialize-request')

      if (imageResult.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60
          })
      }

      return res.status(500).json({
        error: 'Failed to generate world image'
      })
    }

    // Update world state with image URL
    worldState.worldImageUrl = imageResult.imageUrl
    setEvolutionWorldState(sanitizedId, worldState)
    await saveLivingWorldState(sanitizedId, worldState)

    logger.info('API', '[World] Living world initialized', {
      clientId: sanitizedId,
      tier: worldState.tier
    })
    logger.timeEnd('API', 'world-living-initialize-request')

    return res.json({
      worldState,
      worldImageUrl: imageResult.imageUrl,
      success: true
    })
  } catch (error) {
    logger.error('API', '[World] Living world init error', {
      error: error.message,
      stack: error.stack
    })
    logger.timeEnd('API', 'world-living-initialize-request')

    return res.status(500).json({
      error: 'Internal server error'
    })
  }
})

/**
 * POST /api/world/living/evolve
 * Evolve the living world with a new topic
 *
 * Request body:
 * - clientId (required): string - The client identifier
 * - topicName (required): string - The topic just learned
 * - summary (optional): string - Topic summary for context
 *
 * Response:
 * - worldState: Updated WorldState object
 * - worldImageUrl: string - Current world image URL
 * - changesApplied: { zone, terrainEffect, layer }
 * - tier: string - Current tier
 * - success: boolean
 */
router.post('/living/evolve', async (req, res) => {
  logger.time('API', 'world-living-evolve-request')

  try {
    const { clientId, topicName, summary } = req.body

    // Validate clientId
    if (!clientId || typeof clientId !== 'string') {
      logger.warn('API', '[World] Missing clientId for living world evolve')
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    const { sanitized: sanitizedId, error: idError } = sanitizeId(clientId)
    if (idError) {
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(400).json({
        error: idError,
        field: 'clientId'
      })
    }

    // Validate topicName
    if (!topicName || typeof topicName !== 'string') {
      logger.warn('API', '[World] Missing topicName for living world evolve')
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    // Ensure world state is hydrated (local store -> memory) if available, or
    // initialize a base world so evolution always has a persistent canvas.
    let hydratedState = await hydrateLivingWorldState(sanitizedId)

    if (!hydratedState) {
      // Require Gemini when initializing from scratch (we need the base image).
      if (!isGeminiAvailable()) {
        logger.warn('API', '[World] Gemini API not available for living world evolve (init required)', {
          clientId: sanitizedId,
        })
        logger.timeEnd('API', 'world-living-evolve-request')
        return res.status(503).json({
          error: 'World generation service temporarily unavailable',
        })
      }

      const baseState = createInitialWorldState(sanitizedId)
      const basePrompt = buildBaseWorldPrompt()
      const baseImage = await generateLivingWorldImage(basePrompt, {
        aspectRatio: '16:9',
        resolution: '2k',
      })

      if (baseImage.error) {
        logger.error('API', '[World] Base world image generation failed (during evolve init)', {
          error: baseImage.error,
          clientId: sanitizedId,
        })
        logger.timeEnd('API', 'world-living-evolve-request')

        if (baseImage.error === 'RATE_LIMITED') {
          return res.status(429)
            .set('Retry-After', '60')
            .json({
              error: 'Rate limit exceeded. Please try again later.',
              retryAfter: 60,
            })
        }

        return res.status(500).json({
          error: 'Failed to generate world image',
        })
      }

      baseState.worldImageUrl = baseImage.imageUrl
      setEvolutionWorldState(sanitizedId, baseState)
      await saveLivingWorldState(sanitizedId, baseState)
      hydratedState = baseState
    }

    const preEvolveState = hydratedState ? structuredClone(hydratedState) : null

    // Ensure we have a base image to evolve from when possible
    if (hydratedState && !hydratedState.worldImageUrl) {
      const basePrompt = buildBaseWorldPrompt()
      const baseImage = await generateLivingWorldImage(basePrompt, {
        aspectRatio: '16:9',
        resolution: '2k',
      })

      if (baseImage.error) {
        logger.warn('API', '[World] Failed to generate base image before evolve', {
          error: baseImage.error,
          clientId: sanitizedId,
        })
      } else {
        hydratedState.worldImageUrl = baseImage.imageUrl
        setEvolutionWorldState(sanitizedId, hydratedState)
        await saveLivingWorldState(sanitizedId, hydratedState)
      }
    }

    const existingElements = getLivingWorldElements(hydratedState)
    const referenceImageUrl = hydratedState?.worldImageUrl || null

    logger.info('API', '[World] Evolving living world', {
      clientId: sanitizedId,
      topicName,
      hasSummary: !!summary
    })

    // Generate an evolved panorama image, preserving the previous world
    if (!isGeminiAvailable()) {
      logger.warn('API', '[World] Gemini API not available for living world evolve')

      // Keep world state consistent with the image by rolling back the in-memory update.
      if (preEvolveState) {
        setEvolutionWorldState(sanitizedId, preEvolveState)
        await saveLivingWorldState(sanitizedId, preEvolveState)
      } else {
        resetEvolutionWorldState(sanitizedId)
      }

      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(503).json({
        error: 'World generation service temporarily unavailable',
      })
    }

    const normalizedTopicName = typeof topicName === 'string' ? topicName.trim() : ''

    // Avoid spending Gemini calls on duplicate topics.
    const learned = Array.isArray(hydratedState?.topicsLearned) ? hydratedState.topicsLearned : []
    const alreadyApplied = normalizedTopicName
      ? learned.some((t) => typeof t === 'string' && t.toLowerCase() === normalizedTopicName.toLowerCase())
      : false

    if (alreadyApplied) {
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.json({
        worldState: hydratedState,
        worldImageUrl: hydratedState?.worldImageUrl || null,
        changesApplied: {
          skipped: true,
          reason: 'TOPIC_ALREADY_APPLIED',
        },
        tier: hydratedState?.tier || null,
        tierUpgrade: null,
        success: true,
      })
    }

    const currentTotalTopics = Number.isFinite(Number(hydratedState?.totalTopics))
      ? Number(hydratedState.totalTopics)
      : Array.isArray(hydratedState?.topicsLearned)
        ? hydratedState.topicsLearned.length
        : 0
    const predictedTier = calculateTier(currentTotalTopics + 1)

    // Use Gemini image model as the ONLY source of truth for topic -> world element.
    let plan
    try {
      plan = await generateLivingWorldEvolutionPlan({
        topicName,
        summary,
        existingElements,
        tier: predictedTier,
        styleDescriptor: hydratedState?.styleDescriptor || null,
      })
    } catch (error) {
      logger.error('API', '[World] Failed to generate Living World evolution plan', {
        error: error.message,
        clientId: sanitizedId,
      })
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(500).json({
        error: 'Failed to plan world evolution',
      })
    }

    if (plan?.error === 'RATE_LIMITED') {
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(429)
        .set('Retry-After', '60')
        .json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60,
        })
    }

    const elementToAdd = typeof plan?.elementToAdd === 'string' ? plan.elementToAdd.trim() : ''
    if (!elementToAdd) {
      logger.warn('API', '[World] Evolution plan returned no element', {
        clientId: sanitizedId,
        topicName,
        planError: plan?.error || null,
      })
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(500).json({
        error: 'Failed to plan world evolution',
      })
    }

    const placementHint = typeof plan?.placementHint === 'string' ? plan.placementHint.trim() : null
    const targetLayer = typeof plan?.targetLayer === 'string' ? plan.targetLayer.trim() : null

    // Evolve the state (tier/topics) only after we have a concrete plan.
    const evolutionResult = await evolveWorld(sanitizedId, topicName, summary, {
      elementAdded: elementToAdd,
      placementHint,
      model: null,
    })

    // Get updated state
    const updatedState = getEvolutionWorldState(sanitizedId)

    if (!updatedState.worldState) {
      logger.timeEnd('API', 'world-living-evolve-request')
      return res.status(500).json({ error: 'Failed to load updated world state' })
    }

    const evolutionPrompt = buildEvolutionPrompt({
      topicName,
      summary,
      elementToAdd,
      placementHint,
      targetLayer,
      existingElements,
      styleDescriptor: updatedState.worldState?.styleDescriptor,
      tier: updatedState.worldState?.tier || predictedTier,
    })

    const evolvedImage = await generateLivingWorldImage(evolutionPrompt, {
      referenceImageUrl,
      aspectRatio: '16:9',
      resolution: evolutionResult?.tierUpgrade ? '4k' : '2k',
    })

    if (evolvedImage.error) {
      logger.error('API', '[World] Living world image evolution failed', {
        error: evolvedImage.error,
        clientId: sanitizedId,
      })

      // Keep world state consistent with the image by rolling back the in-memory update
      if (preEvolveState) {
        setEvolutionWorldState(sanitizedId, preEvolveState)
        await saveLivingWorldState(sanitizedId, preEvolveState)
      } else {
        resetEvolutionWorldState(sanitizedId)
      }

      logger.timeEnd('API', 'world-living-evolve-request')

      if (evolvedImage.error === 'RATE_LIMITED') {
        return res.status(429)
          .set('Retry-After', '60')
          .json({
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60
          })
      }

      return res.status(500).json({
        error: 'Failed to generate evolved world image'
      })
    }

    updatedState.worldState.worldImageUrl = evolvedImage.imageUrl
    updatedState.worldState.updatedAt = new Date()
    setEvolutionWorldState(sanitizedId, updatedState.worldState)
    await saveLivingWorldState(sanitizedId, updatedState.worldState)

    logger.info('API', '[World] Living world evolved', {
      clientId: sanitizedId,
      topicName,
      tier: evolutionResult.tier,
      changesApplied: evolutionResult.changesApplied
    })
    logger.timeEnd('API', 'world-living-evolve-request')

    return res.json({
      worldState: updatedState.worldState,
      worldImageUrl: updatedState.worldState.worldImageUrl,
      changesApplied: evolutionResult.changesApplied,
      tier: evolutionResult.tier,
      tierUpgrade: evolutionResult.tierUpgrade,
      success: true
    })
  } catch (error) {
    logger.error('API', '[World] Living world evolve error', {
      error: error.message,
      stack: error.stack
    })
    logger.timeEnd('API', 'world-living-evolve-request')

    return res.status(500).json({
      error: 'Internal server error'
    })
  }
})

export default router
