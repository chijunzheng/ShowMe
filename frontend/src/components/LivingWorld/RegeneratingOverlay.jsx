/**
 * RegeneratingOverlay Component
 *
 * Displays a progress overlay during world regeneration.
 * Shows a spinner and progress bar with topic count.
 */

export default function RegeneratingOverlay({ progress }) {
  const total = Number.isFinite(progress?.total) ? progress.total : 0
  const current = Number.isFinite(progress?.current) ? progress.current : 0
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div
        className="w-full max-w-xs bg-white/90 rounded-2xl shadow-xl px-5 py-4 text-center"
        role="status"
        aria-live="polite"
      >
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-base font-semibold text-gray-700">Regenerating world...</p>
        {total > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {current}/{total} topics
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
