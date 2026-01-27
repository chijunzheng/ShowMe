/**
 * ParallaxDiorama Component
 * WB011: Renders the world as a parallax diorama with 3 distinct layers
 * WB012: Distributes pieces to correct zones (nature=foreground, civilization=mid, arcane=background)
 *
 * The parallax effect is achieved by moving layers at different speeds:
 * - Background (arcane): 0.2x speed - slowest, appears farthest
 * - Midground (civilization): 0.5x speed - medium distance
 * - Foreground (nature): 1.0x speed - fastest, appears closest
 *
 * This creates depth perception as users scroll/drag horizontally.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import ZoneLayer from './ZoneLayer'

/**
 * Parallax speed multipliers for each zone
 * Lower values = slower movement = appears farther away
 */
const PARALLAX_SPEEDS = {
  arcane: 0.2,      // Background - slowest
  civilization: 0.5, // Midground - medium
  nature: 1.0,       // Foreground - fastest
}

/**
 * Tier-based background gradients for the world
 * Reflects the user's progress through visual atmosphere
 */
const TIER_BACKGROUNDS = {
  barren: 'bg-gradient-to-b from-slate-400 to-slate-600',
  sprouting: 'bg-gradient-to-b from-green-200 to-green-400',
  growing: 'bg-gradient-to-b from-emerald-300 to-teal-500',
  thriving: 'bg-gradient-to-b from-cyan-400 to-blue-500',
  legendary: 'bg-gradient-to-b from-purple-400 to-indigo-600',
}

/**
 * Default background for new/unknown tiers
 */
const DEFAULT_BACKGROUND = 'bg-gradient-to-b from-slate-300 to-slate-500'

/**
 * Categorize pieces into their respective zones
 *
 * @param {Array} pieces - All world pieces
 * @returns {Object} Pieces organized by zone
 */
function categorizePiecesByZone(pieces) {
  const zones = {
    nature: [],
    civilization: [],
    arcane: [],
  }

  if (!pieces || !Array.isArray(pieces)) {
    return zones
  }

  pieces.forEach((piece) => {
    const zone = piece.zone?.toLowerCase() || 'nature'
    if (zones[zone]) {
      zones[zone].push(piece)
    } else {
      // Unknown zones default to nature (foreground)
      zones.nature.push(piece)
    }
  })

  return zones
}

/**
 * ParallaxDiorama - The main parallax world view with drag/scroll interaction
 *
 * @param {Object} props - Component props
 * @param {Array} props.pieces - Array of WorldPiece objects
 * @param {string} [props.tier='barren'] - Current world tier for background
 * @param {Function} [props.onPieceClick] - Callback when a piece is clicked
 */
