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
import { generateWhatIfScenario, evaluateWhatIfPrediction, detectLanguage, generateScript, generateEducationalImage } from '../services/gemini.js'
import { sanitizeId, escapeHtml } from '../utils/sanitize.js'
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
 * POST /api/learn/mystery/evaluate
 * Evaluate user's theory against expected concepts
 *
 * Request body:
 * - userTheory: string - The user's spoken/typed theory
 * - expectedConcepts: array - Array of key concepts to match against
 *
 * Response:
 * - result: string - 'solved' | 'partial' | 'retry'
 * - matchedConcepts: array - Array of concepts that were matched
 * - xpEarned: number - XP awarded (50 for solved, 15 for partial, 5 for retry)
 * - hint: string - Optional hint for retry cases
 */
router.post('/mystery/evaluate', learnRateLimit, async (req, res) => {
  try {
    const { userTheory, expectedConcepts } = req.body

    // Validate inputs
    if (!userTheory || typeof userTheory !== 'string' || userTheory.trim() === '') {
      return res.status(400).json({
        error: 'Missing or invalid userTheory',
        field: 'userTheory'
      })
    }

    if (!Array.isArray(expectedConcepts) || expectedConcepts.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid expectedConcepts',
        field: 'expectedConcepts'
      })
    }

    logger.info('LEARN', 'Evaluating mystery theory', {
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

    res.json(result)
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
      return res.status(500).json({ error: result.error })
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
      return res.status(500).json({ error: result.error })
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

    // Build context from slides (sanitized to prevent prompt injection)
    const slideContext = slides
      .map((slide, index) => {
        const script = escapeHtml(slide.script || '')
        const subtitle = escapeHtml(slide.subtitle || '')
        return `Slide ${index + 1}: ${script || subtitle}`
      })
      .join('\n')

    // Generate story prompt using Gemini
    const promptText = language === 'zh'
      ? `基于这个教育主题，为小朋友创建一个创意故事提示。

主题: ${topicName}

教学内容:
${slideContext}

请生成一个JSON对象，包含:
{
  "storyPrompt": "创意写作提示，引导孩子使用学到的概念创作故事",
  "conceptChecklist": ["概念1", "概念2", "概念3"],
  "starterSuggestion": "故事的开头建议，帮助孩子开始",
  "imageStyle": "插图风格描述，用于生成儿童友好的插图"
}

要求:
- 故事提示应该有趣、适合儿童
- 概念清单应包含3-5个关键概念
- 开头建议应该引人入胜
- 插图风格应该是"儿童图书插图，色彩鲜艳，友好"
- 所有文本用简体中文

只返回JSON，不要其他文本。`
      : `Based on this educational topic, create a creative story prompt for a kid.

Topic: ${topicName}

Lesson content:
${slideContext}

Generate a JSON object with:
{
  "storyPrompt": "A creative writing prompt that encourages using learned concepts",
  "conceptChecklist": ["concept1", "concept2", "concept3"],
  "starterSuggestion": "An opening line to help the kid start their story",
  "imageStyle": "Style description for generating kid-friendly illustrations"
}

Requirements:
- Story prompt should be engaging and age-appropriate
- Concept checklist should have 3-5 key concepts from the lesson
- Starter suggestion should be inviting and hook the imagination
- Image style should be "children's book illustration, colorful, friendly"
- Keep concepts concise (2-4 words each)

Return ONLY the JSON object, no other text.`

    logger.info('LEARN', 'Generating story prompt', { topicName, language })

    const response = await generateScript(promptText, {
      temperature: 0.9, // Higher creativity for story prompts
      maxTokens: 1000
    })

    if (!response || !response.trim()) {
      throw new Error('Empty response from AI')
    }

    // Parse JSON response
    let storyData
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, response]
      const jsonStr = jsonMatch[1].trim()
      storyData = JSON.parse(jsonStr)
    } catch (parseError) {
      logger.error('LEARN', 'Failed to parse story prompt JSON', { error: parseError.message, response })

      // Fallback to basic structure
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

    // Build context from previous scenes
    const sceneContext = previousScenes.length > 0
      ? `\nPrevious scenes:\n${previousScenes.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : ''

    // Extract scene using Gemini
    const extractPrompt = language === 'zh'
      ? `从这段孩子讲述的故事中提取一个场景。

主题: ${topicName}
概念清单: ${conceptChecklist.join(', ')}
${sceneContext}

故事文本:
${transcript}

生成JSON对象:
{
  "sceneDescription": "简短的场景描述（用于内部）",
  "imagePrompt": "详细的插图提示（卡通风格，友好，色彩鲜艳）",
  "conceptsFound": ["检测到的概念"],
  "narrativeText": "这个场景的清理后的叙述文本"
}

要求:
- 场景描述应该简洁（5-10个字）
- 图像提示应该详细，适合生成儿童友好的插图
- 检测概念清单中出现的概念
- 叙述文本应该是完整的句子
- 所有文本用简体中文

只返回JSON。`
      : `Extract a scene from this kid's story narration.

Topic: ${topicName}
Concept checklist: ${conceptChecklist.join(', ')}
${sceneContext}

Story text:
${transcript}

Generate JSON object:
{
  "sceneDescription": "Brief scene description (for internal use)",
  "imagePrompt": "Detailed prompt for illustration (cartoon style, friendly, colorful)",
  "conceptsFound": ["detected concepts from checklist"],
  "narrativeText": "Clean narrative text for this scene"
}

Requirements:
- Scene description should be concise (5-10 words)
- Image prompt should be detailed and suitable for kid-friendly illustration
- Detect which concepts from the checklist appear in this scene
- Narrative text should be a complete sentence or two
- Keep it engaging and age-appropriate

Return ONLY JSON.`

    logger.info('LEARN', 'Extracting scene from transcript', {
      topicName,
      transcriptLength: transcript.length,
      language
    })

    const response = await generateScript(extractPrompt, {
      temperature: 0.7,
      maxTokens: 500
    })

    if (!response || !response.trim()) {
      throw new Error('Empty response from AI')
    }

    // Parse scene data
    let sceneData
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                       response.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, response]
      const jsonStr = jsonMatch[1].trim()
      sceneData = JSON.parse(jsonStr)
    } catch (parseError) {
      logger.error('LEARN', 'Failed to parse scene JSON', { error: parseError.message })

      // Fallback scene
      sceneData = {
        sceneDescription: language === 'zh' ? '故事场景' : 'Story scene',
        imagePrompt: transcript.substring(0, 100),
        conceptsFound: [],
        narrativeText: transcript
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
