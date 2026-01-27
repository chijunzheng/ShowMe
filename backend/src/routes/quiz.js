/**
 * Quiz Routes
 * WB001: Quiz generation from slides for World Builder gamification
 * WB005: Quiz evaluation and scoring
 *
 * After viewing slides, generates quiz questions that reference specific slide
 * content and test comprehension of the material learned. Also evaluates quiz
 * answers, calculates scores, awards XP, and determines pass/fail status.
 */

import { Router } from 'express'
import { generateQuizQuestions, detectLanguage } from '../services/gemini.js'
import { awardQuizXP } from '../services/worldState.js'
import { sanitizeId } from '../utils/sanitize.js'
import logger from '../utils/logger.js'

const router = Router()

// Quiz scoring constants
const PASS_THRESHOLD = 0.75  // 75% required to pass
const XP_PER_CORRECT = 5     // 5 XP per correct answer
const BONUS_PERFECT = 15     // Bonus XP for 100%
const BONUS_PASS = 10        // Bonus XP for passing

/**
 * POST /api/quiz/generate
 * Generate quiz questions based on slideshow content
 *
 * Request body:
 * - slides: array - The lesson content with {script, subtitle, imageUrl} per slide
 * - topicName: string - The topic being quizzed
 * - language: string - 'en' or 'zh' (optional, auto-detected from topicName)
 *
 * Response:
 * - questions: array - Array of QuizQuestion objects
 * - topicId: string - For tracking (generated from topicName)
 *
 * QuizQuestion types:
 * - mcq: Multiple choice with options[], correctIndex, correctAnswer
 * - fill_blank: Fill in the blank with blankSentence, correctAnswer, acceptableAnswers
 * - voice: Open-ended with expectedTopics, sampleAnswer, correctAnswer
 *
 * All questions have:
 * - id: string - Unique question ID
 * - type: 'mcq' | 'fill_blank' | 'voice'
 * - question: string - The question text
 * - slideReference: number - Which slide (0-indexed) this references
 * - correctAnswer: string - Human-readable correct answer
 * - explanation: string - Why this is correct (shown after answering)
 */
