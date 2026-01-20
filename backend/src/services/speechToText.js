/**
 * Speech-to-Text Service using Google Cloud Chirp 3
 *
 * Dedicated STT service using Chirp 3 model for faster, more accurate transcription.
 * Chirp 3 is Google's latest ASR model with:
 * - Enhanced multilingual accuracy
 * - Speaker diarization
 * - Automatic language detection
 * - Built-in denoiser
 */

import speech from '@google-cloud/speech'

// Chirp 3 is available in specific regions
// Using us-central1 as it's closest to our Cloud Run deployment
const REGION = 'us-central1'
const MODEL = 'chirp_3'

// Project ID from environment or default
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'project-a23ec95e-0a5a-443a-a7a'

// Create Speech client with regional endpoint for V2 API
let speechClient = null

/**
 * Get or create the Speech client
 * Uses lazy initialization to avoid startup errors if credentials aren't available
 */
function getClient() {
  if (!speechClient) {
    try {
      speechClient = new speech.v2.SpeechClient({
        apiEndpoint: `${REGION}-speech.googleapis.com`,
      })
    } catch (error) {
      console.error('[Chirp3] Failed to create Speech client:', error.message)
      return null
    }
  }
  return speechClient
}

/**
 * Map browser MIME types to Cloud Speech encoding types
 * @param {string} mimeType - Browser MIME type (e.g., 'audio/webm')
 * @returns {string} Cloud Speech encoding constant
 */
function getEncoding(mimeType) {
  const encodingMap = {
    'audio/webm': 'WEBM_OPUS',
    'audio/ogg': 'OGG_OPUS',
    'audio/wav': 'LINEAR16',
    'audio/wave': 'LINEAR16',
    'audio/x-wav': 'LINEAR16',
    'audio/mp3': 'MP3',
    'audio/mpeg': 'MP3',
    'audio/mp4': 'MP3',
    'audio/m4a': 'MP3',
    'audio/flac': 'FLAC',
  }
  return encodingMap[mimeType] || 'AUTO'
}

/**
 * Check if the Speech-to-Text service is available
 * @returns {boolean}
 */
export function isChirp3Available() {
  return getClient() !== null
}

/**
 * Transcribe audio using Chirp 3 model
 *
 * @param {Buffer} audioBuffer - Audio data as Buffer
 * @param {string} mimeType - MIME type of the audio (e.g., 'audio/webm')
 * @returns {Promise<{transcription: string|null, error: string|null, duration?: number}>}
 */
export async function transcribeWithChirp3(audioBuffer, mimeType) {
  const client = getClient()

  if (!client) {
    return { transcription: null, error: 'SPEECH_CLIENT_NOT_AVAILABLE' }
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    return { transcription: null, error: 'EMPTY_AUDIO' }
  }

  const startTime = Date.now()

  try {
    // Build the recognizer resource name
    // Format: projects/{project}/locations/{location}/recognizers/_
    // Using "_" as recognizer ID for default recognizer
    const recognizer = `projects/${PROJECT_ID}/locations/${REGION}/recognizers/_`

    // Configure the recognition request
    const request = {
      recognizer,
      config: {
        // Use Chirp 3 model
        model: MODEL,
        // Auto-detect language (Chirp 3 feature)
        autoDecodingConfig: {},
        // Language codes - English and Chinese, Chirp 3 auto-detects the spoken language
        languageCodes: ['en-US', 'en-GB', 'cmn-Hans-CN', 'cmn-Hant-TW'],
        // Features
        features: {
          // Enable automatic punctuation
          enableAutomaticPunctuation: true,
          // Profanity filter off for educational content
          profanityFilter: false,
        },
      },
      // Audio content as base64
      content: audioBuffer.toString('base64'),
    }

    // Call the recognize method (synchronous, for short audio < 1 min)
    const [response] = await client.recognize(request)

    // Extract transcription from results
    const transcription = response.results
      ?.map(result => result.alternatives?.[0]?.transcript || '')
      .join(' ')
      .trim() || ''

    const duration = Date.now() - startTime

    console.log(`[Chirp3] Transcription completed in ${duration}ms: "${transcription.substring(0, 50)}..."`)

    return {
      transcription,
      error: null,
      duration,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[Chirp3] Transcription error after ${duration}ms:`, error.message)

    // Handle specific error types
    if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
      return { transcription: null, error: 'PERMISSION_DENIED' }
    }
    if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return { transcription: null, error: 'RATE_LIMITED' }
    }
    if (error.code === 3 || error.message?.includes('INVALID_ARGUMENT')) {
      return { transcription: null, error: 'INVALID_AUDIO' }
    }
    if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
      return { transcription: null, error: 'RECOGNIZER_NOT_FOUND' }
    }

    return { transcription: null, error: error.message || 'UNKNOWN_ERROR' }
  }
}

export default {
  isChirp3Available,
  transcribeWithChirp3,
}
