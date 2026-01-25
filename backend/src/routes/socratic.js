/**
 * Socratic Routes
 * SOCRATIC-001: Generate probing questions based on slideshow content
 * SOCRATIC-002: Evaluate user answers with encouraging feedback
 */

import { Router } from 'express'
import { generateSocraticQuestion, evaluateSocraticAnswer, generateTTS, detectLanguage } from '../services/gemini.js'
import { sanitizeQuery } from '../utils/sanitize.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * POST /api/socratic/question
 * Generate a Socratic question based on slideshow content
 *
 * Request body:
 * - slides: array - The generated slides with script and imageUrl
 * - topicName: string - The topic being explored
 * - language: string - 'en' or 'zh' (optional, auto-detected from topicName)
 *
 * Response:
 * - question: string - The probing question to ask
 * - questionType: string - comprehension|application|analysis|prediction
 * - expectedTopics: array - Key concepts a good answer should mention
 */
router.post('/question', async (req, res) => {
  const startTime = Date.now()

  try {
    const { slides, topicName, language } = req.body

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

    // Auto-detect language if not provided
    const detectedLanguage = language || detectLanguage(topicName)

    logger.info('SOCRATIC', 'Generating Socratic question', {
      topicName,
      slideCount: slides.length,
      language: detectedLanguage
    })

    const result = await generateSocraticQuestion({
      slides,
      topicName,
      language: detectedLanguage
    })

    if (result.error) {
      logger.error('SOCRATIC', 'Question generation failed', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    const elapsed = Date.now() - startTime
    logger.info('SOCRATIC', 'Question generated', { elapsed, questionType: result.questionType })

    // Check response time requirement (T008: under 3 seconds)
    if (elapsed > 3000) {
      logger.warn('SOCRATIC', 'Response time exceeded 3s target', { elapsed })
    }

    return res.json({
      question: result.question,
      questionType: result.questionType,
      expectedTopics: result.expectedTopics
    })
  } catch (error) {
    logger.error('SOCRATIC', 'Unexpected error in question generation', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * POST /api/socratic/evaluate
 * Evaluate user's spoken answer and provide encouraging feedback
 *
 * Request body:
 * - answer: string - User's transcribed answer
 * - question: string - The original Socratic question
 * - expectedTopics: array - Expected concepts from question generation
 * - slideContext: object - The slide content for context
 * - language: string - 'en' or 'zh' (optional)
 *
 * Response:
 * - feedback: string - Encouraging feedback message
 * - score: number - 1-5 understanding score
 * - correctAspects: array - What the user got right
 * - suggestions: array - Gentle corrections or extensions
 * - followUpQuestion: string|null - Optional deeper question
 * - audioUrl: string|null - TTS audio of feedback (optional)
 * - duration: number - Audio duration in ms (optional)
 */
router.post('/evaluate', async (req, res) => {
  const startTime = Date.now()

  try {
    const { answer, question, expectedTopics, slideContext, language, generateAudio = true } = req.body

    // Validate required fields
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({
        error: 'Missing or invalid question',
        field: 'question'
      })
    }

    // Answer can be empty (handled specially in evaluation)
    const answerText = typeof answer === 'string' ? answer : ''

    // Auto-detect language from question if not provided
    const detectedLanguage = language || detectLanguage(question)

    logger.info('SOCRATIC', 'Evaluating answer', {
      questionLength: question.length,
      answerLength: answerText.length,
      language: detectedLanguage
    })

    const result = await evaluateSocraticAnswer({
      answer: answerText,
      question,
      expectedTopics: Array.isArray(expectedTopics) ? expectedTopics : [],
      slideContext: slideContext || {},
      language: detectedLanguage
    })

    if (result.error) {
      logger.error('SOCRATIC', 'Answer evaluation failed', { error: result.error })
      return res.status(500).json({ error: result.error })
    }

    // Optionally generate TTS for the feedback
    let audioUrl = null
    let duration = 0
    if (generateAudio && result.feedback) {
      const ttsResult = await generateTTS(result.feedback, { language: detectedLanguage })
      if (!ttsResult.error) {
        audioUrl = ttsResult.audioUrl
        duration = ttsResult.duration
      }
    }

    const elapsed = Date.now() - startTime
    logger.info('SOCRATIC', 'Evaluation complete', { elapsed, score: result.score })

    return res.json({
      feedback: result.feedback,
      score: result.score,
      correctAspects: result.correctAspects,
      suggestions: result.suggestions,
      followUpQuestion: result.followUpQuestion,
      audioUrl,
      duration
    })
  } catch (error) {
    logger.error('SOCRATIC', 'Unexpected error in evaluation', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
