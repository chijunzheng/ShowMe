/**
 * ErrorState Component
 *
 * Displays an error state when the world fails to load.
 * Shows error message and retry button.
 */

export default function ErrorState({ message, onRetry }) {
  return (
    <div
      className="
        w-full aspect-video
        bg-gradient-to-b from-slate-400 to-slate-600
        dark:from-slate-600 dark:to-slate-800
        rounded-lg
        flex flex-col items-center justify-center
        p-6
      "
    >
      <div className="text-4xl mb-4">😔</div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Failed to load world
      </h2>
      <p className="text-white/70 text-center mb-6 max-w-sm">
        {message || 'Something went wrong. Please try again.'}
      </p>
      <button
        onClick={onRetry}
        className="
          px-5 py-2.5
          rounded-lg
          bg-white/20 text-white
          font-medium
          hover:bg-white/30
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-white/50
        "
        aria-label="Try again"
      >
        Try Again
      </button>
    </div>
  )
}
