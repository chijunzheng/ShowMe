/**
 * Minimap Component
 *
 * Provides a miniature overview of the Living World for navigation when zoomed in.
 * Shows the full panorama thumbnail with hotspot indicators and a viewport rectangle
 * indicating the current visible area.
 *
 * Features:
 * - Small thumbnail of the world (120x68px for 16:9 aspect ratio)
 * - Hotspot dots showing topic locations
 * - Viewport rectangle showing current visible area
 * - Click-to-navigate functionality
 * - Optional recenter button
 * - Fade in/out based on zoom level
 * - Full accessibility support
 */

import { useCallback } from 'react'

/**
 * Default minimap dimensions (16:9 aspect ratio)
 */
const MINIMAP_WIDTH = 120
const MINIMAP_HEIGHT = 68

/**
 * Position class mappings for corner placement
 */
const POSITION_CLASSES = {
  'bottom-left': 'bottom-4 left-4',
  'bottom-right': 'bottom-4 right-4',
}

/**
 * Minimap - Navigation minimap for the Living World panorama
 *
 * @param {Object} props - Component props
 * @param {string} props.worldImageUrl - Thumbnail of the world panorama
 * @param {Array<{x: number, y: number, topicName: string, glow?: boolean}>} [props.hotspots=[]] - Hotspot positions (0-1 normalized)
 * @param {{x: number, y: number, width: number, height: number}} [props.viewportRect] - Current visible area (0-1 normalized)
 * @param {Function} [props.onNavigate] - Callback when user clicks minimap: (x, y) => void
 * @param {boolean} [props.isVisible=false] - Only show when zoomed > 1.2
 * @param {'bottom-left' | 'bottom-right'} [props.position='bottom-left'] - Corner position
 * @param {boolean} [props.showRecenterButton=false] - Show optional recenter button
 */
function Minimap({
  worldImageUrl,
  hotspots = [],
  viewportRect = { x: 0, y: 0, width: 1, height: 1 },
  onNavigate,
  isVisible = false,
  position = 'bottom-left',
  showRecenterButton = false,
}) {
  /**
   * Handle click on the minimap to navigate
   * Converts click position to normalized coordinates (0-1)
   */
  const handleMinimapClick = useCallback(
    (e) => {
      if (!onNavigate) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      // Clamp to valid range
      const clampedX = Math.max(0, Math.min(1, x))
      const clampedY = Math.max(0, Math.min(1, y))

      onNavigate(clampedX, clampedY)
    },
    [onNavigate]
  )

  /**
   * Handle keyboard navigation on minimap
   */
  const handleKeyDown = useCallback(
    (e) => {
      if (!onNavigate) return

      // Arrow keys for navigation
      const step = 0.1
      let newX = viewportRect.x + viewportRect.width / 2
      let newY = viewportRect.y + viewportRect.height / 2

      switch (e.key) {
        case 'ArrowLeft':
          newX = Math.max(0, newX - step)
          break
        case 'ArrowRight':
          newX = Math.min(1, newX + step)
          break
        case 'ArrowUp':
          newY = Math.max(0, newY - step)
          break
        case 'ArrowDown':
          newY = Math.min(1, newY + step)
          break
        case 'Enter':
        case ' ':
          // Recenter on Enter/Space
          e.preventDefault()
          onNavigate(0.5, 0.5)
          return
        default:
          return
      }

      e.preventDefault()
      onNavigate(newX, newY)
    },
    [onNavigate, viewportRect]
  )

  /**
   * Handle recenter button click
   */
  const handleRecenter = useCallback(() => {
    onNavigate?.(0.5, 0.5)
  }, [onNavigate])

  // Get position classes with fallback
  const positionClass = POSITION_CLASSES[position] || POSITION_CLASSES['bottom-left']

  // Don't render if not visible
  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`
        absolute z-30
        ${positionClass}
        flex flex-col gap-1.5
        transition-opacity duration-300
        animate-fade-in
      `}
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {/* Minimap Container */}
      <div
        data-testid="minimap"
        role="button"
        tabIndex={0}
        aria-label="World navigation minimap. Click to navigate or use arrow keys."
        className={`
          w-[${MINIMAP_WIDTH}px] aspect-video
          rounded-lg overflow-hidden
          border border-white/20
          shadow-lg
          cursor-pointer
          bg-slate-800/50
          backdrop-blur-sm
          transition-all duration-200
          hover:border-white/40 hover:shadow-xl
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
        `}
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
        onClick={handleMinimapClick}
        onKeyDown={handleKeyDown}
      >
        {/* Background image */}
        {worldImageUrl && (
          <img
            src={worldImageUrl}
            alt="World minimap"
            className="w-full h-full object-cover opacity-80"
            draggable={false}
          />
        )}

        {/* Hotspot dots */}
        {hotspots.map((hotspot, index) => {
          // Clamp hotspot positions to valid range
          const clampedX = Math.max(0, Math.min(1, hotspot.x))
          const clampedY = Math.max(0, Math.min(1, hotspot.y))

          return (
            <div
              key={`minimap-hotspot-${index}-${hotspot.topicName}`}
              className={`
                absolute w-1.5 h-1.5
                rounded-full
                bg-white/70
                transform -translate-x-1/2 -translate-y-1/2
                ${hotspot.glow ? 'ring-1 ring-indigo-400 bg-indigo-300' : ''}
              `}
              style={{
                left: `${clampedX * 100}%`,
                top: `${clampedY * 100}%`,
              }}
              aria-hidden="true"
            />
          )
        })}

        {/* Viewport indicator */}
        <div
          data-testid="minimap-viewport"
          className="
            absolute
            border-2 border-white
            rounded-sm
            bg-white/10
            pointer-events-none
            transition-all duration-150 ease-out
          "
          style={{
            left: `${Math.max(0, viewportRect.x) * 100}%`,
            top: `${Math.max(0, viewportRect.y) * 100}%`,
            width: `${Math.min(100, viewportRect.width * 100)}%`,
            height: `${Math.min(100, viewportRect.height * 100)}%`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Recenter Button */}
      {showRecenterButton && onNavigate && (
        <button
          data-testid="minimap-recenter"
          onClick={handleRecenter}
          className="
            w-full
            px-2 py-1
            text-xs font-medium
            text-white/80
            bg-slate-800/60
            backdrop-blur-sm
            rounded-md
            border border-white/10
            transition-all duration-200
            hover:bg-slate-700/70 hover:text-white
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          "
          aria-label="Recenter world view"
        >
          <span className="mr-1" aria-hidden="true">
            +
          </span>
          Recenter
        </button>
      )}
    </div>
  )
}

export default Minimap
