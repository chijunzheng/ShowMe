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
import { generateWhatIfScenario, evaluateWhatIfPrediction, detectLanguage, generateStoryPrompt, extractStoryScene, generateEducationalImage } from '../services/gemini.js'
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
    const { userTheory, expectedConcepts, solveMethod, userAnswer, mysteryData } = req.body

    // Validate expectedConcepts (required for all methods)
    if (!Array.isArray(expectedConcepts) || expectedConcepts.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid expectedConcepts',
        field: 'expectedConcepts'
      })
    }

    // Fast-path evaluation based on solveMethod
    if (solveMethod === 'mcq' && userAnswer && mysteryData?.theoryOptions) {
      // Multiple choice evaluation
      const correctIndex = mysteryData.theoryOptions.correctIndex
      const options = mysteryData.theoryOptions.options || []

      // Validate correctIndex is within bounds
      if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length) {
        logger.warn('LEARN', 'Invalid correctIndex in MCQ fast-path, falling through to LLM', {
          correctIndex,
          optionsLength: options.length
        })
        // Fall through to voice-text evaluation below
      } else {
        logger.info('LEARN', 'Evaluating mystery (MCQ)', {
          selectedIndex: userAnswer.selectedIndex,
          correctIndex
        })

        const isCorrect = userAnswer.selectedIndex === correctIndex
        const xpEarned = isCorrect ? 50 : 10

        return res.json({
          isCorrect,
          feedback: isCorrect
            ? 'Excellent detective work! You identified the correct theory.'
            : 'Not quite. Review the clues and try again.',
          identifiedConcepts: isCorrect ? expectedConcepts : [],
          xpEarned
        })
      }
    }

    if (solveMethod === 'fill-blank' && userAnswer && mysteryData?.fillBlanks) {
      // Fill-in-the-blank evaluation
      // Case-insensitive array comparison
      const normalizeString = (str) => String(str).toLowerCase().trim()
      const userBlanksNormalized = (userAnswer.blanks || []).map(normalizeString)
      const expectedBlanksNormalized = (mysteryData.fillBlanks.blanks || []).map(normalizeString)

      // Validate array lengths match before comparing
      if (userBlanksNormalized.length !== expectedBlanksNormalized.length) {
        logger.warn('LEARN', 'Mismatched array lengths in fill-blank fast-path, falling through to LLM', {
          userLength: userBlanksNormalized.length,
          expectedLength: expectedBlanksNormalized.length
        })
        // Fall through to voice-text evaluation below
      } else {
        logger.info('LEARN', 'Evaluating mystery (Fill Blank)', {
          userBlanks: userAnswer.blanks,
          expectedBlanks: mysteryData.fillBlanks.blanks
        })

        const isCorrect = userBlanksNormalized.every((blank, index) => blank === expectedBlanksNormalized[index])
        const xpEarned = isCorrect ? 50 : 10

        return res.json({
          isCorrect,
          feedback: isCorrect
            ? 'Perfect! You completed the solution correctly.'
            : 'Some words are incorrect. Check the clues again.',
          identifiedConcepts: isCorrect ? expectedConcepts : [],
          xpEarned
        })
      }
    }

    if (solveMethod === 'evidence-board' && userAnswer && mysteryData?.evidenceConnections) {
      // Evidence board evaluation - check all expected connections are present
      const evidenceConnections = mysteryData.evidenceConnections

      // Validate evidenceConnections is a non-empty array
      if (!Array.isArray(evidenceConnections) || evidenceConnections.length === 0) {
        logger.warn('LEARN', 'Invalid evidenceConnections in evidence-board fast-path, falling through to LLM', {
          evidenceConnections
        })
        // Fall through to voice-text evaluation below
      } else {
        logger.info('LEARN', 'Evaluating mystery (Evidence Board)', {
          userConnections: userAnswer.connections,
          expectedConnections: evidenceConnections
        })

        const userConnections = userAnswer.connections || []

        // Check if all expected connections are present in user's answer
        const allConnectionsPresent = evidenceConnections.every(expected => {
          return userConnections.some(userConn =>
            userConn.clueIndex === expected.clueIndex &&
            String(userConn.concept).toLowerCase().trim() === String(expected.concept).toLowerCase().trim()
          )
        })

        const isCorrect = allConnectionsPresent
        const xpEarned = isCorrect ? 50 : 10

        return res.json({
          isCorrect,
          feedback: isCorrect
            ? 'Brilliant! You connected all the evidence correctly.'
            : 'Some connections are missing or incorrect. Review the clues.',
          identifiedConcepts: isCorrect ? expectedConcepts : [],
          xpEarned
        })
      }
    }

    // Fall through to voice-text evaluation (backward compatible)
    // Validate userTheory for voice-text method
    if (!userTheory || typeof userTheory !== 'string' || userTheory.trim() === '') {
      return res.status(400).json({
        error: 'Missing or invalid userTheory',
        field: 'userTheory'
      })
    }

    logger.info('LEARN', 'Evaluating mystery theory (voice-text)', {
      theoryLength: userTheory.length,
      conceptCount: expectedConcepts.length
    })

    const result = await evaluateMysteryTheory({
      userTheory,
      expectedConcepts
    })

    if (result.error) {
      logger.error('LEARN', 'Mystery evaluation failed', { error: result.error })

      const errorStatusMap = {
        'API_NOT_AVAILABLE': 503,
        'RATE_LIMITED': 429,
        'INVALID_RESPONSE': 500,
      }

      const statusCode = errorStatusMap[result.error] || 500
      return res.status(statusCode).json({ error: result.error })
    }

    logger.info('LEARN', 'Mystery theory evaluated', {
      result: result.result,
      xpEarned: result.xpEarned,
      matchedCount: result.matchedConcepts?.length || 0
    })

    // Transform result to match new response format
    const isCorrect = result.result === 'solved'
    res.json({
      isCorrect,
      feedback: result.hint || (isCorrect ? 'Great detective work!' : 'Keep investigating!'),
      identifiedConcepts: result.matchedConcepts || [],
      xpEarned: result.xpEarned
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
      imagePrompt: result.imagePrompt,
      thinkAboutHints: result.thinkAboutHints,
      expectedConsequences: result.expectedConsequences,
      bonusFact: result.bonusFact
    })
  } catch (error) {
    logger.error('LEARN', 'Unexpected error in What If generation', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/learn/whatif/evaluate
 * Evaluate user's prediction against expected consequences (non-judgmental)
 *
 * Request body:
 * - userPrediction: string - User's transcribed prediction
 * - expectedConsequences: array - Expected outcomes from generation
 * - language: string - 'en' or 'zh' (optional)
 *
 * Response:
 * - matchedPredictions: array - Predictions that aligned { concept, userPhrase, feedback }
 * - missedConsequences: array - Consequences not mentioned { concept, reveal }
 * - xpEarned: number - Encouragement-based XP (always positive: 10-50)
 */
router.post('/whatif/evaluate', learnRateLimit, async (req, res) => {
  const startTime = Date.now()

  try {
    const { userPrediction, expectedConsequences, language } = req.body

    // Validate required fields
    if (!Array.isArray(expectedConsequences) || expectedConsequences.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid expectedConsequences array',
        field: 'expectedConsequences'
      })
    }

    const predictionText = typeof userPrediction === 'string' ? userPrediction.trim() : ''

    // Auto-detect language from expected consequences if not provided
    const detectedLanguage = language || detectLanguage(expectedConsequences[0]?.consequence || '')

    logger.info('LEARN', 'Evaluating What If prediction', {
      predictionLength: predictionText.length,
      expectedCount: expectedConsequences.length,
      language: detectedLanguage
    })

    const result = await evaluateWhatIfPrediction({
      userPrediction: predictionText,
      expectedConsequences,
      language: detectedLanguage
    })

    if (result.error) {
      logger.error('LEARN', 'What If evaluation failed', { error: result.error })
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
    logger.info('LEARN', 'What If evaluation complete', {
      elapsed,
      matchedCount: result.matchedPredictions.length,
      xpEarned: result.xpEarned
    })

    return res.json({
      matchedPredictions: result.matchedPredictions,
      missedConsequences: result.missedConsequences,
      xpEarned: result.xpEarned
    })
  } catch (error) {
    logger.error('LEARN', 'Unexpected error in What If evaluation', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
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
