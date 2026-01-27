/**
 * PocketView Component
 * WB013: Full-screen view when user enters a pocket portal
 *
 * Displays the pieces within a pocket world with:
 * - Category-themed background
 * - Grid or scattered layout of pieces
 * - Smooth zoom-in transition from portal
 * - Back button to return to main world
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import WorldPiece from './WorldPiece'

/**
 * Category-specific backgrounds for pocket worlds
 */
const POCKET_BACKGROUNDS = {
  ocean: {
    gradient: 'from-cyan-600 via-blue-700 to-blue-900',
    decorationClass: 'pocket-ocean-decor',
  },
  space: {
    gradient: 'from-indigo-900 via-purple-900 to-black',
    decorationClass: 'pocket-space-decor',
  },
  dinosaurs: {
    gradient: 'from-amber-600 via-orange-700 to-red-900',
    decorationClass: 'pocket-dino-decor',
  },
  ancient: {
    gradient: 'from-yellow-700 via-amber-800 to-stone-900',
    decorationClass: 'pocket-ancient-decor',
  },
  plants: {
    gradient: 'from-green-500 via-emerald-600 to-green-800',
    decorationClass: 'pocket-plant-decor',
  },
  animals: {
    gradient: 'from-orange-500 via-amber-600 to-orange-800',
    decorationClass: 'pocket-animal-decor',
  },
  weather: {
    gradient: 'from-slate-500 via-blue-600 to-slate-800',
    decorationClass: 'pocket-weather-decor',
  },
  technology: {
    gradient: 'from-cyan-600 via-blue-700 to-slate-900',
    decorationClass: 'pocket-tech-decor',
  },
  music: {
    gradient: 'from-pink-500 via-purple-600 to-indigo-800',
    decorationClass: 'pocket-music-decor',
  },
  general: {
    gradient: 'from-violet-500 via-purple-600 to-indigo-800',
    decorationClass: 'pocket-general-decor',
  },
}

/**
 * Get background config for a category
 */
function getPocketBackground(category) {
  return POCKET_BACKGROUNDS[category?.toLowerCase()] || POCKET_BACKGROUNDS.general
}

/**
 * Calculate scattered positions for pieces within the pocket
 * Creates a visually pleasing arrangement with some randomization
 */
function calculateScatteredPositions(pieces) {
  if (!pieces || pieces.length === 0) return []

  // For small counts, use a loose grid pattern
  // For larger counts, scatter more randomly
  const count = pieces.length
  const columns = Math.min(count, Math.ceil(Math.sqrt(count) + 1))
  const rows = Math.ceil(count / columns)

  return pieces.map((piece, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)

    // Base position from grid
    const baseX = (col + 0.5) / columns * 100
    const baseY = (row + 0.5) / rows * 100

    // Add some controlled randomness using piece id for consistency
    const seed = piece.id ? parseInt(piece.id.slice(-4), 16) || index : index
    const offsetX = ((seed % 20) - 10) / 2
    const offsetY = (((seed * 7) % 20) - 10) / 2

    return {
      ...piece,
      pocketX: Math.min(90, Math.max(10, baseX + offsetX)),
      pocketY: Math.min(85, Math.max(15, baseY + offsetY)),
    }
  })
}

/**
 * PocketView - Full screen view of a pocket world
 *
 * @param {Object} props - Component props
 * @param {Object} props.pocket - Pocket data { category, pieces, zone, theme }
 * @param {Function} props.onBack - Callback to return to main world
 * @param {Function} [props.onPieceClick] - Callback when a piece is clicked
 */
function PocketView({
  pocket,
  onBack,
  onPieceClick,
}) {
  // Animation state for zoom-in effect
  const [isEntering, setIsEntering] = useState(true)
  const [isExiting, setIsExiting] = useState(false)

  const { category, pieces, zone, theme } = pocket || {}
  const bgConfig = getPocketBackground(category)

  // Calculate piece positions for scattered layout
  const positionedPieces = useMemo(
    () => calculateScatteredPositions(pieces),
    [pieces]
  )

  /**
   * Complete entrance animation
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false)
    }, 500) // Match transition duration

    return () => clearTimeout(timer)
  }, [])

  /**
   * Handle back button - triggers exit animation then calls onBack
   */
  const handleBack = useCallback(() => {
    setIsExiting(true)

    // Wait for exit animation to complete
    setTimeout(() => {
      onBack?.()
    }, 400) // Slightly shorter than enter for snappy feel
  }, [onBack])

  /**
   * Handle keyboard escape to go back
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleBack])

  if (!pocket) {
    return null
  }

  return (
    <div
      className={`
        fixed inset-0 z-50
        bg-gradient-to-b ${bgConfig.gradient}
        transition-all duration-500 ease-out
        ${isEntering ? 'pocket-zoom-in' : ''}
        ${isExiting ? 'pocket-zoom-out' : ''}
      `}
      role="region"
      aria-label={`${theme?.label || 'Pocket'} world with ${pieces?.length || 0} pieces`}
    >
      {/* Background decorations based on category */}
      <div className={`absolute inset-0 ${bgConfig.decorationClass} pointer-events-none overflow-hidden`}>
        {/* Ambient particles/decorations */}
        {category === 'ocean' && (
          <>
            <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-cyan-200/30 rounded-full pocket-float" />
            <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-blue-200/40 rounded-full pocket-float" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-1/3 left-1/2 w-4 h-4 bg-cyan-100/20 rounded-full pocket-float" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-blue-300/30 rounded-full pocket-float" style={{ animationDelay: '1.5s' }} />
          </>
        )}
        {category === 'space' && (
          <>
            <div className="absolute top-1/5 left-1/4 w-1 h-1 bg-white/80 rounded-full pocket-twinkle" />
            <div className="absolute top-1/4 right-1/3 w-1.5 h-1.5 bg-white/60 rounded-full pocket-twinkle" style={{ animationDelay: '0.3s' }} />
            <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-yellow-200/70 rounded-full pocket-twinkle" style={{ animationDelay: '0.6s' }} />
            <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-blue-200/40 rounded-full pocket-twinkle" style={{ animationDelay: '0.9s' }} />
            <div className="absolute bottom-1/3 right-1/2 w-1 h-1 bg-white/70 rounded-full pocket-twinkle" style={{ animationDelay: '1.2s' }} />
          </>
        )}
      </div>

      {/* Header with back button and title */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          {/* Back button */}
          <button
            onClick={handleBack}
            className={`
              flex items-center gap-2
              px-4 py-2.5 rounded-xl
              bg-white/20 backdrop-blur-sm
              text-white font-medium
              hover:bg-white/30
              active:scale-95
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-white/50
            `}
            aria-label="Return to main world"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            <span className="hidden sm:inline">Back to World</span>
          </button>

          {/* Pocket title */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">{theme?.icon || '✨'}</span>
            <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg">
              {theme?.label || 'Pocket World'}
            </h1>
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm text-white/80">
              {pieces?.length || 0} pieces
            </span>
          </div>
        </div>
      </div>

      {/* Pieces container - scattered layout */}
      <div className="absolute inset-0 pt-20 sm:pt-24 pb-8 px-4">
        <div className="relative w-full h-full">
          {positionedPieces.map((piece, index) => (
            <div
              key={piece.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 pocket-piece-enter"
              style={{
                left: `${piece.pocketX}%`,
                top: `${piece.pocketY}%`,
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <WorldPiece
                piece={piece}
                onClick={onPieceClick}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Escape hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm pointer-events-none">
        Press ESC or tap back to return
      </div>
    </div>
  )
}

export default PocketView
