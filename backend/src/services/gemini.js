/**
 * Gemini AI Service Module
 * F016: Real AI-generated educational diagrams
 * F017: Real TTS audio narration
 * F027a: Speech-to-text transcription
 *
 * Provides functions to generate educational content using Google's Gemini API:
 * - generateScript: Creates slide scripts with educational content
 * - generateEducationalImage: Creates diagrams/visuals for slides
 * - generateTTS: Converts text to speech audio
 * - transcribeAudio: Converts speech audio to text
 */

import { GoogleGenAI } from '@google/genai'

// Configuration constants
const TEXT_MODEL = 'gemini-3-flash-preview'
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'
const IMAGE_MODEL_FALLBACKS = [
  'gemini-2.5-flash-image',
]

const FAST_MODEL = 'gemini-2.5-flash-lite'
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const TTS_FALLBACK_MODEL = 'gemini-2.5-pro-preview-tts'

// Default TTS voice - Kore is a clear, engaging voice suitable for education
const DEFAULT_VOICE = 'Kore'

/**
 * Detect the primary language of a text based on character analysis.
 * Used to generate content in the same language as the user's query.
 * @param {string} text - The text to analyze
 * @returns {string} Language code: 'zh' for Chinese, 'en' for English (default)
 */
export function detectLanguage(text) {
  if (!text) return 'en'

  // Chinese character range (CJK Unified Ideographs)
  const chineseRegex = /[\u4e00-\u9fff]/
  const hasChineseChars = chineseRegex.test(text)

  if (hasChineseChars) return 'zh'
  return 'en'
}

/**
 * Extract JSON from text that may be wrapped in markdown code blocks
 * Handles various formats returned by different Gemini models
 * @param {string} text - Raw text response from Gemini
 * @returns {string} Extracted JSON string ready for parsing
 */
function extractJSON(text) {
  if (!text) return '{}'

  // Debug: log first 50 chars and their char codes
  const preview = text.substring(0, 50)
  const charCodes = [...preview].map(c => c.charCodeAt(0))
  console.log('[extractJSON] First 50 chars:', JSON.stringify(preview))
  console.log('[extractJSON] Char codes:', charCodes.slice(0, 20))

  // Method 1: Match ```json ... ``` anywhere (no $ anchor - allows trailing content)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    const extracted = codeBlockMatch[1].trim()
    console.log('[extractJSON] Matched code block, extracted length:', extracted.length)
    return extracted
  }

  // Method 1b: Handle truncated response - starts with ```json but no closing ```
  if (text.startsWith('```')) {
    // Skip opening fence and optional 'json' label
    let startIdx = 3
    if (text.slice(startIdx, startIdx + 4).toLowerCase() === 'json') {
      startIdx += 4
    }
    // Skip whitespace
    while (startIdx < text.length && /\s/.test(text[startIdx])) {
      startIdx++
    }
    const remaining = text.slice(startIdx).trim()
    console.log('[extractJSON] Truncated code block, extracting from position:', startIdx)

    // Try to find JSON content
    const firstBraceInRemaining = remaining.indexOf('{')
    if (firstBraceInRemaining !== -1) {
      const lastBraceInRemaining = remaining.lastIndexOf('}')
      if (lastBraceInRemaining > firstBraceInRemaining) {
        console.log('[extractJSON] Truncated: brace extraction from remaining')
        return remaining.slice(firstBraceInRemaining, lastBraceInRemaining + 1)
      } else {
        // No closing brace found - extract partial JSON for repairJSON to complete
        console.log('[extractJSON] Truncated: no closing brace, extracting partial JSON')
        return remaining.slice(firstBraceInRemaining)
      }
    }
  }

  // Method 2: Find balanced braces for JSON object
  const firstBrace = text.indexOf('{')
  if (firstBrace !== -1) {
    let depth = 0
    let inString = false
    let escapeNext = false

    for (let i = firstBrace; i < text.length; i++) {
      const char = text[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\' && inString) {
        escapeNext = true
        continue
      }

      if (char === '"' && !escapeNext) {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{') depth++
        else if (char === '}') {
          depth--
          if (depth === 0) {
            console.log('[extractJSON] Balanced brace extraction from', firstBrace, 'to', i)
            return text.slice(firstBrace, i + 1)
          }
        }
      }
    }

    // No balanced closing brace - extract partial JSON for repairJSON to complete
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace > firstBrace) {
      console.log('[extractJSON] Fallback brace extraction from', firstBrace, 'to', lastBrace)
      return text.slice(firstBrace, lastBrace + 1)
    } else {
      console.log('[extractJSON] No closing brace, extracting partial JSON from', firstBrace)
      return text.slice(firstBrace)
    }
  }

  console.log('[extractJSON] No extraction matched, returning raw text')
  return text.trim()
}

/**
 * Complete truncated JSON by adding missing closing brackets and braces
 * @param {string} jsonStr - Potentially truncated JSON string
 * @returns {string} JSON string with proper closing structure
 */
function completeJSONStructure(jsonStr) {
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escapeNext = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{') braceCount++
      else if (char === '}') braceCount--
      else if (char === '[') bracketCount++
      else if (char === ']') bracketCount--
    }
  }

  // Handle unclosed string
  if (inString) {
    jsonStr += '"'
    console.log('[repairJSON] Added closing quote for unclosed string')
  }

  // Add missing closing brackets and braces
  while (bracketCount > 0) {
    jsonStr += ']'
    bracketCount--
    console.log('[repairJSON] Added closing bracket')
  }
  while (braceCount > 0) {
    jsonStr += '}'
    braceCount--
    console.log('[repairJSON] Added closing brace')
  }

  return jsonStr
}

/**
 * Attempt to repair common JSON issues from LLM output
 * @param {string} jsonStr - JSON string that may have issues
 * @returns {string} Repaired JSON string
 */
