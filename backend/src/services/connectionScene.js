/**
 * Connection Scene Service
 * WB021: Pocket Connection Scenes
 *
 * When 3+ related pieces form a "pocket" (connected group) in the world,
 * this service generates a scene showing them interacting together.
 *
 * Functions:
 * - generateScenePrompt: Create a prompt for Gemini image generation
 * - generateConnectionScene: Generate the actual scene image
 * - getSceneEvolutionLevel: Determine scene complexity based on piece count
 */

import { GoogleGenAI } from '@google/genai'
import logger from '../utils/logger.js'
import { extractJSONSimple as extractJSON } from '../utils/json.js'

// Image generation model configuration (same as gemini.js)
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'
const IMAGE_MODEL_FALLBACKS = ['gemini-2.5-flash-image']
const FAST_MODEL = 'gemini-2.5-flash-lite'

// Get or create AI client
let aiClient = null

/**
 * Get or initialize the Gemini AI client
 * @returns {GoogleGenAI|null} The AI client or null if no API key
 */
function getAIClient() {
  if (aiClient) {
    return aiClient
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    logger.warn('CONNECTION_SCENE', 'No valid API key found. Scene generation will be unavailable.')
    return null
  }

  try {
    aiClient = new GoogleGenAI({ apiKey })
    logger.info('CONNECTION_SCENE', 'AI client initialized successfully')
    return aiClient
  } catch (error) {
    logger.error('CONNECTION_SCENE', 'Failed to initialize AI client', { error: error.message })
    return null
  }
}

/**
 * Scene evolution levels based on piece count
 * More pieces = more complex and elaborate scene
 */
export const SCENE_EVOLUTION_LEVELS = {
  initial: { min: 3, max: 4, label: 'Initial Connection' },
  enhanced: { min: 5, max: 6, label: 'Growing Pocket' },
  legendary: { min: 7, max: Infinity, label: 'Legendary Pocket' }
}

/**
 * Get the scene evolution level based on the number of pieces in the pocket
 *
 * @param {number} pieceCount - Number of pieces in the pocket
 * @returns {'initial' | 'enhanced' | 'legendary'}
 */
export function getSceneEvolutionLevel(pieceCount) {
  if (typeof pieceCount !== 'number' || pieceCount < 3) {
    return 'initial'
  }

  if (pieceCount >= SCENE_EVOLUTION_LEVELS.legendary.min) {
    return 'legendary'
  }
  if (pieceCount >= SCENE_EVOLUTION_LEVELS.enhanced.min) {
    return 'enhanced'
  }

  return 'initial'
}

/**
 * Zone-specific style modifiers for scene generation
 */
const ZONE_SCENE_STYLES = {
  nature: {
    setting: 'a lush natural landscape with forests, rivers, or meadows',
    atmosphere: 'vibrant sunlight filtering through trees, butterflies and birds, flowing water',
    palette: 'greens, blues, earth tones with bright flower accents'
  },
  civilization: {
    setting: 'an ancient plaza or courtyard with architectural elements',
    atmosphere: 'warm golden hour lighting, bustling but peaceful activity, historical grandeur',
    palette: 'warm stone colors, gold accents, rich fabrics'
  },
  arcane: {
    setting: 'a mystical library or observatory with floating objects',
    atmosphere: 'magical particles, soft ethereal glow, mysterious but inviting',
    palette: 'deep purples, blues, and silver with magical gold sparkles'
  }
}

/**
 * Generate a scene prompt for the connection scene image
 * Creates a detailed prompt that will show the pocket's topics interacting
 *
 * @param {Object} pocket - The pocket containing related pieces
 * @param {string} pocket.zone - The zone: 'nature' | 'civilization' | 'arcane'
 * @param {Object[]} pocket.pieces - Array of pieces in the pocket
 * @param {string} pocket.pieces[].topicName - Name of each topic
 * @param {string} [pocket.pocketName] - Optional custom pocket name
 * @returns {Promise<{
 *   prompt: string,
 *   description: string,
 *   error: string | null
 * }>}
 */
