import express from 'express'
import { sanitizeQuery } from '../utils/sanitize.js'
import { sendProgress, PROGRESS_TYPES } from '../utils/wsProgress.js'
import {
  isGeminiAvailable,
  generateScript,
  generateSlideContent,
  generateEngagement as geminiGenerateEngagement,
  generateSlideResponse,
  generateTopicMetadata,
  generateTTS,
} from '../services/gemini.js'

const router = express.Router()

// Log Gemini availability on startup
console.log(`[Generate] Gemini API available: ${isGeminiAvailable()}`)

/**
 * Generate a unique ID with prefix and timestamp
 * @param {string} prefix - ID prefix (e.g., 'slide', 'topic', 'seg')
 * @returns {string} Unique ID
 */
function generateId(prefix) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${timestamp}_${random}`
}

const FALLBACK_TOPIC_ICON = '📚'
const FALLBACK_FUN_FACT = 'Visual explanations help people remember new ideas.'

const QUESTION_WORDS = new Set([
  'how',
  'what',
  'why',
  'when',
  'where',
  'who',
  'which',
  'can',
  'could',
  'do',
  'does',
  'did',
  'is',
  'are',
  'was',
  'were',
  'will',
  'would',
  'should',
  'tell',
  'explain',
])

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function buildFallbackTopicName(query) {
  const cleaned = query
    .replace(/[?.!]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned) return 'New Topic'

  const words = cleaned.split(/\s+/)
  const filtered = words.filter((word) => !QUESTION_WORDS.has(word.toLowerCase()))
  const baseWords = (filtered.length > 0 ? filtered : words).slice(0, 4)

  return toTitleCase(baseWords.join(' '))
}

function buildFallbackTopicMetadata(query) {
  return {
    name: buildFallbackTopicName(query),
    icon: FALLBACK_TOPIC_ICON,
  }
}

function buildFallbackEngagement(topicName) {
  const safeTopic = topicName || 'this topic'
  return {
    funFact: {
      emoji: null,
      text: FALLBACK_FUN_FACT,
    },
    suggestedQuestions: [
      `What are the basics of ${safeTopic}?`,
      `Why does ${safeTopic} matter?`,
      `Can you give a simple example of ${safeTopic}?`,
    ],
  }
}

/**
 * Get a mock placeholder image URL for fallback
 * @param {number} index - Slide index for color variation
 * @returns {string} Placeholder image URL
 */
function getMockImageUrl(index) {
  const colors = ['6366F1', '818CF8', 'A5B4FC', 'C7D2FE']
  return `https://placehold.co/800x450/${colors[index % colors.length]}/white?text=Slide+${index + 1}`
}

/**
 * Generate mock slide content based on the query
 * Used as fallback when Gemini API is not available
 * @param {string} query - User's question
 * @param {string} topicId - Topic ID for the slides
 * @param {string} segmentId - Segment ID for the slides
 * @returns {Array} Array of slide objects
 */
function generateMockSlides(query, topicId, segmentId) {
  const slideCount = 3 + Math.floor(Math.random() * 4) // 3-6 slides

  const introSubtitle = `Let's explore the fascinating topic of "${query.replace(/[?]/g, '')}".`
  const subtitles = [
    introSubtitle,
    'Understanding the fundamental concepts helps us grasp the bigger picture.',
    'There are several key components that work together in this process.',
    'These elements interact in interesting ways that affect outcomes.',
    'The implications of this knowledge extend to many areas of our daily lives.',
    'To summarize, these core principles form the foundation of our understanding.',
  ]

  const slides = []
  for (let i = 0; i < slideCount; i++) {
    slides.push({
      id: generateId('slide'),
      imageUrl: getMockImageUrl(i),
      audioUrl: null, // Would be populated by TTS service with real AI
      subtitle: subtitles[i] || subtitles[subtitles.length - 1],
      duration: 4000 + Math.floor(Math.random() * 3000), // 4-7 seconds per slide
      topicId,
      segmentId,
    })
  }

  return slides
}

/**
 * POST /api/generate
 * Generate slideshow from text query
 *
 * F015: Sends WebSocket progress updates during generation if clientId provided
 * F016: Real AI-generated educational diagrams (with mock fallback)
 * F017: Real TTS audio narration (with mock fallback)
 *
 * Request body:
 * - query (required): The user's question
 * - topicId (optional): Existing topic ID for follow-ups
 * - conversationHistory (optional): Previous conversation context
 * - clientId (optional): WebSocket client ID for progress updates
 * - explanationLevel (optional): Level of explanation detail - 'simple', 'standard' (default), or 'deep'
 *   - simple: Everyday language, analogies, shorter sentences, for curious beginners
 *   - standard: Balanced with key concepts and some technical terms
 *   - deep: Technical depth, proper terminology, comprehensive coverage
 *
 * Response:
 * - slides: Array of slide objects with id, imageUrl, audioUrl, subtitle, duration
 * - topic: Topic object with id, name, icon
 * - segmentId: Unique segment identifier
 */
