/**
 * StoryChoiceCard - Individual story choice card with tap interaction
 *
 * Shows emoji + narrative text with concept hints.
 * Supports selected, disabled, and default states with animations.
 */

import PropTypes from 'prop-types'
import { vibrateShort } from '../../../utils/haptics'
import { playSelectSound } from '../../../utils/soundEffects'

export default function StoryChoiceCard({ choice, isSelected = false, isDisabled = false, onSelect }) {
  const handleTap = () => {
    if (isDisabled || isSelected) return
    vibrateShort()
    playSelectSound()
    onSelect?.(choice)
  }

  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={isDisabled}
      className={`
        w-full p-4 rounded-2xl border-2 text-left
        transition-all duration-200 ease-out
        ${isSelected
          ? 'border-pink-500 dark:border-pink-400 bg-pink-50 dark:bg-pink-900/20 shadow-lg shadow-pink-200/50 dark:shadow-pink-900/30 scale-[1.02]'
          : isDisabled
            ? 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed'
            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-pink-300 dark:hover:border-pink-600 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Emoji */}
        <span className="text-3xl flex-shrink-0 mt-0.5">{choice.emoji || '📖'}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-base leading-relaxed ${
            isSelected
              ? 'text-pink-800 dark:text-pink-200 font-medium'
              : 'text-gray-700 dark:text-gray-300'
          }`}>
            {choice.text}
          </p>

          {/* Concept hints */}
          {choice.conceptHints && choice.conceptHints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {choice.conceptHints.map((hint, index) => (
                <span
                  key={index}
                  className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800"
                >
                  {hint}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
            </svg>
          </div>
        )}
      </div>
    </button>
  )
}

StoryChoiceCard.propTypes = {
  choice: PropTypes.shape({
    id: PropTypes.string,
    emoji: PropTypes.string,
    text: PropTypes.string.isRequired,
    conceptHints: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  isSelected: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onSelect: PropTypes.func,
}
