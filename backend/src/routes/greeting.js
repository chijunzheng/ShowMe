import express from 'express'

const router = express.Router()

// Greeting message for cold start
const GREETING_MESSAGE = "Hi! I'm your AI tutor. What would you like to learn about today?"

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
    // TTS greeting disabled to preserve quota; return text-only greeting.
    res.json({
      audioUrl: null,
      duration: 0,
      text: GREETING_MESSAGE,
      available: false,
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
