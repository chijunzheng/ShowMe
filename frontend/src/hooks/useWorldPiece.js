/**
 * useWorldPiece Hook
 * WB010: Manages world piece unlocking after quiz completion
 * WB019: Integrates evolution and pocket scene checks into piece unlock flow
 *
 * This hook handles:
 * - Generating piece images via API
 * - Adding pieces to the user's world state
 * - Managing the pending piece for celebration animation
 * - Checking for evolutions when pieces are added
 * - Checking if new pieces trigger pocket scene regeneration
 * - Managing celebration queue for sequential celebrations
 * - Tracking unlock progress
 *
 * T001: Pass quiz for volcano topic
 * T004: Verify piece added to world state
 * T006: Verify piece is in correct zone (nature for volcano)
 * T007: Verify evolution check runs after piece unlock
 * T008: Verify pocket scene check runs after piece unlock
 */

import { useState, useCallback, useRef } from 'react'
import { getClientId } from '../utils/clientId'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Celebration types for the queue system
 */
const CELEBRATION_TYPES = {
  PIECE_UNLOCK: 'piece-unlock',
  EVOLUTION: 'evolution',
  POCKET_SCENE: 'pocket-scene',
}

/**
 * Topic to zone mapping logic
 * Maps educational topics to their appropriate world zones
 *
 * @param {string} topicName - Name of the topic
 * @param {string} [category] - Optional category from classification
 * @returns {string} Zone name (nature, civilization, or arcane)
 */
function determineZone(topicName, category) {
  // If category is provided, use it directly
  if (category) {
    const normalizedCategory = category.toLowerCase()
    if (['nature', 'civilization', 'arcane'].includes(normalizedCategory)) {
      return normalizedCategory
    }
  }

  // Fallback: Determine zone based on topic keywords
  const topicLower = topicName.toLowerCase()

  // Nature zone: natural phenomena, animals, plants, earth sciences
  const natureKeywords = [
    'volcano', 'mountain', 'ocean', 'river', 'forest', 'tree', 'plant',
    'animal', 'dinosaur', 'fish', 'bird', 'insect', 'weather', 'rain',
    'snow', 'earthquake', 'tornado', 'hurricane', 'ecosystem', 'biology',
    'earth', 'rock', 'mineral', 'crystal', 'water', 'nature', 'wildlife',
    'climate', 'environment', 'solar', 'star', 'planet', 'moon', 'sun',
  ]

  // Civilization zone: human achievements, history, technology
  const civilizationKeywords = [
    'pyramid', 'castle', 'city', 'building', 'bridge', 'architecture',
    'history', 'war', 'king', 'queen', 'empire', 'civilization', 'invention',
    'machine', 'computer', 'robot', 'car', 'train', 'plane', 'ship',
    'medicine', 'hospital', 'school', 'library', 'museum', 'art', 'music',
    'sport', 'olympics', 'government', 'law', 'economy', 'money', 'trade',
  ]

  // Check for nature keywords
  if (natureKeywords.some(keyword => topicLower.includes(keyword))) {
    return 'nature'
  }

  // Check for civilization keywords
  if (civilizationKeywords.some(keyword => topicLower.includes(keyword))) {
    return 'civilization'
  }

  // Default to arcane for abstract/mystical/unknown topics
  return 'arcane'
}

/**
 * Generate a unique piece ID
 *
 * @returns {string} Unique identifier
 */
