/**
 * EmptyState Component
 *
 * Displays empty state for new users who haven't created their world yet.
 * Shows a CTA to create the world and start learning.
 *
 * Note: This component is retained for backward compatibility but the
 * LivingWorldView now uses TreeSeed component instead for the empty state.
 */

export default function EmptyState({ onCreateWorld, isCreating }) {
  return (
    <div
      className="
        w-full aspect-video
        bg-gradient-to-b from-slate-300 to-slate-500
        dark:from-slate-700 dark:to-slate-900
        rounded-lg
        flex flex-col items-center justify-center
        p-6
      "
    >
      {/* World icon */}
      <div className="mb-4">
        <span className="text-5xl" role="img" aria-hidden="true">
          🌍
        </span>
      </div>

      {/* Headline */}
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2 text-center drop-shadow-lg">
        Create Your World
      </h2>

      {/* Description */}
      <p className="text-white/80 text-sm md:text-base mb-6 text-center max-w-sm">
        Start your learning journey and watch your world grow with each new topic you explore.
      </p>

      {/* CTA Button */}
      <button
        onClick={onCreateWorld}
        disabled={isCreating}
        tabIndex={0}
        className="
          px-6 py-3
          rounded-xl
          bg-white text-slate-700
          font-semibold
          hover:bg-white/90 hover:scale-105
          active:scale-95
          transition-all duration-200
          shadow-lg hover:shadow-xl
          focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-500
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        "
        aria-label="Create your world"
      >
        {isCreating ? 'Creating...' : 'Create Your World'}
      </button>
    </div>
  )
}
