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
export default function ConstellationGap({ gap, position, onTap, showLabel = true }) {
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

  const shouldShowLabel = showLabel || isHovered

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
        w-6 h-6 rounded-full
        bg-slate-700/70 border border-cyan-200/60
        ring-2 ring-cyan-300/40
        shadow-[0_0_14px_rgba(56,189,248,0.4)]
        animate-pulse opacity-70
        hover:opacity-90 focus:opacity-90
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
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-100" aria-hidden="true" />

      {/* Tooltip on hover/focus */}
      {isHovered && (
        <div
          className="
            absolute left-1/2 top-full mt-2 -translate-x-1/2
            px-2 py-1 rounded bg-slate-800 text-white text-xs
            whitespace-nowrap pointer-events-none z-10
            shadow-lg
          "
          role="tooltip"
        >
          {gap.suggestedTopic}
          <div
            className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Label */}
      {shouldShowLabel && (
        <div
          className="
            absolute left-1/2 top-full mt-1 -translate-x-1/2
            px-2 py-0.5
            rounded-full
            bg-slate-900/70 border border-cyan-200/30
            text-[11px] text-slate-100
            whitespace-nowrap pointer-events-none
            max-w-[120px] truncate text-center
            shadow-[0_0_10px_rgba(15,23,42,0.6)]
            backdrop-blur-sm
          "
          style={{ textShadow: '0 1px 2px rgba(15, 23, 42, 0.9)' }}
          aria-hidden="true"
        >
          {gap.suggestedTopic}
        </div>
      )}
    </button>
  )
}
