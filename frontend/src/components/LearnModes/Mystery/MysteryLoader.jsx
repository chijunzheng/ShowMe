import PropTypes from 'prop-types'

/**
 * MysteryLoader - Engaging loader for case preparation.
 *
 * Displays rotating investigation stage copy and an optional fun fact while
 * the mystery payload is generated.
 */
export default function MysteryLoader({
  stageText,
  funFact,
  factSource = 'local',
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-amber-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      <div className="max-w-xl w-full space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-700 border-t-indigo-600 dark:border-t-indigo-300 rounded-full animate-spin" />
          <p
            role="status"
            aria-live="polite"
            data-testid="mystery-loader-stage"
            className="text-xl font-medium text-indigo-700 dark:text-indigo-300"
          >
            {stageText}
          </p>
        </div>

        {funFact?.text && (
          <article
            role="status"
            aria-live="polite"
            data-testid="mystery-loader-fun-fact"
            className="bg-white/85 dark:bg-gray-800/85 border border-amber-200 dark:border-amber-700 rounded-2xl p-5 shadow-md"
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Did you know?
              </p>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {factSource === 'api' ? 'Topic fact' : 'Case file fact'}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">{funFact.emoji || '💡'}</span>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{funFact.text}</p>
            </div>
          </article>
        )}

      </div>
    </div>
  )
}

MysteryLoader.propTypes = {
  stageText: PropTypes.string.isRequired,
  funFact: PropTypes.shape({
    emoji: PropTypes.string,
    text: PropTypes.string,
  }),
  factSource: PropTypes.oneOf(['local', 'api']),
}

