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
import { GoogleAuth } from 'google-auth-library'
import { extractJSON } from '../utils/json.js'

// Configuration constants
const TEXT_MODEL = 'gemini-3-flash-preview'
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'
const IMAGE_MODEL_FALLBACKS = [
  'gemini-2.5-flash-image',
]

const FAST_MODEL = 'gemini-2.5-flash-lite'

// GenAI TTS model chain (primary -> fallback(s))
// Defaults prefer Pro quality first, then Flash Preview as GenAI fallback.
const GENAI_TTS_PRIMARY_MODEL = process.env.GENAI_TTS_PRIMARY_MODEL || 'gemini-2.5-pro-preview-tts'
const GENAI_TTS_FALLBACK_MODELS = (process.env.GENAI_TTS_FALLBACK_MODELS || 'gemini-2.5-flash-preview-tts')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean)

const GENAI_TTS_MODELS = [...new Set([GENAI_TTS_PRIMARY_MODEL, ...GENAI_TTS_FALLBACK_MODELS])]

// Cloud TTS fallback config (used when GenAI fails)
// Uses Gemini TTS voice through Cloud Text-to-Speech API (150 QPM)
const CLOUD_TTS_MODEL = 'gemini-2.5-flash-tts'
const CLOUD_TTS_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
let cloudTtsAuthPromise = null

// Default TTS voice for GenAI - Kore is clear and engaging
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
      title: slide.title || `Slide ${index + 1}`,
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

TITLE FIELD: Each slide MUST include a "title" field — a short (2-5 words) descriptive chapter heading for navigation. Examples: "Initial Breakdown", "Stomach Acids", "Nutrient Absorption", "Key Takeaways". Do NOT repeat the subtitle — the title is a concise label, not narration.

