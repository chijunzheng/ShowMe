/**
 * WorldView Component
 * WB011 + WB012: Main container for the World Builder diorama view
 * WB013: Pocket portal system for grouping related pieces
 *
 * This component:
 * - Manages world state (pieces, tier, loading)
 * - Fetches world data from API
 * - Renders the parallax diorama or empty state
 * - Handles piece click interactions
 * - Detects and manages pocket portals for clustered pieces
 *
 * The world displays user's learned topics as collectible pieces
 * arranged in a parallax diorama with 3 depth layers.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import ParallaxDiorama from './ParallaxDiorama'
import PocketView from './PocketView'
import ArcaneReveal from './ArcaneReveal'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * World tier thresholds based on piece count
 */
const TIER_THRESHOLDS = {
  legendary: 50,
  thriving: 30,
  growing: 15,
  sprouting: 5,
  barren: 0,
}

/**
 * Calculate tier based on piece count
 */
function calculateTier(pieceCount) {
  if (pieceCount >= TIER_THRESHOLDS.legendary) return 'legendary'
  if (pieceCount >= TIER_THRESHOLDS.thriving) return 'thriving'
  if (pieceCount >= TIER_THRESHOLDS.growing) return 'growing'
  if (pieceCount >= TIER_THRESHOLDS.sprouting) return 'sprouting'
  return 'barren'
}

/**
 * WB013: Minimum pieces required to form a pocket portal
 */
const POCKET_THRESHOLD = 3

/**
 * WB013: Category inference patterns
 * Maps keywords in topic names to sub-categories
 */
const CATEGORY_PATTERNS = {
  ocean: /ocean|sea|fish|whale|coral|shark|dolphin|jellyfish|octopus|reef|marine|aquatic|underwater/i,
  space: /space|planet|star|galaxy|moon|asteroid|rocket|astronaut|solar|cosmic|nebula|mars|saturn|jupiter/i,
  dinosaurs: /dinosaur|fossil|prehistoric|jurassic|trex|raptor|pterodactyl|extinct|triassic|cretaceous/i,
  ancient: /ancient|egypt|rome|greek|pyramid|pharaoh|gladiator|mythology|medieval|castle|knight/i,
  plants: /plant|tree|flower|garden|forest|leaf|root|photosynthesis|seed|botany|jungle|rainforest/i,
  animals: /animal|lion|tiger|elephant|bird|mammal|reptile|insect|bug|wildlife|zoo|safari|predator/i,
  weather: /weather|rain|storm|cloud|tornado|hurricane|lightning|snow|climate|wind|thunder|forecast/i,
  technology: /computer|robot|ai|machine|code|software|internet|digital|electronic|circuit|programming/i,
  music: /music|song|instrument|guitar|piano|drum|melody|rhythm|orchestra|concert|symphony/i,
}

/**
 * WB013: Infer category from a topic name
 *
 * @param {string} topicName - The name of the topic
 * @returns {string} - Inferred category or 'general'
 */
function inferCategory(topicName) {
  if (!topicName || typeof topicName !== 'string') {
    return 'general'
  }

  const lower = topicName.toLowerCase()

  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(lower)) {
      return category
    }
  }

  return 'general'
}

/**
 * WB013: Detect pocket portals from a collection of pieces
 * Groups pieces by sub-category and returns pockets with 3+ pieces
 *
 * @param {Array} pieces - Array of world pieces
 * @returns {Array} - Array of pocket objects { category, pieces, zone }
 */
function detectPockets(pieces) {
  if (!pieces || !Array.isArray(pieces) || pieces.length < POCKET_THRESHOLD) {
    return []
  }

  // Group pieces by their category
  const categories = {}

  pieces.forEach((piece) => {
    // Use piece's explicit category if available, otherwise infer from topic name
    const category = piece.category || inferCategory(piece.topicName || piece.name)

    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(piece)
  })

  // Filter to only categories with enough pieces to form a pocket
  // Exclude 'general' category from forming pockets (too vague)
  return Object.entries(categories)
    .filter(([category, categoryPieces]) =>
      category !== 'general' && categoryPieces.length >= POCKET_THRESHOLD
    )
    .map(([category, categoryPieces]) => ({
      category,
      pieces: categoryPieces,
      // Use the zone of the first piece in the category
      zone: categoryPieces[0]?.zone || 'nature',
    }))
}