function ParallaxDiorama({ pieces = [], tier = 'barren', onPieceClick }) {
  // Scroll/drag state
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [dragStartOffset, setDragStartOffset] = useState(0)

  // Refs for drag handling
  const containerRef = useRef(null)
  const velocityRef = useRef(0)
  const lastDragX = useRef(0)
  const animationRef = useRef(null)

  // Calculate total layer width based on piece count (min 2000px, extends with pieces)
  const layerWidth = useMemo(() => {
    const pieceCount = pieces?.length || 0
    return Math.max(2000, pieceCount * 200 + 400)
  }, [pieces])

  // Maximum scroll offset (allows scrolling to see all content)
  const maxOffset = useMemo(() => {
    if (!containerRef.current) return 0
    return Math.max(0, layerWidth - containerRef.current.clientWidth)
  }, [layerWidth])

  // Organize pieces by zone for rendering in correct layers
  const piecesByZone = useMemo(() => categorizePiecesByZone(pieces), [pieces])

  // Get tier background or default
  const backgroundClass = TIER_BACKGROUNDS[tier] || DEFAULT_BACKGROUND

  /**
   * Clamp scroll offset within valid bounds
   */
  const clampOffset = useCallback((offset) => {
    return Math.max(-maxOffset, Math.min(0, offset))
  }, [maxOffset])

  /**
   * Handle momentum scrolling after drag release
   */
  useEffect(() => {
    if (isDragging || Math.abs(velocityRef.current) < 0.5) {
      return
    }

    const animate = () => {
      velocityRef.current *= 0.95 // Friction decay

      if (Math.abs(velocityRef.current) > 0.5) {
        setScrollOffset((prev) => clampOffset(prev + velocityRef.current))
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isDragging, clampOffset])

  /**
   * Mouse drag handlers
   */
  const handleMouseDown = useCallback((e) => {
    // Ignore if clicking on a piece (let the piece handle it)
    if (e.target.closest('[role="button"]')) return

    setIsDragging(true)
    setDragStart(e.clientX)
    setDragStartOffset(scrollOffset)
    lastDragX.current = e.clientX
    velocityRef.current = 0

    // Cancel any ongoing momentum animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }, [scrollOffset])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStart
    const newOffset = clampOffset(dragStartOffset + deltaX)
    setScrollOffset(newOffset)

    // Track velocity for momentum
    velocityRef.current = e.clientX - lastDragX.current
    lastDragX.current = e.clientX
  }, [isDragging, dragStart, dragStartOffset, clampOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
    }
  }, [isDragging])

  /**
   * Touch handlers for mobile support
   */
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0]

    // Ignore if touching a piece
    if (e.target.closest('[role="button"]')) return

    setIsDragging(true)
    setDragStart(touch.clientX)
    setDragStartOffset(scrollOffset)
    lastDragX.current = touch.clientX
    velocityRef.current = 0

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }, [scrollOffset])

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - dragStart
    const newOffset = clampOffset(dragStartOffset + deltaX)
    setScrollOffset(newOffset)

    // Track velocity for momentum
    velocityRef.current = touch.clientX - lastDragX.current
    lastDragX.current = touch.clientX
  }, [isDragging, dragStart, dragStartOffset, clampOffset])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * Wheel/scroll handler for desktop
   */
  const handleWheel = useCallback((e) => {
    // Use deltaX for horizontal scroll, fall back to deltaY for trackpads
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY
    setScrollOffset((prev) => clampOffset(prev - delta))
  }, [clampOffset])

  /**
   * Cleanup animation frame on unmount
   */
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`
        relative w-full h-full min-h-[400px]
        ${backgroundClass}
        overflow-hidden
        cursor-grab
        ${isDragging ? 'cursor-grabbing' : ''}
        select-none
      `}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      role="region"
      aria-label="World diorama with parallax layers. Drag to explore."
    >
      {/* Background layer - Arcane pieces (sky/cosmic) */}
      <ZoneLayer
        zone="arcane"
        pieces={piecesByZone.arcane}
        scrollOffset={scrollOffset}
        speed={PARALLAX_SPEEDS.arcane}
        layerWidth={layerWidth}
        onPieceClick={onPieceClick}
      />

      {/* Midground layer - Civilization pieces (structures) */}
      <ZoneLayer
        zone="civilization"
        pieces={piecesByZone.civilization}
        scrollOffset={scrollOffset}
        speed={PARALLAX_SPEEDS.civilization}
        layerWidth={layerWidth}
        onPieceClick={onPieceClick}
      />

      {/* Foreground layer - Nature pieces (terrain/plants) */}
      <ZoneLayer
        zone="nature"
        pieces={piecesByZone.nature}
        scrollOffset={scrollOffset}
        speed={PARALLAX_SPEEDS.nature}
        layerWidth={layerWidth}
        onPieceClick={onPieceClick}
      />

      {/* Scroll indicator hint */}
      {pieces.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60 text-sm animate-pulse pointer-events-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
          <span>Drag to explore</span>
        </div>
      )}

      {/* Debug overlay (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs p-2 rounded pointer-events-none">
          Offset: {scrollOffset.toFixed(0)}px | Pieces: {pieces.length}
        </div>
      )}
    </div>
  )
}

export default ParallaxDiorama
