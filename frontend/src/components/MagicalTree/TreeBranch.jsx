/**
 * TreeBranch Component
 *
 * Represents a category zone branch that holds multiple TreeLeaf components.
 * Groups leaves by zone with zone-specific coloring.
 */

import { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import TreeLeaf from './TreeLeaf'

/**
 * ChevronDown icon component
 */
function ChevronDownIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

/**
 * ChevronUp icon component
 */
function ChevronUpIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  )
}

/**
 * Zone style configurations
 */
const ZONE_STYLES = {
  nature: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    border: 'border-emerald-300 dark:border-emerald-700',
    stem: 'bg-emerald-400 dark:bg-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Nature',
  },
  civilization: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    border: 'border-amber-300 dark:border-amber-700',
    stem: 'bg-amber-400 dark:bg-amber-600',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Civilization',
  },
  arcane: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    border: 'border-purple-300 dark:border-purple-700',
    stem: 'bg-purple-400 dark:bg-purple-600',
    text: 'text-purple-700 dark:text-purple-300',
    label: 'Arcane',
  },
}

/**
 * Position styles for branch direction
 */
const POSITION_STYLES = {
  left: {
    container: 'flex-row',
    stem: 'rotate-[-30deg]',
    leaves: 'justify-start',
  },
  right: {
    container: 'flex-row-reverse',
    stem: 'rotate-[30deg]',
    leaves: 'justify-end',
  },
  center: {
    container: 'flex-col',
    stem: 'rotate-0',
    leaves: 'justify-center',
  },
}

/**
 * Max visible leaves before collapsing
 */
const MAX_VISIBLE_LEAVES = 5

/**
 * TreeBranch - Category zone branch component
 *
 * @param {Object} props
 * @param {string} props.zone - Zone name (nature, civilization, arcane)
 * @param {Array} props.topics - Array of topic objects in this zone
 * @param {Function} props.onLeafClick - Callback when a leaf is clicked
 * @param {string} props.position - Branch position (left, right, center)
 * @param {boolean} props.animate - Whether to animate branch appearance
 */
export default function TreeBranch({
  zone = 'nature',
  topics = [],
  onLeafClick,
  position = 'left',
  animate = false,
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Return null for empty/null topics
  if (!topics || topics.length === 0) {
    return null
  }

  // Get zone styles (default to nature for invalid zones)
  const styles = ZONE_STYLES[zone] || ZONE_STYLES.nature
  const positionStyle = POSITION_STYLES[position] || POSITION_STYLES.left

  // Determine if we need to show expand toggle
  const needsExpand = topics.length > MAX_VISIBLE_LEAVES
  const visibleTopics = needsExpand && !isExpanded
    ? topics.slice(0, MAX_VISIBLE_LEAVES)
    : topics

  /**
   * Handle expand toggle
   */
  const handleExpandToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  /**
   * Calculate staggered animation delays for leaves
   */
  const getAnimationDelay = useCallback(
    (index) => {
      if (!animate) return '0ms'
      return `${index * 100}ms`
    },
    [animate]
  )

  return (
    <div
      data-testid={`branch-${zone}`}
      className={`
        ${styles.bg}
        ${styles.border}
        border
        rounded-lg
        p-3
        ${position === 'left' ? 'branch-left' : ''}
        ${position === 'right' ? 'branch-right' : ''}
        ${position === 'center' ? 'branch-center' : ''}
      `}
      role="group"
      aria-label={`${zone} zone branch with ${topics.length} topics`}
    >
      {/* Branch header with label and count */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${styles.text}`}>
          {styles.label}
        </span>
        <span
          className={`
            text-xs font-bold
            ${styles.bg}
            ${styles.text}
            px-2 py-0.5 rounded-full
            border ${styles.border}
          `}
        >
          {topics.length}
        </span>
      </div>

      {/* Branch stem visual */}
      <div
        data-testid="branch-stem"
        className={`
          ${styles.stem}
          h-1 w-full rounded-full mb-3
          ${positionStyle.stem}
          transition-transform duration-300
        `}
        style={{ transform: position === 'left' ? 'translateX(-10%)' : position === 'right' ? 'translateX(10%)' : '' }}
      />

      {/* Leaves container */}
      <div
        className={`
          flex flex-wrap gap-2
          ${positionStyle.leaves}
        `}
      >
        {visibleTopics.map((topic, index) => (
          <TreeLeaf
            key={topic.id || `topic-${index}`}
            topic={topic}
            zone={zone}
            onClick={onLeafClick}
            isNew={topic.isNew}
            size="medium"
            style={animate ? { animationDelay: getAnimationDelay(index), transitionDelay: getAnimationDelay(index) } : undefined}
          />
        ))}
      </div>

      {/* Expand/collapse toggle */}
      {needsExpand && (
        <button
          data-testid="branch-expand-toggle"
          onClick={handleExpandToggle}
          aria-label={isExpanded ? 'Collapse branch' : `Expand to show all ${topics.length} topics`}
          aria-expanded={isExpanded}
          className={`
            mt-3 w-full
            flex items-center justify-center gap-1
            text-xs ${styles.text}
            hover:opacity-80
            transition-opacity
            py-1 rounded
            ${styles.bg}
            border ${styles.border}
          `}
        >
          {isExpanded ? (
            <>
              Show less <ChevronUpIcon className="w-3 h-3" />
            </>
          ) : (
            <>
              Show all {topics.length} <ChevronDownIcon className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

TreeBranch.propTypes = {
  zone: PropTypes.oneOf(['nature', 'civilization', 'arcane']),
  topics: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      category: PropTypes.string,
    })
  ),
  onLeafClick: PropTypes.func,
  position: PropTypes.oneOf(['left', 'right', 'center']),
  animate: PropTypes.bool,
}
