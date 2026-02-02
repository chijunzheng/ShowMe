/**
 * TrophyBadge Component
 *
 * Displays trophy/badge achievements in the Living World, giving kids
 * a sense of accomplishment. Features celebration animations for newly
 * earned badges and optional progress rings for mastery tracking.
 *
 * Badge Types:
 * - explorer: Discovering new topics (green gradient)
 * - master: Mastering a subject area (purple gradient)
 * - streak: Learning consistency (orange gradient)
 * - milestone: Major achievements (blue gradient)
 * - custom: Special badges (pink gradient)
 *
 * Levels:
 * - 1: Bronze ring
 * - 2: Silver ring
 * - 3: Gold ring
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'

/**
 * Badge style configurations by type
 * Each type has a gradient background and default emoji
 */
const BADGE_STYLES = {
  explorer: { bg: 'from-emerald-400 to-emerald-600', emoji: '🌍' },
  master: { bg: 'from-purple-400 to-purple-600', emoji: '🎓' },
  streak: { bg: 'from-orange-400 to-orange-600', emoji: '🔥' },
  milestone: { bg: 'from-blue-400 to-blue-600', emoji: '🏆' },
  custom: { bg: 'from-pink-400 to-pink-600', emoji: '⭐' },
}

/**
 * Ring color configurations by level
 * Represents bronze (1), silver (2), and gold (3) tiers
 */
const LEVEL_RINGS = {
  1: 'ring-amber-600', // Bronze
  2: 'ring-slate-300', // Silver
  3: 'ring-yellow-400', // Gold
}

/**
 * Size class configurations
 * Maps size prop to Tailwind width/height classes
 */
const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
}

/**
 * Icon size configurations
 * Maps size prop to appropriate text size for emoji/icon
 */
const ICON_SIZE_CLASSES = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
}

/**
 * Progress ring SVG size configurations
 * Dimensions for the circular progress indicator
 */
const PROGRESS_RING_CONFIG = {
  sm: { size: 40, strokeWidth: 3, radius: 17 },
  md: { size: 56, strokeWidth: 4, radius: 24 },
  lg: { size: 72, strokeWidth: 5, radius: 30 },
}

/**
 * Sparkles Component
 *
 * Renders animated sparkle particles around the badge when newly earned.
 * Sparkles are positioned in a circle around the center and animate
 * outward with a staggered delay.
 *
 * @param {Object} props - Component props
 * @param {Function} props.onComplete - Callback when animation finishes
 */
function Sparkles({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, 2000)
    return () => clearTimeout(timer)
  }, [onComplete])

  // Generate 6 sparkle positions in a hexagonal pattern
  const sparkles = useMemo(
    () =>
      [...Array(6)].map((_, i) => ({
        id: i,
        // Position sparkles in a circle (60 degrees apart)
        left: `${50 + 40 * Math.cos((i * Math.PI) / 3)}%`,
        top: `${50 + 40 * Math.sin((i * Math.PI) / 3)}%`,
        delay: `${i * 0.1}s`,
      })),
    []
  )

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    >
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-trophy-sparkle"
          style={{
            left: sparkle.left,
            top: sparkle.top,
            animationDelay: sparkle.delay,
          }}
        />
      ))}
    </div>
  )
}

Sparkles.propTypes = {
  onComplete: PropTypes.func,
}

/**
 * ProgressRing Component
 *
 * Renders a circular SVG progress indicator around the badge.
 * Used for mastery tracking on hotspots.
 *
 * @param {Object} props - Component props
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {string} props.size - Badge size ('sm' | 'md' | 'lg')
 * @param {string} props.color - Stroke color class
 */
function ProgressRing({ progress, size, color = 'stroke-primary-500' }) {
  const config = PROGRESS_RING_CONFIG[size] || PROGRESS_RING_CONFIG.md
  const { size: svgSize, strokeWidth, radius } = config
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <svg
      className="absolute inset-0 -rotate-90"
      width={svgSize}
      height={svgSize}
      viewBox={`0 0 ${svgSize} ${svgSize}`}
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-slate-200 dark:stroke-slate-700"
      />
      {/* Progress circle */}
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className={`${color} transition-all duration-500 ease-out`}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
      />
    </svg>
  )
}

ProgressRing.propTypes = {
  progress: PropTypes.number.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  color: PropTypes.string,
}

/**
 * TrophyBadge Component
 *
 * Main badge display component with support for:
 * - Multiple badge types with distinct visual styles
 * - Three achievement levels (bronze/silver/gold)
 * - Celebration animations for newly earned badges
 * - Progress ring for mastery tracking
 * - Customizable size and optional title display
 *
 * @param {Object} props - Component props
 * @param {string} props.type - Badge type ('explorer' | 'master' | 'streak' | 'milestone' | 'custom')
 * @param {number} props.level - Achievement level (1 | 2 | 3)
 * @param {string} props.title - Badge title (e.g., "Topic Explorer")
 * @param {string} props.description - Badge description (e.g., "Learned 5 topics!")
 * @param {string} props.icon - Custom emoji or icon (defaults to type's emoji)
 * @param {Date} props.earnedAt - When the badge was earned
 * @param {string} props.size - Display size ('sm' | 'md' | 'lg')
 * @param {boolean} props.showTitle - Whether to show title below badge
 * @param {boolean} props.animated - Whether to show shine animation
 * @param {Function} props.onClick - Click handler for badge details
 * @param {boolean} props.isNew - Whether badge was just earned (triggers celebration)
 * @param {Function} props.onCelebrationComplete - Callback when celebration ends
 * @param {number} props.progress - Optional progress value (0-100) for mastery ring
 */