/**
 * Empty state component for new users with no pieces
 */
function EmptyWorldState({ onStartLearning }) {
  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-gradient-to-b from-slate-300 to-slate-500">
      {/* Faded placeholder islands */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Background island silhouettes */}
        <div className="absolute top-1/4 left-1/4 w-32 h-20 bg-slate-400/30 rounded-full blur-sm" />
        <div className="absolute top-1/3 right-1/3 w-24 h-16 bg-slate-400/20 rounded-full blur-sm" />
        <div className="absolute bottom-1/3 left-1/2 w-40 h-24 bg-slate-400/25 rounded-full blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-8">
        {/* World icon */}
        <div className="mx-auto w-20 h-20 mb-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <span className="text-4xl">🌍</span>
        </div>

        {/* Headline */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 drop-shadow-lg">
          Your world awaits!
        </h2>

        {/* Description */}
        <p className="text-white/80 text-lg mb-6 max-w-sm mx-auto">
          Complete a lesson to add your first piece and start building your knowledge world.
        </p>

        {/* CTA Button */}
        <button
          onClick={onStartLearning}
          className="
            px-6 py-3 rounded-xl
            bg-white text-slate-700 font-semibold
            hover:bg-white/90 hover:scale-105
            active:scale-95
            transition-all duration-200
            shadow-lg hover:shadow-xl
            focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-500
          "
        >
          Start Learning
        </button>
      </div>

      {/* Decorative sparkles */}
      <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white/40 rounded-full animate-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/2 right-1/6 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  )
}

/**
 * Loading state component
 */
function LoadingState() {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-gradient-to-b from-slate-300 to-slate-500">
      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      <p className="mt-4 text-white/80">Loading your world...</p>
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }) {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-gradient-to-b from-slate-400 to-slate-600 px-6">
      <div className="text-4xl mb-4">😔</div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Oops! Something went wrong
      </h2>
      <p className="text-white/70 text-center mb-6 max-w-sm">
        {message || 'We couldn\'t load your world. Please try again.'}
      </p>
      <button
        onClick={onRetry}
        className="
          px-5 py-2.5 rounded-lg
          bg-white/20 text-white font-medium
          hover:bg-white/30
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-white/50
        "
      >
        Try Again
      </button>
    </div>
  )
}

/**
 * WorldView - Main world builder container component
 *
 * @param {Object} props - Component props
 * @param {string} props.clientId - User's client ID for API calls
 * @param {Function} [props.onStartLearning] - Callback to start a learning session
 * @param {Function} [props.onPieceClick] - Callback when a piece is clicked
 * @param {Function} [props.onArcaneUnlock] - WB017: Callback when arcane zone is unlocked
 * @param {Array} [props.initialPieces] - Optional initial pieces (for testing)
 * @param {string} [props.initialTier] - Optional initial tier (for testing)
 * @param {boolean} [props.initialArcaneUnlocked] - WB017: Optional initial arcane unlock state (for testing)
 * @param {boolean} [props.skipFetch] - Skip API fetch (for testing with initialPieces)
 */
