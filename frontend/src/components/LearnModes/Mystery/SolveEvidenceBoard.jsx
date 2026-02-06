/**
 * SolveEvidenceBoard - Connect clues to concepts
 *
 * Tap-tap interaction: select a clue, then tap a concept to connect.
 * Color-coded connections with remove functionality.
 * Submit enabled only when all clues are connected.
 */

import { useState, useCallback } from 'react'
import { vibrateShort } from '../../../utils/haptics'

// Color palette for connections
const COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-400', text: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-400 text-white' },
  { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-400', text: 'text-green-700 dark:text-green-300', badge: 'bg-green-400 text-white' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-400', text: 'text-purple-700 dark:text-purple-300', badge: 'bg-purple-400 text-white' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-400', text: 'text-orange-700 dark:text-orange-300', badge: 'bg-orange-400 text-white' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-400', text: 'text-pink-700 dark:text-pink-300', badge: 'bg-pink-400 text-white' }
]

/**
 * @param {Object} props
 * @param {string[]} props.clues - Array of clue texts
 * @param {string[]} props.expectedConcepts - Array of concept names
 * @param {Function} props.onSubmit - Callback with connections array [{clueIndex, concept}]
 */
export default function SolveEvidenceBoard({ clues = [], expectedConcepts = [], onSubmit }) {
  // Map<clueIndex, concept>
  const [connections, setConnections] = useState(new Map())
  const [selectedClueIndex, setSelectedClueIndex] = useState(null)

  const handleSelectClue = useCallback(
    (index) => {
      vibrateShort()
      setSelectedClueIndex((prev) => (prev === index ? null : index))
    },
    []
  )

  const handleSelectConcept = useCallback(
    (concept) => {
      if (selectedClueIndex === null) return

      vibrateShort()

      // Create new Map with the connection
      setConnections((prev) => {
        const newMap = new Map(prev)
        newMap.set(selectedClueIndex, concept)
        return newMap
      })

      // Clear selection
      setSelectedClueIndex(null)
    },
    [selectedClueIndex]
  )

  const handleRemoveConnection = useCallback((clueIndex, e) => {
    e.stopPropagation()
    vibrateShort()

    setConnections((prev) => {
      const newMap = new Map(prev)
      newMap.delete(clueIndex)
      return newMap
    })
  }, [])

  const handleSubmit = useCallback(() => {
    if (connections.size !== clues.length) return

    // Convert Map to array format
    const connectionsArray = Array.from(connections.entries()).map(
      ([clueIndex, concept]) => ({
        clueIndex,
        concept
      })
    )

    onSubmit?.(connectionsArray)
  }, [connections, clues.length, onSubmit])

  const getConceptColor = (concept) => {
    const index = expectedConcepts.indexOf(concept)
    return COLORS[index % COLORS.length]
  }

  const getClueStyle = (index) => {
    const connection = connections.get(index)
    const isSelected = selectedClueIndex === index

    if (connection) {
      const color = getConceptColor(connection)
      return `${color.bg} ${color.border} border-2`
    }

    if (isSelected) {
      return 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 border-2'
    }

    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 border-2 hover:bg-gray-50 dark:hover:bg-gray-750'
  }

  const allConnected = connections.size === clues.length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-purple-200 dark:border-purple-700 shadow-lg">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🔗</span>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Evidence Board
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connect each clue to a concept
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {selectedClueIndex !== null
            ? '👆 Now tap a concept below to make the connection'
            : '👆 Tap a clue, then tap a concept to connect them'}
        </p>
      </div>

      {/* Clues Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Clues ({connections.size}/{clues.length} connected)
        </h4>
        <div className="space-y-3">
          {clues.map((clue, index) => {
            const connection = connections.get(index)
            const color = connection ? getConceptColor(connection) : null

            return (
              <button
                key={index}
                onClick={() => handleSelectClue(index)}
                className={`w-full flex flex-col gap-2 p-4 rounded-xl min-h-[80px] transition-all duration-200 text-left ${getClueStyle(
                  index
                )}`}
              >
                <p className="text-gray-800 dark:text-gray-100 leading-relaxed">
                  {clue}
                </p>
                {connection && color && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${color.badge}`}
                    >
                      {connection}
                      <button
                        onClick={(e) => handleRemoveConnection(index, e)}
                        className="hover:scale-110 transition-transform"
                        aria-label="Remove connection"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Concepts Section */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Concepts
        </h4>
        <div className="flex flex-wrap gap-2">
          {expectedConcepts.map((concept, index) => {
            const color = COLORS[index % COLORS.length]
            const isDisabled = selectedClueIndex === null

            return (
              <button
                key={index}
                onClick={() => handleSelectConcept(concept)}
                disabled={isDisabled}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[44px] ${
                  isDisabled
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : `${color.bg} ${color.text} hover:scale-105 active:scale-95`
                }`}
              >
                {concept}
              </button>
            )
          })}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!allConnected}
        className="w-full py-3 rounded-full font-medium bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:shadow-xl enabled:transform enabled:hover:scale-105 enabled:active:scale-95"
      >
        {allConnected ? 'Submit Evidence' : `Connect ${clues.length - connections.size} more clue${clues.length - connections.size !== 1 ? 's' : ''}`}
      </button>
    </div>
  )
}
