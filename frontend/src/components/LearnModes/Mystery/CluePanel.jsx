/**
 * CluePanel - Display collapsible clues panel
 *
 * Shows clues that reference specific slides from the lesson.
 * Each clue includes a reference to which slide it comes from.
 */

import { useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'

/**
 * @param {Object} props
 * @param {Array} props.clues - Array of {text: string, slideRef: number} clues
 * @param {Array} props.slides - Original lesson slides for reference
 */
export default function CluePanel({ clues = [], slides = [] }) {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = () => {
    vibrateShort()
    setIsExpanded(prev => !prev)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 shadow-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔎</span>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Clues ({clues.length})
          </h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Clues List */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-5 space-y-4">
          {clues.map((clue, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-1">
                  {clue.text}
                </p>
                {clue.slideRef !== undefined && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    📌 From Slide {clue.slideRef}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
