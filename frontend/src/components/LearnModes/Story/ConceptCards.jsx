/**
 * ConceptCards - Visual concept badges for Story Studio
 *
 * Two modes:
 * - Full: larger cards in a grid with icon, name, description
 * - Compact: small horizontal badges
 *
 * Found concepts are highlighted in green.
 */

import PropTypes from 'prop-types'

export default function ConceptCards({ conceptCards = [], conceptsFound = new Set(), compact = false }) {
  if (conceptCards.length === 0) return null

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {conceptCards.map((card, index) => {
          const isFound = conceptsFound.has(card.concept)
          return (
            <span
              key={index}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                transition-colors duration-300
                ${isFound
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-600'
                }
              `}
            >
              <span>{card.icon || '📝'}</span>
              <span>{card.concept}</span>
              {isFound && <span className="text-green-500">✓</span>}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {conceptCards.map((card, index) => {
        const isFound = conceptsFound.has(card.concept)
        return (
          <div
            key={index}
            className={`
              p-3 rounded-xl border-2 transition-all duration-300 text-center
              ${isFound
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
              }
            `}
          >
            <div className="text-2xl mb-1">{card.icon || '📝'}</div>
            <p className={`text-sm font-semibold ${
              isFound ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-gray-100'
            }`}>
              {card.concept}
            </p>
            {card.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {card.description}
              </p>
            )}
            {isFound && (
              <span className="inline-block mt-1 text-xs text-green-500 font-medium">Found!</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

ConceptCards.propTypes = {
  conceptCards: PropTypes.arrayOf(PropTypes.shape({
    concept: PropTypes.string.isRequired,
    icon: PropTypes.string,
    description: PropTypes.string,
  })),
  conceptsFound: PropTypes.instanceOf(Set),
  compact: PropTypes.bool,
}