router.post('/generate', async (req, res) => {
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

    // Validate slide structure (at minimum, need subtitle or script)
    const validSlides = slides.filter(slide =>
      slide && (typeof slide.subtitle === 'string' || typeof slide.script === 'string')
    )

    if (validSlides.length === 0) {
      return res.status(400).json({
        error: 'Slides must contain subtitle or script content',
        field: 'slides'
      })
    }

    // Auto-detect language if not provided
    const detectedLanguage = language || detectLanguage(topicName)

    logger.info('QUIZ', 'Generating quiz questions', {
      topicName,
      slideCount: validSlides.length,
      language: detectedLanguage
    })

    const result = await generateQuizQuestions({
      slides: validSlides,
      topicName,
      language: detectedLanguage
    })

    if (result.error) {
      logger.error('QUIZ', 'Quiz generation failed', { error: result.error })

      // Map error codes to appropriate HTTP status codes
      const errorStatusMap = {
        'API_NOT_AVAILABLE': 503,
        'RATE_LIMITED': 429,
        'INVALID_SLIDES': 400,
        'INVALID_RESPONSE': 500,
        'INSUFFICIENT_QUESTIONS': 500,
        'PARSE_ERROR': 500,
      }

      const statusCode = errorStatusMap[result.error] || 500
      return res.status(statusCode).json({ error: result.error })
    }

    const elapsed = Date.now() - startTime

    // Log question type distribution for monitoring
    const typeDistribution = result.questions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1
      return acc
    }, {})

    logger.info('QUIZ', 'Quiz generated successfully', {
      elapsed,
      questionCount: result.questions.length,
      types: typeDistribution
    })

    // Generate a simple topic ID from the topic name
    const topicId = topicName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'unknown-topic'

    return res.json({
      questions: result.questions,
      topicId,
      metadata: {
        topicName,
        slideCount: validSlides.length,
        questionCount: result.questions.length,
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('QUIZ', 'Unexpected error in quiz generation', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * Normalize a string for fuzzy comparison
 * - Converts to lowercase
 * - Trims whitespace
 * - Removes extra spaces
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeString(str) {
  if (typeof str !== 'string') return ''
  return str.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Check if two strings match with fuzzy matching
 * - Case insensitive
 * - Whitespace tolerant
 * - Checks against acceptableAnswers if provided
 * @param {string} userAnswer - The user's answer
 * @param {string} correctAnswer - The correct answer
 * @param {string[]} acceptableAnswers - Optional array of acceptable variations
 * @returns {{ match: boolean, partial: boolean }} Match result with partial credit flag
 */
function fuzzyMatch(userAnswer, correctAnswer, acceptableAnswers = []) {
  const normalizedUser = normalizeString(userAnswer)
  const normalizedCorrect = normalizeString(correctAnswer)

  // Empty answer is never correct
  if (!normalizedUser) {
    return { match: false, partial: false }
  }

  // Exact match (after normalization)
  if (normalizedUser === normalizedCorrect) {
    return { match: true, partial: false }
  }

  // Check against acceptable answers
  if (Array.isArray(acceptableAnswers) && acceptableAnswers.length > 0) {
    for (const acceptable of acceptableAnswers) {
      if (normalizeString(acceptable) === normalizedUser) {
        return { match: true, partial: false }
      }
    }
  }

  // Check for partial match (user answer contains correct answer or vice versa)
  // Only grant partial credit for substantial matches (> 50% of correct answer length)
  if (normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser)) {
    const minLen = Math.min(normalizedUser.length, normalizedCorrect.length)
    const maxLen = Math.max(normalizedUser.length, normalizedCorrect.length)
    if (minLen / maxLen > 0.5) {
      return { match: false, partial: true }
    }
  }

  return { match: false, partial: false }
}

/**
 * Evaluate a single answer against the question
 * @param {Object} answer - User's answer { questionId, answer, type }
 * @param {Object} question - Original question with correctAnswer, correctIndex, etc.
 * @returns {{ correct: boolean, partial: boolean, userAnswer: string|number, correctAnswer: string }}
 */
function evaluateAnswer(answer, question) {
  const result = {
    correct: false,
    partial: false,
    userAnswer: answer.answer,
    correctAnswer: question.correctAnswer || ''
  }

  const type = question.type || answer.type

  switch (type) {
    case 'mcq': {
      // MCQ: Compare selected index with correctIndex
      const userIndex = typeof answer.answer === 'number' ? answer.answer : parseInt(answer.answer, 10)
      const correctIndex = question.correctIndex
      result.correct = userIndex === correctIndex
      break
    }

    case 'fill_blank': {
      // Fill in the blank: Use fuzzy matching
      const matchResult = fuzzyMatch(
        answer.answer,
        question.correctAnswer,
        question.acceptableAnswers || []
      )
      result.correct = matchResult.match
      result.partial = matchResult.partial
      break
    }

    case 'voice': {
      // Voice: For now, use fuzzy matching against correctAnswer and expectedTopics
      // In a full implementation, this would use AI evaluation
      const userText = String(answer.answer || '')
      const correctAnswer = question.correctAnswer || ''

      // Check if user's response matches the correct answer
      const matchResult = fuzzyMatch(userText, correctAnswer)
      if (matchResult.match) {
        result.correct = true
        break
      }

      // Check if user's response covers expected topics
      const expectedTopics = question.expectedTopics || []
      let topicsMatched = 0
      for (const topic of expectedTopics) {
        if (normalizeString(userText).includes(normalizeString(topic))) {
          topicsMatched++
        }
      }

      // Consider correct if majority of topics are covered
      if (expectedTopics.length > 0 && topicsMatched / expectedTopics.length >= 0.5) {
        result.correct = true
      } else if (topicsMatched > 0) {
        result.partial = true
      }
      break
    }

    default:
      // Unknown type - mark as incorrect
      logger.warn('QUIZ', 'Unknown question type', { type, questionId: question.id })
      break
  }

  return result
}

/**
 * POST /api/quiz/evaluate
 * Evaluate quiz answers and calculate score, XP, and pass/fail status
 *
 * Request body:
 * - answers: array - User's answers [{ questionId, answer, type }]
 * - questions: array - Original questions for reference
 * - topicId: string - ID of the topic being quizzed
 * - clientId: string - The client identifier
 *
 * Response:
 * - score: number - Number of correct answers (partial credit = 0.5)
 * - maxScore: number - Total number of questions
 * - percentage: number - Score as a percentage (0-100)
 * - passed: boolean - True if percentage >= 75%
 * - xpEarned: number - XP earned based on performance
 * - results: array - Per-question results [{ questionId, correct, partial, userAnswer, correctAnswer }]
 * - canRetry: boolean - True if the quiz was failed (can retry)
 * - xpBreakdown: object - Breakdown of XP earned { base, bonus, streak, total }
 */
router.post('/evaluate', async (req, res) => {
  const startTime = Date.now()

  try {
    const { answers, questions, topicId, clientId } = req.body

    // Validate required fields
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid answers array',
        field: 'answers'
      })
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid questions array',
        field: 'questions'
      })
    }

    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid topicId',
        field: 'topicId'
      })
    }

    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId',
        field: 'clientId'
      })
    }

    // Validate clientId format
    const { sanitized: sanitizedClientId, error: clientIdError } = sanitizeId(clientId)
    if (clientIdError) {
      return res.status(400).json({
        error: clientIdError,
        field: 'clientId'
      })
    }

    logger.info('QUIZ', 'Evaluating quiz', {
      clientId: sanitizedClientId,
      topicId,
      answerCount: answers.length,
      questionCount: questions.length
    })

    // Create a map of questions by ID for quick lookup
    const questionMap = new Map()
    for (const question of questions) {
      if (question && question.id) {
        questionMap.set(question.id, question)
      }
    }

    // Evaluate each answer
    const results = []
    let correctCount = 0
    let partialCount = 0

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId)

      if (!question) {
        // Question not found - mark as incorrect
        results.push({
          questionId: answer.questionId,
          correct: false,
          partial: false,
          userAnswer: answer.answer,
          correctAnswer: 'Unknown',
          error: 'Question not found'
        })
        continue
      }

      const evalResult = evaluateAnswer(answer, question)
      results.push({
        questionId: answer.questionId,
        correct: evalResult.correct,
        partial: evalResult.partial,
        userAnswer: evalResult.userAnswer,
        correctAnswer: evalResult.correctAnswer
      })

      if (evalResult.correct) {
        correctCount++
      } else if (evalResult.partial) {
        partialCount++
      }
    }

    // Calculate score (partial credit = 0.5)
    const score = correctCount + (partialCount * 0.5)
    const maxScore = questions.length
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    const passed = percentage >= (PASS_THRESHOLD * 100)

    // Calculate XP earned based on performance
    let baseXP = 0
    let bonusXP = 0

    if (passed) {
      // Base XP: per correct answer
      baseXP = Math.round(score * XP_PER_CORRECT)

      // Bonus for passing
      bonusXP += BONUS_PASS

      // Perfect score bonus
      if (score === maxScore && maxScore > 0) {
        bonusXP += BONUS_PERFECT
      }
    }

    const totalXP = baseXP + bonusXP

    // Award XP if passed using the worldState service
    let xpResult = null
    if (passed && totalXP > 0) {
      try {
        xpResult = await awardQuizXP(sanitizedClientId, Math.round(score), maxScore, 0)
        if (xpResult.error) {
          logger.warn('QUIZ', 'Failed to award XP', { error: xpResult.error })
        }
      } catch (xpError) {
        logger.error('QUIZ', 'Error awarding XP', { error: xpError.message })
      }
    }

    const elapsed = Date.now() - startTime

    logger.info('QUIZ', 'Quiz evaluated', {
      elapsed,
      score,
      maxScore,
      percentage,
      passed,
      xpEarned: xpResult?.newXP || totalXP,
      correctCount,
      partialCount
    })

    return res.json({
      score,
      maxScore,
      percentage,
      passed,
      xpEarned: xpResult?.newXP || totalXP,
      results,
      canRetry: !passed,
      xpBreakdown: {
        base: baseXP,
        bonus: bonusXP,
        streak: 0,  // Streak bonus handled by awardQuizXP
        total: totalXP
      },
      // Include tier info if available from XP award
      tierInfo: xpResult ? {
        totalXP: xpResult.totalXP,
        tier: xpResult.newTier,
        tierUpgrade: xpResult.tierUpgrade
      } : null,
      metadata: {
        topicId,
        questionCount: questions.length,
        evaluatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('QUIZ', 'Unexpected error in quiz evaluation', { error: error.message })
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
