/**
 * useWorldPiece Hook
 * WB010: Manages world piece unlocking after quiz completion
 *
 * This hook handles:
 * - Generating piece images via API
 * - Adding pieces to the user's world state
 * - Managing the pending piece for celebration animation
 * - Tracking unlock progress
 *
 * T001: Pass quiz for volcano topic
 * T004: Verify piece added to world state
 * T006: Verify piece is in correct zone (nature for volcano)
 */

import { useState, useCallback, useRef } from 'react'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

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
  return `piece_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get client ID from local storage
 *
 * @returns {string} Client ID
 */
function getClientId() {
  const storageKey = 'showme_client_id'
  let clientId = localStorage.getItem(storageKey)

  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(storageKey, clientId)
  }

  return clientId
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
 * useWorldPiece - Hook for managing world piece unlocking
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
   *
   * @param {Object} piece - Piece data to add
   * @returns {Promise<boolean>} Success status
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

      return true
    } catch (error) {
      console.error('Error adding piece to world:', error.message)
      return false
    }
  }, [])

  /**
   * Unlock a new piece after quiz completion
   * Main entry point for piece unlocking flow
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

      // Add to world state via API (T004)
      const added = await addPieceToWorld(piece)

      if (!added) {
        throw new Error('Failed to save piece to world')
      }

      // Track in session
      setSessionPieces(prev => [...prev, piece])

      // Set as pending to trigger celebration (T002, T003)
      setPendingPiece(piece)

      return piece
    } catch (error) {
      console.error('Error unlocking piece:', error.message)
      setUnlockError(error.message)
      return null
    } finally {
      setIsUnlocking(false)
      unlockInProgressRef.current = false
    }
  }, [generatePieceImage, addPieceToWorld])

  /**
   * Clear the pending piece after celebration is shown
   * Should be called after user dismisses celebration overlay
   */
  const clearPendingPiece = useCallback(() => {
    setPendingPiece(null)
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

  return {
    // State
    pendingPiece,
    isUnlocking,
    unlockError,
    sessionPieces,

    // Actions
    unlockPiece,
    clearPendingPiece,
    clearUnlockError,
    getSessionPieces,
  }
}

// Also export utility functions for testing
export { determineZone, selectPieceIcon, generatePieceId }