router.post('/', async (req, res) => {
  try {
    const { query, topicId, conversationHistory = [], clientId, explanationLevel = 'standard' } = req.body

    // F004: Sanitize and validate query input
    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      // Send error via WebSocket if client is connected
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.ERROR, { error: queryError })
      }
      return res.status(400).json({
        error: queryError,
        field: 'query'
      })
    }

    // F015: Send 'start' progress to WebSocket client
    if (clientId) {
      sendProgress(clientId, PROGRESS_TYPES.START, {
        query: sanitizedQuery,
        stage: 'Initializing generation...'
      })
    }

    // Generate unique identifiers
    const segmentId = generateId('seg')
    const generatedTopicId = topicId || generateId('topic')

    // Generate topic metadata using Gemini with fallback if rate limited/unavailable
    const topicMetadataResult = await generateTopicMetadata(sanitizedQuery)
    const topicMetadata = topicMetadataResult.error
      ? buildFallbackTopicMetadata(sanitizedQuery)
      : {
          name: topicMetadataResult.topicName,
          icon: topicMetadataResult.topicIcon,
        }

    if (topicMetadataResult.error) {
      console.warn('[Generate] Topic metadata fallback used:', topicMetadataResult.error)
    }

    let slides

    // F016 & F017: Use real Gemini AI for generation
    console.log(`[Generate] Using Gemini AI for query: "${sanitizedQuery.substring(0, 50)}..." (level: ${explanationLevel})`)

    // F015: Send 'script_ready' progress - generating script
    if (clientId) {
      sendProgress(clientId, PROGRESS_TYPES.SCRIPT_READY, {
        topic: topicMetadata.name,
        stage: 'Generating educational script...'
      })
    }

    // Step 1: Generate the script with slide content
    const scriptResult = await generateScript(sanitizedQuery, {
      conversationHistory,
      isFollowUp: false,
      explanationLevel,
    })

    if (scriptResult.error || !scriptResult.slides) {
      console.warn(`[Generate] Script generation failed: ${scriptResult.error}, falling back to mock`)
      // Fall back to mock if script generation fails
      slides = generateMockSlides(sanitizedQuery, generatedTopicId, segmentId)
    } else {
      // F015: Send 'images_generating' progress
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.IMAGES_GENERATING, {
          stage: 'Generating diagrams and visuals...',
          slidesCount: scriptResult.slides.length
        })
      }

      // Step 2: Generate images and audio for each slide in parallel
      const slidePromises = scriptResult.slides.map(async (slideScript, index) => {
        const content = await generateSlideContent(slideScript, {
          topic: topicMetadata.name,
          generateAudio: false,
          explanationLevel,
        })

        // Log any errors but continue with partial content
        if (content.errors.length > 0) {
          console.warn(`[Generate] Slide ${index + 1} errors:`, content.errors)
        }

        return {
          id: generateId('slide'),
          imageUrl: content.imageUrl || getMockImageUrl(index),
          audioUrl: content.audioUrl || null,
          subtitle: slideScript.subtitle,
          duration: content.duration || 5000,
          topicId: generatedTopicId,
          segmentId,
          // F091: Mark conclusion slides
          ...(slideScript.isConclusion && { isConclusion: true }),
        }
      })

      // F015: Send 'audio_generating' progress
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.AUDIO_GENERATING, {
          stage: 'Creating narration audio...',
          slidesCount: scriptResult.slides.length
        })
      }

      slides = await Promise.all(slidePromises)
    }

    // F015: Send 'complete' progress
    if (clientId) {
      sendProgress(clientId, PROGRESS_TYPES.COMPLETE, {
        slidesCount: slides.length,
        topicName: topicMetadata.name
      })
    }

    res.json({
      slides,
      topic: {
        id: generatedTopicId,
        name: topicMetadata.name,
        icon: topicMetadata.icon,
      },
      segmentId,
    })
  } catch (error) {
    console.error('Generation error:', error)
    // F015: Send error via WebSocket if client is connected
    const { clientId } = req.body || {}
    if (clientId) {
      sendProgress(clientId, PROGRESS_TYPES.ERROR, {
        error: 'Failed to generate slideshow'
      })
    }
    res.status(500).json({ error: 'Failed to generate slideshow' })
  }
})

