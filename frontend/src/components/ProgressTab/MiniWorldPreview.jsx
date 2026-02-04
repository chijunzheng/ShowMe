/**
 * MiniWorldPreview Component
 *
 * Compact world preview for Progress Tab header. Shows current world
 * as a thumbnail with tier indicator. Tapping expands to fullscreen.
 */

import { useState, useCallback } from 'react'
import { getTierIcon, getTierLabel, TIER_CONFIG } from '../../constants/world'

/**
 * Static Tailwind class mappings for tier colors
 * Using static strings because Tailwind cannot detect dynamic class names
 */
const TIER_COLOR_CLASSES = {
  barren: {
    badge: 'bg-slate-50/90 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100',
    label: 'text-slate-600 dark:text-slate-400',
  },
  sprouting: {
    badge: 'bg-emerald-50/90 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-100',
    label: 'text-emerald-600 dark:text-emerald-400',
  },
  growing: {
    badge: 'bg-sky-50/90 dark:bg-sky-900/40 text-sky-800 dark:text-sky-100',
    label: 'text-sky-600 dark:text-sky-400',
  },
  thriving: {
    badge: 'bg-violet-50/90 dark:bg-violet-900/40 text-violet-800 dark:text-violet-100',
    label: 'text-violet-600 dark:text-violet-400',
  },
  legendary: {
    badge: 'bg-amber-50/90 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100',
    label: 'text-amber-600 dark:text-amber-400',
  },
}

/**
 * MiniWorldPreview - Compact world thumbnail with expand to fullscreen
 *
 * @param {Object} props
 * @param {string|null} props.worldImageUrl - URL of the world panorama image
 * @param {string} props.tier - World tier (barren, sprouting, growing, thriving, legendary)
 * @param {number} props.topicCount - Number of topics learned
 * @param {Function} props.onExpand - Callback when expand button is clicked
 * @param {boolean} props.isExpanded - Whether the world is currently expanded
 * @param {Function} props.onCollapse - Callback when collapse button is clicked
 * @param {React.ReactNode} props.children - Fullscreen content (LivingWorldView)
 */
export default function MiniWorldPreview({
  worldImageUrl,
  tier = 'barren',
  topicCount = 0,
  onExpand,
  isExpanded = false,
  onCollapse,
  children,
}) {
  const tierIcon = getTierIcon(tier)
  const tierLabel = getTierLabel(tier)
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.barren
  const tierColors = TIER_COLOR_CLASSES[tier] || TIER_COLOR_CLASSES.barren

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onExpand?.()
    }
  }, [onExpand])

  // Empty state - no world created yet
  if (!worldImageUrl) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50">
        <div
          className="
            w-[120px] h-[68px] flex-shrink-0
            rounded-xl
            bg-gradient-to-br from-slate-200 to-slate-300
            dark:from-slate-700 dark:to-slate-800
            flex items-center justify-center
          "
        >
          <span className="text-3xl" aria-hidden="true">🌍</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
            Your World
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Learn topics to grow your world!
          </p>
        </div>
      </div>
    )
  }

  // Fullscreen expanded view
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900">
        {/* Header with back button */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/30 to-transparent">
          <button
            onClick={onCollapse}
            className="
              flex items-center gap-2 px-3 py-2
              rounded-full bg-white/90 dark:bg-slate-800/90
              text-slate-700 dark:text-slate-200
              text-sm font-semibold
              shadow-lg backdrop-blur
              hover:bg-white dark:hover:bg-slate-800
              transition-colors
            "
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </button>

          {/* Tier badge */}
          <div
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-full
              ${tierColors.badge}
              text-sm font-semibold shadow-sm backdrop-blur
            `}
          >
            <span className="text-base" aria-hidden="true">{tierIcon}</span>
            <span className="capitalize">{tierLabel}</span>
          </div>
        </div>

        {/* Fullscreen content - renders LivingWorldView or children */}
        <div className="w-full h-full">
          {children}
        </div>
      </div>
    )
  }

  // Mini preview (collapsed)
  return (
    <div
      className="
        flex items-center gap-4 p-4
        rounded-2xl
        bg-gradient-to-r from-emerald-50 to-sky-50
        dark:from-emerald-900/20 dark:to-sky-900/20
        border border-emerald-100 dark:border-emerald-800/30
        cursor-pointer
        hover:shadow-md hover:scale-[1.01]
        active:scale-[0.99]
        transition-all duration-200
        group
      "
      onClick={onExpand}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Your world - ${tierLabel} tier with ${topicCount} discoveries. Tap to explore.`}
    >
      {/* World thumbnail */}
      <div className="relative w-[120px] h-[68px] flex-shrink-0 rounded-xl overflow-hidden shadow-md">
        <img
          src={worldImageUrl}
          alt="Your world preview"
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div
          className="
            absolute inset-0
            bg-black/0 group-hover:bg-black/20
            flex items-center justify-center
            transition-colors duration-200
          "
        >
          <span
            className="
              text-white text-xl opacity-0 group-hover:opacity-100
              transform scale-75 group-hover:scale-100
              transition-all duration-200
            "
            aria-hidden="true"
          >
            🔍
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
          Your World
        </h3>

        {/* Tier badge */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-base" aria-hidden="true">{tierIcon}</span>
          <span className={`text-sm font-medium ${tierColors.label}`}>
            {tierLabel}
          </span>
        </div>

        {/* Stats */}
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {topicCount} {topicCount === 1 ? 'discovery' : 'discoveries'}
        </p>
      </div>

      {/* Explore indicator */}
      <div
        className="
          px-3 py-1.5
          rounded-full
          bg-emerald-500 text-white
          text-xs font-semibold
          group-hover:bg-emerald-600
          transition-colors
        "
      >
        Explore
      </div>
    </div>
  )
}
