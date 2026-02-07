/**
 * ConceptTracker - Live concept checklist that updates as concepts are detected
 *
 * Shows which concepts have been used in the story so far.
 */

/**
 * @param {Object} props
 * @param {Array} props.conceptChecklist - All concepts to track
 * @param {Set} props.checkedConcepts - Set of concepts that have been detected
 */
export default function ConceptTracker({ conceptChecklist = [], checkedConcepts = new Set() }) {
  const usedCount = checkedConcepts.size
  const totalCount = conceptChecklist.length
  const allUsed = usedCount === totalCount && totalCount > 0

  return (
    <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border-2 border-gray-200 dark:border-slate-700 shadow-lg sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          ✓ Concepts
        </h3>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {usedCount} / {totalCount}
        </span>
      </div>

      {conceptChecklist.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No concepts to track
        </p>
      ) : (
        <div className="space-y-3">
          {conceptChecklist.map((concept, index) => {
            const isChecked = checkedConcepts.has(concept)

            return (
              <div
                key={index}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                  ${isChecked
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600'
                  }
                `}
              >
                <div
                  className={`
                    w-5 h-5 rounded flex items-center justify-center transition-all duration-300
                    ${isChecked
                      ? 'bg-green-500 dark:bg-green-600 text-white'
                      : 'border-2 border-gray-300 dark:border-gray-600'
                    }
                  `}
                >
                  {isChecked && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )}
                </div>
                <span
                  className={`
                    text-sm font-medium transition-colors duration-300
                    ${isChecked
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {concept}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* All concepts used celebration */}
      {allUsed && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg animate-pulse">
          <p className="text-sm text-yellow-800 dark:text-yellow-300 text-center font-medium flex items-center justify-center gap-2">
            <span>🌟</span>
            <span>All concepts used!</span>
            <span>🌟</span>
          </p>
        </div>
      )}

      {/* Encouragement */}
      {!allUsed && usedCount > 0 && (
        <div className="mt-4 p-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Keep going! Try to use all concepts.
          </p>
        </div>
      )}
    </div>
  )
}
