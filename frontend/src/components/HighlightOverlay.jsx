/**
 * HighlightOverlay - CORE024: Visual highlight for slide annotations
 *
 * Renders a pulsing highlight circle at specified coordinates on the slide image.
 * Used when answering SLIDE_QUESTION queries to draw attention to the relevant
 * part of the diagram being discussed.
 *
 * @param {Object} props - Component props
 * @param {number} props.x - X position as percentage (0-100, left to right)
 * @param {number} props.y - Y position as percentage (0-100, top to bottom)
 * @param {boolean} props.visible - Whether the highlight should be shown
 * @param {function} props.onComplete - Callback when highlight animation completes
 */
function HighlightOverlay({ x, y, visible, onComplete }) {
  // Don't render anything if not visible or coordinates are invalid
  if (!visible || typeof x !== 'number' || typeof y !== 'number') {
    return null
  }

  // Clamp coordinates to valid range
  const clampedX = Math.max(0, Math.min(100, x))
  const clampedY = Math.max(0, Math.min(100, y))

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Outer pulsing ring */}
      <div
        className="absolute w-20 h-20 -translate-x-1/2 -translate-y-1/2 highlight-pulse"
        style={{
          left: `${clampedX}%`,
          top: `${clampedY}%`,
        }}
      >
        {/* Inner highlight circle */}
        <div className="absolute inset-0 rounded-full border-4 border-primary/60 bg-primary/20" />
      </div>

      {/* Center dot for precision */}
      <div
        className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-lg"
        style={{
          left: `${clampedX}%`,
          top: `${clampedY}%`,
        }}
      />
    </div>
  )
}

export default HighlightOverlay
