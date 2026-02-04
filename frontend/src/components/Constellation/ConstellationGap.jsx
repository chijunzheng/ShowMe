/**
 * ConstellationGap Component
 *
 * A suggested topic shown as a dim, pulsing star.
 * Represents a gap in the user's knowledge that could be
 * filled by learning the suggested topic.
 */

import { useState, useCallback } from 'react'

/**
 * ConstellationGap - Suggested topic star
 *
 * @param {Object} props - Component props
 * @param {Object} props.gap - Gap data object
 * @param {string} props.gap.id - Unique gap identifier
 * @param {string} props.gap.suggestedTopic - Suggested topic name
 * @param {string} props.gap.curiosityHook - Engaging description/hook
 * @param {Array<string>} props.gap.connectsTo - Node ids this gap would connect to
 * @param {{x: number, y: number}} props.position - Position in layout coordinates
 * @param {Function} props.onTap - Handler when gap is tapped/clicked
 */
export default function ConstellationGap({ gap, position, onTap }) {
  const [isHovered, setIsHovered] = useState(false)

  /**
   * Handle click/tap on the gap
   */
  const handleClick = useCallback(() => {
    onTap?.(gap)
  }, [onTap, gap])

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onTap?.(gap)
      }
    },
    [onTap, gap]
  )

  return (
    <button
      data-testid={`constellation-gap-${gap.id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="
        absolute transform -translate-x-1/2 -translate-y-1/2
        w-5 h-5 rounded-full
        bg-slate-600 border-2 border-dashed border-slate-500
        animate-pulse opacity-50
        hover:opacity-80 focus:opacity-80
        flex items-center justify-center
        transition-all duration-200 hover:scale-125 focus:scale-125
        focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950
      "
      style={{
        left: position.x,
        top: position.y,
      }}
      aria-label={`Suggested topic: ${gap.suggestedTopic}`}
    >
      {/* Question mark indicator */}
      <span className="text-xs text-slate-400 font-bold" aria-hidden="true">
        ?
      </span>

      {/* Tooltip on hover/focus */}
      {isHovered && (
        <div
          className="
            absolute left-1/2 top-full mt-2 -translate-x-1/2
            p-2 rounded bg-slate-800 text-white text-xs
            w-48 text-center pointer-events-none z-10
            shadow-lg
          "
          role="tooltip"
        >
          <div className="font-medium text-slate-100">
            {gap.suggestedTopic}
          </div>
          {gap.curiosityHook && (
            <div className="text-slate-400 mt-1 text-[11px]">
              {gap.curiosityHook}
            </div>
          )}
          {/* Tooltip arrow */}
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"
            aria-hidden="true"
          />
        </div>
      )}
    </button>
  )
}
