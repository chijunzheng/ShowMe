/**
 * Mystery Generator Service
 * Generates detective-style mysteries from lesson content using Gemini AI
 *
 * Uses Gemini to create engaging mystery scenarios where kids use what they
 * learned to solve puzzles. Includes fuzzy concept matching for evaluation.
 */

import { GoogleGenAI } from '@google/genai'
import { detectLanguage } from './gemini.js'
import { extractJSON } from '../utils/json.js'
import logger from '../utils/logger.js'

const TEXT_MODEL = 'gemini-3-flash-preview'
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

/**
 * Generate a detective mystery from slide content
 * @param {Object} params
 * @param {Array} params.slides - Lesson slides with subtitle/script
 * @param {string} params.topicName - Topic name
 * @param {string} params.explanationLevel - 'simple' | 'standard' | 'deep'
 * @returns {Object} Mystery object or error
 */
export async function generateMystery({ slides, topicName, explanationLevel }) {
  try {
    // Detect language from topic name
    const language = detectLanguage(topicName)
    const isZh = language === 'zh'

    // Build slide content summary for mystery generation
    const slideContent = slides
      .map((slide, index) => {
        const text = slide.subtitle || slide.script || ''
        return `Slide ${index + 1}: ${text.trim()}`
      })
      .join('\n\n')

    // Adjust mystery complexity based on explanation level
    const complexityMap = {
      simple: 'very simple and clear, suitable for young children',
      standard: 'moderately challenging but age-appropriate',
      deep: 'complex and thought-provoking, requiring careful reasoning'
    }
    const complexity = complexityMap[explanationLevel] || complexityMap.standard

    const prompt = isZh
      ? `你是一个儿童教育专家。基于以下课程内容，创建一个侦探式的谜题。

课程主题：${topicName}
课程内容：
${slideContent}

要求：
1. 创建一个吸引人的谜题场景（2-3句话），其中某些东西不对劲
2. 谜题应该${complexity}
3. 提供3-5条线索，每条线索引用一个特定的幻灯片编号
4. 线索应该引导孩子使用他们学到的概念来解开谜题
5. 确定2-4个关键概念，孩子应该在他们的理论中提到
6. 提供完整的解决方案说明

返回JSON格式：
{
  "mysteryTitle": "谜题的简短标题",
  "mysterySetup": "谜题场景（2-3句话）",
  "imagePrompt": "用于生成谜题场景图像的英文描述",
  "clues": [
    {"text": "线索文本", "slideRef": 1},
    {"text": "线索文本", "slideRef": 2}
  ],
  "expectedConcepts": ["概念1", "概念2"],
  "solutionExplanation": "完整的解决方案说明"
}`
      : `You are a children's education expert. Based on the following lesson content, create a detective-style mystery.

Topic: ${topicName}
Lesson Content:
${slideContent}

Requirements:
1. Create an engaging mystery scenario (2-3 sentences) where something is wrong
2. The mystery should be ${complexity}
3. Provide 3-5 clues, each referencing a specific slide number
4. Clues should guide the child to use concepts they learned to solve the mystery
5. Identify 2-4 key concepts the child should mention in their theory
6. Provide a full solution explanation

Return JSON format:
{
  "mysteryTitle": "Short catchy title for the mystery",
  "mysterySetup": "The mystery scenario (2-3 sentences)",
  "imagePrompt": "Description for generating mystery scene image (in English)",
  "clues": [
    {"text": "Clue text", "slideRef": 1},
    {"text": "Clue text", "slideRef": 2}
  ],
  "expectedConcepts": ["concept1", "concept2"],
  "solutionExplanation": "Full explanation of how the mystery is solved"
}`

    logger.info('MYSTERY', 'Generating mystery with Gemini', {
      model: TEXT_MODEL,
      slideCount: slides.length,
      language
    })

    const model = genAI.getGenerativeModel({ model: TEXT_MODEL })
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Extract and parse JSON
    const jsonData = extractJSON(text)
    if (!jsonData) {
      logger.error('MYSTERY', 'Failed to extract JSON from response', {
        responseText: text.substring(0, 500)
      })
      return { error: 'PARSE_ERROR' }
    }

    const mystery = JSON.parse(jsonData)

    // Sanitize and validate imagePrompt (prevent overly long prompts)
    if (mystery.imagePrompt) {
      mystery.imagePrompt = mystery.imagePrompt.substring(0, 500)
    }

    // Validate required fields
    const requiredFields = ['mysteryTitle', 'mysterySetup', 'imagePrompt', 'clues', 'expectedConcepts', 'solutionExplanation']
    const missingFields = requiredFields.filter(field => !mystery[field])

    if (missingFields.length > 0) {
      logger.error('MYSTERY', 'Missing required fields in mystery', {
        missingFields
      })
      return { error: 'INVALID_RESPONSE' }
    }

    // Validate clues structure
    if (!Array.isArray(mystery.clues) || mystery.clues.length === 0) {
      logger.error('MYSTERY', 'Invalid clues array')
      return { error: 'INVALID_RESPONSE' }
    }

    // Validate expectedConcepts
    if (!Array.isArray(mystery.expectedConcepts) || mystery.expectedConcepts.length === 0) {
      logger.error('MYSTERY', 'Invalid expectedConcepts array')
      return { error: 'INVALID_RESPONSE' }
    }

    logger.info('MYSTERY', 'Mystery generated successfully', {
      title: mystery.mysteryTitle,
      clueCount: mystery.clues.length,
      conceptCount: mystery.expectedConcepts.length
    })

    return mystery
  } catch (error) {
    logger.error('MYSTERY', 'Error generating mystery', {
      error: error.message,
      stack: error.stack
    })

    // Check for rate limiting
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return { error: 'RATE_LIMITED' }
    }

    // Check for API availability
    if (error.message?.includes('503') || error.message?.includes('unavailable')) {
      return { error: 'API_NOT_AVAILABLE' }
    }

    return { error: 'MYSTERY_GENERATION_FAILED' }
  }
}

