/**
 * Learn Routes
 * Learning modes API endpoints for Mystery Lab, Wonder Lab, and Story Studio
 *
 * Provides endpoints for generating detective mysteries, what-if scenarios,
 * and story creation based on slide content learned.
 */

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { generateMystery, evaluateMysteryTheory } from '../services/mysteryGenerator.js'
import { generateWhatIfScenario, detectLanguage, generateStoryPrompt, extractStoryScene, generateEducationalImage, generateTTS } from '../services/gemini.js'
import logger from '../utils/logger.js'

const router = Router()

// Rate limiter for learn endpoints (5 requests per minute per IP)
const learnRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { error: 'Too many requests. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * POST /api/learn/mystery
 * Generate a detective-style mystery from lesson content
 *
 * Request body:
 * - slides: array - The lesson content with {subtitle, script} per slide
 * - topicName: string - Name of the topic learned
 * - explanationLevel: string - 'simple' | 'standard' | 'deep'
 *
 * Response:
 * - mysteryTitle: string - Short catchy title for the mystery
 * - mysterySetup: string - The mystery scenario (2-3 sentences)
 * - imagePrompt: string - Description for generating mystery scene image
 * - clues: array - Array of {text: string, slideRef: number} clues
 * - expectedConcepts: array - Key concepts user should mention in their theory
 * - solutionExplanation: string - Full explanation of the mystery solution
 */
router.post('/mystery', learnRateLimit, async (req, res) => {
  const startTime = Date.now()

  try {
    const { slides, topicName, explanationLevel } = req.body

    // Validate inputs
    if (!topicName || typeof topicName !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    // Normalize slides
    const normalizedSlides = Array.isArray(slides) ? slides : []
    const validSlides = normalizedSlides.filter(slide =>
      slide && (typeof slide.subtitle === 'string' || typeof slide.script === 'string')
    )

    if (validSlides.length === 0) {
      return res.status(400).json({
        error: 'Slides must contain subtitle or script content',
        field: 'slides'
      })
    }

    // Normalize explanation level
    const normalizedLevel = ['simple', 'standard', 'deep'].includes(explanationLevel)
      ? explanationLevel
      : 'standard'

    logger.info('LEARN', 'Generating mystery', {
      topicName,
      slideCount: validSlides.length,
      explanationLevel: normalizedLevel
    })

    const result = await generateMystery({
      slides: validSlides,
      topicName,
      explanationLevel: normalizedLevel
    })

    if (result.error) {
      logger.error('LEARN', 'Mystery generation failed', { error: result.error })

      const errorStatusMap = {
        'API_NOT_AVAILABLE': 503,
        'RATE_LIMITED': 429,
        'INVALID_SLIDES': 400,
        'INVALID_RESPONSE': 500,
        'PARSE_ERROR': 500,
      }

      const statusCode = errorStatusMap[result.error] || 500
      return res.status(statusCode).json({ error: result.error })
    }

    const duration = Date.now() - startTime
    logger.info('LEARN', 'Mystery generated successfully', {
      duration: `${duration}ms`,
      clueCount: result.clues?.length || 0,
      conceptCount: result.expectedConcepts?.length || 0
    })

    res.json(result)
  } catch (error) {
    logger.error('LEARN', 'Mystery generation error', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({ error: 'MYSTERY_GENERATION_FAILED' })
  }
})

/**
 * POST /api/learn/mystery/image
 * Generate manga-style educational image for mystery scenario
 *
 * Request body:
 * - imagePrompt: string - Description for image generation
 * - topicName: string - Topic name for context
 * - explanationLevel: string - 'simple' | 'standard' | 'deep'
 *
 * Response:
 * - success: boolean
 * - imageUrl: string - Generated image URL (base64 data URL)
 */
router.post('/mystery/image', learnRateLimit, async (req, res) => {
  const startTime = Date.now()

  try {
    const { imagePrompt, topicName, explanationLevel } = req.body

    // Validate imagePrompt
    if (!imagePrompt || typeof imagePrompt !== 'string' || imagePrompt.trim() === '') {
      return res.status(400).json({
        error: 'Missing or invalid imagePrompt',
        field: 'imagePrompt'
      })
    }

    // Validate topicName
    if (!topicName || typeof topicName !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    // Normalize explanation level
    const normalizedLevel = ['simple', 'standard', 'deep'].includes(explanationLevel)
      ? explanationLevel
      : 'standard'

    // Detect language
    const language = detectLanguage(topicName)

    // Prepend manga-style hint to prompt
    const mangaPrompt = `Manga-style educational illustration: ${imagePrompt}`

    logger.info('LEARN', 'Generating mystery image', {
      topicName,
      promptLength: mangaPrompt.length,
      language
    })

    const result = await generateEducationalImage(mangaPrompt, {
      topic: topicName,
      explanationLevel: normalizedLevel,
      language
    })

    if (result.error) {
      logger.error('LEARN', 'Mystery image generation failed', { error: result.error })

      const errorStatusMap = {
        'API_NOT_AVAILABLE': 503,
        'RATE_LIMITED': 429,
        'IMAGE_GENERATION_FAILED': 500,
      }

      const statusCode = errorStatusMap[result.error] || 500
      return res.status(statusCode).json({ error: result.error })
    }

    const duration = Date.now() - startTime
    logger.info('LEARN', 'Mystery image generated', { duration })

    res.json({
      success: true,
      imageUrl: result.imageUrl
    })
  } catch (error) {
    logger.error('LEARN', 'Mystery image generation error', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({ error: 'IMAGE_GENERATION_FAILED' })
  }
})

/**
 * POST /api/learn/mystery/evaluate
 * Evaluate user's theory against expected concepts
 *
 * Request body:
 * - userTheory: string - The user's spoken/typed theory
 * - expectedConcepts: array - Array of key concepts to match against
 * - solveMethod: string - 'mcq' | 'fill-blank' | 'evidence-board' | 'voice-text'
 * - userAnswer: object - Answer data depending on solveMethod
 * - mysteryData: object - Full mystery data (for fast-path validation)
 *
 * Response:
 * - isCorrect: boolean - Whether answer is correct
 * - feedback: string - Feedback message
 * - identifiedConcepts: array - Concepts identified in answer
 * - xpEarned: number - XP awarded (50 for correct, 10 for incorrect)
 */
router.post('/mystery/evaluate', learnRateLimit, async (req, res) => {
  try {
    const { userTheory, expectedConcepts, solveMethod, userAnswer = {}, mysteryData = {}, explanationLevel } = req.body

    const level = ['simple', 'standard', 'deep'].includes(explanationLevel)
      ? explanationLevel
      : 'standard'

    const levelRules = {
      simple: { hotspots: 3, questions: 3, requireConfidence: false, requireRationale: false, requireCausalLinks: false, requireContradictions: false },
      standard: { hotspots: 5, questions: 5, requireConfidence: true, requireRationale: false, requireCausalLinks: false, requireContradictions: false },
      deep: { hotspots: 7, questions: 7, requireConfidence: true, requireRationale: true, requireCausalLinks: true, requireContradictions: true },
    }[level]

    const mergedExpectedConcepts = Array.isArray(mysteryData?.verdict?.expectedConcepts) && mysteryData.verdict.expectedConcepts.length > 0
      ? mysteryData.verdict.expectedConcepts
      : (Array.isArray(expectedConcepts) ? expectedConcepts : [])

    const toSet = (values) => new Set((Array.isArray(values) ? values : []).map((value) => String(value)))

    const normalizeLink = (link) => {
      const from = String(link?.from || '').trim()
      const to = String(link?.to || '').trim()
      if (!from || !to || from === to) return null
      return `${from}->${to}`
    }

    if (solveMethod === 'scene-scan') {
      const hotspots = Array.isArray(mysteryData?.crimeScene?.hotspots) ? mysteryData.crimeScene.hotspots : []
      const requiredHotspotCount = Number.isFinite(Number(mysteryData?.crimeScene?.requiredHotspotCount))
        ? Number(mysteryData.crimeScene.requiredHotspotCount)
        : levelRules.hotspots

      const requiredHotspots = hotspots
        .filter((spot) => !spot?.bonus)
        .slice(0, Math.min(requiredHotspotCount, hotspots.length))
      const requiredIds = requiredHotspots.map((spot) => String(spot.id))
      const foundIds = toSet(userAnswer?.foundHotspotIds)

      const isCorrect = requiredIds.length > 0 && requiredIds.every((id) => foundIds.has(id))
      const bonusCount = hotspots
        .filter((spot) => spot?.bonus)
        .filter((spot) => foundIds.has(String(spot.id)))
        .length

      return res.json({
        isCorrect,
        feedback: isCorrect
          ? 'Evidence sweep complete. The scene is secured.'
          : 'Keep scanning the scene. You missed critical evidence.',
        identifiedConcepts: isCorrect ? mergedExpectedConcepts : [],
        xpEarned: (isCorrect ? 35 : 10) + bonusCount * 5,
        bonusXp: bonusCount * 5,
      })
    }

    if (solveMethod === 'witness-room') {
      const witnesses = Array.isArray(mysteryData?.witnesses) ? mysteryData.witnesses : []
      const questionPool = new Set()
      for (const witness of witnesses) {
        const cards = Array.isArray(witness?.questionCards) ? witness.questionCards : []
        cards.forEach((question) => questionPool.add(String(question)))
      }

      const askedIds = toSet(userAnswer?.askedQuestionIds)
      const askedCount = askedIds.size
      const requiredQuestions = Math.min(levelRules.questions, Math.max(1, questionPool.size || levelRules.questions))
      const coverageSatisfied = askedCount >= requiredQuestions

      const contradictionCount = Number.isFinite(Number(userAnswer?.resolvedContradictions))
        ? Number(userAnswer.resolvedContradictions)
        : (Array.isArray(userAnswer?.resolvedContradictionKeys) ? userAnswer.resolvedContradictionKeys.length : 0)

      const contradictionSatisfied = !levelRules.requireContradictions || contradictionCount > 0
      const isCorrect = coverageSatisfied && contradictionSatisfied
      const bonusXp = askedCount > requiredQuestions ? (askedCount - requiredQuestions) * 2 : 0

      return res.json({
        isCorrect,
        feedback: isCorrect
          ? 'Interrogation complete. Statements are now consistent.'
          : levelRules.requireContradictions && !contradictionSatisfied
            ? 'A contradiction is still unresolved. Compare witness testimony again.'
            : 'Ask more targeted questions to complete interrogation.',
        identifiedConcepts: isCorrect ? mergedExpectedConcepts : [],
        xpEarned: (isCorrect ? 40 : 10) + bonusXp,
        bonusXp,
      })
    }

    if (solveMethod === 'timeline-rebuild') {
      const timelineEvents = Array.isArray(mysteryData?.timeline?.events) ? mysteryData.timeline.events : []
      const expectedIds = timelineEvents
        .filter((event) => !event?.isRedHerring)
        .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0))
        .map((event) => String(event.id))

      const orderedEventIds = (Array.isArray(userAnswer?.orderedEventIds) ? userAnswer.orderedEventIds : []).map((id) => String(id))
      const normalizedOrdered = orderedEventIds.filter((id) => expectedIds.includes(id))
      const orderCorrect = expectedIds.length > 0 &&
        expectedIds.length === normalizedOrdered.length &&
        expectedIds.every((eventId, index) => normalizedOrdered[index] === eventId)

      const expectedLinks = toSet((Array.isArray(mysteryData?.timeline?.causalLinks) ? mysteryData.timeline.causalLinks : []).map(normalizeLink).filter(Boolean))
      const providedLinks = toSet((Array.isArray(userAnswer?.causalLinks) ? userAnswer.causalLinks : []).map(normalizeLink).filter(Boolean))

      const linksCorrect = expectedLinks.size === 0 || [...expectedLinks].every((link) => providedLinks.has(link))
      const isCorrect = orderCorrect && (!levelRules.requireCausalLinks || linksCorrect)

      return res.json({
        isCorrect,
        feedback: isCorrect
          ? 'Timeline reconstructed. Cause-and-effect chain confirmed.'
          : levelRules.requireCausalLinks && !linksCorrect
            ? 'Timeline order looks close, but causal links are incomplete.'
            : 'Timeline order is not correct yet. Re-check event sequencing.',
        identifiedConcepts: isCorrect ? mergedExpectedConcepts : [],
        xpEarned: isCorrect ? 45 : 12,
      })
    }

    if (solveMethod === 'warrant-decision') {
      const verdict = mysteryData?.verdict || {}
      const options = Array.isArray(verdict.options) ? verdict.options : []
      const selectedIndex = Number(userAnswer?.selectedIndex)
      const confidence = Number(userAnswer?.confidence)
      const rationale = typeof userAnswer?.rationale === 'string'
        ? userAnswer.rationale.trim()
        : (typeof userTheory === 'string' ? userTheory.trim() : '')

      if (!Number.isFinite(selectedIndex) || selectedIndex < 0 || selectedIndex >= options.length) {
        return res.status(400).json({
          error: 'Missing or invalid selectedIndex',
          field: 'userAnswer.selectedIndex',
        })
      }

      if (levelRules.requireConfidence && (!Number.isFinite(confidence) || confidence < 0 || confidence > 100)) {
        return res.status(400).json({
          error: 'Missing or invalid confidence',
          field: 'userAnswer.confidence',
        })
      }

      if (levelRules.requireRationale && !rationale) {
        return res.status(400).json({
          error: 'Missing rationale for deep level',
          field: 'userAnswer.rationale',
        })
      }

      const correctIndex = Number.isFinite(Number(verdict.correctIndex)) ? Number(verdict.correctIndex) : 0
      const verdictCorrect = selectedIndex === correctIndex

      let rationaleMatchedConcepts = []
      let rationalePass = true
      let rationaleHint = null
      let rationaleXp = 0

      if (levelRules.requireRationale && rationale) {
        if (!Array.isArray(mergedExpectedConcepts) || mergedExpectedConcepts.length === 0) {
          return res.status(400).json({
            error: 'Missing expected concepts for rationale scoring',
            field: 'expectedConcepts',
          })
        }

        const rationaleResult = await evaluateMysteryTheory({
          userTheory: rationale,
          expectedConcepts: mergedExpectedConcepts,
        })

        if (rationaleResult.error) {
          const errorStatusMap = {
            API_NOT_AVAILABLE: 503,
            RATE_LIMITED: 429,
            INVALID_RESPONSE: 500,
            PARSE_ERROR: 500,
          }
          return res.status(errorStatusMap[rationaleResult.error] || 500).json({ error: rationaleResult.error })
        }

        rationaleMatchedConcepts = rationaleResult.matchedConcepts || []
        rationalePass = rationaleResult.result !== 'retry'
        rationaleHint = rationaleResult.hint || null
        rationaleXp = rationaleResult.xpEarned || 0
      }

      const confidenceBonus = Number.isFinite(confidence)
        ? (confidence >= 70 && confidence <= 90 ? 10 : 0)
        : 0
      const isCorrect = verdictCorrect && rationalePass

      return res.json({
        isCorrect,
        feedback: isCorrect
          ? 'Warrant approved. The case is solved.'
          : verdictCorrect
            ? (rationaleHint || 'Your accusation is correct, but the rationale needs stronger evidence.')
            : 'Warrant denied. Re-examine the case reconstruction.',
        identifiedConcepts: rationaleMatchedConcepts.length > 0
          ? rationaleMatchedConcepts
          : (isCorrect ? mergedExpectedConcepts : []),
        xpEarned: (isCorrect ? 60 : 15) + confidenceBonus + rationaleXp,
        bonusXp: confidenceBonus + rationaleXp,
      })
    }

    // Backward-compatible legacy methods
    if (solveMethod === 'mcq' && userAnswer && mysteryData?.theoryOptions) {
      const correctIndex = mysteryData.theoryOptions.correctIndex
      const options = mysteryData.theoryOptions.options || []

      if (typeof correctIndex === 'number' && correctIndex >= 0 && correctIndex < options.length) {
        const isCorrect = userAnswer.selectedIndex === correctIndex
        return res.json({
          isCorrect,
          feedback: isCorrect
            ? 'Excellent detective work! You identified the correct theory.'
            : 'Not quite. Review the clues and try again.',
          identifiedConcepts: isCorrect ? mergedExpectedConcepts : [],
          xpEarned: isCorrect ? 50 : 10,
        })
      }
    }

    if (solveMethod === 'fill-blank' && userAnswer && mysteryData?.fillBlanks) {
      const normalizeString = (str) => String(str).toLowerCase().trim()
      const userBlanksNormalized = (userAnswer.blanks || []).map(normalizeString)
      const expectedBlanksNormalized = (mysteryData.fillBlanks.blanks || []).map(normalizeString)

      if (userBlanksNormalized.length === expectedBlanksNormalized.length) {
        const isCorrect = userBlanksNormalized.every((blank, index) => blank === expectedBlanksNormalized[index])
        return res.json({
          isCorrect,
          feedback: isCorrect
            ? 'Perfect! You completed the solution correctly.'
            : 'Some words are incorrect. Check the clues again.',
          identifiedConcepts: isCorrect ? mergedExpectedConcepts : [],
          xpEarned: isCorrect ? 50 : 10,
        })
      }
    }

    if (solveMethod === 'evidence-board' && userAnswer && mysteryData?.evidenceConnections) {
      const evidenceConnections = mysteryData.evidenceConnections
      if (Array.isArray(evidenceConnections) && evidenceConnections.length > 0) {
        const userConnections = userAnswer.connections || []
        const allConnectionsPresent = evidenceConnections.every((expected) =>
          userConnections.some((userConn) =>
            userConn.clueIndex === expected.clueIndex &&
            String(userConn.concept).toLowerCase().trim() === String(expected.concept).toLowerCase().trim()
          )
        )

        return res.json({
          isCorrect: allConnectionsPresent,
          feedback: allConnectionsPresent
            ? 'Brilliant! You connected all the evidence correctly.'
            : 'Some connections are missing or incorrect. Review the clues.',
          identifiedConcepts: allConnectionsPresent ? mergedExpectedConcepts : [],
          xpEarned: allConnectionsPresent ? 50 : 10,
        })
      }
    }

    if (!userTheory || typeof userTheory !== 'string' || userTheory.trim() === '') {
      return res.status(400).json({
        error: 'Missing or invalid userTheory',
        field: 'userTheory',
      })
    }

    if (!Array.isArray(mergedExpectedConcepts) || mergedExpectedConcepts.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid expectedConcepts',
        field: 'expectedConcepts',
      })
    }

    logger.info('LEARN', 'Evaluating mystery theory (voice-text)', {
      theoryLength: userTheory.length,
      conceptCount: mergedExpectedConcepts.length,
    })

    const result = await evaluateMysteryTheory({
      userTheory,
      expectedConcepts: mergedExpectedConcepts,
    })

    if (result.error) {
      logger.error('LEARN', 'Mystery evaluation failed', { error: result.error })

      const errorStatusMap = {
        API_NOT_AVAILABLE: 503,
        RATE_LIMITED: 429,
        INVALID_RESPONSE: 500,
        PARSE_ERROR: 500,
      }

      const statusCode = errorStatusMap[result.error] || 500
      return res.status(statusCode).json({ error: result.error })
    }

    const isCorrect = result.result === 'solved'
    return res.json({
      isCorrect,
      feedback: result.hint || (isCorrect ? 'Great detective work!' : 'Keep investigating!'),
      identifiedConcepts: result.matchedConcepts || [],
      xpEarned: result.xpEarned,
    })
  } catch (error) {
    logger.error('LEARN', 'Mystery evaluation error', {
      error: error.message,
      stack: error.stack
    })
    res.status(500).json({ error: 'MYSTERY_EVALUATION_FAILED' })
  }
})

/**
 * POST /api/learn/whatif
 * Generate a "what if?" scenario from slideshow content
 *
 * Request body:
 * - slides: array - The generated slides with script and imageUrl
 * - topicName: string - The topic being explored
 * - explanationLevel: string - 'simple' | 'standard' | 'deep'
 * - language: string - 'en' or 'zh' (optional, auto-detected from topicName)
 *
 * Response:
 * - scenario: string - The "what if?" question
 * - imagePrompt: string - Prompt for generating scenario visual
 * - thinkAboutHints: array - Guiding prompts to help reasoning
 * - expectedConsequences: array - Expected outcomes { concept, consequence }
 * - bonusFact: string - Mind-expanding extra fact
 */
router.post('/whatif', learnRateLimit, async (req, res) => {
  const startTime = Date.now()

  try {
    const { slides, topicName, explanationLevel, language } = req.body

    // Validate required fields
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid slides array',
        field: 'slides'
      })
    }

    if (!topicName || typeof topicName !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    const normalizedLevel = ['simple', 'standard', 'deep'].includes(explanationLevel)
      ? explanationLevel
      : 'standard'

    // Auto-detect language if not provided
    const detectedLanguage = language || detectLanguage(topicName)

    logger.info('LEARN', 'Generating What If scenario', {
      topicName,
      slideCount: slides.length,
      level: normalizedLevel,
      language: detectedLanguage
    })

    const result = await generateWhatIfScenario({
      slides,
      topicName,
      explanationLevel: normalizedLevel,
      language: detectedLanguage
    })

    if (result.error) {
      logger.error('LEARN', 'What If generation failed', { error: result.error })
      const errorStatusMap = {
        API_NOT_AVAILABLE: 503,
        RATE_LIMITED: 429,
        PARSE_ERROR: 502,
        INVALID_RESPONSE: 502,
      }
      const statusCode = errorStatusMap[result.error] || 500
      return res.status(statusCode).json({ error: result.error })
    }

    const elapsed = Date.now() - startTime
    logger.info('LEARN', 'What If scenario generated', { elapsed })

    return res.json({
      scenario: result.scenario,
      scenarioImagePrompt: result.scenarioImagePrompt,
      predictionCards: result.predictionCards,
      scenarioNarration: result.scenarioNarration,
      bonusFact: result.bonusFact,
      bonusFactNarration: result.bonusFactNarration
    })
  } catch (error) {
    logger.error('LEARN', 'Unexpected error in What If generation', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/learn/whatif/reveal-assets
 * Generate images and TTS narration for correct consequence reveals
 *
 * Request body:
 * - consequences: array - Array of {id, revealNarration, revealImagePrompt}
 * - scenarioNarration: string - Scenario introduction narration
 * - bonusFactNarration: string - Bonus fact narration
 * - topicName: string - Topic name for context
 * - explanationLevel: string - 'simple' | 'standard' | 'deep'
 *
 * Response:
 * - scenarioAudioUrl: string - Base64 audio URL for scenario narration
 * - revealAssets: array - Array of {id, imageUrl, audioUrl} for each consequence
 * - bonusFactAudioUrl: string - Base64 audio URL for bonus fact
 */
router.post('/whatif/reveal-assets', learnRateLimit, async (req, res) => {
  const startTime = Date.now()

  try {
    const { consequences, scenarioNarration, bonusFactNarration, topicName, explanationLevel } = req.body

    // Validate required fields
    if (!Array.isArray(consequences) || consequences.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid consequences array',
        field: 'consequences'
      })
    }

    if (!scenarioNarration || typeof scenarioNarration !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid scenarioNarration',
        field: 'scenarioNarration'
      })
    }

    if (!bonusFactNarration || typeof bonusFactNarration !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid bonusFactNarration',
        field: 'bonusFactNarration'
      })
    }

    if (!topicName || typeof topicName !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    const normalizedLevel = ['simple', 'standard', 'deep'].includes(explanationLevel)
      ? explanationLevel
      : 'standard'

    logger.info('LEARN', 'Generating reveal assets', {
      topicName,
      consequenceCount: consequences.length,
      level: normalizedLevel
    })

    // Generate all assets in parallel with graceful degradation
    const allResults = await Promise.all([
      // Scenario audio
      (async () => {
        try {
          return await generateTTS(scenarioNarration)
        } catch (error) {
          logger.error('LEARN', 'Scenario audio generation failed', { error: error.message })
          return null
        }
      })(),
      // Consequence images and audio in parallel
      ...consequences.map((consequence) =>
        Promise.all([
          // Image
          (async () => {
            try {
              const result = await generateEducationalImage(consequence.revealImagePrompt, {
                topic: topicName,
                explanationLevel: normalizedLevel
              })
              return result.error ? null : result.imageUrl
            } catch (error) {
              logger.error('LEARN', 'Consequence image generation failed', {
                id: consequence.id,
                error: error.message
              })
              return null
            }
          })(),
          // Audio
          (async () => {
            try {
              return await generateTTS(consequence.revealNarration)
            } catch (error) {
              logger.error('LEARN', 'Consequence audio generation failed', {
                id: consequence.id,
                error: error.message
              })
              return null
            }
          })()
        ]).then(([imageUrl, audioUrl]) => ({
          id: consequence.id,
          imageUrl,
          audioUrl
        }))
      ),
      // Bonus fact audio
      (async () => {
        try {
          return await generateTTS(bonusFactNarration)
        } catch (error) {
          logger.error('LEARN', 'Bonus fact audio generation failed', { error: error.message })
          return null
        }
      })()
    ])

    // Extract results: first=scenario audio, last=bonus audio, middle=consequence assets
    const scenarioAudioResult = allResults[0]
    const bonusFactAudioResult = allResults[allResults.length - 1]
    const consequenceResults = allResults.slice(1, -1)

    const elapsed = Date.now() - startTime
    logger.info('LEARN', 'Reveal assets generated', {
      elapsed,
      scenarioAudio: !!scenarioAudioResult,
      consequenceCount: consequenceResults.length,
      bonusAudio: !!bonusFactAudioResult
    })

    return res.json({
      scenarioAudioUrl: scenarioAudioResult,
      revealAssets: consequenceResults,
      bonusFactAudioUrl: bonusFactAudioResult
    })
  } catch (error) {
    logger.error('LEARN', 'Reveal assets generation error', {
      error: error.message,
      stack: error.stack
    })
    return res.status(500).json({ error: 'REVEAL_ASSETS_GENERATION_FAILED' })
  }
})