export async function generateScenePrompt(pocket) {
  // Validate inputs
  if (!pocket || !pocket.zone || !Array.isArray(pocket.pieces)) {
    return { prompt: null, description: null, error: 'INVALID_POCKET' }
  }

  const validZones = ['nature', 'civilization', 'arcane']
  if (!validZones.includes(pocket.zone)) {
    return { prompt: null, description: null, error: 'INVALID_ZONE' }
  }

  if (pocket.pieces.length < 3) {
    return { prompt: null, description: null, error: 'INSUFFICIENT_PIECES' }
  }

  const ai = getAIClient()
  if (!ai) {
    // Without AI, generate a basic prompt
    const basicPrompt = generateBasicScenePrompt(pocket)
    return {
      prompt: basicPrompt,
      description: `A scene showing ${pocket.pieces.map(p => p.topicName).join(', ')} together.`,
      error: null
    }
  }

  const topicsList = pocket.pieces.map(p => p.topicName).join(', ')
  const evolutionLevel = getSceneEvolutionLevel(pocket.pieces.length)
  const zoneStyle = ZONE_SCENE_STYLES[pocket.zone]

  // Complexity guidance based on evolution level
  const complexityGuidance = {
    initial: 'Create a simple but charming scene with the topics clearly visible and interacting.',
    enhanced: 'Create a moderately detailed scene with interesting interactions between topics and environmental details.',
    legendary: 'Create an elaborate, epic scene with rich details, dynamic interactions, and a sense of wonder and achievement.'
  }

  const aiPrompt = `You are a creative artist designing a connection scene for an educational game.

The player has learned about these related topics that now form a "pocket" of connected knowledge:
Topics: ${topicsList}
Zone: ${pocket.zone}

This is a "${SCENE_EVOLUTION_LEVELS[evolutionLevel].label}" with ${pocket.pieces.length} pieces.

Generate a whimsical, child-friendly scene prompt that shows these topics interacting naturally together.

ZONE STYLE GUIDANCE:
- Setting: ${zoneStyle.setting}
- Atmosphere: ${zoneStyle.atmosphere}
- Color palette: ${zoneStyle.palette}

REQUIREMENTS:
1. All topics must be clearly visible and recognizable
2. Topics should be interacting naturally in the scene
3. The scene should tell a visual story about how these concepts connect
4. Warm, inviting atmosphere suitable for ages 6-12
5. 16:9 aspect ratio (horizontal/landscape orientation)
6. Educational game art style - colorful and appealing

COMPLEXITY LEVEL: ${complexityGuidance[evolutionLevel]}

Return JSON:
{
  "prompt": "Detailed image generation prompt (2-4 sentences describing the scene)",
  "description": "A simple 1-sentence description for the UI"
}`

  try {
    logger.time('CONNECTION_SCENE', 'generate-scene-prompt')

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: aiPrompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 300,
      }
    })

    const text = response.text || ''
    const jsonStr = extractJSON(text)
    const parsed = JSON.parse(jsonStr)

    logger.timeEnd('CONNECTION_SCENE', 'generate-scene-prompt')

    // Validate response
    if (!parsed.prompt || typeof parsed.prompt !== 'string') {
      // Fall back to basic prompt
      const basicPrompt = generateBasicScenePrompt(pocket)
      return {
        prompt: basicPrompt,
        description: `A scene showing ${topicsList} together.`,
        error: null
      }
    }

    // Ensure the prompt includes style guidance
    let finalPrompt = parsed.prompt
    if (!finalPrompt.toLowerCase().includes('child-friendly')) {
      finalPrompt = `Child-friendly, colorful educational game art style. 16:9 landscape orientation. ${finalPrompt}`
    }

    return {
      prompt: finalPrompt,
      description: parsed.description || `A scene showing ${topicsList} together.`,
      error: null
    }
  } catch (error) {
    logger.error('CONNECTION_SCENE', 'Failed to generate scene prompt', {
      error: error.message,
      zone: pocket.zone,
      pieceCount: pocket.pieces.length
    })

    // Fall back to basic prompt on error
    const basicPrompt = generateBasicScenePrompt(pocket)
    return {
      prompt: basicPrompt,
      description: `A scene showing ${topicsList} together.`,
      error: null
    }
  }
}

