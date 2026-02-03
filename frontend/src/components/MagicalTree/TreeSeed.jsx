/**
 * TreeSeed Component
 *
 * Empty state component displayed when the user has no learned topics yet.
 * Shows an animated seed with CTA to start learning.
 */

import { useCallback } from 'react'
import PropTypes from 'prop-types'

/**
 * TreeSeed - Empty state seed component
 *
 * @param {Object} props
 * @param {Function} props.onStartLearning - Callback when user clicks to start learning
 */
export default function TreeSeed({ onStartLearning, onPlant }) {
  const handleStart = onPlant || onStartLearning
  /**
   * Handle click event
   */
  const handleClick = useCallback(() => {
    handleStart?.()
  }, [handleStart])

  /**
   * Handle keyboard events for accessibility
   */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleStart?.()
      }
    },
    [handleStart]
  )

  return (
    <div
      data-testid="tree-seed"
      className="
        relative
        w-full h-full
        min-h-[320px]
        flex flex-col items-center justify-center
        rounded-2xl
        overflow-hidden
        bg-amber-50/80 dark:bg-amber-900/20
        cursor-pointer
        transition-all duration-300
        hover:shadow-lg hover:-translate-y-0.5
        focus:ring-2 focus:ring-amber-300 focus:ring-offset-2
        group
        animate-seed-glow motion-reduce:animate-none
      "
      role="button"
      tabIndex="0"
      aria-label="Create your world - plant your first seed"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Background gradients + texture */}
      <div
        className="
          absolute inset-0
          bg-gradient-to-b from-amber-50 via-amber-100 to-emerald-50
          dark:from-amber-900/30 dark:via-emerald-900/20 dark:to-amber-900/30
        "
        aria-hidden="true"
      />
      <div
        className="
          absolute inset-0
          opacity-30
          bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6)_0%,_rgba(255,255,255,0)_55%)]
        "
        aria-hidden="true"
      />

      {/* Emoji sky details */}
      <div
        className="
          absolute -top-2 left-6
          text-4xl
          opacity-80
          animate-seed-bob motion-reduce:animate-none
        "
        aria-hidden="true"
      >
        ☀️
      </div>
      <div
        className="
          absolute top-6 right-8
          flex items-center gap-2
          text-3xl
          opacity-70
          animate-seed-bob motion-reduce:animate-none
        "
        aria-hidden="true"
      >
        ☁️ ☁️
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 w-full">
        {/* Emoji badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-200">
          <span className="px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-900/40 shadow-sm">
            ✨ Earn XP
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-900/40 shadow-sm">
            🧠 Learn
          </span>
          <span className="px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-900/40 shadow-sm">
            🧭 Discover
          </span>
        </div>

        {/* Hero seed */}
        <div className="relative mt-6 flex flex-col items-center">
          <div
            data-testid="seed-visual"
            className="
              relative
              w-24 h-24
              rounded-full
              bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600
              dark:from-amber-400 dark:via-amber-600 dark:to-amber-800
              shadow-2xl
              animate-seed-bob motion-reduce:animate-none
              transition-transform duration-300
              group-hover:scale-105
              flex items-center justify-center
              text-5xl
            "
            aria-hidden="true"
          >
            🌱
            <span className="absolute bottom-2 right-3 text-xl" aria-hidden="true">
              🌰
            </span>
          </div>

          <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl animate-sparkle-drift motion-reduce:animate-none" aria-hidden="true">
            ✨
          </div>

          {/* Soil/ground visual */}
          <div
            data-testid="seed-soil"
            className="
              relative
              mt-6
              w-64 max-w-[85vw] h-12
              bg-gradient-to-t from-amber-700 via-amber-600 to-amber-500
              dark:from-amber-900 dark:via-amber-800 dark:to-amber-700
              rounded-full
              shadow-inner
            "
          >
            <div className="absolute inset-0 flex items-center justify-center gap-3 text-lg opacity-80" aria-hidden="true">
              🪨 🪵 🪨
            </div>
          </div>
        </div>

        {/* CTA text */}
        <div className="mt-6 max-w-sm">
          <h3 className="text-xl font-display font-bold text-amber-900 dark:text-amber-100 mb-2">
            Plant Your First Seed 🌱
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-200 mb-4">
            Ask a question to start your learning journey.
          </p>

          {/* CTA visual styled as button */}
          <span
            className="
              inline-flex items-center justify-center
              px-6 py-2.5
              bg-emerald-500 hover:bg-emerald-600
              text-white font-semibold
              rounded-full
              shadow-md hover:shadow-lg
              transition-all duration-200
              hover:scale-105 active:scale-95
            "
          >
            🌱 Begin Now
          </span>
        </div>
      </div>
    </div>
  )
}

// NOTE: The container div has role="button" to serve as the single clickable element.
// The CTA visual (Start Learning span) is styled like a button but is not a button element
// to avoid having multiple elements match getByRole('button') in tests.

TreeSeed.propTypes = {
  onStartLearning: PropTypes.func,
  onPlant: PropTypes.func,
}