/**
 * POST /api/generate/follow-up
 * Generate appended slides with context from previous conversation
 *
 * F015: Sends WebSocket progress updates during generation if clientId provided
 * F016: Real AI-generated educational diagrams (with mock fallback)
 * F017: Real TTS audio narration (with mock fallback)
 *
 * Request body:
 * - query (required): The follow-up question
 * - topicId (required): Existing topic ID to append to
 * - conversationHistory (optional): Previous conversation context
 * - clientId (optional): WebSocket client ID for progress updates
 * - explanationLevel (optional): Level of explanation detail - 'simple', 'standard' (default), or 'deep'
 *   - simple: Everyday language, analogies, shorter sentences, for curious beginners
 *   - standard: Balanced with key concepts and some technical terms
 *   - deep: Technical depth, proper terminology, comprehensive coverage
 *
 * Response:
 * - slides: Array of new slide objects
 * - segmentId: Unique segment identifier for the new slides
 */
router.post('/follow-up', async (req, res) => {
  try {
    const { query, topicId, conversationHistory = [], clientId, explanationLevel = 'standard' } = req.body

    // F004: Sanitize and validate query input
    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.ERROR, { error: queryError })
      }
      return res.status(400).json({
        error: queryError,
        field: 'query'
      })
    }

    // Validate topicId is provided and non-empty
    if (!topicId || typeof topicId !== 'string' || !topicId.trim()) {
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.ERROR, { error: 'topicId is required for follow-up questions' })
      }
      return res.status(400).json({
        error: 'topicId is required for follow-up questions',
        field: 'topicId'
      })
    }

    // F015: Send 'start' progress for follow-up generation
    if (clientId) {
      sendProgress(clientId, PROGRESS_TYPES.START, {
        query: sanitizedQuery,
        isFollowUp: true,
        stage: 'Processing follow-up question...'
      })
    }

    const segmentId = generateId('seg')
    const sanitizedTopicId = topicId.trim()

    // Check if Gemini is available for real AI generation
    const useRealAI = isGeminiAvailable()

    let slides

    if (useRealAI) {
      // F016 & F017: Use real Gemini AI for follow-up generation
      console.log(`[Generate] Using Gemini AI for follow-up: "${sanitizedQuery.substring(0, 50)}..." (level: ${explanationLevel})`)

      // Generate script with conversation context for better follow-up
      const scriptResult = await generateScript(sanitizedQuery, {
        conversationHistory,
        isFollowUp: true,
        explanationLevel,
      })

      if (scriptResult.error || !scriptResult.slides) {
        console.warn(`[Generate] Follow-up script generation failed: ${scriptResult.error}, falling back to mock`)
        slides = generateMockSlides(sanitizedQuery, sanitizedTopicId, segmentId)
      } else {
        // F015: Send 'images_generating' progress
        if (clientId) {
          sendProgress(clientId, PROGRESS_TYPES.IMAGES_GENERATING, {
            stage: 'Generating follow-up diagrams...',
            slidesCount: scriptResult.slides.length
          })
        }

        // Generate images and audio for each slide in parallel
        const slidePromises = scriptResult.slides.map(async (slideScript, index) => {
          const content = await generateSlideContent(slideScript, {
            topic: conversationHistory[0]?.topic || '',
            generateAudio: false,
            explanationLevel,
          })

          if (content.errors.length > 0) {
            console.warn(`[Generate] Follow-up slide ${index + 1} errors:`, content.errors)
          }

          return {
            id: generateId('slide'),
            imageUrl: content.imageUrl || getMockImageUrl(index),
            audioUrl: content.audioUrl || null,
            subtitle: slideScript.subtitle,
            duration: content.duration || 5000,
            topicId: sanitizedTopicId,
            segmentId,
            // F091: Mark conclusion slides
            ...(slideScript.isConclusion && { isConclusion: true }),
          }
        })

        // F015: Send 'audio_generating' progress
        if (clientId) {
          sendProgress(clientId, PROGRESS_TYPES.AUDIO_GENERATING, {
            stage: 'Creating narration audio...',
            slidesCount: scriptResult.slides.length
          })
        }

        slides = await Promise.all(slidePromises)
      }
    } else {
      // No API key - use mock data
      console.log('[Generate] No Gemini API key, using mock follow-up slides')

      // F015: Send 'images_generating' progress
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.IMAGES_GENERATING, {
          stage: 'Generating follow-up diagrams...'
        })
      }

      slides = generateMockSlides(sanitizedQuery, sanitizedTopicId, segmentId)
    }

    // F015: Send 'complete' progress
    if (clientId) {
      sendProgress(clientId, PROGRESS_TYPES.COMPLETE, {
        slidesCount: slides.length,
        isFollowUp: true
      })
    }

    res.json({
      slides,
      segmentId,
    })
  } catch (error) {
    console.error('Follow-up generation error:', error)
    const { clientId } = req.body || {}
    if (clientId) {
      sendProgress(clientId, PROGRESS_TYPES.ERROR, {
        error: 'Failed to generate follow-up slides'
      })
    }
    res.status(500).json({ error: 'Failed to generate follow-up slides' })
  }
})