/**
 * Generate a basic scene prompt without AI
 * Used as fallback when AI is unavailable
 *
 * @param {Object} pocket - The pocket containing related pieces
 * @returns {string} Basic scene prompt
 */
function generateBasicScenePrompt(pocket) {
  const topicsList = pocket.pieces.map(p => p.topicName).join(', ')
  const zoneStyle = ZONE_SCENE_STYLES[pocket.zone] || ZONE_SCENE_STYLES.nature

  return `A whimsical, child-friendly illustration in ${zoneStyle.setting}.
The scene shows these learned topics interacting together: ${topicsList}.
Style: Colorful, playful, educational game art style.
Requirements: All topics clearly visible and recognizable, topics interacting naturally, warm inviting atmosphere suitable for ages 6-12.
16:9 landscape aspect ratio. Color palette: ${zoneStyle.palette}.
No text or labels in the image.`
}

/**
 * Generate a connection scene image for a pocket
 * Creates an AI-generated image showing the pocket's topics interacting
 *
 * @param {Object} pocket - The pocket to generate a scene for
 * @param {string} pocket.zone - The zone: 'nature' | 'civilization' | 'arcane'
 * @param {Object[]} pocket.pieces - Array of pieces in the pocket
 * @param {string} pocket.pieces[].topicName - Name of each topic
 * @param {string} [pocket.pocketName] - Optional custom pocket name
 * @returns {Promise<{
 *   imageUrl: string | null,
 *   prompt: string | null,
 *   description: string | null,
 *   evolutionLevel: string,
 *   pieceCount: number,
 *   generatedAt: Date,
 *   error: string | null
 * }>}
 */
export async function generateConnectionScene(pocket) {
  // Validate inputs
  if (!pocket || !pocket.zone || !Array.isArray(pocket.pieces)) {
    return {
      imageUrl: null,
      prompt: null,
      description: null,
      evolutionLevel: 'initial',
      pieceCount: 0,
      generatedAt: new Date(),
      error: 'INVALID_POCKET'
    }
  }

  if (pocket.pieces.length < 3) {
    return {
      imageUrl: null,
      prompt: null,
      description: null,
      evolutionLevel: 'initial',
      pieceCount: pocket.pieces.length,
      generatedAt: new Date(),
      error: 'INSUFFICIENT_PIECES'
    }
  }

  const ai = getAIClient()
  if (!ai) {
    return {
      imageUrl: null,
      prompt: null,
      description: null,
      evolutionLevel: getSceneEvolutionLevel(pocket.pieces.length),
      pieceCount: pocket.pieces.length,
      generatedAt: new Date(),
      error: 'API_NOT_AVAILABLE'
    }
  }

  // Step 1: Generate the scene prompt
  const promptResult = await generateScenePrompt(pocket)

  if (promptResult.error && !promptResult.prompt) {
    return {
      imageUrl: null,
      prompt: null,
      description: null,
      evolutionLevel: getSceneEvolutionLevel(pocket.pieces.length),
      pieceCount: pocket.pieces.length,
      generatedAt: new Date(),
      error: promptResult.error
    }
  }

  const evolutionLevel = getSceneEvolutionLevel(pocket.pieces.length)

  // Step 2: Generate the image
  const enhancedPrompt = `${promptResult.prompt}

Additional style requirements for connection scene:
- Educational game art style, vibrant saturated colors
- 16:9 landscape aspect ratio (1920x1080 proportions)
- Scene should fill the entire frame
- All elements clearly visible and recognizable
- Child-friendly, magical, inviting atmosphere
- No text, labels, or UI elements
- High quality illustration suitable for display in a game UI`

  let lastError = null

  // Try image generation with fallback models
  for (const model of [IMAGE_MODEL, ...IMAGE_MODEL_FALLBACKS]) {
    try {
      logger.time('CONNECTION_SCENE', 'generate-image')

      const response = await ai.models.generateContent({
        model,
        contents: enhancedPrompt,
        config: {
          responseModalities: ['IMAGE'],
        }
      })

      logger.timeEnd('CONNECTION_SCENE', 'generate-image')

      // Extract image data from response
      const parts = response.candidates?.[0]?.content?.parts || []

      for (const part of parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png'
          const base64Data = (part.inlineData.data || '').replace(/\s/g, '')
          const imageUrl = `data:${mimeType};base64,${base64Data}`

          logger.info('CONNECTION_SCENE', 'Scene generated successfully', {
            model,
            zone: pocket.zone,
            pieceCount: pocket.pieces.length,
            evolutionLevel
          })

          return {
            imageUrl,
            prompt: promptResult.prompt,
            description: promptResult.description,
            evolutionLevel,
            pieceCount: pocket.pieces.length,
            generatedAt: new Date(),
            error: null
          }
        }
      }

      // No image in response, try next model
      lastError = 'NO_IMAGE_GENERATED'
    } catch (error) {
      logger.warn('CONNECTION_SCENE', `Image generation failed with model ${model}`, {
        error: error.message
      })
      lastError = error.message

      // Handle content filtering
      if (error.message?.includes('SAFETY') || error.message?.includes('blocked')) {
        lastError = 'CONTENT_FILTERED'
        break // Don't try other models if content was filtered
      }

      // Handle rate limiting
      if (error.message?.includes('quota') || error.message?.includes('rate')) {
        lastError = 'RATE_LIMITED'
        break
      }
    }
  }

  // All models failed
  return {
    imageUrl: null,
    prompt: promptResult.prompt,
    description: promptResult.description,
    evolutionLevel,
    pieceCount: pocket.pieces.length,
    generatedAt: new Date(),
    error: lastError || 'GENERATION_FAILED'
  }
}

