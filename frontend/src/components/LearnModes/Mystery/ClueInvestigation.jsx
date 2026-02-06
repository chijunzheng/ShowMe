/**
 * ClueInvestigation - Step-through clue viewer for Mystery Lab
 *
 * Displays clues one at a time with progress tracking.
 * Previous clues are collapsed above, current clue is highlighted.
 * Inline slide references are shown when available.
 */

import { useState, useEffect } from 'react'
import { vibrateShort } from '../../../utils/haptics'
import SlideReference from './SlideReference'

/**
 * @param {Object} props
 * @param {Array<{text: string, narratorText: string, slideRef?: number}>} props.clues - Array of clue objects
 * @param {Array<{imageUrl: string, subtitle?: string}>} props.slides - Lesson slides for references
 * @param {number} props.currentClueIndex - Which clue is shown (0-based)
 * @param {boolean} props.isTtsPlaying - Whether TTS is currently playing
 * @param {Function} props.onNextClue - "Next Clue" callback
 * @param {Function} props.onReadyToSolve - "Ready to Solve!" on final clue
 */
export default function ClueInvestigation({
  clues = [],
  slides = [],
  currentClueIndex = 0,
  isTtsPlaying = false,
  onNextClue,
  onReadyToSolve,
}) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Trigger fade transition when clue index changes
  // MUST be called before any conditional returns (React Rules of Hooks)
  useEffect(() => {
    if (clues.length === 0) return

    setIsTransitioning(true)
    const timeout = setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
    return () => clearTimeout(timeout)
  }, [currentClueIndex, clues.length])

  // Handle edge case: empty clues array
  if (clues.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6 py-12">
        <div className="text-center">
          <p className="text-lg text-gray-500 dark:text-gray-400">
            No clues available
          </p>
        </div>
      </div>
    )
  }

  const totalClues = clues.length
  const isLastClue = currentClueIndex === totalClues - 1
  const currentClue = clues[currentClueIndex]

  const handleNextClick = () => {
    vibrateShort()
    if (isLastClue) {
      onReadyToSolve()
    } else {
      onNextClue()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-950">
      <div className="max-w-2xl w-full space-y-6">
        {/* Progress Indicator */}
        <div className="text-center">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
            Clue {currentClueIndex + 1} of {totalClues}
          </p>
        </div>

        {/* Previous Clues - Collapsed */}
        {currentClueIndex > 0 && (
          <div className="space-y-3">
            {clues.slice(0, currentClueIndex).map((clue, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 opacity-60"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 text-white flex items-center justify-center font-bold text-xs">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {clue.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current Clue - Highlighted with fade transition */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-purple-400 dark:border-purple-500 shadow-xl transition-opacity duration-300 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
              {currentClueIndex + 1}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔎</span>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  Current Clue
                </h3>
              </div>
              <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                {currentClue.text}
              </p>
            </div>
          </div>

          {/* Inline Slide Reference */}
          {currentClue.slideRef && (
            <div className="mt-6 pl-14">
              <SlideReference
                slideRef={currentClue.slideRef}
                slides={slides}
                caption={`Reference: Slide ${currentClue.slideRef}`}
              />
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={handleNextClick}
          disabled={isTtsPlaying}
          className={`w-full px-8 py-4 rounded-full font-medium text-lg shadow-lg transform transition-all duration-200 ${
            isTtsPlaying
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : isLastClue
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
              : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-xl hover:scale-105 active:scale-95'
          }`}
        >
          {isTtsPlaying
            ? 'Narrating...'
            : isLastClue
            ? '🎯 Ready to Solve!'
            : 'Next Clue'}
        </button>

        {/* Progress Dots */}
        {totalClues > 1 && (
          <div className="flex justify-center gap-2 pt-2">
            {clues.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentClueIndex
                    ? 'w-8 bg-purple-600 dark:bg-purple-400'
                    : index < currentClueIndex
                    ? 'w-2 bg-gray-400 dark:bg-gray-600'
                    : 'w-2 bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
