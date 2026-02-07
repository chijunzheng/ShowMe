import PropTypes from 'prop-types'

/**
 * ExperimentLoader - Engaging loader for Wonder Lab experiment preparation.
 *
 * Displays rotating stage copy and an optional fun fact card while
 * the scenario payload is generated. Mirrors MysteryLoader's pattern
 * with a science theme.
 */
export default function ExperimentLoader({
  stageText,
  funFact,
  factSource = 'local',
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950">
      <div className="max-w-xl w-full space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-300 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🧪</span>
            </div>
          </div>
          <p
            role="status"
            aria-live="polite"
            data-testid="experiment-loader-stage"
            className="text-xl font-medium text-blue-700 dark:text-blue-300"
          >
            {stageText}
          </p>
        </div>

        {funFact?.text && (
          <article
            role="status"
            aria-live="polite"
            data-testid="experiment-loader-fun-fact"
            className="bg-white/85 dark:bg-gray-800/85 border border-blue-200 dark:border-blue-700 rounded-2xl p-5 shadow-md"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                Did you know?
              </p>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {factSource === 'api' ? 'Topic fact' : 'Lab fact'}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">{funFact.emoji || '🔬'}</span>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{funFact.text}</p>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}

ExperimentLoader.propTypes = {
  stageText: PropTypes.string.isRequired,
  funFact: PropTypes.shape({
    emoji: PropTypes.string,
    text: PropTypes.string,
  }),
  factSource: PropTypes.oneOf(['local', 'api']),
}
