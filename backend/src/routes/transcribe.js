/**
 * Transcription Route
 * F027a: Backend STT endpoint
 *
 * POST /api/transcribe - Accepts audio blob and returns transcription
 * Uses Gemini 3 Flash for speech recognition
 * Supports audio/webm and audio/wav formats
 */

import express from 'express'
import multer from 'multer'
import logger from '../utils/logger.js'
import { isGeminiAvailable, transcribeAudio } from '../services/gemini.js'

const router = express.Router()

// Configure multer for memory storage (files kept in buffer)
// Maximum file size: 10MB for audio files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, callback) => {
    // Accept only audio files (webm, wav, mp3, ogg, etc.)
    const rawMimeType = file.mimetype || ''
    const normalizedMimeType = rawMimeType.split(';')[0].trim()
    const allowedMimeTypes = [
      'audio/webm',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg',
      'audio/mp4',
      'audio/m4a',
    ]

    if (allowedMimeTypes.includes(normalizedMimeType)) {
      file.mimetype = normalizedMimeType
      callback(null, true)
    } else {
      callback(new Error(`Unsupported audio format: ${rawMimeType || normalizedMimeType}`), false)
    }
  },
})

// Log service availability on startup
logger.info('API', `[Transcribe] Gemini available: ${isGeminiAvailable()}`)

/**
 * POST /api/transcribe
 * Transcribe audio blob to text using Gemini 3 Flash
 *
 * Request: multipart/form-data with 'audio' field containing audio file
 * Response: { transcription: "text here", model: "chirp3" | "gemini" }
 * Errors:
 *   - 400: Empty audio, missing audio field, unsupported format
 *   - 500: Transcription failed
 *   - 503: No transcription service available
 */
router.post('/', upload.single('audio'), async (req, res) => {
  logger.time('API', 'transcribe-request')

  try {
    // Check if file was uploaded
    if (!req.file) {
      logger.warn('API', '[Transcribe] No audio file provided')
      return res.status(400).json({
        error: 'No audio file provided',
        field: 'audio',
      })
    }

    const { buffer, mimetype, size } = req.file
    const rawMimeType = mimetype || ''
    const normalizedMimeType = rawMimeType.split(';')[0].trim()

    // Validate buffer has content
    if (!buffer || buffer.length === 0) {
      logger.warn('API', '[Transcribe] Empty audio file')
      return res.status(400).json({
        error: 'Empty audio file',
        field: 'audio',
      })
    }

    const logContext = {
      mimeType: normalizedMimeType,
      size: `${(size / 1024).toFixed(2)}KB`,
    }
    if (rawMimeType && rawMimeType !== normalizedMimeType) {
      logContext.rawMimeType = rawMimeType
    }
    logger.info('API', '[Transcribe] Processing audio', logContext)

    let result
    let modelUsed

    // Use Gemini 3 Flash directly for speech recognition (skip Chirp 3)
    if (isGeminiAvailable()) {
      logger.info('API', '[Transcribe] Using Gemini 3 Flash')
      result = await transcribeAudio(buffer, normalizedMimeType)
      modelUsed = 'gemini'
    }

    // No service available
    if (!result) {
      logger.error('API', '[Transcribe] No transcription service available')
      return res.status(503).json({
        error: 'Transcription service temporarily unavailable',
      })
    }

    if (result.error) {
      logger.error('API', '[Transcribe] Transcription failed', {
        error: result.error,
        model: modelUsed,
      })

      // Map error types to appropriate HTTP status codes
      if (result.error === 'EMPTY_AUDIO' || result.error === 'INVALID_AUDIO') {
        return res.status(400).json({
          error: 'Invalid or empty audio',
          field: 'audio',
        })
      }

      if (result.error === 'RATE_LIMITED') {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please try again later.',
        })
      }

      if (result.error === 'PERMISSION_DENIED') {
        return res.status(503).json({
          error: 'Transcription service configuration error',
        })
      }

      return res.status(500).json({
        error: 'Transcription failed',
      })
    }

    logger.info('API', '[Transcribe] Success', {
      transcriptionLength: result.transcription?.length || 0,
      model: modelUsed,
      duration: result.duration ? `${result.duration}ms` : undefined,
    })
    logger.timeEnd('API', 'transcribe-request')

    // Return successful transcription
    res.json({
      transcription: result.transcription,
      model: modelUsed,
    })
  } catch (error) {
    logger.error('API', '[Transcribe] Request error', {
      error: error.message,
      stack: error.stack,
    })
    logger.timeEnd('API', 'transcribe-request')

    // Handle multer errors specifically
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'Audio file too large. Maximum size is 10MB.',
          field: 'audio',
        })
      }
      return res.status(400).json({
        error: `Upload error: ${error.message}`,
        field: 'audio',
      })
    }

    // Handle file filter rejection
    if (error.message?.includes('Unsupported audio format')) {
      return res.status(400).json({
        error: error.message,
        field: 'audio',
      })
    }

    res.status(500).json({
      error: 'Internal server error',
    })
  }
})

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    logger.warn('API', '[Transcribe] Multer error', { error: error.message })

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Audio file too large. Maximum size is 10MB.',
        field: 'audio',
      })
    }

    return res.status(400).json({
      error: `Upload error: ${error.message}`,
    })
  }

  // Handle file filter rejection errors
  if (error.message?.includes('Unsupported audio format')) {
    return res.status(400).json({
      error: error.message,
      field: 'audio',
    })
  }

  next(error)
})

export default router
