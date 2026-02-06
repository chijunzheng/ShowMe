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

// Keep client init lazy so the backend can boot without an API key.
let aiClient = null
let aiClientKey = null

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null
  }

  // Avoid recreating the client unless the key changed (useful for tests).
  if (aiClient && aiClientKey === apiKey) {
    return aiClient
  }

  try {
    aiClient = new GoogleGenAI({ apiKey })
    aiClientKey = apiKey
    return aiClient
  } catch (error) {
    logger.error('MYSTERY', 'Failed to initialize Gemini client', { error: error.message })
    aiClient = null
    aiClientKey = null
    return null
  }
}

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
    const ai = getAIClient()
    if (!ai) {
      return { error: 'API_NOT_AVAILABLE' }
    }

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
7. 为每条线索添加"narratorText"，使用侦探叙述者的声音（适合TTS朗读）
8. 提供"theoryOptions"用于多选题模式（4个选项，1个正确答案）
9. 提供"fillBlanks"用于填空模式（包含空格的句子和单词库）
10. 提供"evidenceConnections"将线索与概念关联
11. 提供"revealNarration"用于最终戏剧性揭示（侦探风格）

返回JSON格式：
{
  "mysteryTitle": "谜题的简短标题",
  "mysterySetup": "谜题场景（2-3句话）",
  "imagePrompt": "用于生成谜题场景图像的英文描述",
  "clues": [
    {"text": "线索文本", "slideRef": 1, "narratorText": "侦探叙述版本的线索"},
    {"text": "线索文本", "slideRef": 2, "narratorText": "侦探叙述版本的线索"}
  ],
  "expectedConcepts": ["概念1", "概念2"],
  "solutionExplanation": "完整的解决方案说明",
  "theoryOptions": {
    "options": ["理论选项1", "理论选项2", "理论选项3", "理论选项4"],
    "correctIndex": 0
  },
  "fillBlanks": {
    "sentence": "包含___和___的句子",
    "blanks": ["词1", "词2"],
    "wordBank": ["词1", "词2", "干扰词1", "干扰词2"]
  },
  "evidenceConnections": [
    {"clueIndex": 0, "concept": "概念1"},
    {"clueIndex": 1, "concept": "概念2"}
  ],
  "revealNarration": "戏剧性的侦探风格揭示叙述"
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
7. Add "narratorText" for each clue using detective narrator voice (suitable for TTS)
8. Provide "theoryOptions" for multiple-choice mode (4 options, 1 correct)
9. Provide "fillBlanks" for fill-in-the-blank mode (sentence with blanks and word bank)
10. Provide "evidenceConnections" linking clues to concepts
11. Provide "revealNarration" for dramatic final reveal (detective style)

Narrator voice guidelines:
- Use detective storytelling style ("Notice the curious detail...", "The evidence suggests...")
- Make it engaging and mysterious but age-appropriate
- Keep narration concise and clear for TTS

Return JSON format:
{
  "mysteryTitle": "Short catchy title for the mystery",
  "mysterySetup": "The mystery scenario (2-3 sentences)",
  "imagePrompt": "Description for generating mystery scene image (in English)",
  "clues": [
    {"text": "Clue text", "slideRef": 1, "narratorText": "Detective narrator version of clue"},
    {"text": "Clue text", "slideRef": 2, "narratorText": "Detective narrator version of clue"}
  ],
  "expectedConcepts": ["concept1", "concept2"],
  "solutionExplanation": "Full explanation of how the mystery is solved",
  "theoryOptions": {
    "options": ["Theory option 1", "Theory option 2", "Theory option 3", "Theory option 4"],
    "correctIndex": 0
  },
  "fillBlanks": {
    "sentence": "Sentence with ___ and ___ blanks",
    "blanks": ["word1", "word2"],
    "wordBank": ["word1", "word2", "distractor1", "distractor2"]
  },
  "evidenceConnections": [
    {"clueIndex": 0, "concept": "concept1"},
    {"clueIndex": 1, "concept": "concept2"}
  ],
  "revealNarration": "Dramatic detective-style reveal narration"
}`

    logger.info('MYSTERY', 'Generating mystery with Gemini', {
      model: TEXT_MODEL,
      slideCount: slides.length,
      language
    })

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    })
    const text = response.text || ''

    // Extract and parse JSON
    const jsonData = extractJSON(text)
    if (!jsonData) {
      logger.error('MYSTERY', 'Failed to extract JSON from response', {
        responseText: text.substring(0, 500)
      })
      return { error: 'PARSE_ERROR' }
    }

    let mystery
    try {
      mystery = JSON.parse(jsonData)
    } catch (parseError) {
      logger.error('MYSTERY', 'Failed to parse JSON from response', {
        error: parseError.message,
        responseText: text.substring(0, 500)
      })
      return { error: 'PARSE_ERROR' }
    }

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

    // Add fallback defaults for new fields if missing

    // Add narratorText to each clue if missing
    mystery.clues = mystery.clues.map(clue => ({
      ...clue,
      narratorText: clue.narratorText || clue.text
    }))

    // Add default theoryOptions if missing
    if (!mystery.theoryOptions || !Array.isArray(mystery.theoryOptions?.options)) {
      mystery.theoryOptions = {
        options: isZh
          ? ['这个理论看起来合理', '另一个可能的解释', '不太可能的解释', '不可能的解释']
          : ['This theory seems reasonable', 'Another possible explanation', 'Unlikely explanation', 'Impossible explanation'],
        correctIndex: 0
      }
    }

    // Add default fillBlanks if missing
    if (!mystery.fillBlanks || !mystery.fillBlanks.sentence) {
      const firstConcept = mystery.expectedConcepts[0] || (isZh ? '概念' : 'concept')
      const secondConcept = mystery.expectedConcepts[1] || (isZh ? '另一个概念' : 'another concept')
      mystery.fillBlanks = {
        sentence: isZh
          ? `这个谜题涉及___和___。`
          : `This mystery involves ___ and ___.`,
        blanks: [firstConcept, secondConcept],
        wordBank: [firstConcept, secondConcept, isZh ? '干扰词' : 'distractor']
      }
    }

    // Add default evidenceConnections if missing
    if (!Array.isArray(mystery.evidenceConnections) || mystery.evidenceConnections.length === 0) {
      mystery.evidenceConnections = mystery.clues.map((clue, index) => ({
        clueIndex: index,
        concept: mystery.expectedConcepts[0] || (isZh ? '概念' : 'concept')
      }))
    }

    // Add default revealNarration if missing
    if (!mystery.revealNarration) {
      mystery.revealNarration = mystery.solutionExplanation
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

    // Check for API availability / auth issues
    if (
      error.message?.includes('401') ||
      error.message?.includes('403') ||
      error.message?.toLowerCase()?.includes('api key') ||
      error.message?.toLowerCase()?.includes('permission') ||
      error.message?.includes('503') ||
      error.message?.toLowerCase()?.includes('unavailable')
    ) {
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
    const ai = getAIClient()
    if (!ai) {
      return { error: 'API_NOT_AVAILABLE' }
    }

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

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    })
    const text = response.text || ''

    // Extract and parse JSON
    const jsonData = extractJSON(text)
    if (!jsonData) {
      logger.error('MYSTERY', 'Failed to extract JSON from evaluation response', {
        responseText: text.substring(0, 500)
      })
      return { error: 'PARSE_ERROR' }
    }

    let evaluation
    try {
      evaluation = JSON.parse(jsonData)
    } catch (parseError) {
      logger.error('MYSTERY', 'Failed to parse JSON from evaluation response', {
        error: parseError.message,
        responseText: text.substring(0, 500)
      })
      return { error: 'PARSE_ERROR' }
    }

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

    // Check for API availability / auth issues
    if (
      error.message?.includes('401') ||
      error.message?.includes('403') ||
      error.message?.toLowerCase()?.includes('api key') ||
      error.message?.toLowerCase()?.includes('permission') ||
      error.message?.includes('503') ||
      error.message?.toLowerCase()?.includes('unavailable')
    ) {
      return { error: 'API_NOT_AVAILABLE' }
    }

    return { error: 'MYSTERY_EVALUATION_FAILED' }
  }
}