function repairJSON(jsonStr) {
  let repaired = jsonStr

  // Remove BOM and invisible characters at start
  repaired = repaired.replace(/^\uFEFF/, '')

  // Replace smart/curly quotes with straight quotes
  repaired = repaired.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
  repaired = repaired.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")

  // Remove trailing commas before ] or }
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  // Remove JavaScript-style comments
  repaired = repaired.replace(/\/\/[^\n]*/g, '')
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '')

  // Convert literal escape sequences OUTSIDE of strings to actual whitespace
  // This fixes cases where Gemini outputs literal \n between JSON tokens
  // (which is invalid - escape sequences are only valid inside quoted strings)
  let result = ''
  let inString = false
  let i = 0

  while (i < repaired.length) {
    const char = repaired[i]
    const nextChar = repaired[i + 1]

    // Handle escape sequences inside strings - preserve them as-is
    if (inString && char === '\\') {
      result += char
      if (nextChar) {
        result += nextChar
        i += 2
      } else {
        i++
      }
      continue
    }

    // Track string boundaries
    if (char === '"') {
      inString = !inString
      result += char
      i++
      continue
    }

    // Outside string: convert literal escape sequences to actual whitespace chars
    if (!inString && char === '\\' && nextChar) {
      if (nextChar === 'n') {
        result += '\n'
        i += 2
        continue
      }
      if (nextChar === 't') {
        result += '\t'
        i += 2
        continue
      }
      if (nextChar === 'r') {
        result += '\r'
        i += 2
        continue
      }
      // Remove other invalid escapes outside strings
      result += nextChar
      i += 2
      continue
    }

    result += char
    i++
  }
  repaired = result

  // Complete truncated JSON by adding missing brackets/braces
  repaired = completeJSONStructure(repaired)

  return repaired
}

// Initialize the Google GenAI client
// Uses GEMINI_API_KEY from environment if not explicitly provided
let aiClient = null

/**
 * Get or initialize the Gemini AI client
 * Lazily initializes to allow startup without API key for mock mode
 * @returns {GoogleGenAI|null} The AI client or null if no API key
 */
function getAIClient() {
  if (aiClient) {
    return aiClient
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.warn('[Gemini] No valid API key found. AI features will use mock data.')
    return null
  }

  try {
    aiClient = new GoogleGenAI({ apiKey })
    console.log('[Gemini] AI client initialized successfully')
    return aiClient
  } catch (error) {
    console.error('[Gemini] Failed to initialize AI client:', error.message)
    return null
  }
}


/**
 * Check if Gemini API is available
 * @returns {boolean} True if API key is configured and client is ready
 */
export function isGeminiAvailable() {
  return getAIClient() !== null
}

/**
 * Explanation level definitions for adjusting content complexity
 * - simple: Everyday language, analogies, shorter sentences, for curious beginners
 * - standard: Balanced with key concepts and some technical terms (default)
 * - deep: Technical depth, proper terminology, comprehensive coverage
 */
const EXPLANATION_LEVEL_INSTRUCTIONS = {
  simple: `
EXPLANATION LEVEL: SIMPLE
- Use everyday language that anyone can understand - avoid jargon completely
- Explain concepts using analogies and relatable comparisons (e.g., "Think of it like...")
- Keep sentences short and ideas simple
- Like explaining to a curious friend or a younger person
- Focus on the core "what" and "why" without technical details
- Use concrete, familiar examples from daily life`,

  standard: `
EXPLANATION LEVEL: STANDARD
- Use balanced language with key concepts and some technical terms
- Include proper terminology but explain it when introduced
- Suitable for general audiences (ages 10+)
- Provide context and examples to support understanding`,

  deep: `
EXPLANATION LEVEL: DEEP
- Provide technical depth and nuanced explanations
- Use proper terminology throughout, with brief explanations for specialized terms
- Include more detailed, comprehensive coverage of the topic
- Cover underlying mechanisms, exceptions, and edge cases
- For users who want thorough, expert-level understanding
- Include relevant scientific or technical context where appropriate`,
}

/**
 * Image style instructions for different explanation levels
 */
const IMAGE_LEVEL_INSTRUCTIONS = {
  simple: `
- Keep visuals very simple and uncluttered
- Use fewer elements and larger text labels
- Emphasize key concepts with simple icons or symbols
- Avoid complex diagrams - prefer single-concept illustrations
- Use bright, friendly colors`,

  standard: `
- Clean, professional educational illustration style
- Moderate level of detail with clear labels
- Use multiple elements if needed to explain the concept
- Balance visual complexity with clarity`,

  deep: `
- Include more detailed and comprehensive diagrams
- Show multiple components, relationships, or steps
- Include technical labels and annotations
- Can use more sophisticated visualization types (flowcharts, system diagrams)
- Show interconnections and dependencies between elements`,
}

/**
 * Generate an educational script with slides based on a user query
 *
 * @param {string} query - The user's question or topic
 * @param {Object} options - Generation options
 * @param {Array} options.conversationHistory - Previous conversation context
 * @param {boolean} options.isFollowUp - Whether this is a follow-up question
 * @param {string} options.explanationLevel - Level of explanation: 'simple', 'standard', or 'deep'
 * @returns {Promise<{slides: Array<{subtitle: string, imagePrompt: string}>, error: string|null}>}
 */
