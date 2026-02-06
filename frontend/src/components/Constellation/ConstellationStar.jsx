/**
 * ConstellationStar Component
 *
 * A single topic rendered as a star in the constellation.
 * Brightness varies based on mastery level, with visual effects
 * ranging from dim to brilliant with animated rays.
 *
 * Brightness levels:
 * - dim (mastery < 0.25): small, faint star
 * - glow (0.25-0.5): medium size, soft glow
 * - bright (0.5-0.75): larger, clear glow
 * - brilliant (0.75+): largest, with animated rays
 */

import { useState, useCallback, useMemo } from 'react'

/**
 * Size classes for different brightness levels
 */
const SIZE_CLASSES = {
  dim: 'w-5 h-5',
  glow: 'w-6 h-6',
  bright: 'w-7 h-7',
  brilliant: 'w-9 h-9',
}

/**
 * Color classes for different brightness levels
 */
const COLOR_CLASSES = {
  dim: 'bg-slate-500',
  glow: 'bg-indigo-300',
  bright: 'bg-indigo-200',
  brilliant: 'bg-white',
}

/**
 * Glow effect classes for different brightness levels
 */
const GLOW_CLASSES = {
  dim: 'opacity-60 shadow-[0_0_4px_rgba(100,116,139,0.3)]',
  glow: 'opacity-80 shadow-[0_0_8px_rgba(165,180,252,0.5)]',
  bright: 'opacity-95 shadow-[0_0_14px_rgba(199,210,254,0.7)]',
  brilliant: 'opacity-100 shadow-[0_0_24px_rgba(255,255,255,0.9)] animate-pulse-slow',
}

/**
 * Ray angles for brilliant stars (4-point star pattern)
 */
const RAY_ANGLES = [0, 45, 90, 135]

/**
 * ConstellationStar - A single topic node in the constellation
 *
 * @param {Object} props - Component props
 * @param {Object} props.node - The topic node data
 * @param {string} props.node.id - Unique node identifier
 * @param {string} props.node.name - Topic display name
 * @param {number} props.node.mastery - Mastery level (0-1)
 * @param {'dim'|'glow'|'bright'|'brilliant'} props.node.brightness - Visual brightness level
 * @param {{x: number, y: number}} props.position - Position in layout coordinates
 * @param {Function} props.onTap - Handler when star is tapped/clicked
 */
export default function ConstellationStar({
  node,
  position,
  onTap,
  showLabel = true,
  onHoverStart,
  onHoverEnd,
  isDimmed = false,
  accentColor,
}) {
  const [isHovered, setIsHovered] = useState(false)

  /**
   * Handle click/tap on the star
   */
  const handleClick = useCallback(() => {
    onTap?.(node)
  }, [onTap, node])

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onTap?.(node)
      }
    },
    [onTap, node]
  )

  const handleHoverStart = useCallback(() => {
    setIsHovered(true)
    onHoverStart?.(node)
  }, [onHoverStart, node])

  const handleHoverEnd = useCallback(() => {
    setIsHovered(false)
    onHoverEnd?.(node)
  }, [onHoverEnd, node])

  /**
   * Get CSS classes based on brightness
   */
  const sizeClass = SIZE_CLASSES[node.brightness] || SIZE_CLASSES.glow
  const colorClass = COLOR_CLASSES[node.brightness] || COLOR_CLASSES.glow
  const glowClass = GLOW_CLASSES[node.brightness] || GLOW_CLASSES.glow

  /**
   * Memoize mastery percentage for aria-label
   */
  const masteryPercent = useMemo(() => {
    return Math.round((node.mastery || 0) * 100)
  }, [node.mastery])

  const shouldShowLabel = showLabel || isHovered

  return (
    <button
      data-testid={`constellation-star-${node.id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      onFocus={handleHoverStart}
      onBlur={handleHoverEnd}
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        rounded-full
        transition-all duration-300
        hover:scale-125 focus:scale-125
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
        ${sizeClass}
        ${colorClass}
        ${glowClass}
        ${isDimmed ? 'opacity-40' : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
      }}
      aria-label={`${node.name} - ${masteryPercent}% mastery`}
    >
      {accentColor && (
        <span
          className="absolute inset-0 rounded-full border pointer-events-none"
          style={{ borderColor: accentColor, opacity: 0.55 }}
          aria-hidden="true"
        />
      )}
      {/* Brilliant stars get animated rays */}
      {node.brightness === 'brilliant' && (
        <div
          className="absolute inset-0"
          style={{ animation: 'spin 20s linear infinite' }}
          aria-hidden="true"
        >
          {RAY_ANGLES.map((deg) => (
            <div
              key={deg}
              className="absolute w-0.5 h-3 bg-gradient-to-t from-white/60 to-transparent"
              style={{
                left: '50%',
                top: '-4px',
                transform: `translateX(-50%) rotate(${deg}deg)`,
                transformOrigin: 'bottom center',
              }}
            />
          ))}
        </div>
      )}

      {/* Label tooltip on hover/focus */}
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
          <div className="font-medium">{node.name}</div>
          <div className="text-slate-400 text-[10px]">
            {masteryPercent}% mastery
          </div>
          {/* Tooltip arrow */}
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
            bg-slate-900/70 border border-white/10
            text-[11px] text-slate-100
            whitespace-nowrap pointer-events-none
            max-w-[110px] truncate text-center
            shadow-[0_0_10px_rgba(15,23,42,0.6)]
            backdrop-blur-sm
          "
          style={{ textShadow: '0 1px 2px rgba(15, 23, 42, 0.9)' }}
          aria-hidden="true"
        >
          {node.name}
        </div>
      )}
    </button>
  )
}