Output Format (JSON):
{
  "slides": [
    {
      "title": "Short Chapter Title",
      "subtitle": "Conversational explanation text that sounds natural when spoken aloud",
      "imagePrompt": "Description of educational diagram showing [concept], with labeled parts including [details]. Style: clean, colorful educational illustration."
    },
    {
      "title": "Key Takeaways",
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
 * @param {boolean} options.comicPanel - Whether to force a 4-panel comic page layout
 * @returns {Promise<{imageUrl: string|null, error: string|null}>}
 */
export async function generateEducationalImage(imagePrompt, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { imageUrl: null, error: 'API_NOT_AVAILABLE' }
  }

  const { topic = '', explanationLevel = 'standard', language = 'en', comicPanel = false } = options

  // Validate and normalize explanation level
  const validLevels = ['simple', 'standard', 'deep']
  const normalizedLevel = validLevels.includes(explanationLevel) ? explanationLevel : 'standard'

  // Get level-specific image style instructions
  const levelStyleInstructions = IMAGE_LEVEL_INSTRUCTIONS[normalizedLevel]

  // Language-specific instruction for text labels
  const languageInstruction = language === 'zh'
    ? '- IMPORTANT: All text labels, annotations, and captions on the diagram must be in Simplified Chinese (简体中文)'
    : ''

  const comicPanelInstructions = comicPanel
    ? `- Format as a 4-panel manga/comic page arranged in a 2x2 grid
- Use clear, visible panel borders separating each panel
- Show sequential storytelling progression from top-left to top-right to bottom-left to bottom-right
- NO text, speech bubbles, labels, or captions inside the image
- Use a wide/landscape composition so all four panels are readable`
    : ''

  // Enhance the prompt for better educational diagrams
  const enhancedPrompt = `Create an educational diagram illustration: ${imagePrompt}

Style requirements:
${levelStyleInstructions}
- No photorealistic elements - use illustrated/diagrammatic style
- White or light colored background for clarity
${comicPanelInstructions}
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
  const status = error?.status
  if (
    status === 429 ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota') ||
    message.includes('rate') ||
    message.includes('429')
  ) {
    return 'RATE_LIMITED'
  }
  return message || 'UNKNOWN_ERROR'
}

// Cloud TTS helper functions (fallback when GenAI rate limited)
async function getCloudTtsAccessToken() {
  if (!cloudTtsAuthPromise) {
    const auth = new GoogleAuth({ scopes: [CLOUD_TTS_SCOPE] })
    cloudTtsAuthPromise = auth.getClient()
  }

  try {
    const client = await cloudTtsAuthPromise
    const tokenResponse = await client.getAccessToken()
    if (typeof tokenResponse === 'string') return tokenResponse
    return tokenResponse?.token || null
  } catch (error) {
    console.error('[CloudTTS] Failed to acquire access token:', error.message)
    return null
  }
}

async function generateCloudTTS(text, language = 'en') {
  const accessToken = await getCloudTtsAccessToken()
  if (!accessToken) {
    return { audioUrl: null, duration: 0, error: 'CLOUD_TTS_AUTH_FAILED' }
  }

  const languageCode = language === 'zh' ? 'cmn-CN' : 'en-US'

  // Use Gemini TTS model through Cloud TTS API
  const requestBody = {
    input: { text },
    voice: {
      languageCode,
      model_name: CLOUD_TTS_MODEL,
      name: 'Kore', // Gemini TTS voice
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  const endpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize'

  console.log('[CloudTTS] Fallback request:', { model: CLOUD_TTS_MODEL, textLength: text.length })

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(projectId ? { 'x-goog-user-project': projectId } : {}),
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = data?.error?.message || `HTTP_${response.status}`
      console.error('[CloudTTS] API error:', { status: response.status, message })
      return { audioUrl: null, duration: 0, error: normalizeTtsError({ message, status: response.status }) }
    }

    const audioContent = data?.audioContent
    if (!audioContent) {
      return { audioUrl: null, duration: 0, error: 'NO_AUDIO_GENERATED' }
    }

    console.log('[CloudTTS] Success - audio content length:', audioContent.length)
    const audioUrl = `data:audio/mpeg;base64,${audioContent}`
    // Estimate duration: ~150 words per minute, ~5 chars per word
    const estimatedDuration = Math.round((text.length / 5 / 150) * 60 * 1000)
    return { audioUrl, duration: estimatedDuration, error: null }
  } catch (error) {
    console.error('[CloudTTS] Request failed:', error.message)
    return { audioUrl: null, duration: 0, error: normalizeTtsError(error) }
  }
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

/**
 * Generate TTS audio from text
 * Primary: Gemini GenAI SDK (better quality, 10 RPM limit)
 * Fallback: Cloud TTS API (standard quality, 150 QPM limit)
 *
 * @param {string} text - The text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.voice - Voice name to use (default: Kore)
 * @param {string} options.language - Language code: 'en' or 'zh' (affects speaking prompt)
 * @returns {Promise<{audioUrl: string|null, duration: number, error: string|null}>}
 */
export async function generateTTS(text, options = {}) {
  const {
    voice = DEFAULT_VOICE,
    language = 'en',
  } = options

  const ai = getAIClient()
  if (!ai) {
    // No API key, try Cloud TTS directly
    console.log('[TTS] No GenAI client, using Cloud TTS fallback')
    return generateCloudTTS(text, language)
  }

  // Style prompt for engaging, educational speech
  const stylePrompt = language === 'zh'
    ? '用清晰、生动、自然的方式朗读以下内容，就像在教导一个好奇的学生：'
    : 'Read the following in a clear, engaging, and natural way, as if teaching a curious student:'

  const fullPrompt = `${stylePrompt}\n\n${text}`
  const genAiErrors = []

  for (let i = 0; i < GENAI_TTS_MODELS.length; i += 1) {
    const model = GENAI_TTS_MODELS[i]
    const hasMoreGenAiFallbacks = i < GENAI_TTS_MODELS.length - 1

    console.log('[TTS] GenAI request:', { model, voice, textLength: text.length })

    try {
      const response = await ai.models.generateContent({
        model,
        contents: fullPrompt,
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      })

      // Extract audio data from response
      const parts = response.candidates?.[0]?.content?.parts || []

      for (const part of parts) {
        if (part.inlineData) {
          console.log('[TTS] GenAI success - mimeType:', part.inlineData.mimeType, 'model:', model)
          const result = buildAudioResult(part.inlineData)
          console.log('[TTS] Audio URL length:', result.audioUrl?.length || 0, 'duration:', result.duration)
          return result
        }
      }

      genAiErrors.push('NO_AUDIO_GENERATED')
      if (hasMoreGenAiFallbacks) {
        console.warn('[TTS] No audio in GenAI response:', { model, nextModel: GENAI_TTS_MODELS[i + 1] })
        continue
      }

      console.error('[TTS] No audio in GenAI response, trying Cloud TTS fallback')
    } catch (error) {
      const normalizedError = normalizeTtsError(error)
      genAiErrors.push(normalizedError)

      if (hasMoreGenAiFallbacks) {
        console.warn('[TTS] GenAI failed:', error.message, '- trying next GenAI fallback model')
        continue
      }

      console.warn('[TTS] GenAI failed:', error.message, '- trying Cloud TTS fallback')
    }
  }

  // Fall back to Cloud TTS after exhausting GenAI model chain.
  const fallbackResult = await generateCloudTTS(text, language)
  if (fallbackResult.audioUrl) {
    return fallbackResult
  }

  // Prefer surfaced Cloud-specific auth/permission errors.
  if (fallbackResult.error && fallbackResult.error !== 'RATE_LIMITED') {
    return fallbackResult
  }

  const normalizedError =
    genAiErrors.find((code) => code && code !== 'NO_AUDIO_GENERATED') ||
    fallbackResult.error ||
    'UNKNOWN_ERROR'

  return { audioUrl: null, duration: 0, error: normalizedError }
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

/**
 * Generate a random educational topic for the "Surprise Me" feature
 * Returns a curiosity-sparking question with category and emoji
 *
 * @returns {Promise<{topic: string, category: string, emoji: string, error: string|null}>}
 */
export async function generateRandomTopic({ excludeTopics = [] } = {}) {
  if (!isGeminiAvailable()) {
    return { topic: null, category: null, emoji: null, error: 'API_KEY_MISSING' }
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const cleanedExclude = Array.isArray(excludeTopics)
      ? excludeTopics
        .filter((topic) => typeof topic === 'string')
        .map((topic) => topic.trim())
        .filter((topic) => topic.length > 0)
        .slice(0, 20)
      : []
    const excludeSet = new Set(cleanedExclude.map((topic) => topic.toLowerCase()))

    // Expanded category pool with subtopics for constrained random selection
    const TOPIC_CATEGORIES = [
      { name: 'Biology', subtopics: ['cells', 'ecosystems', 'evolution', 'anatomy', 'genetics', 'microbes', 'symbiosis'] },
      { name: 'Physics', subtopics: ['gravity', 'light', 'electricity', 'magnetism', 'sound', 'waves', 'energy', 'friction'] },
      { name: 'Chemistry', subtopics: ['elements', 'reactions', 'molecules', 'states of matter', 'acids', 'crystals'] },
      { name: 'Space', subtopics: ['planets', 'stars', 'galaxies', 'black holes', 'astronauts', 'moons', 'comets', 'nebulae'] },
      { name: 'Earth Science', subtopics: ['volcanoes', 'earthquakes', 'weather', 'oceans', 'rocks', 'caves', 'glaciers', 'fossils'] },
      { name: 'Animals', subtopics: ['mammals', 'birds', 'insects', 'ocean life', 'dinosaurs', 'reptiles', 'amphibians', 'migration'] },
      { name: 'Plants', subtopics: ['trees', 'flowers', 'photosynthesis', 'seeds', 'rainforests', 'deserts', 'carnivorous plants'] },
      { name: 'Human Body', subtopics: ['brain', 'heart', 'bones', 'senses', 'digestion', 'muscles', 'immune system', 'sleep'] },
      { name: 'Technology', subtopics: ['computers', 'internet', 'robots', 'inventions', 'AI', 'smartphones', 'satellites'] },
      { name: 'History', subtopics: ['ancient civilizations', 'inventions', 'explorers', 'famous buildings', 'archaeology'] },
      { name: 'Math', subtopics: ['numbers', 'patterns', 'shapes', 'puzzles', 'infinity', 'probability', 'geometry'] },
      { name: 'Engineering', subtopics: ['bridges', 'buildings', 'machines', 'vehicles', 'dams', 'tunnels', 'skyscrapers'] },
      { name: 'Food Science', subtopics: ['cooking', 'nutrition', 'preservation', 'fermentation', 'baking', 'spices'] },
      { name: 'Psychology', subtopics: ['memory', 'dreams', 'emotions', 'learning', 'perception', 'habits', 'creativity'] },
      { name: 'Music', subtopics: ['instruments', 'sound waves', 'composers', 'rhythm', 'singing', 'genres'] },
      { name: 'Art', subtopics: ['colors', 'famous artists', 'techniques', 'optical illusions', 'sculpture', 'photography'] },
      { name: 'Sports Science', subtopics: ['muscles', 'training', 'equipment', 'records', 'aerodynamics', 'nutrition'] },
      { name: 'Weather', subtopics: ['storms', 'clouds', 'seasons', 'climate', 'rainbows', 'tornadoes', 'hurricanes', 'snow'] },
      { name: 'Ocean', subtopics: ['deep sea', 'coral reefs', 'waves', 'marine animals', 'tides', 'shipwrecks', 'bioluminescence'] },
      { name: 'Aviation', subtopics: ['planes', 'helicopters', 'airports', 'flight physics', 'drones', 'hot air balloons'] },
      { name: 'Medicine', subtopics: ['vaccines', 'surgery', 'diseases', 'healing', 'medicine history', 'x-rays'] },
      { name: 'Geography', subtopics: ['mountains', 'rivers', 'deserts', 'islands', 'waterfalls', 'canyons', 'poles'] },
      { name: 'Ecology', subtopics: ['food chains', 'habitats', 'endangered species', 'recycling', 'pollution', 'conservation'] },
      { name: 'Materials', subtopics: ['metals', 'plastics', 'glass', 'wood', 'fabrics', 'rubber', 'concrete'] },
    ]

    // Pick random category and subtopic for constrained generation
    const category = TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)]
    const subtopic = category.subtopics[Math.floor(Math.random() * category.subtopics.length)]

    const promptBase = `Generate ONE educational question about ${category.name}, specifically related to ${subtopic}.

Requirements:
- Topic should spark curiosity and be visually explainable
- Phrase it as a question (e.g., "Why do cats purr?" or "How do volcanoes form?")
- Keep it concise (under 10 words)
- Avoid controversial, political, or sensitive topics
- Focus on the ${subtopic} aspect of ${category.name}
${cleanedExclude.length > 0 ? `- Avoid repeating or closely mirroring these recent topics: ${cleanedExclude.map((topic) => `"${topic}"`).join(', ')}` : ''}

Return ONLY valid JSON (no markdown):
{
  "topic": "the question",
  "category": "${category.name}",
  "emoji": "one relevant emoji"
}

Example response:
{"topic": "Why do fireflies glow?", "category": "Biology", "emoji": "🪲"}`

    const MAX_ATTEMPTS = 3
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const seed = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const prompt = `${promptBase}

Random seed: ${seed}`
      const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 256,
          responseMimeType: 'application/json',
        }
      })

      const text = response.text || ''
      const jsonStr = extractJSON(text)
      const result = JSON.parse(jsonStr)

      if (!result.topic || typeof result.topic !== 'string') {
        return { topic: null, category: null, emoji: null, error: 'INVALID_RESPONSE' }
      }

      const topic = result.topic.trim()
      if (excludeSet.size > 0 && excludeSet.has(topic.toLowerCase())) {
        if (attempt < MAX_ATTEMPTS - 1) {
          continue
        }
        return { topic: null, category: null, emoji: null, error: 'DUPLICATE_TOPIC' }
      }

      return {
        topic,
        category: result.category?.trim() || 'General',
        emoji: result.emoji || '✨',
        error: null,
      }
    }
    return { topic: null, category: null, emoji: null, error: 'DUPLICATE_TOPIC' }
  } catch (error) {
    console.error('[Gemini] Random topic error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { topic: null, category: null, emoji: null, error: 'RATE_LIMITED' }
    }

    return { topic: null, category: null, emoji: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Classify a topic into a world zone for World Builder gamification
 * WB007: Topic to zone mapping
 *
 * Zones:
 * - nature: Animals, plants, geology, weather, oceans, space, biology
 * - civilization: History, cultures, inventions, buildings, people, society
 * - arcane: Math, philosophy, abstract concepts, logic, music theory, language
 *
 * @param {string} topicName - The topic name
 * @param {string} topicDescription - Brief description or slide summary (optional)
 * @returns {Promise<{zone: string, confidence: number, error: string|null}>}
 */
export async function classifyTopicZone(topicName, topicDescription = '') {
  const ai = getAIClient()
  if (!ai) {
    return { zone: null, confidence: 0, error: 'API_NOT_AVAILABLE' }
  }

  // Validate input
  if (!topicName || typeof topicName !== 'string' || topicName.trim().length === 0) {
    return { zone: null, confidence: 0, error: 'INVALID_TOPIC' }
  }

  const prompt = `You are a classifier for an educational world-building game. Classify the following topic into exactly ONE zone.

ZONES:
1. "nature" - Natural world topics: animals, plants, geology (volcanoes, earthquakes), weather, oceans, space/astronomy, biology, ecosystems, chemistry of natural processes
2. "civilization" - Human civilization topics: history, cultures, ancient civilizations (Egypt, Rome, etc.), inventions, architecture/buildings, famous people, society, geography of human settlements, wars, politics
3. "arcane" - Abstract/intellectual topics: mathematics, philosophy, logic, music theory, language/linguistics, abstract physics concepts, economics theory, psychology concepts, computer science theory

RULES:
- Concrete, tangible topics about the physical world → nature
- Topics about human history, society, or physical creations → civilization
- Abstract, theoretical, or conceptual topics → arcane
- When in doubt between civilization and arcane: if it's about DOING something in society → civilization; if it's about UNDERSTANDING a concept → arcane
- "History of math" → civilization (because it's about historical development)
- "How calculus works" → arcane (because it's about the abstract concept)

TOPIC: "${topicName}"
${topicDescription ? `DESCRIPTION: "${topicDescription}"` : ''}

Respond with ONLY a JSON object:
{
  "zone": "nature" | "civilization" | "arcane",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.1, // Low temperature for consistent classification
        maxOutputTokens: 128,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    // Validate zone is one of the expected values
    const validZones = ['nature', 'civilization', 'arcane']
    const zone = validZones.includes(parsed.zone) ? parsed.zone : null

    if (!zone) {
      return { zone: null, confidence: 0, error: 'INVALID_ZONE_RESPONSE' }
    }

    // Validate and normalize confidence
    let confidence = parseFloat(parsed.confidence)
    if (isNaN(confidence) || confidence < 0) confidence = 0.5
    if (confidence > 1) confidence = 1

    return {
      zone,
      confidence,
      error: null
    }
  } catch (error) {
    console.error('[Gemini] Zone classification error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { zone: null, confidence: 0, error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { zone: null, confidence: 0, error: 'PARSE_ERROR' }
    }

    return { zone: null, confidence: 0, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate an image prompt for a world piece based on topic
 * WB008: World piece prompt generation
 *
 * Generates a whimsical, child-friendly prompt for a world piece image
 * that represents what the user learned about a topic. The prompt describes
 * elements suitable for an isometric game art diorama.
 *
 * @param {string} topicName - The topic learned
 * @param {string} zone - 'nature' | 'civilization' | 'arcane'
 * @param {string} summary - Brief topic summary from slides
 * @returns {Promise<{ prompt: string, elements: string[], error: string|null }>}
 */
export async function generateWorldPiecePrompt(topicName, zone, summary) {
  const ai = getAIClient()
  if (!ai) {
    return { prompt: null, elements: null, error: 'API_NOT_AVAILABLE' }
  }

  // Validate zone
  const validZones = ['nature', 'civilization', 'arcane']
  if (!validZones.includes(zone)) {
    return { prompt: null, elements: null, error: 'INVALID_ZONE' }
  }

  // Zone-specific style modifiers
  const zoneModifiers = {
    nature: 'lush greenery, natural elements, animals or plants, organic shapes, earthy colors with vibrant accents',
    civilization: 'architectural elements, historical or cultural artifacts, buildings, monuments, inventions, warm stone and metal textures',
    arcane: 'magical elements, floating objects, glowing particles, ethereal effects, mystical symbols, crystals, nebula colors'
  }

  const aiPrompt = `You are a creative artist designing collectible world pieces for an educational game.
The player just learned about "${topicName}" and earned a world piece for their island diorama.

Topic summary: ${summary || 'No summary provided'}
Zone category: ${zone}

Generate a WHIMSICAL, CHILD-FRIENDLY image prompt for a world piece that:
1. Represents a key visual element or concept from this topic
2. Is suitable for isometric game art style
3. Works as a collectible piece that can be placed in a parallax diorama
4. Has a transparent or simple background for layering
5. Is charming and appealing to children ages 8-14

Zone style guidance: ${zoneModifiers[zone]}

For ABSTRACT topics (math, philosophy, logic, etc.):
- Use metaphorical representations (e.g., algebra → balance scales with glowing equations)
- Create whimsical visualizations (e.g., prime numbers → a crystalline tower with numbered facets)
- Don't be too literal - make it magical and interesting

For CONCRETE topics (animals, buildings, historical figures):
- Focus on the most iconic or recognizable visual element
- Add whimsical or fantastical touches to make it special

Output Format (JSON):
{
  "prompt": "Detailed image generation prompt here (1-3 sentences describing the visual)",
  "elements": ["element1", "element2", "element3"]
}

The "elements" array should list 2-4 key visual elements that will appear in the image.
The "prompt" should be a complete, detailed description ready for image generation.

IMPORTANT: The prompt should specify "isometric game art style, vibrant colors, child-friendly, whimsical, transparent background, centered composition, no text".`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: aiPrompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 256,
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    // Validate response
    if (!parsed.prompt || typeof parsed.prompt !== 'string') {
      return { prompt: null, elements: null, error: 'INVALID_RESPONSE' }
    }

    // Ensure the prompt includes style guidance
    let finalPrompt = parsed.prompt
    if (!finalPrompt.toLowerCase().includes('isometric')) {
      finalPrompt = `Isometric game art style, vibrant colors, child-friendly, whimsical, transparent background, centered composition, no text. ${finalPrompt}`
    }

    return {
      prompt: finalPrompt,
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      error: null
    }
  } catch (error) {
    console.error('[Gemini] World piece prompt generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { prompt: null, elements: null, error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { prompt: null, elements: null, error: 'PARSE_ERROR' }
    }

    return { prompt: null, elements: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate world piece image using Gemini's image generation
 * WB009: World piece image generation
 *
 * Creates an AI-generated image for a world piece that can be layered
 * in the user's island diorama. The image should be consistent style,
 * suitable for parallax layering with transparent or removable background.
 *
 * @param {string} prompt - The image generation prompt from generateWorldPiecePrompt
 * @returns {Promise<{ imageUrl: string|null, error: string|null }>}
 */
export async function generateWorldPieceImage(prompt) {
  const ai = getAIClient()
  if (!ai) {
    return { imageUrl: null, error: 'API_NOT_AVAILABLE' }
  }

  if (!prompt || typeof prompt !== 'string') {
    return { imageUrl: null, error: 'INVALID_PROMPT' }
  }

  // Enhance prompt with world piece specific styling
  const enhancedPrompt = `${prompt}

Additional style requirements for world piece:
- Isometric game art style with clean lines
- Vibrant, saturated colors suitable for children
- Single centered object or small scene
- Transparent or solid color background (for easy layering)
- No text, labels, or UI elements
- Suitable for parallax diorama display at approximately 512x512 pixels
- Game asset quality, collectible item appearance`

  let lastError = null

  // Use the primary image model only to keep collectible style consistent
  for (const model of [IMAGE_MODEL]) {
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

          console.log('[Gemini] World piece image generated successfully', { model })
          return { imageUrl, error: null }
        }
      }
    } catch (error) {
      lastError = error.message || 'UNKNOWN_ERROR'
      console.warn('[Gemini] World piece image generation failed, trying next model:', {
        model,
        error: error.message,
      })
    }
  }

  // All models failed - check error type
  if (lastError?.includes('quota') || lastError?.includes('rate')) {
    return { imageUrl: null, error: 'RATE_LIMITED' }
  }
  if (lastError?.includes('safety') || lastError?.includes('blocked')) {
    return { imageUrl: null, error: 'CONTENT_FILTERED' }
  }

  return { imageUrl: null, error: lastError || 'NO_IMAGE_GENERATED' }
}

/**
 * Generate a small, concrete evolution plan for the Living World.
 * WB023: Used to choose a topic-specific element to add (and where), instead of relying
 * solely on generic terrain progressions.
 *
 * @param {Object} params
 * @param {string} params.topicName
 * @param {string} [params.summary]
 * @param {string[]} [params.existingElements]
 * @param {string} [params.tier]
 * @param {string} [params.styleDescriptor]
 * @returns {Promise<{ elementToAdd: string|null, placementHint: string|null, targetLayer: string|null, error: string|null }>}
 */
export async function generateLivingWorldEvolutionPlan(params = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { elementToAdd: null, placementHint: null, targetLayer: null, error: 'API_NOT_AVAILABLE' }
  }

  const {
    topicName,
    summary = '',
    existingElements = [],
    tier = 'barren',
    styleDescriptor = '',
  } = params || {}

  if (!topicName || typeof topicName !== 'string' || !topicName.trim()) {
    return { elementToAdd: null, placementHint: null, targetLayer: null, error: 'INVALID_TOPIC' }
  }

  const safeSummary = typeof summary === 'string' ? summary.trim() : ''
  const safeExisting = Array.isArray(existingElements) ? existingElements.filter(Boolean).slice(-12) : []

  const prompt = `You are an art director for an evolving panoramic "Living World" (16:9 painterly landscape).

Your job: propose ONE small, concrete visual element to ADD that directly represents the learned topic, and a short placement hint.

WORLD CONTEXT:
- Tier: ${tier}
- Style DNA: ${styleDescriptor}

TOPIC:
- Name: "${topicName.trim()}"
${safeSummary ? `- Summary: "${safeSummary}"` : ''}

EXISTING ELEMENTS (must be preserved):
${safeExisting.length ? safeExisting.map(e => `- ${String(e).slice(0, 160)}`).join('\n') : '- (none yet)'}

RULES:
- Choose an element that is semantically literal for the topic (avoid unrelated metaphors).
- Keep it SMALL and LOCAL. Do not repaint the whole scene.
- The element must be grounded in the landscape (or water) unless the topic is explicitly about the sky/space.
- Do NOT add auroras, sky ribbons, huge iridescent clouds, or dramatic new sky phenomena unless the topic is explicitly about the sky/space.
- No text, labels, symbols, UI, or letters.

Return ONLY JSON:
{
  "elementToAdd": "One short noun-phrase describing the new element (max 14 words)",
  "placementHint": "One short hint for placement in the 16:9 frame (e.g., 'midground center-left near horizon')",
  "targetLayer": "One of: sky | background | midground | foreground"
}`

  try {
    const response = await ai.models.generateContent({
      // Use the image model as the sole "classifier" for topic -> world element.
      // We request JSON output (no image) to keep this step deterministic and structured.
      model: IMAGE_MODEL,
      contents: prompt,
      config: {
        temperature: 0.6,
        maxOutputTokens: 256,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    const elementToAdd = typeof parsed.elementToAdd === 'string' ? parsed.elementToAdd.trim() : ''
    const placementHint = typeof parsed.placementHint === 'string' ? parsed.placementHint.trim() : ''
    const targetLayer = typeof parsed.targetLayer === 'string' ? parsed.targetLayer.trim().toLowerCase() : ''

    return {
      elementToAdd: elementToAdd || null,
      placementHint: placementHint || null,
      targetLayer: ['sky', 'background', 'midground', 'foreground'].includes(targetLayer) ? targetLayer : null,
      error: null,
    }
  } catch (error) {
    console.error('[Gemini] Living World evolution plan error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { elementToAdd: null, placementHint: null, targetLayer: null, error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { elementToAdd: null, placementHint: null, targetLayer: null, error: 'PARSE_ERROR' }
    }

    return { elementToAdd: null, placementHint: null, targetLayer: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate Living World image with optional reference image conditioning
 * WB-EVOLUTION: Creates evolving world panoramas that maintain visual consistency
 *
 * When a referenceImageUrl is provided, the generated image will evolve from
 * the previous world state while incorporating new elements from the prompt.
 *
 * @param {string} prompt - Description of the world state and elements to generate
 * @param {Object} options - Generation options
 * @param {string|null} options.referenceImageUrl - Previous world image (base64 data URL) for evolution
 * @param {'16:9'|'1:1'} options.aspectRatio - Aspect ratio for the output (default: '16:9' for panoramas)
 * @param {'2k'|'4k'} options.resolution - Resolution quality (default: '2k', use '4k' for milestones)
 * @returns {Promise<{ imageUrl: string|null, error: string|null }>}
 */
export async function generateLivingWorldImage(prompt, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { imageUrl: null, error: 'API_NOT_AVAILABLE' }
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return { imageUrl: null, error: 'INVALID_PROMPT' }
  }

  const {
    referenceImageUrl = null,
    aspectRatio = '16:9',
    resolution = '2k'
  } = options

  // Resolution specifications
  const resolutionSpec = resolution === '4k'
    ? 'ultra high resolution 4K quality (3840x2160 for 16:9, 2160x2160 for 1:1)'
    : 'high resolution 2K quality (1920x1080 for 16:9, 1080x1080 for 1:1)'

  // Build the enhanced prompt with living world style requirements
  const styleRequirements = `
Living World Style Requirements:
- Aspect ratio: ${aspectRatio} panoramic landscape view
- Resolution: ${resolutionSpec}
- Style: Enchanting illustrated world, soft painterly style with rich colors
- Atmosphere: Magical educational world that evolves over time
- Composition: Layered depth with sky, background (mountains/distant features), midground (forests/structures), foreground (water/terrain details)
- Lighting: Dynamic natural lighting appropriate to the world's tier
- No text, labels, or UI elements in the image
- Seamless, cohesive world that can evolve with new elements`

  let contents
  let evolutionInstruction = ''

  if (referenceImageUrl && referenceImageUrl.startsWith('data:')) {
    // Parse the base64 data URL to extract mime type and data
    const dataUrlMatch = referenceImageUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1]
      const base64Data = dataUrlMatch[2]

      evolutionInstruction = `
IMPORTANT: Evolve from the provided reference image.
- Maintain the same overall world composition and style
- Keep existing elements and their positions
- Seamlessly integrate the new elements described in the prompt
- Preserve visual consistency with the reference world`

      // Multipart content with reference image
      contents = [
        {
          role: 'user',
          parts: [
            { text: `${prompt}\n${evolutionInstruction}\n${styleRequirements}` },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ]
    } else {
      // Invalid data URL format, proceed without reference
      contents = [
        {
          role: 'user',
          parts: [{ text: `${prompt}\n${styleRequirements}` }]
        }
      ]
    }
  } else {
    // No reference image - initial world generation
    contents = [
      {
        role: 'user',
        parts: [{ text: `${prompt}\n${styleRequirements}` }]
      }
    ]
  }

  let lastError = null

  // Living World must use the image model only (no heuristic fallbacks),
  // so evolution stays consistent and debuggable.
  for (const model of [IMAGE_MODEL]) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
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

          console.log('[Gemini] Living World image generated successfully', {
            model,
            hasReference: !!referenceImageUrl,
            aspectRatio,
            resolution
          })
          return { imageUrl, error: null }
        }
      }
    } catch (error) {
      lastError = error.message || 'UNKNOWN_ERROR'
      console.warn('[Gemini] Living World image generation failed, trying next model:', {
        model,
        error: error.message,
      })
    }
  }

  // All models failed - check error type
  if (lastError?.includes('quota') || lastError?.includes('rate')) {
    return { imageUrl: null, error: 'RATE_LIMITED' }
  }
  if (lastError?.includes('safety') || lastError?.includes('blocked')) {
    return { imageUrl: null, error: 'CONTENT_FILTERED' }
  }

  return { imageUrl: null, error: lastError || 'NO_IMAGE_GENERATED' }
}

/**
 * Generate a "What If?" scenario with prediction cards.
 * Creates an engaging hypothetical scenario with 4 prediction cards (2 correct, 2 wrong).
 *
 * @param {Object} params
 * @param {Array} params.slides - The slides from the lesson
 * @param {string} params.topicName - The topic being explored
 * @param {string} params.explanationLevel - 'simple' | 'standard' | 'deep'
 * @param {string} params.language - 'en' or 'zh'
 * @returns {Object} { scenario, scenarioImagePrompt, scenarioNarration, predictionCards, bonusFact, bonusFactNarration, error }
 */
export async function generateWhatIfScenario({ slides, topicName, explanationLevel, language }) {
  const ai = getAIClient()
  if (!ai) {
    return { error: 'API_NOT_AVAILABLE' }
  }

  try {
    // Build slide context summary
    const slideContext = slides
      .map((slide, i) => `Slide ${i + 1}: ${slide.script || slide.subtitle || ''}`)
      .join('\n')

    // Language-specific prompt
    const languageNote = language === 'zh'
      ? 'Generate all content in Simplified Chinese (简体中文).'
      : 'Generate all content in English.'

    const levelGuidance = {
      simple: 'Keep the scenario simple and concrete. Use everyday language.',
      standard: 'Balance accessibility with depth. Include key scientific concepts.',
      deep: 'Create a sophisticated scenario that requires deep conceptual understanding.'
    }

    const prompt = `You are creating an engaging "What If?" scenario for a learning experience.

Topic: ${topicName}
Level: ${explanationLevel}
${languageNote}

Lesson content:
${slideContext}

Create a counterfactual "What If?" scenario that:
1. Changes one key aspect of the topic in an interesting way
2. Requires understanding the lesson to reason through
3. Is thought-provoking but not overwhelming

${levelGuidance[explanationLevel] || levelGuidance.standard}

Generate exactly 4 prediction cards. Exactly 2 should be correct (scientifically accurate consequences) and 2 should be wrong (plausible-sounding but incorrect).

For correct predictions:
- Include "revealNarration": dramatic TTS-friendly explanation of why it's correct
- Include "revealImagePrompt": description for generating a visual of this consequence

For wrong predictions:
- Only include "id", "text", and "isCorrect: false"

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "scenario": "What if [interesting counterfactual]?",
  "scenarioImagePrompt": "Description for generating a dramatic visual of this scenario",
  "scenarioNarration": "Dramatic, engaging TTS text to introduce the scenario (2-3 sentences)",
  "predictionCards": [
    {
      "id": "card-1",
      "text": "Correct prediction statement",
      "isCorrect": true,
      "revealNarration": "Dramatic explanation of why this is correct",
      "revealImagePrompt": "Visual description of this consequence"
    },
    {
      "id": "card-2",
      "text": "Wrong prediction statement",
      "isCorrect": false
    },
    {
      "id": "card-3",
      "text": "Correct prediction statement",
      "isCorrect": true,
      "revealNarration": "Dramatic explanation of why this is correct",
      "revealImagePrompt": "Visual description of this consequence"
    },
    {
      "id": "card-4",
      "text": "Wrong prediction statement",
      "isCorrect": false
    }
  ],
  "bonusFact": "Mind-expanding fact related to the scenario",
  "bonusFactNarration": "TTS-friendly dramatic narration of the bonus fact"
}`

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    let extracted
    try {
      const jsonStr = repairJSON(extractJSON(text))
      extracted = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('[Gemini] What If generation failed to parse JSON:', {
        error: parseError.message,
        preview: text.substring(0, 400),
      })
      return { error: 'PARSE_ERROR' }
    }

    // Validate response structure
    if (!extracted.scenario || typeof extracted.scenario !== 'string') {
      console.error('[Gemini] What If generation: missing or invalid scenario')
      return { error: 'INVALID_RESPONSE' }
    }

    if (!Array.isArray(extracted.predictionCards)) {
      console.error('[Gemini] What If generation: predictionCards is not an array')
      return { error: 'INVALID_RESPONSE' }
    }

    // Validate cards: 3-4 cards, at least 2 correct (3 accepted due to occasional truncation)
    const cards = extracted.predictionCards
      .filter(c => c && typeof c === 'object' && typeof c.text === 'string' && typeof c.isCorrect === 'boolean')
      .slice(0, 4)

    if (cards.length < 3) {
      console.error('[Gemini] What If generation: expected 3-4 cards, got', cards.length)
      return { error: 'INVALID_RESPONSE' }
    }

    const correctCards = cards.filter(c => c.isCorrect === true)
    const wrongCards = cards.filter(c => c.isCorrect === false)

    // Attempt to fix if count is off
    if (correctCards.length !== 2) {
      console.warn('[Gemini] What If generation: expected 2 correct cards, got', correctCards.length, '- attempting fix')

      if (correctCards.length < 2) {
        console.error('[Gemini] What If generation: cannot fix - insufficient correct cards')
        return { error: 'INVALID_RESPONSE' }
      }
    }

    // Build immutable set of extra correct card IDs to demote
    const extraCorrectIds = new Set(
      correctCards.slice(2).map(c => c.id || cards.indexOf(c))
    )

    // Validate correct cards have required fields
    const validatedCards = cards.map((c, i) => {
      const isDemoted = extraCorrectIds.has(c.id || i)
      const isCorrect = c.isCorrect && !isDemoted

      const card = {
        id: typeof c.id === 'string' ? c.id : `card-${i + 1}`,
        text: c.text.trim(),
        isCorrect
      }

      if (isCorrect) {
        if (!c.revealNarration || typeof c.revealNarration !== 'string' || !c.revealNarration.trim()) {
          console.error('[Gemini] What If generation: correct card missing revealNarration')
          return null
        }
        if (!c.revealImagePrompt || typeof c.revealImagePrompt !== 'string' || !c.revealImagePrompt.trim()) {
          console.error('[Gemini] What If generation: correct card missing revealImagePrompt')
          return null
        }
        card.revealNarration = c.revealNarration.trim()
        card.revealImagePrompt = c.revealImagePrompt.trim()
      }

      return card
    })

    if (validatedCards.some(c => c === null)) {
      return { error: 'INVALID_RESPONSE' }
    }

    return {
      scenario: extracted.scenario.trim(),
      scenarioImagePrompt: (typeof extracted.scenarioImagePrompt === 'string' && extracted.scenarioImagePrompt.trim())
        ? extracted.scenarioImagePrompt.trim()
        : `Visual representation of: ${extracted.scenario}`,
      scenarioNarration: (typeof extracted.scenarioNarration === 'string' && extracted.scenarioNarration.trim())
        ? extracted.scenarioNarration.trim()
        : extracted.scenario.trim(),
      predictionCards: validatedCards,
      bonusFact: typeof extracted.bonusFact === 'string' ? extracted.bonusFact.trim() : '',
      bonusFactNarration: (typeof extracted.bonusFactNarration === 'string' && extracted.bonusFactNarration.trim())
        ? extracted.bonusFactNarration.trim()
        : (typeof extracted.bonusFact === 'string' ? extracted.bonusFact.trim() : ''),
      error: null
    }
  } catch (error) {
    console.error('[Gemini] What If generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { error: 'PARSE_ERROR' }
    }

    return { error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate story prompt with concept checklist for Story Studio learning mode.
 *
 * @param {Object} params
 * @param {Array} params.slides - Lesson slides (expects subtitle/script fields)
 * @param {string} params.topicName - The topic being learned
 * @param {string} params.language - 'en' or 'zh'
 * @returns {Promise<{storyPrompt: string, conceptChecklist: string[], starterSuggestion: string, imageStyle: string, missionHook: string, sceneImagePrompt: string, conceptCards: Array<{concept: string, icon: string, description: string}>, chapters: Object, error: string|null}>}
 */
export async function generateStoryPrompt({ slides, topicName, language }) {
  const ai = getAIClient()
  if (!ai) {
    return { storyPrompt: '', conceptChecklist: [], starterSuggestion: '', imageStyle: '', missionHook: '', sceneImagePrompt: '', conceptCards: [], chapters: {}, error: 'API_NOT_AVAILABLE' }
  }

  try {
    const slideContext = (Array.isArray(slides) ? slides : [])
      .map((slide, index) => {
        const subtitle = typeof slide?.subtitle === 'string' ? slide.subtitle : ''
        const script = typeof slide?.script === 'string' ? slide.script : ''
        const content = (script || subtitle).trim()
        return content ? `Slide ${index + 1}: ${content}` : null
      })
      .filter(Boolean)
      .join('\n')

    const languageNote = language === 'zh'
      ? 'Return all text in Simplified Chinese (简体中文).'
      : 'Return all text in English.'

    const prompt = language === 'zh'
      ? `基于这个教育主题，为小朋友创建一个创意故事提示。

主题: ${topicName}

教学内容:
${slideContext}

请返回一个JSON对象，包含:
{
  "storyPrompt": "创意写作提示，引导孩子使用学到的概念创作故事",
  "conceptChecklist": ["概念1", "概念2", "概念3"],
  "starterSuggestion": "故事的开头建议，帮助孩子开始",
  "imageStyle": "插图风格描述，用于生成儿童友好的插图",
  "missionHook": "简短2-3句话的激动人心的介绍钩子，适合TTS朗读",
  "sceneImagePrompt": "用于生成彩色场景图像的详细提示",
  "conceptCards": [{"concept": "概念名称", "icon": "表情符号", "description": "1句话描述"}],
  "chapters": {
    "1": {
      "prompt": "我们的故事从哪里开始？",
      "icon": "表情符号",
      "choices": [
        {"id": "1a", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]},
        {"id": "1b", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]},
        {"id": "1c", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]}
      ]
    },
    "2": {
      "prompt": "下一步会发生什么？",
      "icon": "表情符号",
      "choices": [
        {"id": "2a", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]},
        {"id": "2b", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]},
        {"id": "2c", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]}
      ]
    },
    "3": {
      "prompt": "故事如何收尾？",
      "icon": "表情符号",
      "choices": [
        {"id": "3a", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]},
        {"id": "3b", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]},
        {"id": "3c", "emoji": "表情", "text": "故事选择文本（1-2句话）", "conceptHints": ["概念"]}
      ]
    }
  }
}

要求:
- 故事提示应该有趣、适合儿童
- 概念清单应包含3-5个关键概念
- 开头建议应该引人入胜
- 插图风格应该是"儿童图书插图，色彩鲜艳，友好"
- missionHook应该激动人心且适合儿童，最多2-3句话
- sceneImagePrompt应该描述生成插图的生动场景
- conceptCards应该为每个概念配一张卡片，带有相关的表情符号图标
- 第1、2、3章都应有正好3个选择，每个都融入不同的概念
- 每个选择应该是1-2句引人入胜的叙述

只返回JSON，不要其他文本。`
      : `Based on this educational topic, create a creative story prompt for a kid.

Topic: ${topicName}

Lesson content:
${slideContext}

Return a JSON object with:
{
  "storyPrompt": "A creative writing prompt that encourages using learned concepts",
  "conceptChecklist": ["concept1", "concept2", "concept3"],
  "starterSuggestion": "An opening line to help the kid start their story",
  "imageStyle": "Style description for generating kid-friendly illustrations",
  "missionHook": "A short 2-3 sentence exciting hook to narrate via TTS",
  "sceneImagePrompt": "A detailed prompt for generating a colorful scene image",
  "conceptCards": [{"concept": "name", "icon": "emoji", "description": "1 sentence"}],
  "chapters": {
    "1": {
      "prompt": "Where does our story begin?",
      "icon": "emoji",
      "choices": [
        {"id": "1a", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "1b", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "1c", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]}
      ]
    },
    "2": {
      "prompt": "What challenge appears next?",
      "icon": "emoji",
      "choices": [
        {"id": "2a", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "2b", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "2c", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]}
      ]
    },
    "3": {
      "prompt": "How should the story end?",
      "icon": "emoji",
      "choices": [
        {"id": "3a", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "3b", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "3c", "emoji": "emoji", "text": "Story choice text (1-2 sentences)", "conceptHints": ["concept"]}
      ]
    }
  }
}

Requirements:
- Story prompt should be engaging and age-appropriate
- Concept checklist should have 3-5 key concepts from the lesson
- Starter suggestion should hook the imagination
- Image style should be \"children's book illustration, colorful, friendly\"
- Keep concepts concise (2-4 words each)
- missionHook should be exciting and kid-friendly, 2-3 sentences max
- sceneImagePrompt should describe a vivid scene for generating an illustration
- conceptCards should have one card per concept with a relevant emoji icon
- Chapters 1, 2, and 3 should each have exactly 3 choices, each weaving in different concepts
- Each choice should be 1-2 sentences of engaging narrative

${languageNote}

Return ONLY the JSON object, no other text.`

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.9,
        maxOutputTokens: 1800,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    if (!parsed || typeof parsed !== 'object') {
      return { storyPrompt: '', conceptChecklist: [], starterSuggestion: '', imageStyle: '', missionHook: '', sceneImagePrompt: '', conceptCards: [], chapters: {}, error: 'INVALID_RESPONSE' }
    }

    const storyPrompt = typeof parsed.storyPrompt === 'string' ? parsed.storyPrompt.trim() : ''
    const conceptChecklist = Array.isArray(parsed.conceptChecklist)
      ? parsed.conceptChecklist.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim()).slice(0, 5)
      : []
    const starterSuggestion = typeof parsed.starterSuggestion === 'string' ? parsed.starterSuggestion.trim() : ''
    const imageStyle = typeof parsed.imageStyle === 'string' ? parsed.imageStyle.trim() : ''
    const missionHook = typeof parsed.missionHook === 'string' ? parsed.missionHook.trim() : storyPrompt
    const sceneImagePrompt = typeof parsed.sceneImagePrompt === 'string' ? parsed.sceneImagePrompt.trim() : ''
    const conceptCards = Array.isArray(parsed.conceptCards)
      ? parsed.conceptCards.filter(c => c && typeof c === 'object').map(c => ({
          concept: typeof c.concept === 'string' ? c.concept.trim() : '',
          icon: typeof c.icon === 'string' ? c.icon.trim() : '📝',
          description: typeof c.description === 'string' ? c.description.trim() : ''
        })).filter(c => c.concept)
      : conceptChecklist.map(c => ({ concept: c, icon: '📝', description: '' }))

    const defaultChapterPrompts = language === 'zh'
      ? {
          1: '我们的故事从哪里开始？',
          2: '下一步会发生什么？',
          3: '故事如何收尾？',
        }
      : {
          1: 'Where does our story begin?',
          2: 'What challenge appears next?',
          3: 'How should the story end?',
        }

    const chapters = {}
    if (parsed.chapters && typeof parsed.chapters === 'object') {
      for (const chapterNumber of [1, 2, 3]) {
        const chapterKey = String(chapterNumber)
        const chapterData = parsed.chapters?.[chapterKey]
        if (!chapterData || typeof chapterData !== 'object') {
          continue
        }

        const chapterChoices = Array.isArray(chapterData.choices)
          ? chapterData.choices.filter(c => c && typeof c === 'object').map((choice, choiceIndex) => ({
              id: typeof choice.id === 'string' && choice.id.trim()
                ? choice.id.trim()
                : `${chapterNumber}${String.fromCharCode(97 + choiceIndex)}`,
              emoji: typeof choice.emoji === 'string' && choice.emoji.trim()
                ? choice.emoji.trim()
                : '📖',
              text: typeof choice.text === 'string' ? choice.text.trim() : '',
              conceptHints: Array.isArray(choice.conceptHints)
                ? choice.conceptHints.filter(h => typeof h === 'string' && h.trim()).map(h => h.trim()).slice(0, 3)
                : []
            })).filter(choice => choice.text).slice(0, 3)
          : []

        chapters[chapterKey] = {
          prompt: typeof chapterData.prompt === 'string' && chapterData.prompt.trim()
            ? chapterData.prompt.trim()
            : defaultChapterPrompts[chapterNumber],
          icon: typeof chapterData.icon === 'string' && chapterData.icon.trim()
            ? chapterData.icon.trim()
            : '📖',
          choices: chapterChoices,
        }
      }
    }

    if (!storyPrompt || conceptChecklist.length === 0 || !starterSuggestion || !imageStyle) {
      return { storyPrompt, conceptChecklist, starterSuggestion, imageStyle, missionHook, sceneImagePrompt, conceptCards, chapters, error: 'INVALID_RESPONSE' }
    }

    return { storyPrompt, conceptChecklist, starterSuggestion, imageStyle, missionHook, sceneImagePrompt, conceptCards, chapters, error: null }
  } catch (error) {
    console.error('[Gemini] Story prompt generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { storyPrompt: '', conceptChecklist: [], starterSuggestion: '', imageStyle: '', missionHook: '', sceneImagePrompt: '', conceptCards: [], chapters: {}, error: 'RATE_LIMITED' }
    }

    if (error.message?.includes('JSON')) {
      return { storyPrompt: '', conceptChecklist: [], starterSuggestion: '', imageStyle: '', missionHook: '', sceneImagePrompt: '', conceptCards: [], chapters: {}, error: 'PARSE_ERROR' }
    }

    return { storyPrompt: '', conceptChecklist: [], starterSuggestion: '', imageStyle: '', missionHook: '', sceneImagePrompt: '', conceptCards: [], chapters: {}, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate next story chapter choices and illustration prompt based on previous selections.
 *
 * @param {Object} params
 * @param {string} params.topicName
 * @param {string[]} params.conceptChecklist
 * @param {Array<{chapter: number, selectedText: string}>} params.previousChapters
 * @param {number} params.currentChapter - 2, 3, or 4
 * @param {string} params.imageStyle
 * @param {string} params.language - 'en' or 'zh'
 * @returns {Promise<{illustration: {imagePrompt: string, sceneDescription: string, panelCaptions: string[]}, nextChapter: Object|null, conceptsFound: string[], error: string|null}>}
 */
export async function generateStoryChapter({ topicName, conceptChecklist = [], previousChapters = [], currentChapter, imageStyle, language = 'en' }) {
  const ai = getAIClient()
  if (!ai) {
    return { illustration: { imagePrompt: '', sceneDescription: '', panelCaptions: [] }, nextChapter: null, conceptsFound: [], error: 'API_NOT_AVAILABLE' }
  }

  try {
    // Build context from previous chapters
    const previousContext = previousChapters
      .map(ch => `Chapter ${ch.chapter}: ${ch.selectedText}`)
      .join('\n')

    const conceptList = conceptChecklist.join(', ')

    const chapterNames = { 2: 'The Adventure', 3: 'The Ending', 4: 'Final Illustration' }
    const chapterName = chapterNames[currentChapter] || `Chapter ${currentChapter}`

    const isLastChapter = currentChapter >= 4

    // Build the prompt
    const nextChapterSection = isLastChapter
      ? '"nextChapter": null'
      : `"nextChapter": {
      "prompt": "Question for chapter ${currentChapter + 1}",
      "icon": "emoji",
      "choices": [
        {"id": "${currentChapter + 1}a", "emoji": "emoji", "text": "Story choice (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "${currentChapter + 1}b", "emoji": "emoji", "text": "Story choice (1-2 sentences)", "conceptHints": ["concept"]},
        {"id": "${currentChapter + 1}c", "emoji": "emoji", "text": "Story choice (1-2 sentences)", "conceptHints": ["concept"]}
      ]
    }`

    const prompt = language === 'zh'
      ? `你是一个儿童故事助手。根据之前的章节选择，继续这个故事。

主题: ${topicName}
概念清单: ${conceptList}
之前的章节:
${previousContext}

当前章节: ${currentChapter} - ${chapterName}

返回JSON:
{
  "illustration": {
    "imagePrompt": "4格漫画页插图提示：描述一个2x2网格，包含Panel 1到Panel 4连续剧情（${imageStyle}）",
    "sceneDescription": "本页场景摘要（1句话）",
    "panelCaptions": [
      "Panel 1 字幕（1句话）",
      "Panel 2 字幕（1句话）",
      "Panel 3 字幕（1句话）",
      "Panel 4 字幕（1句话）"
    ]
  },
  ${isLastChapter ? '"nextChapter": null' : `"nextChapter": {
    "prompt": "下一章的问题",
    "icon": "表情符号",
    "choices": [
      {"id": "${currentChapter + 1}a", "emoji": "表情", "text": "故事选择（1-2句话）", "conceptHints": ["概念"]}
    ]
  }`},
  "conceptsFound": ["在之前选择中检测到的概念"]
}

要求:
- 插图提示应明确描述4格漫画页（2x2布局），每格展示连续剧情，风格为${imageStyle}
- imagePrompt应强调：清晰分格边框、从左上到右上再到左下到右下的阅读顺序、画面中不含文字
- 场景描述简洁（1句话）
- panelCaptions必须有4条短句，每条对应一个分镜
- 如果不是最后一章，下一章应有3个选择
- 选择应与之前的故事连贯
- 每个选择应融入不同的概念
- 检测之前选择中使用的概念

只返回JSON。`
      : `You are a children's story assistant. Continue this story based on previous chapter selections.

Topic: ${topicName}
Concept checklist: ${conceptList}
Previous chapters:
${previousContext}

Current chapter: ${currentChapter} - ${chapterName}

Return a JSON object:
{
  "illustration": {
    "imagePrompt": "4-panel manga page prompt: describe a 2x2 grid with sequential beats [Panel 1]...[Panel 4] (${imageStyle})",
    "sceneDescription": "Overall scene summary in 1 sentence",
    "panelCaptions": [
      "Panel 1 caption (1 sentence)",
      "Panel 2 caption (1 sentence)",
      "Panel 3 caption (1 sentence)",
      "Panel 4 caption (1 sentence)"
    ]
  },
  ${nextChapterSection},
  "conceptsFound": ["concepts detected in previous selections"]
}

Requirements:
- illustration imagePrompt should explicitly describe a 4-panel manga/comic page in a 2x2 grid, suitable for ${imageStyle}
- imagePrompt should enforce: clear panel borders, sequential flow (top-left -> top-right -> bottom-left -> bottom-right), and no text in the image
- sceneDescription should be concise (1 sentence)
- panelCaptions must contain exactly 4 short sentences (one per panel) that narrate sequential story beats
- If not the last chapter, nextChapter should have exactly 3 choices
- Choices must be coherent with the story so far
- Each choice should weave in different concepts from the checklist
- conceptsFound should list concepts from the checklist that appeared in previous selections
- Keep choice text to 1-2 engaging sentences
${isLastChapter ? '- This is the final chapter, so nextChapter should be null' : currentChapter === 3 ? '- nextChapter choices should be about how the story concludes - these are the final choices before the ending' : `- Chapter ${currentChapter + 1} name: ${chapterNames[currentChapter + 1] || 'Next'}`}

Return ONLY the JSON object, no other text.`

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.9,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    if (!parsed || typeof parsed !== 'object') {
      return { illustration: { imagePrompt: '', sceneDescription: '', panelCaptions: [] }, nextChapter: null, conceptsFound: [], error: 'INVALID_RESPONSE' }
    }

    // Parse illustration
    const illustration = {
      imagePrompt: typeof parsed.illustration?.imagePrompt === 'string' ? parsed.illustration.imagePrompt.trim() : '',
      sceneDescription: typeof parsed.illustration?.sceneDescription === 'string' ? parsed.illustration.sceneDescription.trim() : '',
      panelCaptions: Array.isArray(parsed.illustration?.panelCaptions)
        ? parsed.illustration.panelCaptions
          .filter((caption) => typeof caption === 'string' && caption.trim())
          .map((caption) => caption.trim())
          .slice(0, 4)
        : []
    }

    // Parse next chapter (null for last chapter)
    let nextChapter = null
    if (parsed.nextChapter && typeof parsed.nextChapter === 'object') {
      nextChapter = {
        prompt: typeof parsed.nextChapter.prompt === 'string' ? parsed.nextChapter.prompt.trim() : 'What happens next?',
        icon: typeof parsed.nextChapter.icon === 'string' ? parsed.nextChapter.icon.trim() : '📖',
        choices: Array.isArray(parsed.nextChapter.choices)
          ? parsed.nextChapter.choices.filter(c => c && typeof c === 'object').map(c => ({
              id: typeof c.id === 'string' ? c.id : '',
              emoji: typeof c.emoji === 'string' ? c.emoji : '📖',
              text: typeof c.text === 'string' ? c.text.trim() : '',
              conceptHints: Array.isArray(c.conceptHints) ? c.conceptHints.filter(h => typeof h === 'string') : []
            })).filter(c => c.text).slice(0, 3)
          : []
      }
    }

    // Parse concepts found
    const conceptsFound = Array.isArray(parsed.conceptsFound)
      ? parsed.conceptsFound.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim())
      : []

    return { illustration, nextChapter, conceptsFound, error: null }
  } catch (error) {
    console.error('[Gemini] Story chapter generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { illustration: { imagePrompt: '', sceneDescription: '', panelCaptions: [] }, nextChapter: null, conceptsFound: [], error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { illustration: { imagePrompt: '', sceneDescription: '', panelCaptions: [] }, nextChapter: null, conceptsFound: [], error: 'PARSE_ERROR' }
    }

    return { illustration: { imagePrompt: '', sceneDescription: '', panelCaptions: [] }, nextChapter: null, conceptsFound: [], error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate finalized story scenes from all selected answers in a single pass.
 *
 * @param {Object} params
 * @param {string} params.topicName
 * @param {string[]} params.conceptChecklist
 * @param {Array<{chapterNumber: number, selectedText: string, conceptHints?: string[]}>} params.answers
 * @param {string} params.imageStyle
 * @param {string} params.language - 'en' or 'zh'
 * @returns {Promise<{scenes: Array<{chapterNumber: number, chapterTitle: string, narrativeText: string, sceneDescription: string, imagePrompt: string, panelCaptions: string[]}>, conceptsFound: string[], error: string|null}>}
 */
export async function generateFinalStoryFromAnswers({
  topicName,
  conceptChecklist = [],
  answers = [],
  imageStyle,
  language = 'en',
}) {
  const ai = getAIClient()
  if (!ai) {
    return { scenes: [], conceptsFound: [], error: 'API_NOT_AVAILABLE' }
  }

  try {
    const normalizedAnswers = Array.isArray(answers)
      ? answers
        .filter(answer => answer && typeof answer === 'object' && typeof answer.selectedText === 'string' && answer.selectedText.trim())
        .map((answer, index) => ({
          chapterNumber: typeof answer.chapterNumber === 'number' && Number.isFinite(answer.chapterNumber)
            ? answer.chapterNumber
            : index + 1,
          selectedText: answer.selectedText.trim(),
          conceptHints: Array.isArray(answer.conceptHints)
            ? answer.conceptHints.filter((hint) => typeof hint === 'string' && hint.trim()).map((hint) => hint.trim()).slice(0, 4)
            : [],
        }))
      : []

    const answerContext = normalizedAnswers
      .map(answer => {
        const hints = answer.conceptHints.length > 0 ? ` (concept hints: ${answer.conceptHints.join(', ')})` : ''
        return `Chapter ${answer.chapterNumber} answer: ${answer.selectedText}${hints}`
      })
      .join('\n')

    const conceptList = conceptChecklist.join(', ')

    const prompt = language === 'zh'
      ? `你是一个儿童故事助手。请根据用户已经选择的三段剧情，生成完整的三页漫画故事（每页4格）。\n\n主题: ${topicName}\n概念清单: ${conceptList}\n用户选择:\n${answerContext}\n\n请返回JSON:\n{\n  \"scenes\": [\n    {\n      \"chapterNumber\": 1,\n      \"chapterTitle\": \"第1章标题\",\n      \"narrativeText\": \"该章完整叙述（2-4句）\",\n      \"sceneDescription\": \"本页场景摘要（1句）\",\n      \"imagePrompt\": \"4格漫画页提示：描述2x2网格，按顺序讲述剧情（${imageStyle}）\",\n      \"panelCaptions\": [\"第1格字幕\", \"第2格字幕\", \"第3格字幕\", \"第4格字幕\"]\n    },\n    {\n      \"chapterNumber\": 2,\n      \"chapterTitle\": \"第2章标题\",\n      \"narrativeText\": \"该章完整叙述（2-4句）\",\n      \"sceneDescription\": \"本页场景摘要（1句）\",\n      \"imagePrompt\": \"4格漫画页提示：描述2x2网格，按顺序讲述剧情（${imageStyle}）\",\n      \"panelCaptions\": [\"第1格字幕\", \"第2格字幕\", \"第3格字幕\", \"第4格字幕\"]\n    },\n    {\n      \"chapterNumber\": 3,\n      \"chapterTitle\": \"第3章标题\",\n      \"narrativeText\": \"该章完整叙述（2-4句）\",\n      \"sceneDescription\": \"本页场景摘要（1句）\",\n      \"imagePrompt\": \"4格漫画页提示：描述2x2网格，按顺序讲述剧情（${imageStyle}）\",\n      \"panelCaptions\": [\"第1格字幕\", \"第2格字幕\", \"第3格字幕\", \"第4格字幕\"]\n    }\n  ],\n  \"conceptsFound\": [\"命中的概念\"]\n}\n\n要求:\n- scenes必须正好3章，对应chapterNumber 1,2,3\n- 每章都必须有panelCaptions且正好4条短句\n- imagePrompt必须强调：2x2分格、清晰边框、从左上到右上再到左下到右下、画面里不要文字\n- chapterTitle要简短有趣\n- narrativeText要和用户选择一致\n- conceptsFound仅包含概念清单中的词\n\n只返回JSON。`
      : `You are a children's story assistant. Based on the user's selected answers, generate a complete 3-page manga story (4 panels per page).\n\nTopic: ${topicName}\nConcept checklist: ${conceptList}\nSelected answers:\n${answerContext}\n\nReturn JSON:\n{\n  \"scenes\": [\n    {\n      \"chapterNumber\": 1,\n      \"chapterTitle\": \"Chapter 1 title\",\n      \"narrativeText\": \"Full chapter narration (2-4 sentences)\",\n      \"sceneDescription\": \"One-sentence scene summary\",\n      \"imagePrompt\": \"4-panel manga page prompt describing a 2x2 sequential layout (${imageStyle})\",\n      \"panelCaptions\": [\"Panel 1 caption\", \"Panel 2 caption\", \"Panel 3 caption\", \"Panel 4 caption\"]\n    },\n    {\n      \"chapterNumber\": 2,\n      \"chapterTitle\": \"Chapter 2 title\",\n      \"narrativeText\": \"Full chapter narration (2-4 sentences)\",\n      \"sceneDescription\": \"One-sentence scene summary\",\n      \"imagePrompt\": \"4-panel manga page prompt describing a 2x2 sequential layout (${imageStyle})\",\n      \"panelCaptions\": [\"Panel 1 caption\", \"Panel 2 caption\", \"Panel 3 caption\", \"Panel 4 caption\"]\n    },\n    {\n      \"chapterNumber\": 3,\n      \"chapterTitle\": \"Chapter 3 title\",\n      \"narrativeText\": \"Full chapter narration (2-4 sentences)\",\n      \"sceneDescription\": \"One-sentence scene summary\",\n      \"imagePrompt\": \"4-panel manga page prompt describing a 2x2 sequential layout (${imageStyle})\",\n      \"panelCaptions\": [\"Panel 1 caption\", \"Panel 2 caption\", \"Panel 3 caption\", \"Panel 4 caption\"]\n    }\n  ],\n  \"conceptsFound\": [\"matched concepts\"]\n}\n\nRequirements:\n- scenes must include exactly 3 chapters with chapterNumber 1, 2, and 3\n- each scene must contain exactly 4 short panelCaptions\n- imagePrompt must enforce: 2x2 panel grid, clear panel borders, top-left -> top-right -> bottom-left -> bottom-right story flow, and no text in the image\n- chapterTitle should be short and kid-friendly\n- narrativeText must stay coherent with the selected answers\n- conceptsFound must only include concepts from the checklist\n\nReturn ONLY JSON.`

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.85,
        maxOutputTokens: 2400,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    if (!parsed || typeof parsed !== 'object') {
      return { scenes: [], conceptsFound: [], error: 'INVALID_RESPONSE' }
    }

    const scenes = Array.isArray(parsed.scenes)
      ? parsed.scenes
        .filter(scene => scene && typeof scene === 'object')
        .slice(0, 3)
        .map((scene, index) => {
          const chapterNumber = index + 1
          return {
            chapterNumber,
            chapterTitle: typeof scene.chapterTitle === 'string' && scene.chapterTitle.trim()
              ? scene.chapterTitle.trim()
              : `Chapter ${chapterNumber}`,
            narrativeText: typeof scene.narrativeText === 'string' && scene.narrativeText.trim()
              ? scene.narrativeText.trim()
              : normalizedAnswers[index]?.selectedText || '',
            sceneDescription: typeof scene.sceneDescription === 'string' ? scene.sceneDescription.trim() : '',
            imagePrompt: typeof scene.imagePrompt === 'string' ? scene.imagePrompt.trim() : '',
            panelCaptions: Array.isArray(scene.panelCaptions)
              ? scene.panelCaptions
                .filter((caption) => typeof caption === 'string' && caption.trim())
                .map((caption) => caption.trim())
                .slice(0, 4)
              : [],
          }
        })
      : []

    if (scenes.length !== 3 || scenes.some((scene) => !scene.imagePrompt || scene.panelCaptions.length === 0)) {
      return { scenes: [], conceptsFound: [], error: 'INVALID_RESPONSE' }
    }

    const checklistSet = new Set(conceptChecklist.map((concept) => String(concept || '').trim()).filter(Boolean))
    const conceptsFound = Array.isArray(parsed.conceptsFound)
      ? parsed.conceptsFound
        .filter(concept => typeof concept === 'string' && concept.trim())
        .map(concept => concept.trim())
        .filter(concept => checklistSet.size === 0 || checklistSet.has(concept))
      : []

    return { scenes, conceptsFound, error: null }
  } catch (error) {
    console.error('[Gemini] Final story generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { scenes: [], conceptsFound: [], error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { scenes: [], conceptsFound: [], error: 'PARSE_ERROR' }
    }

    return { scenes: [], conceptsFound: [], error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Extract a scene from a story transcript for Story Studio and return structured JSON.
 *
 * @param {Object} params
 * @param {string} params.transcript
 * @param {string} params.topicName
 * @param {string[]} params.conceptChecklist
 * @param {string[]} params.previousScenes
 * @param {string} params.language - 'en' or 'zh'
 * @returns {Promise<{sceneDescription: string, imagePrompt: string, conceptsFound: string[], narrativeText: string, error: string|null}>}
 */
export async function extractStoryScene({ transcript, topicName, conceptChecklist = [], previousScenes = [], language }) {
  const ai = getAIClient()
  if (!ai) {
    return { sceneDescription: '', imagePrompt: '', conceptsFound: [], narrativeText: '', error: 'API_NOT_AVAILABLE' }
  }

  try {
    const sceneContext = Array.isArray(previousScenes) && previousScenes.length > 0
      ? `\nPrevious scenes:\n${previousScenes.map((s, i) => `${i + 1}. ${String(s || '').slice(0, 200)}`).join('\n')}`
      : ''

    const checklistText = Array.isArray(conceptChecklist)
      ? conceptChecklist.filter(Boolean).join(', ')
      : ''

    const prompt = language === 'zh'
      ? `从这段孩子讲述的故事中提取一个场景。

主题: ${topicName}
概念清单: ${checklistText}
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
- 场景描述应该简洁
- 图像提示应该详细，适合生成儿童友好的插图
- 只检测概念清单中出现的概念（尽量匹配）
- 叙述文本应该是完整的句子

只返回JSON。`
      : `Extract a scene from this kid's story narration.

Topic: ${topicName}
Concept checklist: ${checklistText}
${sceneContext}

Story text:
${transcript}

Return a JSON object:
{
  "sceneDescription": "Brief scene description (for internal use)",
  "imagePrompt": "Detailed prompt for illustration (cartoon style, friendly, colorful)",
  "conceptsFound": ["detected concepts from checklist"],
  "narrativeText": "Clean narrative text for this scene"
}

Requirements:
- Scene description should be concise
- Image prompt should be detailed and suitable for kid-friendly illustration
- Detect which concepts from the checklist appear in this scene
- Narrative text should be a complete sentence or two

Return ONLY JSON.`

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    if (!parsed || typeof parsed !== 'object') {
      return { sceneDescription: '', imagePrompt: '', conceptsFound: [], narrativeText: '', error: 'INVALID_RESPONSE' }
    }

    const sceneDescription = typeof parsed.sceneDescription === 'string' ? parsed.sceneDescription.trim() : ''
    const imagePrompt = typeof parsed.imagePrompt === 'string' ? parsed.imagePrompt.trim() : ''
    const narrativeText = typeof parsed.narrativeText === 'string' ? parsed.narrativeText.trim() : ''
    const conceptsFound = Array.isArray(parsed.conceptsFound)
      ? parsed.conceptsFound.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim()).slice(0, 10)
      : []

    if (!sceneDescription || !imagePrompt || !narrativeText) {
      return { sceneDescription, imagePrompt, conceptsFound, narrativeText, error: 'INVALID_RESPONSE' }
    }

    return { sceneDescription, imagePrompt, conceptsFound, narrativeText, error: null }
  } catch (error) {
    console.error('[Gemini] Story scene extraction error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { sceneDescription: '', imagePrompt: '', conceptsFound: [], narrativeText: '', error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('JSON')) {
      return { sceneDescription: '', imagePrompt: '', conceptsFound: [], narrativeText: '', error: 'PARSE_ERROR' }
    }

    return { sceneDescription: '', imagePrompt: '', conceptsFound: [], narrativeText: '', error: error.message || 'UNKNOWN_ERROR' }
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
  classifyTopicZone,
  generateWorldPiecePrompt,
  generateWorldPieceImage,
  generateLivingWorldEvolutionPlan,
  generateLivingWorldImage,
  generateWhatIfScenario,
  detectLanguage,
  generateStoryPrompt,
  generateStoryChapter,
  generateFinalStoryFromAnswers,
  extractStoryScene,
}