/**
 * POST /api/learn/story
 * Generate story prompt with concept checklist based on slideshow content
 *
 * Request body:
 * - slides: array - The lesson content slides
 * - topicName: string - The topic being learned
 *
 * Response:
 * - storyPrompt: string - Creative writing prompt for the story
 * - conceptChecklist: array - Key concepts to use in story
 * - starterSuggestion: string - Opening line suggestion
 * - imageStyle: string - Style guide for illustration generation
 */
router.post('/story', learnRateLimit, async (req, res) => {
  const startTime = Date.now()

  try {
    const { slides, topicName } = req.body

    if (!topicName || typeof topicName !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid slides array',
        field: 'slides'
      })
    }

    // Detect language from topic name
    const language = detectLanguage(topicName)

    logger.info('LEARN', 'Generating story prompt', { topicName, language })

    const result = await generateStoryPrompt({ slides, topicName, language })

    let storyData = null
    if (result.error) {
      logger.error('LEARN', 'Story prompt generation failed', { error: result.error })

      if (result.error === 'API_NOT_AVAILABLE') {
        return res.status(503).json({ error: 'API_NOT_AVAILABLE' })
      }

      if (result.error === 'RATE_LIMITED') {
        return res.status(429).json({ error: 'RATE_LIMITED' })
      }

      // Fallback to basic structure for parsing/format issues
      storyData = {
        storyPrompt: language === 'zh'
          ? `创作一个关于${topicName}的故事`
          : `Create a story about ${topicName}`,
        conceptChecklist: language === 'zh'
          ? ['概念1', '概念2', '概念3']
          : ['concept 1', 'concept 2', 'concept 3'],
        starterSuggestion: language === 'zh'
          ? '很久很久以前...'
          : 'Once upon a time...',
        imageStyle: language === 'zh'
          ? '儿童图书插图，色彩鲜艳，友好'
          : "children's book illustration, colorful, friendly"
      }
    } else {
      storyData = {
        storyPrompt: result.storyPrompt,
        conceptChecklist: result.conceptChecklist,
        starterSuggestion: result.starterSuggestion,
        imageStyle: result.imageStyle,
      }
    }

    const duration = Date.now() - startTime
    logger.info('LEARN', 'Story prompt generated', { duration, language })

    return res.json(storyData)

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('LEARN', 'Story prompt generation failed', {
      error: error.message,
      duration
    })

    return res.status(500).json({
      error: 'Failed to generate story prompt',
      message: error.message
    })
  }
})

