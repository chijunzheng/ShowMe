import express from 'express'
import { generateTTS, isGeminiAvailable } from '../services/gemini.js'

const router = express.Router()

// Greeting message for cold start
const GREETING_MESSAGE = "Hi! I'm your AI tutor. What would you like to learn about today?"

// Log Gemini availability for greeting
console.log(`[Greeting] Gemini API available for TTS: ${isGeminiAvailable()}`)

/**
 * POST /api/greeting
 * Generate TTS audio for the cold start greeting
 * CORE010: AI greeting on cold start
 *
 * This endpoint generates a spoken greeting using Gemini TTS.
 * If the API is not available, returns a flag indicating no audio.
 *
 * Response:
 * - audioUrl: Base64 data URI of the greeting audio (WAV format)
 * - duration: Duration of the audio in milliseconds
 * - text: The greeting text that was spoken
 * - available: Boolean indicating if TTS was successful
 */
router.post('/', async (req, res) => {
  try {
    // Check if Gemini TTS is available
    if (!isGeminiAvailable()) {
      console.log('[Greeting] Gemini API not available, returning no audio')
      return res.json({
        audioUrl: null,
        duration: 0,
        text: GREETING_MESSAGE,
        available: false,
      })
    }

    console.log('[Greeting] Generating TTS for greeting message')

    // Generate TTS audio for the greeting
    const ttsResult = await generateTTS(GREETING_MESSAGE)

    if (ttsResult.error) {
      console.warn('[Greeting] TTS generation failed:', ttsResult.error)
      return res.json({
        audioUrl: null,
        duration: 0,
        text: GREETING_MESSAGE,
        available: false,
        error: ttsResult.error,
      })
    }

    console.log('[Greeting] TTS generated successfully, duration:', ttsResult.duration, 'ms')

    res.json({
      audioUrl: ttsResult.audioUrl,
      duration: ttsResult.duration,
      text: GREETING_MESSAGE,
      available: true,
    })
  } catch (error) {
    console.error('[Greeting] Error generating greeting:', error)
    res.status(500).json({
      error: 'Failed to generate greeting',
      text: GREETING_MESSAGE,
      available: false,
    })
  }
})

export default router