/**
 * Get scene evolution level display info for UI
 *
 * @param {string} level - Evolution level: 'initial' | 'enhanced' | 'legendary'
 * @returns {{ label: string, icon: string, color: string, minPieces: number }}
 */
export function getSceneLevelDisplayInfo(level) {
  const info = {
    initial: {
      label: SCENE_EVOLUTION_LEVELS.initial.label,
      icon: 'link',
      color: '#60a5fa', // blue-400
      minPieces: SCENE_EVOLUTION_LEVELS.initial.min
    },
    enhanced: {
      label: SCENE_EVOLUTION_LEVELS.enhanced.label,
      icon: 'network',
      color: '#a78bfa', // violet-400
      minPieces: SCENE_EVOLUTION_LEVELS.enhanced.min
    },
    legendary: {
      label: SCENE_EVOLUTION_LEVELS.legendary.label,
      icon: 'sparkles',
      color: '#f59e0b', // amber-500
      minPieces: SCENE_EVOLUTION_LEVELS.legendary.min
    }
  }

  return info[level] || info.initial
}

/**
 * Check if a pocket scene should be regenerated
 * Based on whether new pieces have been added since last generation
 *
 * @param {Object} pocket - The pocket to check
 * @param {Object} existingScene - The existing scene data (if any)
 * @returns {{ shouldRegenerate: boolean, reason: string | null }}
 */
export function shouldRegenerateScene(pocket, existingScene) {
  if (!existingScene || !existingScene.imageUrl) {
    return { shouldRegenerate: true, reason: 'no_existing_scene' }
  }

  const currentPieceCount = pocket.pieces?.length || 0
  const previousPieceCount = existingScene.pieceCountAtGeneration || 0

  // Regenerate if evolution level has changed
  const currentLevel = getSceneEvolutionLevel(currentPieceCount)
  const previousLevel = getSceneEvolutionLevel(previousPieceCount)

  if (currentLevel !== previousLevel) {
    return { shouldRegenerate: true, reason: 'evolution_level_changed' }
  }

  // Regenerate if significant pieces have been added (2+ new pieces)
  if (currentPieceCount >= previousPieceCount + 2) {
    return { shouldRegenerate: true, reason: 'significant_pieces_added' }
  }

  return { shouldRegenerate: false, reason: null }
}

export default {
  generateScenePrompt,
  generateConnectionScene,
  getSceneEvolutionLevel,
  getSceneLevelDisplayInfo,
  shouldRegenerateScene,
  SCENE_EVOLUTION_LEVELS
}
