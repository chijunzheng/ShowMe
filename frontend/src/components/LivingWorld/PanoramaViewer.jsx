/**
 * PanoramaViewer Component
 *
 * Displays a panoramic world view with pan/zoom capabilities and interactive hotspots.
 * Part of the "Living World" feature for continuous panoramic landscape.
 *
 * Features:
 * - Pan: Touch drag or mouse drag
 * - Zoom: Pinch gesture or scroll wheel
 * - Momentum scrolling with bounds
 * - Interactive hotspots with glow effects
 * - Loading skeleton with 16:9 aspect ratio
 * - Full accessibility support
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import useLongPress from '../../hooks/useLongPress'

/**
 * Minimum distance (in pixels) to consider movement as a drag vs a tap
 */
const DRAG_THRESHOLD = 5

/**
 * Zoom constraints
 */
const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_SENSITIVITY = 0.002

/**
 * Hotspot Component - Renders an interactive region marker
 * Supports tap (short press) and long-press for quick actions
 */
function Hotspot({ x, y, topicName, glow, piece, onTap, onLongPress }) {
  const hotspotRef = useRef(null)

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      onTap?.(piece || { name: topicName, x, y })
    },
    [piece, topicName, x, y, onTap]
  )

  const handleLongPress = useCallback(
    ({ x: pressX, y: pressY }) => {
      if (!onLongPress || !hotspotRef.current) return

      // Get element bounds for positioning
      const rect = hotspotRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top

      onLongPress({
        piece: piece || { id: topicName, name: topicName, zone: 'nature' },
        position: { x: centerX, y: centerY },
      })
    },
    [piece, topicName, onLongPress]
  )

  // Long-press detection
  const longPressHandlers = useLongPress(handleLongPress, {
    delay: 500,
    onClick: handleClick,
  })

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onTap?.(piece || { name: topicName, x, y })
      }
    },
    [piece, topicName, x, y, onTap]
  )

  // Clamp coordinates to valid range
  const clampedX = Math.max(0, Math.min(1, x))
  const clampedY = Math.max(0, Math.min(1, y))

  return (
    <div
      ref={hotspotRef}
      data-testid="hotspot"
      role="button"
      tabIndex={0}
      aria-label={`Explore ${topicName}. Long-press for quick actions.`}
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        min-w-[44px] min-h-[44px] w-12 h-12
        flex items-center justify-center
        rounded-full
        bg-white/20 dark:bg-white/10
        backdrop-blur-sm
        border-2 border-white/50 dark:border-white/30
        cursor-pointer
        transition-all duration-300
        hover:scale-110 hover:bg-white/30
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${glow ? 'animate-pulse shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-400/50' : ''}
      `}
      style={{
        left: `${clampedX * 100}%`,
        top: `${clampedY * 100}%`,
      }}
      onKeyDown={handleKeyDown}
      {...longPressHandlers}
    >
      <span className="text-xs font-medium text-white dark:text-white/90 text-center px-1 truncate max-w-[80px]">
        {topicName}
      </span>
    </div>
  )
}

/**
 * Loading Skeleton Component
 */
function LoadingSkeleton() {
  return (
    <div
      data-testid="panorama-skeleton"
      className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse"
    >
      {/* Placeholder shimmer lines */}
      <div className="absolute inset-0 flex flex-col justify-center items-center gap-4 p-8">
        <div className="w-3/4 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
        <div className="w-1/2 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
        <div className="w-2/3 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
      </div>
    </div>
  )
}

/**
 * PanoramaViewer - The main panoramic world viewer component
 *
 * @param {Object} props - Component props
 * @param {string} [props.worldImageUrl] - URL of the world panorama image
 * @param {boolean} [props.isLoading=false] - Whether to show loading state
 * @param {Function} [props.onRegionTap] - Callback when user taps a region: (x, y) => void
 * @param {Function} [props.onHotspotLongPress] - Callback when user long-presses a hotspot: ({ piece, position }) => void
 * @param {Array} [props.hotspots=[]] - Areas to highlight: [{ x, y, topicName, glow, piece }]
 */
function PanoramaViewer({
  worldImageUrl,
  isLoading = false,
  onRegionTap,
  onHotspotLongPress,
  hotspots = [],
}) {
  // Pan state
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragStartOffsetRef = useRef({ x: 0, y: 0 })
  const totalDragDistanceRef = useRef(0)

  // Zoom state
  const [zoom, setZoom] = useState(1)

  // Momentum scrolling
  const velocityRef = useRef({ x: 0, y: 0 })
  const lastPositionRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef(null)

  // Container and image refs
  const containerRef = useRef(null)
  const imageRef = useRef(null)

  // Image loading state
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  /**
   * Clamp offset to keep image within bounds
   */
  const clampOffset = useCallback(
    (newOffset, currentZoom = zoom) => {
      if (!containerRef.current || !imageRef.current) {
        return newOffset
      }

      const container = containerRef.current.getBoundingClientRect()
      const scaledWidth = container.width * currentZoom
      const scaledHeight = container.height * currentZoom

      const maxX = Math.max(0, (scaledWidth - container.width) / 2)
      const maxY = Math.max(0, (scaledHeight - container.height) / 2)

      return {
        x: Math.max(-maxX, Math.min(maxX, newOffset.x)),
        y: Math.max(-maxY, Math.min(maxY, newOffset.y)),
      }
    },
    [zoom]
  )

  /**
   * Handle momentum scrolling animation
   */
  useEffect(() => {
    if (isDragging) {
      return
    }

    const animate = () => {
      const velocity = velocityRef.current
      const friction = 0.95

      if (Math.abs(velocity.x) > 0.5 || Math.abs(velocity.y) > 0.5) {
        velocityRef.current = {
          x: velocity.x * friction,
          y: velocity.y * friction,
        }

        setOffset((prev) =>
          clampOffset({
            x: prev.x + velocityRef.current.x,
            y: prev.y + velocityRef.current.y,
          })
        )

        animationRef.current = requestAnimationFrame(animate)
      }
    }

    if (Math.abs(velocityRef.current.x) > 0.5 || Math.abs(velocityRef.current.y) > 0.5) {
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isDragging, clampOffset])

  /**
   * Mouse event handlers
   */
  const handleMouseDown = useCallback(
    (e) => {
      // Ignore if clicking on a hotspot
      if (e.target.closest('[data-testid="hotspot"]')) {
        return
      }

      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      dragStartOffsetRef.current = { ...offset }
      lastPositionRef.current = { x: e.clientX, y: e.clientY }
      totalDragDistanceRef.current = 0
      velocityRef.current = { x: 0, y: 0 }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    },
    [offset]
  )

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) {
        return
      }

      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y

      totalDragDistanceRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Calculate velocity for momentum
      velocityRef.current = {
        x: e.clientX - lastPositionRef.current.x,
        y: e.clientY - lastPositionRef.current.y,
      }
      lastPositionRef.current = { x: e.clientX, y: e.clientY }

      setOffset(
        clampOffset({
          x: dragStartOffsetRef.current.x + deltaX,
          y: dragStartOffsetRef.current.y + deltaY,
        })
      )
    },
    [isDragging, clampOffset]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
    }
  }, [isDragging])

  /**
   * Touch event handlers
   */
  const handleTouchStart = useCallback(
    (e) => {
      if (e.target.closest('[data-testid="hotspot"]')) {
        return
      }

      const touch = e.touches[0]
      setIsDragging(true)
      dragStartRef.current = { x: touch.clientX, y: touch.clientY }
      dragStartOffsetRef.current = { ...offset }
      lastPositionRef.current = { x: touch.clientX, y: touch.clientY }
      totalDragDistanceRef.current = 0
      velocityRef.current = { x: 0, y: 0 }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    },
    [offset]
  )

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || e.touches.length !== 1) {
        return
      }

      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStartRef.current.x
      const deltaY = touch.clientY - dragStartRef.current.y

      totalDragDistanceRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      velocityRef.current = {
        x: touch.clientX - lastPositionRef.current.x,
        y: touch.clientY - lastPositionRef.current.y,
      }
      lastPositionRef.current = { x: touch.clientX, y: touch.clientY }

      setOffset(
        clampOffset({
          x: dragStartOffsetRef.current.x + deltaX,
          y: dragStartOffsetRef.current.y + deltaY,
        })
      )
    },
    [isDragging, clampOffset]
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * Wheel handler for zooming
   */
  const handleWheel = useCallback(
    (e) => {
      e.preventDefault()

      const delta = -e.deltaY * ZOOM_SENSITIVITY
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))

      setZoom(newZoom)
      setOffset((prev) => clampOffset(prev, newZoom))
    },
    [zoom, clampOffset]
  )

  /**
   * Handle click/tap on the panorama
   */
  const handleClick = useCallback(
    (e) => {
      // Don't trigger tap if it was a drag
      if (totalDragDistanceRef.current > DRAG_THRESHOLD) {
        return
      }

      // Don't trigger if clicking a hotspot
      if (e.target.closest('[data-testid="hotspot"]')) {
        return
      }

      if (!onRegionTap || !containerRef.current) {
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      onRegionTap(x, y)
    },
    [onRegionTap]
  )

  /**
   * Handle image load
   */
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true)
    setImageError(false)
  }, [])

  /**
   * Handle image error
   */
  const handleImageError = useCallback(() => {
    setImageError(true)
    setImageLoaded(false)
  }, [])

  /**
   * Reset image state when URL changes
   */
  useEffect(() => {
    if (worldImageUrl) {
      setImageLoaded(false)
      setImageError(false)
    }
  }, [worldImageUrl])

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

  const showSkeleton = isLoading || (worldImageUrl && !imageLoaded && !imageError)

  return (
    <div
      ref={containerRef}
      data-testid="panorama-container"
      role="region"
      aria-label="World panorama viewer. Drag to pan, scroll to zoom."
      className={`
        relative w-full aspect-video
        overflow-hidden
        bg-slate-100 dark:bg-slate-800
        rounded-lg
        select-none
        cursor-grab
        ${isDragging ? 'cursor-grabbing' : ''}
      `}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onClick={handleClick}
    >
      {/* Loading Skeleton */}
      {showSkeleton && <LoadingSkeleton />}

      {/* World Image */}
      {worldImageUrl && (
        <img
          ref={imageRef}
          src={worldImageUrl}
          alt="World panorama landscape"
          className={`
            absolute inset-0 w-full h-full
            object-cover
            transition-opacity duration-500
            ${imageLoaded ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
          draggable={false}
        />
      )}

      {/* Error State */}
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 dark:bg-slate-700">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}

      {/* Hotspots */}
      {!isLoading &&
        imageLoaded &&
        hotspots?.map((hotspot, index) => (
          <Hotspot
            key={`hotspot-${index}-${hotspot.topicName}`}
            x={hotspot.x}
            y={hotspot.y}
            topicName={hotspot.topicName}
            glow={hotspot.glow}
            piece={hotspot.piece}
            onTap={onRegionTap}
            onLongPress={onHotspotLongPress}
          />
        ))}
    </div>
  )
}

export default PanoramaViewer
