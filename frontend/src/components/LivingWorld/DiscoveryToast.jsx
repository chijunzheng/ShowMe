/**
 * DiscoveryToast Component
 *
 * Displays a toast notification when a new landmark is discovered in the world.
 * Shows the element name, topic, and placement hint with an Explore button.
 */

/**
 * Format discovery label for display
 * @param {Object} discovery - Discovery object
 * @returns {string} Formatted label
 */
function formatDiscoveryLabel(discovery) {
  if (!discovery) return ''
  if (discovery.elementAdded) return discovery.elementAdded
  return discovery.topicName || 'New discovery'
}

export default function DiscoveryToast({ discovery, onClose, onExplore }) {
  if (!discovery) return null

  const label = formatDiscoveryLabel(discovery)
  const placement = discovery.placementHint ? discovery.placementHint : null

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
      <div
        className="
          pointer-events-auto
          max-w-lg
          bg-white/90 dark:bg-slate-900/90
          border border-white/60 dark:border-slate-700
          rounded-2xl
          shadow-2xl
          px-4 py-3
          backdrop-blur
          animate-[fade-in-up_0.5s_ease-out]
        "
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-500 font-semibold">
              New Landmark
            </div>
            <div className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {label}
            </div>
            {discovery.topicName && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                Topic: {discovery.topicName}
              </div>
            )}
            {placement && (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                {placement}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onExplore && (
              <button
                onClick={onExplore}
                className="
                  px-3 py-1.5
                  rounded-full
                  text-xs font-semibold
                  bg-emerald-500/90 text-white
                  shadow-sm hover:shadow-md
                  hover:bg-emerald-500
                  transition-colors
                "
              >
                Explore
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Dismiss discovery"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