/**
 * Evaluate user's theory against expected concepts using fuzzy matching
 * @param {Object} params
 * @param {string} params.userTheory - User's spoken/typed theory
 * @param {Array} params.expectedConcepts - Expected concepts to match
 * @returns {Object} Evaluation result
 */
export async function evaluateMysteryTheory({ userTheory, expectedConcepts }) {
  try {
    // Use Gemini to perform semantic matching of concepts
    const prompt = `You are evaluating a child's answer to a detective mystery puzzle.

Expected concepts the child should mention:
${expectedConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Child's theory:
"${userTheory}"

Task: Determine which expected concepts are present in the child's theory using semantic matching (not exact word matching). A concept is "matched" if the child expresses the idea, even if they use different words.

Return JSON format:
{
  "matchedConcepts": ["concept1", "concept2"],
  "hint": "A helpful hint if not all concepts were matched (optional)"
}

Be generous with semantic matching. For example:
- "plants need air" matches "carbon dioxide"
- "can't breathe" matches "sealed environment"
- "no water" matches "dehydration"

Return ONLY the JSON, no other text.`

    logger.info('MYSTERY', 'Evaluating theory with Gemini', {
      model: TEXT_MODEL,
      theoryLength: userTheory.length,
      expectedCount: expectedConcepts.length
    })

    const model = genAI.getGenerativeModel({ model: TEXT_MODEL })
    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Extract and parse JSON
    const jsonData = extractJSON(text)
    if (!jsonData) {
      logger.error('MYSTERY', 'Failed to extract JSON from evaluation response', {
        responseText: text.substring(0, 500)
      })
      return { error: 'PARSE_ERROR' }
    }

    const evaluation = JSON.parse(jsonData)

    // Calculate match rate
    const matchedCount = evaluation.matchedConcepts?.length || 0
    const matchRate = matchedCount / expectedConcepts.length

    // Determine result based on match rate
    let result_type
    let xpEarned

    if (matchRate >= 0.8) {
      // 80%+ concepts matched = solved
      result_type = 'solved'
      xpEarned = 50
    } else if (matchRate >= 0.4) {
      // 40-79% concepts matched = partial
      result_type = 'partial'
      xpEarned = 15
    } else {
      // <40% concepts matched = retry
      result_type = 'retry'
      xpEarned = 5
    }

    logger.info('MYSTERY', 'Theory evaluated', {
      result: result_type,
      matchRate: `${(matchRate * 100).toFixed(0)}%`,
      matchedCount,
      xpEarned
    })

    return {
      result: result_type,
      matchedConcepts: evaluation.matchedConcepts || [],
      xpEarned,
      hint: evaluation.hint || null
    }
  } catch (error) {
    logger.error('MYSTERY', 'Error evaluating theory', {
      error: error.message,
      stack: error.stack
    })

    // Check for rate limiting
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return { error: 'RATE_LIMITED' }
    }

    // Check for API availability
    if (error.message?.includes('503') || error.message?.includes('unavailable')) {
      return { error: 'API_NOT_AVAILABLE' }
    }

    return { error: 'MYSTERY_EVALUATION_FAILED' }
  }
}
