/**
 * PanoramaViewer Component
 *
 * Displays a panoramic world view with pan/zoom capabilities and interactive hotspots.
 * Part of the "Living World" feature for continuous panoramic landscape.
 *
 * Features:
 * - Pan: Touch drag or mouse drag (via InteractiveCanvas)
 * - Zoom: Pinch gesture, scroll wheel, or double-tap (via InteractiveCanvas)
 * - Momentum scrolling with bounds (via InteractiveCanvas)
 * - Interactive hotspots with glow effects
 * - Loading skeleton with 16:9 aspect ratio
 * - Full accessibility support
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import useLongPress from '../../hooks/useLongPress'
import InteractiveCanvas from './InteractiveCanvas'

/**
 * Zoom constraints
 */
const MIN_ZOOM = 1
const MAX_ZOOM = 3

/**
 * Normalize coordinate values to 0-1 range
 * Supports normalized (0-1), percentage (0-100), or pixel-like (0-1000) inputs.
 */
function normalizeCoordinate(value) {
  if (!Number.isFinite(value)) return 0.5
  if (value >= 0 && value <= 1) return value
  if (value > 1 && value <= 100) return value / 100
  if (value > 100 && value <= 1000) return value / 1000
  return Math.max(0, Math.min(1, value / 1000))
}

/**
 * Hotspot Component - Renders an interactive region marker
 * Supports tap (short press) and long-press for quick actions
 *
 * @param {Object} props - Component props
 * @param {number} props.x - X position (0-1 normalized)
 * @param {number} props.y - Y position (0-1 normalized)
 * @param {string} props.topicName - Display name for the hotspot
 * @param {boolean} [props.glow] - Whether to show glow effect
 * @param {Object} [props.piece] - Optional piece data for callbacks
 * @param {Function} [props.onTap] - Callback when tapped
 * @param {Function} [props.onLongPress] - Callback when long-pressed
 * @param {number} [props.zoom=1] - Current zoom level for scaling
 * @param {'panorama' | 'map'} [props.variant='panorama'] - Visual styling variant
 */