async function generateScriptWithModel(ai, prompt, model, fallbackTopic) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    })

    const text = response.text || ''

    // Extract JSON from the response (handle markdown code blocks)
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error('Invalid response format: missing slides array')
    }

    // Validate each slide has required fields
    const validSlides = parsed.slides.map((slide, index) => ({
      // Strip markdown formatting from subtitles (they're spoken by TTS)
      subtitle: (slide.subtitle || `Slide ${index + 1}`).replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1'),
      imagePrompt: slide.imagePrompt || `Educational diagram about ${fallbackTopic}`,
      ...(slide.isConclusion && { isConclusion: true })
    }))

    return { slides: validSlides, error: null }
  } catch (error) {
    console.error('[Gemini] Script generation error:', error.message)

    // Handle specific error types
    if (error.message?.includes('JSON')) {
      return { slides: null, error: 'PARSE_ERROR' }
    }
    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { slides: null, error: 'RATE_LIMITED' }
    }

    return { slides: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

export async function generateScript(query, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { slides: null, error: 'API_NOT_AVAILABLE' }
  }

  const { conversationHistory = [], isFollowUp = false, explanationLevel = 'standard', language = 'en', complexity = 'simple' } = options

  // Validate and normalize explanation level
  const validLevels = ['simple', 'standard', 'deep']
  const normalizedLevel = validLevels.includes(explanationLevel) ? explanationLevel : 'standard'

  // Get level-specific instructions
  const levelInstructions = EXPLANATION_LEVEL_INSTRUCTIONS[normalizedLevel]
  const imageLevelInstructions = IMAGE_LEVEL_INSTRUCTIONS[normalizedLevel]

  // Construct context-aware slide count guidance (CORE032)
  let slideCountGuidance = ''
  if (isFollowUp) {
    slideCountGuidance = `
CONTEXT: This is a follow-up request with complexity: "${complexity.toUpperCase()}".
- Adjust the number of slides and depth of explanation based on this complexity.
- "trivial": Just 1 very simple slide.
- "simple": 1 slide with clear explanation.
- "moderate": 2-3 slides to explain the concept.
- "complex": 3-4 slides to cover the broader scope.`
  } else {
    slideCountGuidance = normalizedLevel === 'simple'
    ? `- Create 3-4 content slides (keep it concise and digestible)`
    : normalizedLevel === 'deep'
    ? `- Create 4-6 content slides to cover the topic thoroughly:
  - More slides allow for deeper exploration of each aspect`
    : `- Create 3-5 content slides based on topic complexity:
  - Simple concepts (definitions, basic facts): 3 slides
  - Moderate topics (processes, comparisons): 4 slides
  - Complex topics (multi-step systems, deep explanations): 5 slides`
  }

  // Language instruction for non-English queries
  const languageInstruction = language === 'zh'
    ? `\nLANGUAGE REQUIREMENT: The user asked their question in Chinese. You MUST generate ALL content in Simplified Chinese (简体中文):
- All subtitles must be written in Chinese
- All image prompts must describe diagrams with Chinese text labels
- Maintain natural, educational Chinese suitable for learning\n`
    : ''

  const systemPrompt = `You are an expert educational content creator for a visual learning app.
Your task is to create a script for an educational slideshow that explains topics clearly.
${levelInstructions}
${languageInstruction}
Guidelines:
${slideCountGuidance}
- Each slide should have a clear, concise explanation (2-3 sentences max)
- Include an image prompt describing what educational diagram/visual should accompany each slide
- For follow-up questions, build on previous context without repeating it

IMAGE PROMPT STYLE:
${imageLevelInstructions}

NARRATION STYLE - Write like a human presenter naturally explaining a slide:
The subtitles will be read aloud by TTS. Write them as if you are a friendly, engaging presenter pointing at a diagram and explaining it to a curious learner. NOT like a textbook or formal document.

DO use:
- Deictic references to the visual: "See this part here...", "Notice how...", "Look at this...", "Right here you can see..."
- Natural transitions: "So here's the thing...", "Now, what happens next is...", "And this is where it gets interesting..."
- Rhetorical questions: "But wait, how does that work?", "So why does this matter?"
- Brief pauses for emphasis: "And that... is what makes it special", "The key here... is the connection"
- Reference specific parts of the diagram: "This arrow shows...", "The blue section represents...", "Over on the left side..."
- Conversational connectors: "Okay, so...", "Now here's the cool part...", "Think of it this way..."

DO NOT use:
- Formal, textbook language: "It is important to note that..."
- Passive voice: "The process is initiated by..."
- Stiff academic phrasing: "One must consider..." or "It should be observed that..."
- Abstract statements without visual connection: "Photosynthesis is a process whereby..."

Examples:
BAD (robotic): "Photosynthesis is the process by which plants convert sunlight into energy. Chlorophyll absorbs light in the chloroplasts."
GOOD (human): "See how the leaf takes in sunlight? Right here in these tiny parts called chloroplasts... that's where the magic happens. The green stuff, chlorophyll, basically catches the light like a solar panel."

BAD (robotic): "The water cycle consists of evaporation, condensation, and precipitation phases."
GOOD (human): "Okay, so look at this cycle. Water goes up... that's evaporation. Then notice these clouds forming? The water's cooling down and condensing. And then... it falls back down as rain."

IMPORTANT: Always end with a CONCLUSION slide that:
- Summarizes 2-3 key takeaways from the explanation
- Uses a conversational "key takeaways" format in the subtitle
- Has isConclusion: true to mark it as the final summary

CRITICAL: Subtitles are spoken aloud by TTS. Do NOT use markdown formatting (no **bold**, *italics*, or other markup). Write plain text only.

Output Format (JSON):
{
  "slides": [
    {
      "subtitle": "Conversational explanation text that sounds natural when spoken aloud",
      "imagePrompt": "Description of educational diagram showing [concept], with labeled parts including [details]. Style: clean, colorful educational illustration."
    },
    {
      "subtitle": "Alright, let's wrap this up. First thing to remember... [key point 1]. Second... [key point 2]. And the big takeaway? [key point 3].",
      "imagePrompt": "Summary infographic with three key points highlighted in boxes or icons. Clean, minimal design with bullet points.",
      "isConclusion": true
    }
  ]
}

Important: Image prompts should describe detailed educational diagrams with labels, arrows, and clear visual representations. Do not describe photos or realistic images - focus on diagrams, charts, and illustrated explanations.`

  const contextPart = conversationHistory.length > 0
    ? `\n\nPrevious context: ${conversationHistory.map(h => h.query).join(' -> ')}`
    : ''

  const userPrompt = isFollowUp
    ? `Follow-up question: ${query}${contextPart}`
    : `Question: ${query}`

  const prompt = systemPrompt + '\n\n' + userPrompt
  const primaryResult = await generateScriptWithModel(ai, prompt, TEXT_MODEL, query)

  if (!primaryResult.error) {
    return primaryResult
  }

  const fallbackResult = await generateScriptWithModel(ai, prompt, FAST_MODEL, query)
  if (!fallbackResult.error) {
    console.warn('[Gemini] Script generation fell back to fast model')
    return fallbackResult
  }

  return primaryResult
}