function generatePieceId() {
  return `piece_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Select an appropriate icon based on topic
 *
 * @param {string} topicName - Name of the topic
 * @param {string} zone - Zone type
 * @returns {string} Emoji icon
 */
function selectPieceIcon(topicName, zone) {
  const topicLower = topicName.toLowerCase()

  // Nature icons
  if (topicLower.includes('volcano')) return '🌋'
  if (topicLower.includes('mountain')) return '🏔️'
  if (topicLower.includes('ocean') || topicLower.includes('sea')) return '🌊'
  if (topicLower.includes('forest') || topicLower.includes('tree')) return '🌲'
  if (topicLower.includes('dinosaur')) return '🦕'
  if (topicLower.includes('animal')) return '🦁'
  if (topicLower.includes('bird')) return '🦅'
  if (topicLower.includes('fish')) return '🐠'
  if (topicLower.includes('star') || topicLower.includes('space')) return '⭐'
  if (topicLower.includes('planet')) return '🪐'
  if (topicLower.includes('sun')) return '☀️'
  if (topicLower.includes('moon')) return '🌙'
  if (topicLower.includes('weather')) return '🌤️'
  if (topicLower.includes('rain')) return '🌧️'
  if (topicLower.includes('snow')) return '❄️'
  if (topicLower.includes('flower') || topicLower.includes('plant')) return '🌸'

  // Civilization icons
  if (topicLower.includes('pyramid')) return '🏛️'
  if (topicLower.includes('castle')) return '🏰'
  if (topicLower.includes('city')) return '🏙️'
  if (topicLower.includes('robot')) return '🤖'
  if (topicLower.includes('computer')) return '💻'
  if (topicLower.includes('car')) return '🚗'
  if (topicLower.includes('train')) return '🚂'
  if (topicLower.includes('plane') || topicLower.includes('airplane')) return '✈️'
  if (topicLower.includes('ship') || topicLower.includes('boat')) return '🚢'
  if (topicLower.includes('art') || topicLower.includes('painting')) return '🎨'
  if (topicLower.includes('music')) return '🎵'
  if (topicLower.includes('book') || topicLower.includes('library')) return '📚'
  if (topicLower.includes('science') || topicLower.includes('lab')) return '🔬'

  // Zone-based fallback icons
  switch (zone) {
    case 'nature':
      return '🌿'
    case 'civilization':
      return '🏛️'
    case 'arcane':
      return '✨'
    default:
      return '🌍'
  }
}

/**
 * useWorldPiece - Hook for managing world piece unlocking with celebration queue
 *
 * @returns {Object} Hook state and methods
 */
export default function useWorldPiece() {
  // The piece waiting to be celebrated (triggers celebration overlay)
  const [pendingPiece, setPendingPiece] = useState(null)

  // Whether an unlock operation is in progress
  const [isUnlocking, setIsUnlocking] = useState(false)

  // Error state for unlock failures
  const [unlockError, setUnlockError] = useState(null)

  // Track recently unlocked pieces for this session
  const [sessionPieces, setSessionPieces] = useState([])

  // Celebration queue for sequential celebrations
  // Each item: { type: 'piece-unlock' | 'evolution' | 'pocket-scene', data: Object }
  const [celebrationQueue, setCelebrationQueue] = useState([])

  // Currently showing celebration (from queue)
  const [currentCelebration, setCurrentCelebration] = useState(null)

  // Pending pocket scene reveal (if any)
  const [pendingPocketScene, setPendingPocketScene] = useState(null)

  // Ref to prevent duplicate unlock attempts
  const unlockInProgressRef = useRef(false)

  /**
   * Generate a piece image via API
   * Calls the backend to create a unique piece image based on the topic
   *
   * @param {string} topicName - Name of the topic
   * @param {string} zone - Zone type for styling hints
   * @returns {Promise<string|null>} Image URL or null on failure
   */
  const generatePieceImage = useCallback(async (topicName, zone) => {
    try {
      const response = await fetch(`${API_BASE}/api/world/piece/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          topicName,
          zone,
        }),
      })

      if (!response.ok) {
        console.warn('Failed to generate piece image, using fallback')
        return null
      }

      const data = await response.json()
      return data.imageUrl || null
    } catch (error) {
      console.warn('Error generating piece image:', error.message)
      return null
    }
  }, [])

  /**
   * Add a piece to the user's world state via API
   * Returns enhanced response with evolution and pocket info
   *
   * @param {Object} piece - Piece data to add
   * @returns {Promise<Object|null>} API response with piece, evolutions, pockets, or null on failure
   */
  const addPieceToWorld = useCallback(async (piece) => {
    try {
      const response = await fetch(`${API_BASE}/api/world/piece`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          piece,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add piece to world')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error adding piece to world:', error.message)
      return null
    }
  }, [])

  /**
   * Check for piece evolutions after adding a new piece
   * Evolutions occur when related pieces form patterns
   *
   * @param {Object} piece - The newly added piece
   * @returns {Promise<Object>} Evolution check result
   */
  const checkEvolutions = useCallback(async (piece) => {
    try {
      const response = await fetch(`${API_BASE}/api/world/piece/check-evolutions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          pieceId: piece.id,
        }),
      })

      if (!response.ok) {
        console.warn('Evolution check failed, skipping')
        return { evolutions: [] }
      }

      const data = await response.json()
      return {
        evolutions: data.evolutions || [],
      }
    } catch (error) {
      console.warn('Error checking evolutions:', error.message)
      return { evolutions: [] }
    }
  }, [])

  /**
   * Check if the new piece triggers pocket scene regeneration
   * Happens when piece count crosses thresholds (3, 5, 7)
   *
   * @param {Object} piece - The newly added piece
   * @returns {Promise<Object>} Pocket scene check result
   */
  const checkPocketScene = useCallback(async (piece) => {
    try {
      const response = await fetch(`${API_BASE}/api/world/pocket/check-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: getClientId(),
          pieceId: piece.id,
        }),
      })

      if (!response.ok) {
        console.warn('Pocket scene check failed, skipping')
        return { shouldRegenerate: false, newScene: null }
      }

      const data = await response.json()
      return {
        shouldRegenerate: data.shouldRegenerate || false,
        newScene: data.scene || null,
        pocket: data.pocket || null,
      }
    } catch (error) {
      console.warn('Error checking pocket scene:', error.message)
      return { shouldRegenerate: false, newScene: null }
    }
  }, [])

  /**
   * Process the celebration queue
   * Shows the next celebration in sequence
   */
  const processNextCelebration = useCallback(() => {
    setCelebrationQueue(prevQueue => {
      if (prevQueue.length === 0) {
        setCurrentCelebration(null)
        return prevQueue
      }

      const [next, ...rest] = prevQueue
      setCurrentCelebration(next)
      return rest
    })
  }, [])

  /**
   * Complete the current celebration and show next
   */
  const completeCelebration = useCallback(() => {
    processNextCelebration()
  }, [processNextCelebration])

  /**
   * Unlock a new piece after quiz completion with full celebration flow
   * Main entry point for piece unlocking flow
   *
   * Flow:
   * 1. Save piece to world
   * 2. Check for evolutions -> if any, queue evolution celebrations
   * 3. Check if piece joins a pocket that needs scene regeneration
   * 4. Queue piece unlock celebration
   * 5. Queue evolution celebrations (if any)
   * 6. Queue pocket scene reveal (if applicable)
   * 7. Start celebration sequence
   *
   * @param {Object} quizResult - Quiz completion result
   * @param {number} quizResult.percentage - Score percentage (0-100)
   * @param {boolean} [quizResult.passed] - Whether quiz was passed
   * @param {Object} topicInfo - Information about the quiz topic
   * @param {string} topicInfo.name - Topic name
   * @param {string} [topicInfo.category] - Topic category for zone mapping
   * @param {string} [topicInfo.description] - Topic description
   * @returns {Promise<Object|null>} Unlocked piece or null on failure
   */
  const unlockPiece = useCallback(async (quizResult, topicInfo) => {
    // Prevent duplicate unlocks
    if (unlockInProgressRef.current) {
      console.warn('Unlock already in progress')
      return null
    }

    // Validate quiz passed (default threshold: 70%)
    const passed = quizResult.passed ?? quizResult.percentage >= 70
    if (!passed) {
      console.log('Quiz not passed, piece not unlocked')
      return null
    }

    // Validate topic info
    if (!topicInfo?.name) {
      console.error('Topic name required for piece unlock')
      return null
    }

    try {
      unlockInProgressRef.current = true
      setIsUnlocking(true)
      setUnlockError(null)

      // Determine the zone for this topic (T006)
      const zone = determineZone(topicInfo.name, topicInfo.category)

      // Select an appropriate icon
      const icon = selectPieceIcon(topicInfo.name, zone)

      // Generate a unique piece ID
      const pieceId = generatePieceId()

      // Attempt to generate a custom piece image (best effort)
      const imageUrl = await generatePieceImage(topicInfo.name, zone)

      // Construct the piece object
      const piece = {
        id: pieceId,
        name: topicInfo.name,
        zone,
        icon,
        imageUrl,
        description: topicInfo.description || null,
        unlockedAt: new Date().toISOString(),
        quizScore: quizResult.percentage,
      }

      // Step 1: Add to world state via API (T004)
      const addResult = await addPieceToWorld(piece)

      if (!addResult) {
        throw new Error('Failed to save piece to world')
      }

      // Update piece with any server-side additions
      const savedPiece = addResult.piece || piece

      // Step 2: Check for evolutions (T007)
      const evolutionResult = await checkEvolutions(savedPiece)

      // Step 3: Check for pocket scene regeneration (T008)
      const pocketResult = await checkPocketScene(savedPiece)

      // Step 4: Build celebration queue in order
      const celebrations = []

      // First: Piece unlock celebration
      celebrations.push({
        type: CELEBRATION_TYPES.PIECE_UNLOCK,
        data: savedPiece,
      })

      // Second: Evolution celebrations (if any)
      if (evolutionResult.evolutions && evolutionResult.evolutions.length > 0) {
        evolutionResult.evolutions.forEach(evolution => {
          celebrations.push({
            type: CELEBRATION_TYPES.EVOLUTION,
            data: evolution,
          })
        })
      }

      // Third: Pocket scene reveal (if new scene generated)
      if (pocketResult.newScene) {
        celebrations.push({
          type: CELEBRATION_TYPES.POCKET_SCENE,
          data: {
            scene: pocketResult.newScene,
            pocket: pocketResult.pocket,
          },
        })
      }

      // Track in session
      setSessionPieces(prev => [...prev, savedPiece])

      // Set the queue and start celebrations
      setCelebrationQueue(celebrations.slice(1)) // All but first
      setCurrentCelebration(celebrations[0]) // Start with first

      // Also set pendingPiece for backwards compatibility
      setPendingPiece(savedPiece)

      // Store pending pocket scene for access
      if (pocketResult.newScene) {
        setPendingPocketScene({
          scene: pocketResult.newScene,
          pocket: pocketResult.pocket,
        })
      }

      return savedPiece
    } catch (error) {
      console.error('Error unlocking piece:', error.message)
      setUnlockError(error.message)
      return null
    } finally {
      setIsUnlocking(false)
      unlockInProgressRef.current = false
    }
  }, [generatePieceImage, addPieceToWorld, checkEvolutions, checkPocketScene])

  /**
   * Clear the pending piece after celebration is shown
   * Should be called after user dismisses celebration overlay
   */
  const clearPendingPiece = useCallback(() => {
    setPendingPiece(null)
  }, [])

  /**
   * Clear the pending pocket scene
   */
  const clearPendingPocketScene = useCallback(() => {
    setPendingPocketScene(null)
  }, [])

  /**
   * Clear any unlock errors
   */
  const clearUnlockError = useCallback(() => {
    setUnlockError(null)
  }, [])

  /**
   * Get pieces unlocked in current session
   *
   * @returns {Array} Session pieces
   */
  const getSessionPieces = useCallback(() => {
    return [...sessionPieces]
  }, [sessionPieces])

  /**
   * Skip to next celebration in queue
   * Useful if user wants to skip current celebration
   */
  const skipCelebration = useCallback(() => {
    processNextCelebration()
  }, [processNextCelebration])

  /**
   * Clear all celebrations and reset state
   */
  const clearAllCelebrations = useCallback(() => {
    setCelebrationQueue([])
    setCurrentCelebration(null)
    setPendingPiece(null)
    setPendingPocketScene(null)
  }, [])

  return {
    // State
    pendingPiece,
    isUnlocking,
    unlockError,
    sessionPieces,
    celebrationQueue,
    currentCelebration,
    pendingPocketScene,

    // Actions
    unlockPiece,
    clearPendingPiece,
    clearPendingPocketScene,
    clearUnlockError,
    getSessionPieces,
    completeCelebration,
    skipCelebration,
    clearAllCelebrations,

    // Constants (for external use)
    CELEBRATION_TYPES,
  }
}

// Also export utility functions for testing
export { determineZone, selectPieceIcon, generatePieceId, CELEBRATION_TYPES }
