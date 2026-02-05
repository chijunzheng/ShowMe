/**
 * ExplorerRankBadge Component
 *
 * Displays the user's current explorer rank with icon and title.
 * Supports multiple size variants and optional click handling.
 *
 * @param {Object} props
 * @param {number} props.level - Current rank level (1-7)
 * @param {string} props.title - Rank title
 * @param {string} props.icon - Rank emoji icon
 * @param {'compact' | 'standard' | 'large'} [props.size='standard'] - Display size
 * @param {boolean} [props.showTitle=true] - Whether to show title text
 * @param {Function} [props.onClick] - Click handler (for showing details)
 */

import PropTypes from 'prop-types'
import { getRankTailwindColors, MAX_RANK_LEVEL } from './explorerRankUtils'

/**
 * Size configuration for badge variants
 */
const SIZE_CONFIG = {
  compact: {
    container: 'w-8 h-8',
    icon: 'text-lg',
    padding: 'p-1',
    wrapper: 'inline-flex items-center justify-center',
  },
  standard: {
    container: 'h-10',
    icon: 'text-xl',
    padding: 'px-3 py-1.5',
    wrapper: 'inline-flex items-center gap-2',
  },
  large: {
    container: 'h-14',
    icon: 'text-3xl',
    padding: 'px-4 py-2',
    wrapper: 'inline-flex flex-col items-center gap-1',
  },
}

export default function ExplorerRankBadge({
  level,
  title,
  icon,
  size = 'standard',
  showTitle = true,
  onClick,
}) {
  // Validate level
  const safeLevel = level >= 1 && level <= MAX_RANK_LEVEL ? level : 1
  const colors = getRankTailwindColors(safeLevel)
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.standard

  // Determine if badge is interactive
  const isClickable = typeof onClick === 'function'

  // Build className based on size
  const containerClassName = [
    sizeConfig.wrapper,
    sizeConfig.container,
    sizeConfig.padding,
    colors.bg,
    colors.text,
    'rounded-full',
    'border',
    colors.border,
    'transition-all duration-200',
    isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : '',
    // Special shimmer effect for max rank
    safeLevel === MAX_RANK_LEVEL ? 'shimmer' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Handle click
  const handleClick = () => {
    if (isClickable) {
      onClick()
    }
  }

  // Handle keyboard interaction
  const handleKeyDown = (e) => {
    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  // Compact variant - icon only with tooltip
  if (size === 'compact') {
    return (
      <div
        data-testid="explorer-rank-badge"
        className={containerClassName}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? 'button' : 'status'}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={`${title} - Level ${safeLevel}`}
        title={`${title} - Level ${safeLevel}`}
      >
        <span className={sizeConfig.icon} aria-hidden="true">
          {icon}
        </span>
      </div>
    )
  }

  // Standard variant - icon + title
  if (size === 'standard') {
    return (
      <div
        data-testid="explorer-rank-badge"
        className={containerClassName}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? 'button' : 'status'}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={`${title} - Level ${safeLevel}`}
      >
        <span className={sizeConfig.icon} aria-hidden="true">
          {icon}
        </span>
        {showTitle && (
          <span className="font-semibold text-sm whitespace-nowrap">{title}</span>
        )}
      </div>
    )
  }

  // Large variant - icon + title + level subtitle
  return (
    <div
      data-testid="explorer-rank-badge"
      className={containerClassName}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : 'status'}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={`${title} - Level ${safeLevel}`}
    >
      <span className={sizeConfig.icon} aria-hidden="true">
        {icon}
      </span>
      {showTitle && (
        <div className="flex flex-col items-center">
          <span className="font-bold text-base">{title}</span>
          <span className="text-xs opacity-75">Level {safeLevel}</span>
        </div>
      )}
    </div>
  )
}

ExplorerRankBadge.propTypes = {
  level: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['compact', 'standard', 'large']),
  showTitle: PropTypes.bool,
  onClick: PropTypes.func,
}