/**
 * Generate an educational diagram/image based on a prompt
 *
 * @param {string} imagePrompt - Description of the image to generate
 * @param {Object} options - Generation options
 * @param {string} options.topic - The overall topic for context
 * @param {string} options.explanationLevel - Level of visual complexity: 'simple', 'standard', or 'deep'
 * @param {string} options.language - Language code for text labels: 'en' or 'zh'
 * @returns {Promise<{imageUrl: string|null, error: string|null}>}
 */
export async function generateEducationalImage(imagePrompt, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { imageUrl: null, error: 'API_NOT_AVAILABLE' }
  }

  const { topic = '', explanationLevel = 'standard', language = 'en' } = options

  // Validate and normalize explanation level
  const validLevels = ['simple', 'standard', 'deep']
  const normalizedLevel = validLevels.includes(explanationLevel) ? explanationLevel : 'standard'

  // Get level-specific image style instructions
  const levelStyleInstructions = IMAGE_LEVEL_INSTRUCTIONS[normalizedLevel]

  // Language-specific instruction for text labels
  const languageInstruction = language === 'zh'
    ? '- IMPORTANT: All text labels, annotations, and captions on the diagram must be in Simplified Chinese (简体中文)'
    : ''

  // Enhance the prompt for better educational diagrams
  const enhancedPrompt = `Create an educational diagram illustration: ${imagePrompt}

Style requirements:
${levelStyleInstructions}
- No photorealistic elements - use illustrated/diagrammatic style
- White or light colored background for clarity
${languageInstruction}
${topic ? `- Topic context: ${topic}` : ''}`

  let lastError = null

  for (const model of [IMAGE_MODEL, ...IMAGE_MODEL_FALLBACKS]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: enhancedPrompt,
        config: {
          responseModalities: ['IMAGE'],
        }
      })

      // Extract image data from response
      const parts = response.candidates?.[0]?.content?.parts || []

      for (const part of parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png'
          const base64Data = (part.inlineData.data || '').replace(/\s/g, '')
          const imageUrl = `data:${mimeType};base64,${base64Data}`
          return { imageUrl, error: null }
        }
      }
    } catch (error) {
      lastError = error.message || 'UNKNOWN_ERROR'
      console.warn('[Gemini] generateContent image failed, trying next model:', {
        model,
        error: error.message,
      })
    }
  }

  if (lastError?.includes('quota') || lastError?.includes('rate')) {
    return { imageUrl: null, error: 'RATE_LIMITED' }
  }
  if (lastError?.includes('safety') || lastError?.includes('blocked')) {
    return { imageUrl: null, error: 'CONTENT_FILTERED' }
  }

  return { imageUrl: null, error: lastError || 'NO_IMAGE_GENERATED' }
}

function normalizeTtsError(error) {
  const message = error?.message || ''
  if (message.includes('quota') || message.includes('rate') || message.includes('429')) {
    return 'RATE_LIMITED'
  }
  return message || 'UNKNOWN_ERROR'
}

function extractInlineAudio(response) {
  const resolved = response?.response || response
  const parts = resolved?.candidates?.[0]?.content?.parts || []

  for (const part of parts) {
    if (part?.inlineData?.data) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      }
    }
  }

  return null
}

function estimatePcmDurationMs(pcmBuffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const bytesPerSample = bitsPerSample / 8
  const totalSamples = pcmBuffer.length / bytesPerSample / numChannels
  return Math.round((totalSamples / sampleRate) * 1000)
}

function estimateWavDurationMs(wavBuffer) {
  if (wavBuffer.length < 44) {
    return 0
  }

  if (wavBuffer.toString('ascii', 0, 4) !== 'RIFF' || wavBuffer.toString('ascii', 8, 12) !== 'WAVE') {
    return 0
  }

  let offset = 12
  let sampleRate = null
  let numChannels = null
  let bitsPerSample = null
  let dataSize = null

  while (offset + 8 <= wavBuffer.length) {
    const chunkId = wavBuffer.toString('ascii', offset, offset + 4)
    const chunkSize = wavBuffer.readUInt32LE(offset + 4)

    if (chunkId === 'fmt ' && offset + 24 <= wavBuffer.length) {
      numChannels = wavBuffer.readUInt16LE(offset + 10)
      sampleRate = wavBuffer.readUInt32LE(offset + 12)
      bitsPerSample = wavBuffer.readUInt16LE(offset + 22)
    } else if (chunkId === 'data') {
      dataSize = chunkSize
      break
    }

    offset += 8 + chunkSize
    if (chunkSize % 2 === 1) {
      offset += 1
    }
  }

  if (!sampleRate || !numChannels || !bitsPerSample || !dataSize) {
    return 0
  }

  const bytesPerSample = bitsPerSample / 8
  const durationSeconds = dataSize / (sampleRate * numChannels * bytesPerSample)
  return Math.round(durationSeconds * 1000)
}

function buildAudioResult(inlineData) {
  if (!inlineData?.data) {
    return { audioUrl: null, duration: 0, error: 'NO_AUDIO_GENERATED' }
  }

  const mimeType = inlineData.mimeType || 'audio/pcm'
  const normalizedMimeType = mimeType.split(';')[0].trim().toLowerCase()
  const audioBuffer = Buffer.from(inlineData.data, 'base64')

  if (
    !normalizedMimeType ||
    normalizedMimeType === 'audio/pcm' ||
    normalizedMimeType === 'audio/l16' ||
    normalizedMimeType === 'audio/x-l16' ||
    normalizedMimeType === 'audio/raw'
  ) {
    const wavBuffer = pcmToWav(audioBuffer, 24000, 1, 16)
    const audioUrl = `data:audio/wav;base64,${wavBuffer.toString('base64')}`
    const duration = estimatePcmDurationMs(audioBuffer)
    return { audioUrl, duration, error: null }
  }

  if (normalizedMimeType === 'audio/wav' || normalizedMimeType === 'audio/x-wav') {
    const duration = estimateWavDurationMs(audioBuffer)
    const audioUrl = `data:${mimeType};base64,${inlineData.data}`
    return { audioUrl, duration, error: null }
  }

  const audioUrl = `data:${mimeType};base64,${inlineData.data}`
  return { audioUrl, duration: 0, error: null }
}