function TrophyBadge({
  type = 'custom',
  level = 1,
  title = '',
  description = '',
  icon,
  earnedAt,
  size = 'md',
  showTitle = false,
  animated = false,
  onClick,
  isNew = false,
  onCelebrationComplete,
  progress,
}) {
  const [showSparkles, setShowSparkles] = useState(isNew)

  // Get badge style configuration
  const badgeStyle = BADGE_STYLES[type] || BADGE_STYLES.custom
  const levelRing = LEVEL_RINGS[level] || LEVEL_RINGS[1]
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md
  const iconSizeClass = ICON_SIZE_CLASSES[size] || ICON_SIZE_CLASSES.md

  // Use custom icon or fall back to type's default emoji
  const displayIcon = icon || badgeStyle.emoji

  // Determine if progress ring should be shown
  const hasProgress = typeof progress === 'number' && progress >= 0

  /**
   * Handle sparkle animation completion
   */
  const handleSparkleComplete = useCallback(() => {
    setShowSparkles(false)
    onCelebrationComplete?.()
  }, [onCelebrationComplete])

  /**
   * Handle badge click
   */
  const handleClick = useCallback(() => {
    onClick?.()
  }, [onClick])

  /**
   * Handle keyboard interaction for accessibility
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick?.()
      }
    },
    [onClick]
  )

  // Reset sparkles when isNew changes
  useEffect(() => {
    if (isNew) {
      setShowSparkles(true)
    }
  }, [isNew])

  return (
    <>
      {/* CSS Keyframes for badge-specific animations */}
      <style>{`
        @keyframes badgeShine {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }

        @keyframes badgeCelebrate {
          0% { transform: scale(0) rotate(-180deg); }
          50% { transform: scale(1.2) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes trophySparkle {
          0% { opacity: 1; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0) translateY(-20px); }
        }

        .animate-badge-shine {
          animation: badgeShine 2s ease-in-out infinite;
        }

        .animate-badge-celebrate {
          animation: badgeCelebrate 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-trophy-sparkle {
          animation: trophySparkle 0.8s ease-out forwards;
        }
      `}</style>

      <div
        className={`
          relative inline-flex flex-col items-center
          ${onClick ? 'cursor-pointer' : ''}
        `}
        onClick={onClick ? handleClick : undefined}
        onKeyDown={onClick ? handleKeyDown : undefined}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={
          onClick
            ? `${title || `${type} badge`}, level ${level}${description ? `, ${description}` : ''}`
            : undefined
        }
      >
        {/* Progress ring container (if progress prop is provided) */}
        {hasProgress && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              width: PROGRESS_RING_CONFIG[size]?.size || PROGRESS_RING_CONFIG.md.size,
              height: PROGRESS_RING_CONFIG[size]?.size || PROGRESS_RING_CONFIG.md.size,
              transform: 'translate(-50%, -50%)',
              left: '50%',
              top: '50%',
            }}
          >
            <ProgressRing progress={progress} size={size} />
          </div>
        )}

        {/* Badge circle */}
        <div
          className={`
            ${sizeClass}
            rounded-full
            bg-gradient-to-br ${badgeStyle.bg}
            ring-4 ${levelRing}
            flex items-center justify-center
            shadow-lg
            transition-transform duration-200
            ${onClick ? 'hover:scale-110 active:scale-95' : ''}
            ${animated ? 'animate-badge-shine' : ''}
            ${isNew ? 'animate-badge-celebrate' : ''}
          `}
        >
          <span
            className={`${iconSizeClass} select-none`}
            role="img"
            aria-label={`${type} badge icon`}
          >
            {displayIcon}
          </span>
        </div>

        {/* Title text */}
        {showTitle && title && (
          <span
            className="
              mt-1 text-xs font-medium
              text-slate-600 dark:text-slate-400
              text-center max-w-[80px] truncate
            "
            title={title}
          >
            {title}
          </span>
        )}

        {/* Sparkle celebration effect */}
        {showSparkles && <Sparkles onComplete={handleSparkleComplete} />}
      </div>
    </>
  )
}

TrophyBadge.propTypes = {
  type: PropTypes.oneOf(['explorer', 'master', 'streak', 'milestone', 'custom']),
  level: PropTypes.oneOf([1, 2, 3]),
  title: PropTypes.string,
  description: PropTypes.string,
  icon: PropTypes.string,
  earnedAt: PropTypes.instanceOf(Date),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showTitle: PropTypes.bool,
  animated: PropTypes.bool,
  onClick: PropTypes.func,
  isNew: PropTypes.bool,
  onCelebrationComplete: PropTypes.func,
  progress: PropTypes.number,
}

export default TrophyBadge
