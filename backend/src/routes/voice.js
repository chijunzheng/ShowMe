import express from 'express'
import { generateTTS, detectLanguage } from '../services/gemini.js'
import { sanitizeQuery } from '../utils/sanitize.js'

const router = express.Router()

/**
 * POST /api/voice/speak
 * Generate TTS audio for voice-agent lines.
 *
 * Request body:
 * - text (required): text to speak
 * - voice (optional): Gemini prebuilt voice name
 *
 * Response:
 * - audioUrl: Base64 data URI of the audio (WAV format)
 * - duration: Duration of the audio in milliseconds
 * - text: The sanitized text that was spoken
 * - available: Boolean indicating if TTS was successful
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, voice } = req.body || {}

    const { sanitized, error } = sanitizeQuery(text)
    if (error) {
      return res.status(400).json({
        error,
        field: 'text',
      })
    }

    // Detect language from text for multi-language TTS support
    const language = detectLanguage(sanitized)

    const ttsResult = await generateTTS(sanitized, {
      ...(typeof voice === 'string' && voice.trim() ? { voice: voice.trim() } : {}),
      language,
    })

    if (ttsResult.error) {
      console.warn('[Voice] TTS error:', ttsResult.error)
      if (ttsResult.error === 'RATE_LIMITED') {
        console.warn('[Voice] Rate limited by Cloud TTS API')
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60,
        })
      }

      return res.json({
        audioUrl: null,
        duration: 0,
        text: sanitized,
        available: false,
        error: ttsResult.error,
      })
    }

    return res.json({
      audioUrl: ttsResult.audioUrl,
      duration: ttsResult.duration,
      text: sanitized,
      available: true,
    })
  } catch (error) {
    console.error('[Voice] Error generating TTS:', error)
    return res.status(500).json({
      error: 'Failed to generate voice audio',
      available: false,
    })
  }
})

export default router