async function generateTtsWithGenAI(ai, model, prompt, voice) {
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    })

    const inlineData = extractInlineAudio(response)
    return buildAudioResult(inlineData)
  } catch (error) {
    console.error('[Gemini] TTS generation error:', error.message)
    return { audioUrl: null, duration: 0, error: normalizeTtsError(error) }
  }
}


/**
 * Generate TTS audio from text
 *
 * @param {string} text - The text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.voice - Voice name to use (default: Kore)
 * @param {string} options.language - Language code: 'en' or 'zh' (affects speaking prompt)
 * @returns {Promise<{audioUrl: string|null, duration: number, error: string|null}>}
 */
export async function generateTTS(text, options = {}) {
  const { voice = DEFAULT_VOICE, language = 'en' } = options

  // Prepare text with speaking instructions for natural delivery
  // Use language-appropriate prompt for better TTS quality
  const speakingPrompt = language === 'zh'
    ? `用清晰、生动的方式朗读以下内容，就像在教导一个好奇的学生: ${text}`
    : `Speak clearly and engagingly, as if teaching a curious student: ${text}`

  const ai = getAIClient()
  if (!ai) {
    return { audioUrl: null, duration: 0, error: 'API_NOT_AVAILABLE' }
  }

  // Try primary TTS model
  const primaryResult = await generateTtsWithGenAI(ai, TTS_MODEL, speakingPrompt, voice)
  if (!primaryResult.error) {
    return primaryResult
  }
  if (primaryResult.error === 'RATE_LIMITED') {
    return primaryResult
  }

  // Fallback to preview model if primary fails
  const fallbackResult = await generateTtsWithGenAI(ai, TTS_FALLBACK_MODEL, speakingPrompt, voice)
  if (!fallbackResult.error) {
    console.warn('[Gemini] TTS fell back to preview model')
    return fallbackResult
  }

  return primaryResult
}

/**
 * Convert raw PCM data to WAV format
 * PCM format from Gemini: 24kHz sample rate, 16-bit depth, mono
 *
 * @param {Buffer} pcmData - Raw PCM audio data
 * @param {number} sampleRate - Sample rate in Hz (default: 24000)
 * @param {number} numChannels - Number of channels (default: 1 for mono)
 * @param {number} bitsPerSample - Bits per sample (default: 16)
 * @returns {Buffer} WAV file buffer
 */
function pcmToWav(pcmData, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmData.length
  const headerSize = 44
  const fileSize = headerSize + dataSize - 8

  const buffer = Buffer.alloc(headerSize + dataSize)
  let offset = 0

  // RIFF header
  buffer.write('RIFF', offset); offset += 4
  buffer.writeUInt32LE(fileSize, offset); offset += 4
  buffer.write('WAVE', offset); offset += 4

  // fmt subchunk
  buffer.write('fmt ', offset); offset += 4
  buffer.writeUInt32LE(16, offset); offset += 4 // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, offset); offset += 2  // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, offset); offset += 2
  buffer.writeUInt32LE(sampleRate, offset); offset += 4
  buffer.writeUInt32LE(byteRate, offset); offset += 4
  buffer.writeUInt16LE(blockAlign, offset); offset += 2
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2

  // data subchunk
  buffer.write('data', offset); offset += 4
  buffer.writeUInt32LE(dataSize, offset); offset += 4

  // Copy PCM data
  pcmData.copy(buffer, offset)

  return buffer
}

/**
 * Generate a complete slide with image and audio in parallel
 * This is a convenience function that combines image and TTS generation
 *
 * @param {Object} slideScript - The slide script object
 * @param {string} slideScript.subtitle - Text to be spoken
 * @param {string} slideScript.imagePrompt - Description for image generation
 * @param {Object} options - Generation options
 * @param {boolean} options.generateAudio - Whether to generate TTS audio (default: true)
 * @param {string} options.topic - The overall topic for context
 * @param {string} options.explanationLevel - Level of visual complexity: 'simple', 'standard', or 'deep'
 * @param {string} options.language - Language code for content: 'en' or 'zh'
 * @returns {Promise<{imageUrl: string|null, audioUrl: string|null, duration: number, errors: Array}>}
 */
export async function generateSlideContent(slideScript, options = {}) {
  const { subtitle, imagePrompt } = slideScript
  const { generateAudio = true, ...contentOptions } = options
  const errors = []

  // Generate image and audio in parallel for faster response
  const audioPromise = generateAudio
    ? generateTTS(subtitle, contentOptions)
    : Promise.resolve({ audioUrl: null, duration: 0, error: null })

  const [imageResult, audioResult] = await Promise.all([
    generateEducationalImage(imagePrompt, contentOptions),
    audioPromise
  ])

  if (imageResult.error) {
    errors.push({ type: 'image', error: imageResult.error })
  }
  if (audioResult.error) {
    errors.push({ type: 'audio', error: audioResult.error })
  }

  return {
    imageUrl: imageResult.imageUrl,
    audioUrl: audioResult.audioUrl,
    duration: audioResult.duration || 5000, // Default 5s if no duration
    errors
  }
}

/**
 * Generate engagement content (fun fact + suggested questions)
 * Uses the text model to create relevant engagement content
 *
 * @param {string} query - The user's question
 * @param {string} explanationLevel - The explanation level: 'simple', 'standard', or 'deep'
 * @returns {Promise<{funFact: Object|null, suggestedQuestions: Array|null, error: string|null}>}
 */