function Hotspot({
  x,
  y,
  topicName,
  glow,
  piece,
  status = 'fresh',
  onTap,
  onLongPress,
  zoom = 1,
  variant = 'panorama',
}) {
  const hotspotRef = useRef(null)
  const isMap = variant === 'map'
  const showImage = !isMap && piece?.imageUrl

  const statusRingClass = status === 'due'
    ? 'ring-2 ring-rose-400/80 shadow-rose-400/40'
    : status === 'fading'
      ? 'ring-2 ring-amber-300/70 shadow-amber-300/30'
      : ''

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      // Keep backward compatibility - pass piece if available, otherwise x,y
      if (piece) {
        onTap?.(piece)
      } else {
        onTap?.(x, y)
      }
    },
    [piece, x, y, onTap]
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
        if (piece) {
          onTap?.(piece)
        } else {
          onTap?.(x, y)
        }
      }
    },
    [piece, x, y, onTap]
  )

  // Normalize coordinates to valid range
  const clampedX = Math.max(0, Math.min(1, normalizeCoordinate(x)))
  const clampedY = Math.max(0, Math.min(1, normalizeCoordinate(y)))

  // Sub-linear scaling: hotspots shrink when zoomed in, but not proportionally
  // This keeps them readable at high zoom without becoming giant at zoom=1
  const hotspotScale = 1 / Math.sqrt(zoom)

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
        ${isMap ? 'bg-emerald-500/20 border-emerald-200/80' : 'bg-white/20 dark:bg-white/10 border-white/50 dark:border-white/30'}
        backdrop-blur-sm
        border-2
        cursor-pointer
        transition-all duration-300
        hover:scale-110 hover:bg-white/30
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        ${glow ? 'animate-pulse shadow-lg shadow-indigo-500/50 ring-2 ring-indigo-400/50' : ''}
        ${statusRingClass}
      `}
      style={{
        left: `${clampedX * 100}%`,
        top: `${clampedY * 100}%`,
        transform: `translate(-50%, -50%) scale(${hotspotScale})`,
      }}
      onKeyDown={handleKeyDown}
      {...longPressHandlers}
    >
      <div className="flex flex-col items-center gap-1">
        {showImage ? (
          <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/60 shadow-md">
            <img
              src={piece.imageUrl}
              alt={topicName}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : isMap && (
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-500 rotate-45 rounded-[2px]" />
          </div>
        )}
        <span
          className={`
            text-[11px] font-semibold text-center px-1.5 py-0.5
            rounded-full
            ${isMap ? 'bg-white/80 text-emerald-800 shadow-sm' : 'text-white dark:text-white/90'}
            truncate max-w-[90px]
          `}
        >
          {topicName}
        </span>
      </div>
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
 * @param {Array} [props.hotspots=[]] - Areas to highlight: [{ x, y, topicName, glow, piece, status }]
 * @param {Function} [props.onZoomChange] - Callback when zoom level changes: (zoom) => void
 * @param {Function} [props.onViewportChange] - Callback when viewport changes: ({ x, y, width, height }) => void
 * @param {React.Ref} [props.canvasRef] - Ref to access InteractiveCanvas methods
 * @param {'panorama' | 'map'} [props.variant='panorama'] - Visual styling variant
 */
function PanoramaViewer({
  worldImageUrl,
  isLoading = false,
  onRegionTap,
  onHotspotLongPress,
  hotspots = [],
  onZoomChange,
  onViewportChange,
  canvasRef: externalCanvasRef,
  variant = 'panorama',
}) {
  const isMap = variant === 'map'
  // Track current zoom for hotspot scaling
  const [currentZoom, setCurrentZoom] = useState(1)

  // Track dragging state for cursor styling
  const [isDragging, setIsDragging] = useState(false)

  // Container and canvas refs
  const containerRef = useRef(null)
  const canvasRef = useRef(null)

  // Image loading state
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  /**
   * Handle zoom change from InteractiveCanvas
   * Updates local state and notifies parent
   * Note: Viewport rect is updated via onTransformed for continuous tracking
   */
  const handleZoomChange = useCallback(
    (zoom) => {
      setCurrentZoom(zoom)
      onZoomChange?.(zoom)
    },
    [onZoomChange]
  )

  /**
   * Handle transform start (for cursor styling)
   */
  const handleTransformStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  /**
   * Handle transform end (for cursor styling)
   */
  const handleTransformEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * Calculate viewport rect from transform state
   * Returns normalized (0-1) coordinates representing visible area
   */
  const calculateViewportRect = useCallback(
    (transformState) => {
      if (!containerRef.current) return null

      const { scale, positionX, positionY } = transformState
      const rect = containerRef.current.getBoundingClientRect()

      // Calculate visible area dimensions in normalized coordinates
      // At scale=1, viewport is full image (width=1, height=1)
      // At scale=2, viewport is half the image (width=0.5, height=0.5)
      const viewWidth = 1 / scale
      const viewHeight = 1 / scale

      // Convert pixel position to normalized coordinates
      // positionX/Y represent the offset of the content from the viewport origin
      // When positionX is 0, content left edge aligns with viewport left edge
      // When positionX is negative, content is shifted left (viewport sees right portion)
      const normalizedX = -positionX / (rect.width * scale)
      const normalizedY = -positionY / (rect.height * scale)

      return {
        x: Math.max(0, Math.min(1 - viewWidth, normalizedX)),
        y: Math.max(0, Math.min(1 - viewHeight, normalizedY)),
        width: viewWidth,
        height: viewHeight,
      }
    },
    []
  )

  /**
   * Handle continuous transform updates (fires during pan/zoom/pinch)
   * Updates viewport rect for minimap synchronization
   */
  const handleTransformed = useCallback(
    (transformState) => {
      if (!onViewportChange) return

      const viewportRect = calculateViewportRect(transformState)
      if (viewportRect) {
        onViewportChange(viewportRect)
      }
    },
    [calculateViewportRect, onViewportChange]
  )

  /**
   * Handle click/tap on the panorama
   * Note: InteractiveCanvas handles drag detection internally, so clicks
   * only fire for actual taps, not drags
   */
  const handleClick = useCallback(
    (e) => {
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

  const showSkeleton = isLoading || (worldImageUrl && !imageLoaded && !imageError)

  return (
    <div
      ref={containerRef}
      data-testid="panorama-container"
      role="region"
      aria-label={
        isMap
          ? 'World map view. Drag to pan, scroll to zoom.'
          : 'World panorama viewer. Drag to pan, scroll to zoom.'
      }
      className={`
        relative w-full aspect-video
        overflow-hidden
        bg-slate-100 dark:bg-slate-800
        rounded-xl
        ${isMap ? 'ring-1 ring-emerald-200/70 dark:ring-emerald-400/20 shadow-lg' : 'rounded-lg'}
        select-none
        cursor-grab
        ${isDragging ? 'cursor-grabbing' : ''}
      `}
      onClick={handleClick}
    >
      {/* Map overlays */}
      {isMap && (
        <>
          <div
            className="
              absolute inset-0 pointer-events-none
              bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.75)_0%,_rgba(255,255,255,0)_60%)]
              opacity-70
            "
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(255,255,255,0.25) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.25) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden="true"
          />
          <div
            className="
              absolute top-3 left-3
              px-2.5 py-1
              text-[11px] font-semibold uppercase tracking-[0.15em]
              bg-white/70 dark:bg-slate-900/60
              text-emerald-700 dark:text-emerald-200
              rounded-full shadow-sm
            "
            aria-hidden="true"
          >
            World Map
          </div>
          <div
            className="
              absolute bottom-3 right-3
              w-10 h-10
              rounded-full
              border border-emerald-200/80 dark:border-emerald-400/40
              bg-white/70 dark:bg-slate-900/60
              shadow-sm
              flex items-center justify-center
              text-[10px] font-bold text-emerald-700 dark:text-emerald-200
            "
            aria-hidden="true"
          >
            N
          </div>
        </>
      )}

      {/* Loading Skeleton */}
      {showSkeleton && <LoadingSkeleton />}

      {/* InteractiveCanvas handles pan/zoom/pinch gestures */}
      {worldImageUrl && (
        <InteractiveCanvas
          ref={externalCanvasRef || canvasRef}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onZoomChange={handleZoomChange}
          onTransformStart={handleTransformStart}
          onTransformEnd={handleTransformEnd}
          onTransformed={handleTransformed}
          className="w-full h-full"
        >
          {/* World Image */}
          <img
            src={worldImageUrl}
            alt="World panorama landscape"
            className={`
              w-full h-full
              object-cover
              transition-opacity duration-500
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
            onLoad={handleImageLoad}
            onError={handleImageError}
            draggable={false}
          />
        </InteractiveCanvas>
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

      {/* Hotspots - rendered outside InteractiveCanvas for consistent positioning */}
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
            status={hotspot.status}
            onTap={onRegionTap}
            onLongPress={onHotspotLongPress}
            zoom={currentZoom}
            variant={variant}
          />
        ))}
    </div>
  )
}

export default PanoramaViewer
