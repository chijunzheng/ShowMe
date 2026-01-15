import express from 'express'
import { sanitizeQuery } from '../utils/sanitize.js'
import { sendProgress, PROGRESS_TYPES } from '../utils/wsProgress.js'
import {
  isGeminiAvailable,
  generateScript,
  generateSlideContent,
  generateEngagement as geminiGenerateEngagement
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

/**
 * Extract topic name and icon from query using simple heuristics
 * In production, this would use Gemini for intelligent extraction
 * @param {string} query - User's question
 * @returns {{name: string, icon: string}} Topic metadata
 */
function extractTopicFromQuery(query) {
  const normalizedQuery = query.toLowerCase().trim()

  // Topic mapping based on common educational subjects
  const topicMappings = [
    { keywords: ['heart', 'cardiac', 'blood', 'circulatory'], name: 'The Heart', icon: '❤️' },
    { keywords: ['brain', 'neuron', 'mind', 'cognitive'], name: 'The Brain', icon: '🧠' },
    { keywords: ['sun', 'solar', 'star'], name: 'The Sun', icon: '☀️' },
    { keywords: ['moon', 'lunar'], name: 'The Moon', icon: '🌙' },
    { keywords: ['planet', 'mars', 'venus', 'jupiter', 'saturn'], name: 'Planets', icon: '🪐' },
    { keywords: ['space', 'universe', 'cosmos', 'galaxy'], name: 'Space', icon: '🌌' },
    { keywords: ['black hole'], name: 'Black Holes', icon: '🕳️' },
    { keywords: ['photosynthesis', 'plant', 'chlorophyll'], name: 'Photosynthesis', icon: '🌱' },
    { keywords: ['gravity', 'weight', 'fall'], name: 'Gravity', icon: '🍎' },
    { keywords: ['electricity', 'electric', 'current', 'voltage'], name: 'Electricity', icon: '⚡' },
    { keywords: ['magnet', 'magnetic'], name: 'Magnetism', icon: '🧲' },
    { keywords: ['weather', 'rain', 'cloud', 'storm'], name: 'Weather', icon: '🌦️' },
    { keywords: ['volcano', 'eruption', 'lava'], name: 'Volcanoes', icon: '🌋' },
    { keywords: ['earthquake', 'seismic', 'tectonic'], name: 'Earthquakes', icon: '🌍' },
    { keywords: ['ocean', 'sea', 'marine', 'wave'], name: 'The Ocean', icon: '🌊' },
    { keywords: ['airplane', 'flight', 'fly', 'aircraft'], name: 'Flight', icon: '✈️' },
    { keywords: ['car', 'engine', 'vehicle', 'automobile'], name: 'Automobiles', icon: '🚗' },
    { keywords: ['computer', 'processor', 'cpu', 'software'], name: 'Computers', icon: '💻' },
    { keywords: ['internet', 'web', 'online', 'network'], name: 'The Internet', icon: '🌐' },
    { keywords: ['wifi', 'wireless'], name: 'WiFi', icon: '📶' },
    { keywords: ['phone', 'mobile', 'smartphone'], name: 'Smartphones', icon: '📱' },
    { keywords: ['dream', 'sleep', 'rem'], name: 'Dreams', icon: '💭' },
    { keywords: ['dna', 'gene', 'genetic', 'chromosome'], name: 'DNA & Genetics', icon: '🧬' },
    { keywords: ['dinosaur', 'prehistoric', 'fossil'], name: 'Dinosaurs', icon: '🦕' },
    { keywords: ['atom', 'molecule', 'chemistry'], name: 'Atoms', icon: '⚛️' },
    { keywords: ['light', 'photon', 'optic'], name: 'Light', icon: '💡' },
    { keywords: ['sound', 'wave', 'acoustic', 'audio'], name: 'Sound', icon: '🔊' },
    { keywords: ['music', 'melody', 'rhythm'], name: 'Music', icon: '🎵' },
    { keywords: ['math', 'number', 'equation', 'calculation'], name: 'Mathematics', icon: '🔢' },
  ]

  // Find matching topic
  for (const mapping of topicMappings) {
    if (mapping.keywords.some(keyword => normalizedQuery.includes(keyword))) {
      return { name: mapping.name, icon: mapping.icon }
    }
  }

  // Default fallback - extract first significant words from query
  const words = query.replace(/[?!.,]/g, '').split(' ').filter(w => w.length > 3)
  const topicName = words.slice(0, 3).join(' ') || 'General Topic'

  return { name: topicName, icon: '📚' }
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
  const slideCount = 3 + Math.floor(Math.random() * 2) // 3-4 slides

  const introSubtitle = `Let's explore the fascinating topic of "${query.replace(/[?]/g, '')}".`
  const subtitles = [
    introSubtitle,
    'Understanding the fundamental concepts helps us grasp the bigger picture.',
    'There are several key components that work together in this process.',
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
 *
 * Response:
 * - slides: Array of slide objects with id, imageUrl, audioUrl, subtitle, duration
 * - topic: Topic object with id, name, icon
 * - segmentId: Unique segment identifier
 */
router.post('/', async (req, res) => {
  try {
    const { query, topicId, conversationHistory = [], clientId } = req.body

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

    // Extract topic metadata from query (using sanitized input)
    const topicMetadata = extractTopicFromQuery(sanitizedQuery)

    // Check if Gemini is available for real AI generation
    const useRealAI = isGeminiAvailable()

    let slides

    if (useRealAI) {
      // F016 & F017: Use real Gemini AI for generation
      console.log(`[Generate] Using Gemini AI for query: "${sanitizedQuery.substring(0, 50)}..."`)

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
        isFollowUp: false
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
            topic: topicMetadata.name
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
      console.log('[Generate] No Gemini API key, using mock slides')

      // F015: Send 'script_ready' progress - script/topic extraction complete
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.SCRIPT_READY, {
          topic: topicMetadata.name,
          stage: 'Script generated, creating visuals...'
        })
      }

      // F015: Send 'images_generating' progress
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.IMAGES_GENERATING, {
          stage: 'Generating diagrams...'
        })
      }

      slides = generateMockSlides(sanitizedQuery, generatedTopicId, segmentId)

      // F015: Send 'audio_generating' progress
      if (clientId) {
        sendProgress(clientId, PROGRESS_TYPES.AUDIO_GENERATING, {
          stage: 'Creating narration...',
          slidesCount: slides.length
        })
      }
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
 *
 * Response:
 * - slides: Array of new slide objects
 * - segmentId: Unique segment identifier for the new slides
 */
router.post('/follow-up', async (req, res) => {
  try {
    const { query, topicId, conversationHistory = [], clientId } = req.body

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
      console.log(`[Generate] Using Gemini AI for follow-up: "${sanitizedQuery.substring(0, 50)}..."`)

      // Generate script with conversation context for better follow-up
      const scriptResult = await generateScript(sanitizedQuery, {
        conversationHistory,
        isFollowUp: true
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
            topic: conversationHistory[0]?.topic || ''
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
 * Topic-specific fun facts and suggested questions for engagement content
 * In production, this would be generated by Gemini based on the query
 */
const engagementContent = {
  heart: {
    funFacts: [
      { emoji: '❤️', text: 'Your heart beats about 100,000 times every day, pumping roughly 2,000 gallons of blood!' },
      { emoji: '💓', text: 'A blue whale\'s heart is so large that a small child could crawl through its arteries.' },
      { emoji: '🫀', text: 'The human heart can continue beating even when disconnected from the body because it has its own electrical system.' },
    ],
    questions: [
      'How does blood flow through the heart?',
      'What makes the heart beat?',
      'Why do heart attacks happen?',
      'How does exercise affect the heart?',
      'What are heart valves?',
    ]
  },
  brain: {
    funFacts: [
      { emoji: '🧠', text: 'Your brain generates enough electricity to power a small LED light bulb!' },
      { emoji: '⚡', text: 'The human brain processes images in just 13 milliseconds - faster than the blink of an eye.' },
      { emoji: '🔮', text: 'Your brain is about 73% water, which is why dehydration can affect your thinking and mood.' },
    ],
    questions: [
      'How do neurons communicate?',
      'Why do we have dreams?',
      'How does memory work?',
      'What happens during sleep?',
      'How does the brain control emotions?',
    ]
  },
  space: {
    funFacts: [
      { emoji: '🌌', text: 'There are more stars in the universe than grains of sand on all of Earth\'s beaches!' },
      { emoji: '🚀', text: 'A day on Venus is longer than a year on Venus - it rotates so slowly!' },
      { emoji: '🌟', text: 'Neutron stars are so dense that a teaspoon of their material would weigh about 6 billion tons.' },
    ],
    questions: [
      'How big is the universe?',
      'What is a black hole?',
      'How do stars form?',
      'Are there other planets with life?',
      'What is dark matter?',
    ]
  },
  blackHole: {
    funFacts: [
      { emoji: '🕳️', text: 'If you fell into a black hole, you would be stretched like spaghetti due to extreme gravity differences!' },
      { emoji: '⏰', text: 'Time moves slower near a black hole - if you watched someone fall in, they would appear to freeze at the edge.' },
      { emoji: '🌀', text: 'The supermassive black hole at the center of our galaxy is 4 million times the mass of our Sun.' },
    ],
    questions: [
      'What happens inside a black hole?',
      'Can anything escape a black hole?',
      'How do black holes form?',
      'What is the event horizon?',
      'Do black holes die?',
    ]
  },
  photosynthesis: {
    funFacts: [
      { emoji: '🌱', text: 'Plants produce about 98% of the oxygen in our atmosphere through photosynthesis!' },
      { emoji: '🍃', text: 'The process of photosynthesis is actually not very efficient - only about 1-2% of sunlight is converted to plant matter.' },
      { emoji: '🌿', text: 'Without plants and photosynthesis, most life on Earth would cease to exist within months.' },
    ],
    questions: [
      'Why are plants green?',
      'What is chlorophyll?',
      'Can photosynthesis work without sunlight?',
      'How do plants breathe at night?',
      'What do plants need to grow?',
    ]
  },
  weather: {
    funFacts: [
      { emoji: '⛈️', text: 'A single lightning bolt can heat the surrounding air to temperatures five times hotter than the surface of the sun!' },
      { emoji: '🌪️', text: 'The fastest wind speed ever recorded was 253 mph during a tornado in Oklahoma.' },
      { emoji: '❄️', text: 'No two snowflakes are exactly alike - each one has a unique crystalline structure.' },
    ],
    questions: [
      'How do clouds form?',
      'What causes thunder and lightning?',
      'Why does it rain?',
      'How do tornadoes form?',
      'What creates a rainbow?',
    ]
  },
  airplane: {
    funFacts: [
      { emoji: '✈️', text: 'A Boeing 747 has about 6 million parts, and half of them are fasteners!' },
      { emoji: '🛫', text: 'Airplane wings actually bend upward during flight - they can flex up to 12 feet on a 747.' },
      { emoji: '🌐', text: 'At any given moment, there are about 5,000 commercial aircraft flying above the United States.' },
    ],
    questions: [
      'How do airplane wings create lift?',
      'Why do airplanes have pressurized cabins?',
      'How do jets engines work?',
      'Why do planes fly so high?',
      'What keeps airplanes stable in the air?',
    ]
  },
  default: {
    funFacts: [
      { emoji: '💡', text: 'The human brain can process 11 million bits of information every second!' },
      { emoji: '🔬', text: 'An atom is 99.9999999% empty space - if you removed all the empty space from atoms, humanity would fit in a sugar cube.' },
      { emoji: '🌍', text: 'Earth is the only planet not named after a god - its name comes from Old English meaning "ground" or "soil".' },
    ],
    questions: [
      'How does this connect to other topics?',
      'Can you explain the key concepts?',
      'What are the real-world applications?',
      'Why is this important to understand?',
      'What are common misconceptions about this?',
    ]
  }
}

/**
 * Get engagement content based on query keywords
 * @param {string} query - User's question
 * @returns {{funFacts: Array, questions: Array}} Engagement content
 */
function getEngagementForQuery(query) {
  const normalizedQuery = query.toLowerCase()

  const topicMap = [
    { keywords: ['heart', 'cardiac', 'blood', 'circulatory', 'pulse'], content: engagementContent.heart },
    { keywords: ['brain', 'neuron', 'mind', 'cognitive', 'thinking'], content: engagementContent.brain },
    { keywords: ['space', 'universe', 'cosmos', 'galaxy', 'planet', 'star', 'sun', 'moon'], content: engagementContent.space },
    { keywords: ['black hole'], content: engagementContent.blackHole },
    { keywords: ['photosynthesis', 'plant', 'chlorophyll', 'leaves'], content: engagementContent.photosynthesis },
    { keywords: ['weather', 'rain', 'cloud', 'storm', 'thunder', 'lightning'], content: engagementContent.weather },
    { keywords: ['airplane', 'flight', 'fly', 'aircraft', 'jet', 'wing'], content: engagementContent.airplane },
  ]

  for (const { keywords, content } of topicMap) {
    if (keywords.some(keyword => normalizedQuery.includes(keyword))) {
      return content
    }
  }

  return engagementContent.default
}

/**
 * POST /api/generate/engagement
 * Generate fun fact + suggested questions (fast, ~1-2s)
 * This endpoint is designed to return quickly to show content during generation
 *
 * When Gemini is available, uses AI for more relevant content.
 * Falls back to curated content when API is not available.
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
    const { query } = req.body

    // F004: Sanitize and validate query input
    const { sanitized: sanitizedQuery, error: queryError } = sanitizeQuery(query)
    if (queryError) {
      return res.status(400).json({
        error: queryError,
        field: 'query'
      })
    }

    // Try AI-generated engagement content if available
    if (isGeminiAvailable()) {
      try {
        const aiEngagement = await geminiGenerateEngagement(sanitizedQuery)
        if (!aiEngagement.error && aiEngagement.funFact && aiEngagement.suggestedQuestions) {
          return res.json({
            funFact: aiEngagement.funFact,
            suggestedQuestions: aiEngagement.suggestedQuestions.slice(0, 3),
          })
        }
        // Fall through to mock if AI fails
        console.warn('[Generate] AI engagement failed, using mock:', aiEngagement.error)
      } catch (aiError) {
        console.warn('[Generate] AI engagement error, using mock:', aiError.message)
      }
    }

    // Fallback: Get topic-relevant engagement content (using sanitized input)
    const content = getEngagementForQuery(sanitizedQuery)

    // Select a random fun fact from the topic
    const randomFact = content.funFacts[Math.floor(Math.random() * content.funFacts.length)]

    // Select 3 random suggested questions, shuffled
    const shuffledQuestions = [...content.questions].sort(() => Math.random() - 0.5)
    const suggestedQuestions = shuffledQuestions.slice(0, 3)

    res.json({
      funFact: randomFact,
      suggestedQuestions,
    })
  } catch (error) {
    console.error('Engagement generation error:', error)
    res.status(500).json({ error: 'Failed to generate engagement content' })
  }
})

export default router