export async function generateEngagement(query, explanationLevel = 'standard') {
  const ai = getAIClient()
  if (!ai) {
    return { funFact: null, suggestedQuestions: null, error: 'API_NOT_AVAILABLE' }
  }

  // Normalize level
  const normalizedLevel = ['simple', 'standard', 'deep'].includes(explanationLevel)
    ? explanationLevel
    : 'standard'

  // Level-specific instructions for fun facts
  const levelInstructions = {
    simple: `Use simple, everyday language. The fun fact should be easy to understand for anyone, like explaining to a curious friend. Avoid technical terms.`,
    standard: `Use balanced language suitable for general audiences. Some terminology is okay if it's commonly known.`,
    deep: `You can include technical details and precise terminology. The audience wants depth and nuance.`,
  }

  const prompt = `Based on the user's question "${query}", provide:
1. One surprising, fascinating fun fact
2. Three follow-up questions that would help deepen understanding

IMPORTANT FOR FUN FACT:
- Do NOT explain the core concept of the question - that will be covered in the main content
- Instead, provide a TANGENTIAL fun fact: historical origin, surprising application, unusual connection, or interesting trivia
- The fact should be related to the topic but reveal something unexpected, not explain the basics
- Examples of good tangential facts:
  * For "How does WiFi work?" → "WiFi was partly invented by actress Hedy Lamarr during WWII" (history, not how it works)
  * For "What is DNA?" → "If you uncoiled all the DNA in your body, it would stretch to Pluto and back" (surprising scale, not what DNA does)
  * For "How do airplanes fly?" → "The Wright brothers' first flight was shorter than a Boeing 747's wingspan" (comparison, not lift physics)

${levelInstructions[normalizedLevel]}

Output Format (JSON):
{
  "funFact": {
    "emoji": "single relevant emoji",
    "text": "The tangential fun fact (1-2 sentences)"
  },
  "suggestedQuestions": [
    "Question 1?",
    "Question 2?",
    "Question 3?"
  ]
}`

  const generateWithModel = async (model) => {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        temperature: 0.8,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    const funFact = parsed.funFact && typeof parsed.funFact.text === 'string'
      ? parsed.funFact
      : null
    const suggestedQuestions = Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions
      : null

    return {
      funFact,
      suggestedQuestions,
      error: funFact && suggestedQuestions ? null : 'INVALID_RESPONSE'
    }
  }

  const modelsToTry = [FAST_MODEL, TEXT_MODEL]
  let lastError = 'UNKNOWN_ERROR'

  for (const model of modelsToTry) {
    try {
      const result = await generateWithModel(model)
      if (!result.error) {
        return result
      }
      lastError = result.error
    } catch (error) {
      console.error('[Gemini] Engagement generation error:', error.message)
      if (error.message?.includes('JSON')) {
        lastError = 'PARSE_ERROR'
      } else if (error.message?.includes('quota') || error.message?.includes('rate')) {
        lastError = 'RATE_LIMITED'
      } else {
        lastError = error.message || 'UNKNOWN_ERROR'
      }
    }
  }

  return { funFact: null, suggestedQuestions: null, error: lastError }
}

/**
 * Generate a short chitchat response for small-talk queries.
 *
 * @param {string} query - The user's message
 * @param {Object} options - Optional context
 * @param {string} options.activeTopicName - Current topic name for context
 * @returns {Promise<{responseText: string|null, error: string|null}>}
 */
