/**
 * SolveFillBlank - Fill-in-the-blank sentence completion
 *
 * Parse sentence by "___" delimiter, render inline blank buttons.
 * Word bank below with tap-to-fill interaction.
 * Used words are disabled and removed from available options.
 */

import { useState, useCallback } from 'react'
import { vibrateShort } from '../../../utils/haptics'

/**
 * @param {Object} props
 * @param {Object} props.fillBlanks - Fill-in-the-blank configuration
 * @param {string} props.fillBlanks.sentence - Sentence with "___" placeholders
 * @param {string[]} props.fillBlanks.blanks - Expected answers (for ordering)
 * @param {string[]} props.fillBlanks.wordBank - Available words to choose from
 * @param {Function} props.onSubmit - Callback with userBlanks array
 * @param {boolean} props.disabled - Prevents interaction when true
 */
export default function SolveFillBlank({ fillBlanks, onSubmit, disabled = false }) {
  const { sentence = '', blanks = [], wordBank = [] } = fillBlanks || {}

  // Array of selected words for each blank position
  const [selectedWords, setSelectedWords] = useState(Array(blanks.length).fill(null))
  const [selectedBlankIndex, setSelectedBlankIndex] = useState(null)

  // Parse sentence into parts (text and blanks)
  const parts = sentence.split('___')

  const handleSelectBlank = useCallback((index) => {
    if (disabled) return
    vibrateShort()
    setSelectedBlankIndex((prev) => (prev === index ? null : index))
  }, [disabled])

  const handleSelectWord = useCallback(
    (word) => {
      if (disabled) return
      if (selectedBlankIndex === null) return

      // Check if word is already used
      if (selectedWords.includes(word)) return

      vibrateShort()

      // Fill the blank with the word
      setSelectedWords((prev) => {
        const newWords = [...prev]
        newWords[selectedBlankIndex] = word
        return newWords
      })

      // Clear blank selection
      setSelectedBlankIndex(null)
    },
    [selectedBlankIndex, selectedWords, disabled]
  )

  const handleRemoveWord = useCallback((index) => {
    if (disabled) return
    vibrateShort()

    setSelectedWords((prev) => {
      const newWords = [...prev]
      newWords[index] = null
      return newWords
    })

    setSelectedBlankIndex(null)
  }, [disabled])

  const handleSubmit = useCallback(() => {
    if (disabled) return
    if (selectedWords.some((word) => word === null)) return

    onSubmit?.(selectedWords)
  }, [selectedWords, onSubmit, disabled])

  const allFilled = selectedWords.every((word) => word !== null)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-700 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">✏️</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Complete the Theory
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Fill in the blanks with the correct words
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {selectedBlankIndex !== null
            ? '👆 Tap a word below to fill the blank'
            : '👆 Tap a blank space, then choose a word'}
        </p>
      </div>

      {/* Sentence with Blanks */}
      <div className="mb-6 p-5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
        <div className="flex flex-wrap items-center gap-2 text-base leading-relaxed">
          {parts.map((part, index) => (
            <div key={index} className="contents">
              {part && (
                <span className="text-gray-800 dark:text-gray-100">{part}</span>
              )}
              {index < blanks.length && (
                <button
                  onClick={() =>
                    selectedWords[index]
                      ? handleRemoveWord(index)
                      : handleSelectBlank(index)
                  }
                  disabled={disabled}
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium min-w-[120px] min-h-[44px] transition-all duration-200 ${
                    selectedWords[index]
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : selectedBlankIndex === index
                        ? 'bg-purple-500 text-white'
                        : 'bg-white dark:bg-gray-700 border-2 border-dashed border-purple-400 dark:border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
                  }`}
                >
                  {selectedWords[index] || '___'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Word Bank */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Word Bank
        </h4>
        <div className="flex flex-wrap gap-2">
          {wordBank.map((word, index) => {
            const isUsed = selectedWords.includes(word)
            const isDisabled = selectedBlankIndex === null || isUsed

            return (
              <button
                key={index}
                onClick={() => handleSelectWord(word)}
                disabled={isDisabled}
                className={`px-4 py-2 rounded-full text-sm font-medium min-h-[44px] transition-all duration-200 ${
                  isUsed
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 opacity-40 cursor-not-allowed line-through'
                    : isDisabled
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-400 hover:text-white dark:hover:bg-blue-400 hover:scale-105 active:scale-95'
                }`}
              >
                {word}
              </button>
            )
          })}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={disabled || !allFilled}
        className="w-full py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:shadow-xl enabled:transform enabled:hover:scale-105 enabled:active:scale-95"
      >
        {allFilled ? 'Check Answer' : `Fill ${selectedWords.filter((w) => w === null).length} more blank${selectedWords.filter((w) => w === null).length !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
