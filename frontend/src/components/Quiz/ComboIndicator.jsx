/**
 * ComboIndicator Component
 * WB002/WB003: Persistent badge showing current combo multiplier
 *
 * Features:
 * - Displays current multiplier (x1.25, x1.5, x2)
 * - Color changes by combo level (gray -> blue -> gold)
 * - Pulses on combo up with scale animation
 * - Three style variations based on celebration style:
 *   - playful: Rounded, bouncy, star decorations
 *   - balanced: Clean badge with subtle glow
 *   - intense: Sharp edges, fire/lightning accent
 *
 * @param {Object} props - Component props
 * @param {number} props.multiplier - Current multiplier value (1, 1.25, 1.5, 2)
 * @param {number} props.comboLevel - Current combo level (0, 1, 2)
 * @param {boolean} props.showComboUp - Whether to show combo up animation
 * @param {'playful' | 'balanced' | 'intense'} props.celebrationStyle - Style variation
 */

import { useState, useEffect } from 'react'

/**
 * Star decoration for playful style
 */
function StarDecoration({ className = '' }) {
  return (
    <svg
      className={`w-3 h-3 ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

/**
 * Lightning bolt for intense style
 */
function LightningBolt({ className = '' }) {
  return (
    <svg
      className={`w-3 h-3 ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13 0L0 14h9l-2 10 13-14h-9l2-10z" />
    </svg>
  )
}

/**
 * Fire icon for intense style at max combo
 */
function FireIcon({ className = '' }) {
  return (
    <svg
      className={`w-4 h-4 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <defs>
        <linearGradient id="fireGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#facc15" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C9.243 5.243 7 8.243 7 11c0 2.761 2.239 5 5 5s5-2.239 5-5c0-2.757-2.243-5.757-5-9z"
        fill="url(#fireGradient)"
      />
      <path
        d="M12 8c-1.105 1.657-2 3.315-2 4.5 0 1.105.895 2 2 2s2-.895 2-2c0-1.185-.895-2.843-2-4.5z"
        fill="#fef08a"
      />
    </svg>
  )
}

/**
 * Get styling configuration based on combo level and celebration style
 */
function getComboStyles(comboLevel, celebrationStyle) {
  // Base styles by combo level
  const levelStyles = {
    0: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      text: 'text-gray-400 dark:text-gray-500',
      glow: '',
      accent: 'text-gray-300 dark:text-gray-600'
    },
    1: {
      bg: 'bg-primary-50 dark:bg-primary-900/30',
      border: 'border-primary-200 dark:border-primary-700',
      text: 'text-primary dark:text-primary-400',
      glow: 'shadow-md shadow-primary/20',
      accent: 'text-primary-400 dark:text-primary-300'
    },
    2: {
      bg: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30',
      border: 'border-amber-300 dark:border-amber-600',
      text: 'text-amber-600 dark:text-amber-400',
      glow: 'shadow-lg shadow-amber-500/30',
      accent: 'text-amber-400 dark:text-amber-300'
    }
  }

  // Style variations by celebration style
  const styleVariations = {
    playful: {
      shape: 'rounded-full',
      padding: 'px-3 py-1.5',
      animation: 'hover:scale-105',
      decoration: 'stars'
    },
    balanced: {
      shape: 'rounded-lg',
      padding: 'px-3 py-1',
      animation: 'hover:shadow-lg',
      decoration: 'glow'
    },
    intense: {
      shape: 'rounded-md',
      padding: 'px-2.5 py-1',
      animation: 'hover:brightness-110',
      decoration: 'lightning'
    }
  }

  const level = levelStyles[comboLevel] || levelStyles[0]
  const variation = styleVariations[celebrationStyle] || styleVariations.balanced

  return { ...level, ...variation }
}

/**
 * Format multiplier for display (e.g., 1.5 -> "x1.5")
 */
function formatMultiplier(multiplier) {
  if (multiplier === 1) return 'x1'
  // Remove trailing zeros and format nicely
  const formatted = multiplier.toString().replace(/\.?0+$/, '')
  return `x${formatted}`
}

export default function ComboIndicator({
  multiplier = 1,
  comboLevel = 0,
  showComboUp = false,
  celebrationStyle = 'balanced'
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [showComboText, setShowComboText] = useState(false)

  // Trigger animation when showComboUp changes to true
  useEffect(() => {
    if (showComboUp) {
      setIsAnimating(true)
      setShowComboText(true)

      // Reset animation state after animation completes
      const animTimer = setTimeout(() => {
        setIsAnimating(false)
      }, 600)

      // Hide combo text after longer delay
      const textTimer = setTimeout(() => {
        setShowComboText(false)
      }, 1500)

      return () => {
        clearTimeout(animTimer)
        clearTimeout(textTimer)
      }
    }
  }, [showComboUp])

  // Get styles based on current state
  const styles = getComboStyles(comboLevel, celebrationStyle)

  // Don't render if multiplier is 1 and not animating (level 0)
  if (comboLevel === 0 && !isAnimating) {
    return null
  }

  return (
    <div className="relative">
      {/* Main badge */}
      <div
        className={`
          relative flex items-center gap-1.5
          ${styles.padding}
          ${styles.shape}
          ${styles.bg}
          ${styles.glow}
          border ${styles.border}
          ${styles.animation}
          transition-all duration-300
          ${isAnimating ? 'animate-bounce-in' : ''}
        `}
      >
        {/* Playful style: Star decorations */}
        {celebrationStyle === 'playful' && comboLevel >= 1 && (
          <>
            <StarDecoration
              className={`
                absolute -top-1 -left-1
                ${styles.accent}
                ${isAnimating ? 'animate-sparkle' : 'animate-pulse-slow'}
              `}
            />
            {comboLevel >= 2 && (
              <StarDecoration
                className={`
                  absolute -bottom-1 -right-1
                  ${styles.accent}
                  ${isAnimating ? 'animate-sparkle' : 'animate-pulse-slow'}
                `}
                style={{ animationDelay: '150ms' }}
              />
            )}
          </>
        )}

        {/* Intense style: Lightning/fire decorations */}
        {celebrationStyle === 'intense' && comboLevel >= 1 && (
          <>
            <LightningBolt
              className={`
                absolute -top-1.5 -right-1.5
                ${styles.accent}
                ${isAnimating ? 'animate-pulse' : ''}
              `}
            />
            {comboLevel >= 2 && (
              <div className="absolute -top-2 -left-1 animate-flame-flicker">
                <FireIcon />
              </div>
            )}
          </>
        )}

        {/* Balanced style: Subtle glow ring */}
        {celebrationStyle === 'balanced' && comboLevel >= 2 && (
          <div
            className={`
              absolute inset-0 ${styles.shape}
              bg-gradient-to-r from-amber-400/20 to-yellow-400/20
              animate-pulse-slow
              -z-10
            `}
            style={{ transform: 'scale(1.1)' }}
          />
        )}

        {/* Multiplier text */}
        <span
          className={`
            font-bold text-sm tabular-nums
            ${styles.text}
            ${isAnimating ? 'animate-scale-up' : ''}
          `}
        >
          {formatMultiplier(multiplier)}
        </span>

        {/* Combo level indicator dots (playful style) */}
        {celebrationStyle === 'playful' && comboLevel > 0 && (
          <div className="flex gap-0.5">
            {Array.from({ length: comboLevel }).map((_, i) => (
              <div
                key={i}
                className={`
                  w-1.5 h-1.5 rounded-full
                  ${comboLevel === 2 ? 'bg-amber-400' : 'bg-primary-400'}
                `}
              />
            ))}
          </div>
        )}
      </div>

      {/* Combo Up popup text */}
      {showComboText && (
        <div
          className={`
            absolute -top-8 left-1/2 -translate-x-1/2
            whitespace-nowrap
            animate-fade-in
          `}
        >
          <span
            className={`
              px-2 py-0.5 rounded-full
              text-xs font-bold
              ${comboLevel === 2
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'
                : 'bg-gradient-to-r from-primary to-cyan-500 text-white'
              }
              shadow-lg
            `}
          >
            {celebrationStyle === 'playful' && 'Combo Up!'}
            {celebrationStyle === 'balanced' && 'Combo!'}
            {celebrationStyle === 'intense' && 'COMBO!'}
          </span>
        </div>
      )}

      {/* Particle effects for max combo (intense style) */}
      {celebrationStyle === 'intense' && comboLevel === 2 && isAnimating && (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className="absolute top-1/2 left-1/2 text-amber-400 animate-tier-particle"
              style={{
                animationDelay: `${i * 100}ms`,
                transform: `rotate(${i * 90}deg) translateX(20px)`
              }}
            >
              <LightningBolt className="w-2 h-2" />
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
