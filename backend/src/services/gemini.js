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
const TEXT_MODEL = 'gemini-3-pro-preview'
const IMAGE_MODEL = 'gemini-3-pro-image-preview'
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'
const FAST_MODEL = 'gemini-2.0-flash' // Fast model for low-latency operations

// Default TTS voice - Kore is a clear, engaging voice suitable for education
const DEFAULT_VOICE = 'Kore'

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
 * Generate an educational script with slides based on a user query
 *
 * @param {string} query - The user's question or topic
 * @param {Object} options - Generation options
 * @param {Array} options.conversationHistory - Previous conversation context
 * @param {boolean} options.isFollowUp - Whether this is a follow-up question
 * @returns {Promise<{slides: Array<{subtitle: string, imagePrompt: string}>, error: string|null}>}
 */
export async function generateScript(query, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { slides: null, error: 'API_NOT_AVAILABLE' }
  }

  const { conversationHistory = [], isFollowUp = false } = options

  const systemPrompt = `You are an expert educational content creator for a visual learning app.
Your task is to create a script for an educational slideshow that explains topics clearly.

Guidelines:
- Create 3-6 slides based on topic complexity:
  - Simple concepts (definitions, basic facts): 3 slides
  - Moderate topics (processes, comparisons): 4 slides
  - Complex topics (multi-step systems, deep explanations): 5-6 slides
- Each slide should have a clear, concise explanation (2-3 sentences max)
- Include an image prompt describing what educational diagram/visual should accompany each slide
- Make content accessible for general audiences (ages 10+)
- Use analogies and relatable examples when possible
- For follow-up questions, build on previous context without repeating it

Output Format (JSON):
{
  "slides": [
    {
      "subtitle": "Clear explanation text that will be spoken aloud",
      "imagePrompt": "Description of educational diagram showing [concept], with labeled parts including [details]. Style: clean, colorful educational illustration."
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

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
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
      subtitle: slide.subtitle || `Slide ${index + 1}`,
      imagePrompt: slide.imagePrompt || `Educational diagram about ${query}`
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

/**
 * Generate an educational diagram/image based on a prompt
 *
 * @param {string} imagePrompt - Description of the image to generate
 * @param {Object} options - Generation options
 * @param {string} options.topic - The overall topic for context
 * @returns {Promise<{imageUrl: string|null, error: string|null}>}
 */
export async function generateEducationalImage(imagePrompt, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { imageUrl: null, error: 'API_NOT_AVAILABLE' }
  }

  const { topic = '' } = options

  // Enhance the prompt for better educational diagrams
  const enhancedPrompt = `Create an educational diagram illustration: ${imagePrompt}

Style requirements:
- Clean, professional educational illustration style
- Bright, engaging colors suitable for learning
- Clear labels and annotations where appropriate
- Simple, uncluttered composition
- No photorealistic elements - use illustrated/diagrammatic style
- White or light colored background for clarity
${topic ? `- Topic context: ${topic}` : ''}`

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: enhancedPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      }
    })

    // Extract image data from response
    const parts = response.candidates?.[0]?.content?.parts || []

    for (const part of parts) {
      if (part.inlineData) {
        const mimeType = part.inlineData.mimeType || 'image/png'
        const base64Data = part.inlineData.data
        const imageUrl = `data:${mimeType};base64,${base64Data}`
        return { imageUrl, error: null }
      }
    }

    // No image in response
    return { imageUrl: null, error: 'NO_IMAGE_GENERATED' }
  } catch (error) {
    console.error('[Gemini] Image generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { imageUrl: null, error: 'RATE_LIMITED' }
    }
    if (error.message?.includes('safety') || error.message?.includes('blocked')) {
      return { imageUrl: null, error: 'CONTENT_FILTERED' }
    }

    return { imageUrl: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

/**
 * Generate TTS audio from text
 *
 * @param {string} text - The text to convert to speech
 * @param {Object} options - TTS options
 * @param {string} options.voice - Voice name to use (default: Kore)
 * @returns {Promise<{audioUrl: string|null, duration: number, error: string|null}>}
 */
export async function generateTTS(text, options = {}) {
  const ai = getAIClient()
  if (!ai) {
    return { audioUrl: null, duration: 0, error: 'API_NOT_AVAILABLE' }
  }

  const { voice = DEFAULT_VOICE } = options

  // Prepare text with speaking instructions for natural delivery
  const speakingPrompt = `Speak clearly and engagingly, as if teaching a curious student: ${text}`

  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: speakingPrompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    })

    // Extract audio data
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

    if (!audioData) {
      return { audioUrl: null, duration: 0, error: 'NO_AUDIO_GENERATED' }
    }

    // Convert PCM to WAV and create data URI
    // The Gemini TTS returns raw PCM data at 24kHz, 16-bit mono
    const pcmBuffer = Buffer.from(audioData, 'base64')
    const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16)
    const audioUrl = `data:audio/wav;base64,${wavBuffer.toString('base64')}`

    // Estimate duration from PCM data length
    // PCM at 24kHz, 16-bit (2 bytes per sample), mono
    const durationMs = Math.round((pcmBuffer.length / 2 / 24000) * 1000)

    return { audioUrl, duration: durationMs, error: null }
  } catch (error) {
    console.error('[Gemini] TTS generation error:', error.message)

    if (error.message?.includes('quota') || error.message?.includes('rate')) {
      return { audioUrl: null, duration: 0, error: 'RATE_LIMITED' }
    }

    return { audioUrl: null, duration: 0, error: error.message || 'UNKNOWN_ERROR' }
  }
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
 * @returns {Promise<{imageUrl: string|null, audioUrl: string|null, duration: number, errors: Array}>}
 */
export async function generateSlideContent(slideScript, options = {}) {
  const { subtitle, imagePrompt } = slideScript
  const errors = []

  // Generate image and audio in parallel for faster response
  const [imageResult, audioResult] = await Promise.all([
    generateEducationalImage(imagePrompt, options),
    generateTTS(subtitle, options)
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
 * @returns {Promise<{funFact: Object|null, suggestedQuestions: Array|null, error: string|null}>}
 */
export async function generateEngagement(query) {
  const ai = getAIClient()
  if (!ai) {
    return { funFact: null, suggestedQuestions: null, error: 'API_NOT_AVAILABLE' }
  }

  const prompt = `Based on the topic "${query}", provide:
1. One surprising, fascinating fun fact that would engage learners
2. Three follow-up questions that would help deepen understanding

Output Format (JSON):
{
  "funFact": {
    "emoji": "single relevant emoji",
    "text": "The fun fact text (1-2 sentences)"
  },
  "suggestedQuestions": [
    "Question 1?",
    "Question 2?",
    "Question 3?"
  ]
}`

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 512,
      }
    })

    const text = response.text || ''
    const jsonStr = repairJSON(extractJSON(text))
    const parsed = JSON.parse(jsonStr)

    return {
      funFact: parsed.funFact || null,
      suggestedQuestions: parsed.suggestedQuestions || [],
      error: null
    }
  } catch (error) {
    console.error('[Gemini] Engagement generation error:', error.message)
    return { funFact: null, suggestedQuestions: null, error: error.message || 'UNKNOWN_ERROR' }
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

export default {
  isGeminiAvailable,
  generateScript,
  generateEducationalImage,
  generateTTS,
  generateSlideContent,
  generateEngagement,
  transcribeAudio,
  generateSlideResponse,
  generateTopicName,
}
