/**
 * Gemini AI Service Module
 * F016: Real AI-generated educational diagrams
 * F017: Real TTS audio narration
 *
 * Provides functions to generate educational content using Google's Gemini API:
 * - generateScript: Creates slide scripts with educational content
 * - generateEducationalImage: Creates diagrams/visuals for slides
 * - generateTTS: Converts text to speech audio
 */

import { GoogleGenAI } from '@google/genai'

// Configuration constants
const TEXT_MODEL = 'gemini-2.0-flash'
const IMAGE_MODEL = 'gemini-2.0-flash-exp-image-generation'
const TTS_MODEL = 'gemini-2.5-flash-preview-tts'

// Default TTS voice - Kore is a clear, engaging voice suitable for education
const DEFAULT_VOICE = 'Kore'

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
- Create 3-4 slides that progressively explain the concept
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
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
    const jsonStr = jsonMatch[1] || text

    // Try to parse the JSON
    const parsed = JSON.parse(jsonStr.trim())

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
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text]
    const jsonStr = jsonMatch[1] || text
    const parsed = JSON.parse(jsonStr.trim())

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

export default {
  isGeminiAvailable,
  generateScript,
  generateEducationalImage,
  generateTTS,
  generateSlideContent,
  generateEngagement,
}