function WorldView({
  clientId,
  onStartLearning,
  onPieceClick,
  onArcaneUnlock,
  initialPieces,
  initialTier,
  initialArcaneUnlocked = false,
  skipFetch = false,
}) {
  // World state
  const [pieces, setPieces] = useState(initialPieces || [])
  const [tier, setTier] = useState(initialTier || 'barren')
  const [isLoading, setIsLoading] = useState(!skipFetch)
  const [error, setError] = useState(null)

  // WB017: Arcane zone unlock state
  const [arcaneUnlocked, setArcaneUnlocked] = useState(initialArcaneUnlocked)
  const [topicsNeeded, setTopicsNeeded] = useState(20) // Default threshold
  const [showArcaneReveal, setShowArcaneReveal] = useState(false)

  // WB013: Pocket portal state
  const [activePocket, setActivePocket] = useState(null)

  // WB013: Detect pocket portals from current pieces
  const pockets = useMemo(() => detectPockets(pieces), [pieces])

  /**
   * Fetch world state from API
   */
  const fetchWorldState = useCallback(async () => {
    if (skipFetch || !clientId) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `${API_BASE}/api/world?clientId=${encodeURIComponent(clientId)}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch world state')
      }

      const data = await response.json()
      const worldState = data.worldState || {}

      // Update state with fetched data
      setPieces(worldState.pieces || [])

      // Calculate tier from piece count if not provided
      const calculatedTier = worldState.tier || calculateTier(worldState.pieces?.length || 0)
      setTier(calculatedTier)

      // WB017: Update arcane unlock state from world state response
      setArcaneUnlocked(worldState.arcaneUnlocked || false)
      const topicsCompleted = worldState.topicsCompleted || 0
      const threshold = data.tiers?.arcaneUnlockThreshold || 20
      setTopicsNeeded(Math.max(0, threshold - topicsCompleted))
    } catch (err) {
      console.error('Failed to load world state:', err)
      setError(err.message)

      // Use empty state on error
      setPieces([])
      setTier('barren')
    } finally {
      setIsLoading(false)
    }
  }, [clientId, skipFetch])

  /**
   * Load world state on mount
   */
  useEffect(() => {
    fetchWorldState()
  }, [fetchWorldState])

  /**
   * Handle piece click - opens piece details
   */
  const handlePieceClick = useCallback((piece) => {
    onPieceClick?.(piece)
  }, [onPieceClick])

  /**
   * Handle start learning button
   */
  const handleStartLearning = useCallback(() => {
    onStartLearning?.()
  }, [onStartLearning])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    fetchWorldState()
  }, [fetchWorldState])

  /**
   * WB013: Handle pocket portal click - opens pocket view
   */
  const handlePocketClick = useCallback((pocketData) => {
    setActivePocket(pocketData)
  }, [])

  /**
   * WB013: Handle return from pocket view
   */
  const handlePocketBack = useCallback(() => {
    setActivePocket(null)
  }, [])

  /**
   * WB017: Handle arcane reveal animation completion
   */
  const handleArcaneRevealComplete = useCallback(() => {
    setShowArcaneReveal(false)
    onArcaneUnlock?.()
  }, [onArcaneUnlock])

  /**
   * WB017: Trigger arcane reveal when unlocked via external action
   * This is called when a piece is added that triggers the unlock
   */
  const triggerArcaneReveal = useCallback(() => {
    setArcaneUnlocked(true)
    setTopicsNeeded(0)
    setShowArcaneReveal(true)
  }, [])

  // WB013: Render pocket view if active
  if (activePocket) {
    return (
      <PocketView
        pocket={activePocket}
        onBack={handlePocketBack}
        onPieceClick={onPieceClick}
      />
    )
  }

  // WB017: Render arcane reveal animation if showing
  if (showArcaneReveal) {
    return (
      <ArcaneReveal onComplete={handleArcaneRevealComplete} />
    )
  }

  // Render loading state
  if (isLoading) {
    return <LoadingState />
  }

  // Render error state
  if (error) {
    return <ErrorState message={error} onRetry={handleRetry} />
  }

  // Render empty state for new users
  if (!pieces || pieces.length === 0) {
    return <EmptyWorldState onStartLearning={handleStartLearning} />
  }

  // Render the parallax diorama with pocket portals
  return (
    <ParallaxDiorama
      pieces={pieces}
      tier={tier}
      pockets={pockets}
      onPieceClick={handlePieceClick}
      onPocketClick={handlePocketClick}
      arcaneUnlocked={arcaneUnlocked}
      topicsNeeded={topicsNeeded}
    />
  )
}

export default WorldView
