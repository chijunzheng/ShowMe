/**
 * BossBattle - Boss battle wrapper component
 *
 * Wraps quiz question content with boss battle styling.
 * Features pulsing border, gradient background, and boss indicator badge.
 * Only applies boss styling when isActive is true.
 *
 * @param {Object} props
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {React.ReactNode} props.children - Quiz content to wrap
 * @param {boolean} props.isActive - Whether boss battle styling is active
 */

import { useMemo } from 'react'
import PropTypes from 'prop-types'
import { getBossStyle } from '@/hooks/game/bossBattleConfig'

/**
 * Level-specific class mappings for active state styling.
 */
const LEVEL_CLASSES = {
  simple: {
    gradient: 'bg-gradient-to-br from-emerald-50 to-green-100',
    border: 'border-emerald-400',
    ring: 'ring-emerald-300',
    shadow: 'shadow-emerald-200',
    label: 'simple',
  },
  standard: {
    gradient: 'bg-gradient-to-br from-cyan-50 to-blue-100',
    border: 'border-cyan-400',
    ring: 'ring-cyan-300',
    shadow: 'shadow-cyan-200',
    label: 'standard',
  },
  deep: {
    gradient: 'bg-gradient-to-br from-violet-50 to-purple-100',
    border: 'border-violet-400',
    ring: 'ring-violet-300',
    shadow: 'shadow-violet-200',
    label: 'deep',
  },
}

export default function BossBattle({ level, children, isActive = false }) {
  // Get level-specific configuration with fallback
  const bossStyle = useMemo(() => getBossStyle(level), [level])
  const levelClasses = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple

  // Build class names based on active state
  const containerClasses = useMemo(() => {
    const baseClasses = [
      'relative',
      'rounded-xl',
      'p-4',
      'transition-all',
      'duration-300',
      'boss',
    ]

    if (isActive) {
      return [
        ...baseClasses,
        levelClasses.gradient,
        'border-2',
        levelClasses.border,
        'ring-4',
        levelClasses.ring,
        'shadow-lg',
        levelClasses.shadow,
        'animate-pulse',
        'active',
        levelClasses.label,
      ].join(' ')
    }

    return [
      ...baseClasses,
      'bg-transparent',
      'border',
      'border-transparent',
      'inactive',
    ].join(' ')
  }, [isActive, levelClasses])

  return (
    <div
      data-testid="boss-battle"
      role={isActive ? 'region' : undefined}
      aria-label={isActive ? `Boss battle: ${bossStyle.name}` : undefined}
      className={containerClasses}
    >
      {/* Boss indicator badge - only shown when active */}
      {isActive && (
        <div
          data-testid="boss-indicator"
          className={`
            absolute -top-3 left-1/2 -translate-x-1/2
            flex items-center gap-1.5
            px-3 py-1 rounded-full
            bg-white shadow-md
            border ${levelClasses.border}
            z-10
          `}
        >
          <span aria-hidden="true" className="text-lg">
            {bossStyle.icon}
          </span>
          <span className="text-sm font-bold text-gray-800 tracking-wide">
            BOSS
          </span>
        </div>
      )}

      {/* Children content */}
      <div className="relative z-0">{children}</div>
    </div>
  )
}

BossBattle.propTypes = {
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  children: PropTypes.node,
  isActive: PropTypes.bool,
}