/**
 * POST /api/learn/story/scene
 * Extract scene from transcript chunk and generate illustration
 *
 * Request body:
 * - transcript: string - Current transcript chunk to process
 * - topicName: string - The topic for context
 * - conceptChecklist: array - List of concepts to detect
 * - previousScenes: array - Previous scene descriptions for continuity
 * - imageStyle: string - Style guide for images
 *
 * Response:
 * - sceneDescription: string - Brief scene description
 * - imagePrompt: string - Detailed prompt for image generation
 * - conceptsFound: array - Concepts detected in this scene
 * - narrativeText: string - Cleaned narrative text for this scene
 * - imageUrl: string - Generated illustration URL (base64 data URL)
 */
router.post('/story/scene', learnRateLimit, async (req, res) => {
  const startTime = Date.now()

  try {
    const { transcript, topicName, conceptChecklist = [], previousScenes = [], imageStyle } = req.body

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 10) {
      return res.status(400).json({
        error: 'Missing or invalid transcript (minimum 10 characters)',
        field: 'transcript'
      })
    }

    if (!topicName || typeof topicName !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicName',
        field: 'topicName'
      })
    }

    // Detect language
    const language = detectLanguage(transcript)

    logger.info('LEARN', 'Extracting scene from transcript', {
      topicName,
      transcriptLength: transcript.length,
      language
    })

    const sceneResult = await extractStoryScene({
      transcript,
      topicName,
      conceptChecklist,
      previousScenes,
      language,
    })

    let sceneData = null
    if (sceneResult.error) {
      logger.error('LEARN', 'Scene extraction failed', { error: sceneResult.error })

      if (sceneResult.error === 'API_NOT_AVAILABLE') {
        return res.status(503).json({ error: 'API_NOT_AVAILABLE' })
      }
      if (sceneResult.error === 'RATE_LIMITED') {
        return res.status(429).json({ error: 'RATE_LIMITED' })
      }

      // Fallback scene for parsing/format issues
      sceneData = {
        sceneDescription: language === 'zh' ? '故事场景' : 'Story scene',
        imagePrompt: transcript.substring(0, 100),
        conceptsFound: [],
        narrativeText: transcript
      }
    } else {
      sceneData = {
        sceneDescription: sceneResult.sceneDescription,
        imagePrompt: sceneResult.imagePrompt,
        conceptsFound: sceneResult.conceptsFound,
        narrativeText: sceneResult.narrativeText,
      }
    }

    // Generate illustration for this scene (512x512 for speed)
    const fullImagePrompt = `${sceneData.imagePrompt}. ${imageStyle || "children's book illustration, colorful, friendly, cartoon style"}`

    logger.info('LEARN', 'Generating scene illustration', {
      imagePrompt: fullImagePrompt.substring(0, 100)
    })

    const imageResult = await generateEducationalImage(fullImagePrompt, {
      topic: topicName,
      language,
      explanationLevel: 'simple' // Simple style for kid-friendly illustrations
    })

    if (imageResult.error) {
      logger.error('LEARN', 'Image generation failed', { error: imageResult.error })
      // Continue without image
      sceneData.imageUrl = null
      sceneData.imageError = imageResult.error
    } else {
      sceneData.imageUrl = imageResult.imageUrl
    }

    const duration = Date.now() - startTime
    logger.info('LEARN', 'Scene extracted and illustrated', {
      duration,
      hasImage: !!sceneData.imageUrl,
      conceptsFound: sceneData.conceptsFound
    })

    return res.json(sceneData)

  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('LEARN', 'Scene extraction failed', {
      error: error.message,
      duration
    })

    return res.status(500).json({
      error: 'Failed to extract scene',
      message: error.message
    })
  }
})

export default router