/**
 * POST /api/generate/engagement
 * Generate fun fact + suggested questions (fast, ~1-2s)
 * This endpoint is designed to return quickly to show content during generation
 *
 * Uses the Gemini fast model to keep results relevant and low latency.
 *
 * Request body:
 * - query (required): The user's question
 *
 * Response:
 * - funFact: Object with emoji and text
 * - suggestedQuestions: Array of 3 follow-up question strings
 */
router.post('/engagement', async (req, res) => {
  try {
    const { query, explanationLevel = 'standard' } = req.body

    // F004: Sanitize and validate query input
    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      return res.status(400).json({
        error: queryError,
        field: 'query'
      })
    }

    const aiEngagement = await geminiGenerateEngagement(sanitizedQuery, explanationLevel)
    const fallbackTopic = buildFallbackTopicName(sanitizedQuery)

    if (aiEngagement.error ||
      !aiEngagement.funFact ||
      !Array.isArray(aiEngagement.suggestedQuestions)) {
      const fallbackEngagement = buildFallbackEngagement(fallbackTopic)
      // Generate TTS for fallback fun fact
      const ttsResult = await generateTTS(`Fun fact: ${fallbackEngagement.funFact.text}`)
      return res.json({
        funFact: {
          ...fallbackEngagement.funFact,
          audioUrl: ttsResult.audioUrl || null,
          duration: ttsResult.duration || 0,
        },
        suggestedQuestions: fallbackEngagement.suggestedQuestions,
        fallback: true,
      })
    }

    // Generate TTS for the fun fact - this runs after text is ready
    // so it adds ~2-3s but eliminates a separate frontend request
    const funFactText = `Fun fact: ${aiEngagement.funFact.text}`
    const ttsResult = await generateTTS(funFactText)

    res.json({
      funFact: {
        ...aiEngagement.funFact,
        audioUrl: ttsResult.audioUrl || null,
        duration: ttsResult.duration || 0,
      },
      suggestedQuestions: aiEngagement.suggestedQuestions.slice(0, 3),
      fallback: false,
    })
  } catch (error) {
    console.error('Engagement generation error:', error)
    res.status(500).json({ error: 'Failed to generate engagement content' })
  }
})

/**
 * POST /api/generate/respond
 * CORE023, CORE024: Generate verbal-only response for slide questions
 * Used when user asks about something on the current slide (e.g., "What's the red part?")
 *
 * Request body:
 * - query (required): The user's question about the current slide
 * - currentSlide (required): Current slide context
 *   - subtitle: The slide's narration text
 *   - topicName: The topic name for context
 *
 * Response:
 * - response: Verbal explanation text
 * - audioUrl: TTS audio data URL
 * - highlight: { x, y } coordinates as percentages (0-100) for annotation highlight, or null
 * - duration: Audio duration in milliseconds
 */
router.post('/respond', async (req, res) => {
  try {
    const { query, currentSlide } = req.body

    // F004: Sanitize and validate query input
    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      return res.status(400).json({
        error: queryError,
        field: 'query'
      })
    }

    // Validate currentSlide is provided
    if (!currentSlide) {
      return res.status(400).json({
        error: 'currentSlide context is required',
        field: 'currentSlide'
      })
    }

    console.log(`[Generate/Respond] Processing slide question: "${sanitizedQuery.substring(0, 50)}..."`)

    // Check if Gemini is available
    if (!isGeminiAvailable()) {
      // Fallback response when API is not available
      return res.json({
        response: "I can help explain what you see on the slide. Could you tell me more about what you'd like to know?",
        audioUrl: null,
        highlight: { x: 50, y: 50 },
        duration: 3000,
      })
    }

    // Generate the slide response with highlight coordinates
    const result = await generateSlideResponse(sanitizedQuery, {
      subtitle: currentSlide.subtitle || '',
      topicName: currentSlide.topicName || '',
    })

    if (result.error) {
      console.warn(`[Generate/Respond] Generation failed: ${result.error}`)
      // Return a fallback response on error
      return res.json({
        response: "I'm not quite sure what you're asking about. Could you try pointing at it or describing it differently?",
        audioUrl: null,
        highlight: null,
        duration: 3000,
      })
    }

    res.json({
      response: result.response,
      audioUrl: result.audioUrl,
      highlight: result.highlight,
      duration: result.duration,
    })
  } catch (error) {
    console.error('Respond generation error:', error)
    res.status(500).json({ error: 'Failed to generate response' })
  }
})

export default router