export async function generateChitchatResponse(query, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { responseText: null, error: 'API_NOT_AVAILABLE' }
  }

  const { activeTopicName = '' } = options
  const topicContext = activeTopicName
    ? `The current topic is "${activeTopicName}". If it helps, you may invite the user to continue it.`
    : 'No active topic is set.'

  const prompt = `You are a friendly AI tutor in a voice-first learning app.
The user said: "${query}"

Respond in 1-2 short sentences (max 30 words). Be warm and concise.
If the user greets you, greet back and ask what they want to learn.
If they thank you, acknowledge and invite another question.
If they ask what you can do, explain you can generate slides and teach topics.
Do not start a lesson, and do not suggest slide content.
${topicContext}

Return plain text only.`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 120,
      }
    })

    const responseText = response.text?.trim() || ''
    if (!responseText) {
      return { responseText: null, error: 'EMPTY_RESPONSE' }
    }

    return { responseText, error: null }
  } catch (error) {
    console.error('[Gemini] Chitchat generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { responseText: null, error: 'RATE_LIMITED' }
    }

    return { responseText: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Transcribe audio to text using Gemini's multimodal capabilities
 * F027a: Backend STT endpoint
 *
 * @param {Buffer|string} audioData - Audio data as Buffer or base64 string
 * @param {string} mimeType - MIME type of the audio (e.g., 'audio/webm', 'audio/wav')
 * @returns {Promise<{transcription: string|null, error: string|null}>}
 */
export async function transcribeAudio(audioData, mimeType) {
  const ai = getAIClient()
  if (!ai) {
    return { transcription: null, error: 'API_NOT_AVAILABLE' }
  }

  // Validate inputs
  if (!audioData) {
    return { transcription: null, error: 'EMPTY_AUDIO' }
  }

  if (!mimeType) {
    return { transcription: null, error: 'MISSING_MIME_TYPE' }
  }

  // Convert Buffer to base64 if needed
  const base64Data = Buffer.isBuffer(audioData)
    ? audioData.toString('base64')
    : audioData

  // Validate we have actual content
  if (!base64Data || base64Data.length === 0) {
    return { transcription: null, error: 'EMPTY_AUDIO' }
  }

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            {
              text: 'Transcribe the speech in this audio. Return ONLY the transcribed text, nothing else. If the audio is silent or contains no speech, return an empty string.',
            },
          ],
        },
      ],
      config: {
        temperature: 0.1, // Low temperature for accurate transcription
        maxOutputTokens: 1024,
      },
    })

    const transcription = response.text?.trim() || ''

    return { transcription, error: null }
  } catch (error) {
    console.error('[Gemini] Transcription error:', error.message)

    // Handle specific error types
    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { transcription: null, error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
      return { transcription: null, error: 'INVALID_AUDIO' }
    }

    return { transcription: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate a verbal-only response for a slide question
 * CORE023, CORE024: Answers questions about the current slide and suggests highlight position
 *
 * @param {string} query - The user's question about the current slide
 * @param {Object} slideContext - Context about the current slide
 * @param {string} slideContext.subtitle - The narration/subtitle text of the current slide
 * @param {string} slideContext.topicName - The topic name for context
 * @returns {Promise<{response: string, highlight: {x: number, y: number}|null, audioUrl: string|null, duration: number, error: string|null}>}
 */
export async function generateSlideResponse(query, slideContext = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { response: null, highlight: null, audioUrl: null, duration: 0, error: 'API_NOT_AVAILABLE' }
  }

  const { subtitle = '', topicName = '' } = slideContext

  // Build context for the LLM to understand what's being shown
  const prompt = `You are an educational assistant helping explain a visual diagram about "${topicName}".

The current slide shows this content: "${subtitle}"

The user is asking about something visible on this educational diagram: "${query}"

Your task:
1. Provide a brief, helpful verbal explanation (2-3 sentences max) answering their question about the visible content
2. Estimate where on the diagram they are likely asking about. Return coordinates as percentages (0-100) where:
   - x=0 is left edge, x=100 is right edge
   - y=0 is top edge, y=100 is bottom edge

Common diagram regions:
- Center: x=50, y=50
- Top center: x=50, y=25
- Bottom center: x=50, y=75
- Left side: x=25, y=50
- Right side: x=75, y=50

Consider the typical layout of educational diagrams when estimating position. If the user mentions colors, arrows, labels, or specific parts, estimate where those elements would typically appear.

Output Format (JSON):
{
  "response": "Your verbal explanation here",
  "highlight": {
    "x": 50,
    "y": 50
  }
}

If you cannot determine a specific location, set highlight to null.`

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 512,
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    const verbalResponse = parsed.response || "I'm not sure what you're asking about. Could you be more specific?"
    const highlight = parsed.highlight && typeof parsed.highlight.x === 'number' && typeof parsed.highlight.y === 'number'
      ? { x: Math.max(0, Math.min(100, parsed.highlight.x)), y: Math.max(0, Math.min(100, parsed.highlight.y)) }
      : null

    // Generate TTS audio for the response
    const audioResult = await generateTTS(verbalResponse)

    return {
      response: verbalResponse,
      highlight,
      audioUrl: audioResult.audioUrl,
      duration: audioResult.duration || 3000,
      error: null
    }
  } catch (error) {
    console.error('[Gemini] Slide response generation error:', error.message)
    return {
      response: null,
      highlight: null,
      audioUrl: null,
      duration: 0,
      error: error.message || 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Generate a short, relevant topic name from a user query
 * F087: Automatic topic name generation
 *
 * Uses the fast Gemini Flash model for low latency (<1s target)
 * Extracts a 2-4 word topic name without question words
 *
 * @param {string} query - The user's question
 * @returns {Promise<{topicName: string|null, error: string|null}>}
 */
export async function generateTopicName(query) {
  const ai = getAIClient()
  if (!ai) {
    return { topicName: null, error: 'API_NOT_AVAILABLE' }
  }

  const prompt = `Extract a short topic name (2-4 words) from this question. The topic name should:
- Be 2-4 words maximum
- NOT include question words (how, what, why, when, where, who, which, can, do, does, is, are)
- Be a noun phrase describing the subject matter
- Be title case

Question: "${query}"

Return ONLY the topic name, nothing else. No quotes, no punctuation, just the words.`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3, // Low temperature for consistent results
        maxOutputTokens: 32, // Short response expected
      }
    })

    const rawText = response.text?.trim() || ''

    // Clean up the response: remove quotes, extra punctuation, and validate
    let topicName = rawText
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/[.!?:]$/g, '') // Remove trailing punctuation
      .replace(/\n/g, ' ') // Convert newlines to spaces
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim()

    // Validate word count (2-4 words per spec)
    const words = topicName.split(/\s+/).filter(w => w.length > 0)
    if (words.length > 4) {
      // If too long, take first 4 words
      topicName = words.slice(0, 4).join(' ')
    }

    // Final validation: ensure we have something
    if (!topicName || topicName.length === 0) {
      return { topicName: null, error: 'EMPTY_RESPONSE' }
    }

    return { topicName, error: null }
  } catch (error) {
    console.error('[Gemini] Topic name generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { topicName: null, error: 'RATE_LIMITED' }
    }

    return { topicName: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate a short topic name and emoji icon from a user query
 *
 * Uses the fast Gemini Flash model for low latency (<1s target)
 *
 * @param {string} query - The user's question
 * @returns {Promise<{topicName: string|null, topicIcon: string|null, error: string|null}>}
 */
export async function generateTopicMetadata(query) {
  const ai = getAIClient()
  if (!ai) {
    return { topicName: null, topicIcon: null, error: 'API_NOT_AVAILABLE' }
  }

  const prompt = `Extract a short topic name (2-4 words) and a single emoji icon from this question. The topic name should:
- Be 2-4 words maximum
- NOT include question words (how, what, why, when, where, who, which, can, do, does, is, are)
- Be a noun phrase describing the subject matter
- Be title case

Return an emoji that best represents the topic. Use a single emoji only.

Question: "${query}"

Output Format (JSON):
{
  "topicName": "Your Topic Name",
  "topicIcon": "Emoji"
}`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 64,
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    let topicName = typeof parsed.topicName === 'string' ? parsed.topicName : ''
    let topicIcon = typeof parsed.topicIcon === 'string' ? parsed.topicIcon : ''

    topicName = topicName
      .replace(/^["']|["']$/g, '')
      .replace(/[.!?:]$/g, '')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const words = topicName.split(/\s+/).filter(w => w.length > 0)
    if (words.length > 4) {
      topicName = words.slice(0, 4).join(' ')
    }

    topicIcon = topicIcon
      .replace(/^["']|["']$/g, '')
      .replace(/\s+/g, '')
      .trim()

    if (!topicName || !topicIcon) {
      return { topicName: null, topicIcon: null, error: 'EMPTY_RESPONSE' }
    }

    return { topicName, topicIcon, error: null }
  } catch (error) {
    console.error('[Gemini] Topic metadata generation error:', error.message)

    if (error.message?.includes('JSON')) {
      return { topicName: null, topicIcon: null, error: 'PARSE_ERROR' }
    }
    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { topicName: null, topicIcon: null, error: 'RATE_LIMITED' }
    }

    return { topicName: null, topicIcon: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Determine the complexity of a follow-up query to decide response format.
 * CORE032: Adaptive Follow-up Responses
 *
 * Trivial: Voice only (fast answer, checking facts/visuals)
 * Simple: Voice + 1 slide (standard elaboration)
 * Moderate: 2-3 slides (deeper explanation)
 * Complex: Offer choice (broad topic, multiple paths)
 *
 * @param {string} query - The user's question
 * @param {string} context - Brief context about current topic/slide
 * @returns {Promise<{complexity: 'trivial'|'simple'|'moderate'|'complex', reasoning: string, error: string|null}>}
 */
export async function determineQueryComplexity(query, context = '') {
  const ai = getAIClient()
  if (!ai) {
    // Fallback if API unavailable
    return { complexity: 'simple', reasoning: 'API unavailable', error: 'API_NOT_AVAILABLE' }
  }

  const prompt = `Analyze this follow-up question and determine the complexity of the required response.
Context: ${context}
Question: "${query}"

Classify into exactly one category:
- "trivial": Quick fact check, visual question ("what color is that"), or yes/no. Needs voice answer only.
- "simple": Standard follow-up asking for an example or basic clarification. Needs 1 new slide.
- "moderate": Deeper explanation, asking "how" or "why" about a process. Needs 2-3 new slides.
- "complex": Very broad request ("tell me everything", "how does it compare to X") or completely new angle. Needs user choice/menu.

Return ONLY a JSON object:
{
  "complexity": "trivial" | "simple" | "moderate" | "complex",
  "reasoning": "Brief explanation why"
}`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 128,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    const validComplexities = ['trivial', 'simple', 'moderate', 'complex']
    const complexity = validComplexities.includes(parsed.complexity) ? parsed.complexity : 'simple'

    return { 
      complexity, 
      reasoning: parsed.reasoning || 'AI determination',
      error: null 
    }
  } catch (error) {
    console.error('[Gemini] Complexity determination error:', error.message)
    return { complexity: 'simple', reasoning: 'Error fallback', error: error.message }
  }
}

/**
 * Determine if a query is semantically related to current slide content
 * Used as fallback when keyword matching fails to detect follow-up intent
 *
 * @param {string} query - The user's question
 * @param {string} slideSubtitle - The current slide's narration text
 * @param {string} topicName - The current topic name
 * @returns {Promise<{isRelated: boolean, confidence: number, error: string|null}>}
 */
export async function determineSemanticRelation(query, slideSubtitle, topicName) {
  const ai = getAIClient()
  if (!ai) {
    return { isRelated: false, confidence: 0, error: 'API_NOT_AVAILABLE' }
  }

  const prompt = `You are classifying whether a user's question is a follow-up to the current educational content.

Current topic: "${topicName}"
Current slide content: "${slideSubtitle}"
User's new question: "${query}"

Determine if the question is asking about or related to the current slide/topic content.
Consider semantic relationships - the question doesn't need exact keyword matches.

Example: Slide about "CPU clock cycles synchronize operations" + question "How is timing managed?" = RELATED
Example: Slide about "photosynthesis in plants" + question "What is quantum physics?" = NOT RELATED

Return JSON only: {"isRelated": true/false, "confidence": 0.0-1.0}`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 64,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    return {
      isRelated: parsed.isRelated === true,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      error: null
    }
  } catch (error) {
    console.error('[Gemini] Semantic relation error:', error.message)
    return { isRelated: false, confidence: 0, error: error.message }
  }
}

/**
 * Generate suggested questions based on topic history or default commonly asked questions
 * Uses FAST_MODEL (gemini-2.5-flash-lite) for quick response
 * @param {Array<string>} topicNames - Array of topic names from user's history
 * @returns {Promise<{questions: string[], error: string|null}>}
 */
export async function generateSuggestedQuestions(topicNames = []) {
  if (!isGeminiAvailable()) {
    return { questions: [], error: 'API_KEY_MISSING' }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    let prompt
    if (topicNames.length > 0) {
      prompt = `Based on these topics the user has explored: ${topicNames.join(', ')}

Generate 3 related follow-up questions they might want to learn about next. Questions should:
- Be naturally curious and educational
- Connect to or expand on the topics they've explored
- Be concise (under 8 words each)

Return ONLY a JSON array of 3 question strings, no explanation.
Example: ["How do neurons communicate?", "What causes memory loss?", "Why do we forget dreams?"]`
    } else {
      prompt = `Generate 3 commonly asked educational questions that spark curiosity. Questions should:
- Cover diverse topics (science, nature, technology, etc.)
- Be engaging and make people want to learn
- Be concise (under 8 words each)

Return ONLY a JSON array of 3 question strings, no explanation.
Example: ["How do black holes work?", "Why do we dream?", "How does WiFi work?"]`
    }

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
    })

    const text = response.text || ''
    const jsonStr = extractJSON(text)
    const questions = JSON.parse(jsonStr)

    if (!Array.isArray(questions) || questions.length === 0) {
      return { questions: [], error: 'INVALID_RESPONSE' }
    }

    // Ensure we return exactly 3 questions, cleaned up
    const cleaned = questions
      .slice(0, 3)
      .map(q => q.replace(/^["']|["']$/g, '').trim())
      .filter(q => q.length > 0)

    return { questions: cleaned, error: null }
  } catch (error) {
    console.error('[Gemini] Suggested questions error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { questions: [], error: 'RATE_LIMITED' }
    }

    return { questions: [], error: error.message || 'UNKNOWN_ERROR' }
  }
}

export default {
  isGeminiAvailable,
  generateScript,
  generateEducationalImage,
  generateTTS,
  generateSlideContent,
  generateEngagement,
  generateChitchatResponse,
  transcribeAudio,
  generateSlideResponse,
  generateTopicName,
  generateTopicMetadata,
  generateSuggestedQuestions,
  determineQueryComplexity,
  determineSemanticRelation,
}
