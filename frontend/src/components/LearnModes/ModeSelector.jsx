/**
 * ModeSelector - Choose learning mode after slideshow
 *
 * Presents 3 engaging learning modes as alternatives to traditional quiz:
 * - Mystery Lab: Solve detective-style puzzles
 * - Wonder Lab: Explore "what if?" scenarios
 * - Story Studio: Create illustrated stories
 */

import { useState } from 'react'
import { vibrateShort } from '../../utils/haptics'
import { playSelectSound } from '../../utils/soundEffects'

/**
 * @param {Object} props
 * @param {Array} props.slides - Content slides from the lesson
 * @param {string} props.topicName - Name of the topic learned
 * @param {string} props.explanationLevel - 'simple' | 'standard' | 'deep'
 * @param {Function} props.onModeSelect - Callback when mode selected (mode: 'mystery' | 'whatif' | 'story')
 * @param {Function} props.onSkip - Callback to skip and return to main view
 */
export default function ModeSelector({
  slides = [],
  topicName = '',
  explanationLevel = 'standard',
  onModeSelect,
  onSkip,
}) {
  const [selectedMode, setSelectedMode] = useState(null)

  const modes = [
    {
      id: 'mystery',
      icon: '🔍',
      title: 'Mystery Lab',
      description: 'Solve a puzzle',
      color: 'from-purple-500 to-indigo-600',
      hoverColor: 'hover:from-purple-600 hover:to-indigo-700',
    },
    {
      id: 'whatif',
      icon: '🌟',
      title: 'Wonder Lab',
      description: '"What if?" scenarios',
      color: 'from-blue-500 to-cyan-600',
      hoverColor: 'hover:from-blue-600 hover:to-cyan-700',
    },
    {
      id: 'story',
      icon: '📖',
      title: 'Story Studio',
      description: 'Create your own story',
      color: 'from-pink-500 to-rose-600',
      hoverColor: 'hover:from-pink-600 hover:to-rose-700',
    },
  ]

  const handleModeClick = (modeId) => {
    if (selectedMode) return // Prevent double-click

    vibrateShort()
    playSelectSound()
    setSelectedMode(modeId)

    // Brief delay for visual feedback, then trigger callback
    setTimeout(() => {
      onModeSelect?.(modeId)
    }, 200)
  }

  const handleSkip = () => {
    vibrateShort()
    playSelectSound()
    onSkip?.()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950">
      {/* Header */}
      <div className="text-center mb-8 max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Nice learning!
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          How would you like to explore what you learned?
        </p>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-8">
        {modes.map((mode) => {
          const isSelected = selectedMode === mode.id
          const isDisabled = selectedMode && selectedMode !== mode.id

          return (
            <button
              key={mode.id}
              onClick={() => handleModeClick(mode.id)}
              disabled={isDisabled}
              className={`
                group relative overflow-hidden
                rounded-2xl p-6 text-left
                transition-all duration-300
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected ? 'scale-105 shadow-2xl' : 'hover:scale-105 hover:shadow-xl'}
                ${isSelected ? 'ring-4 ring-white dark:ring-gray-700' : ''}
              `}
              style={{
                minHeight: '180px',
              }}
            >
              {/* Gradient Background */}
              <div
                className={`
                  absolute inset-0 bg-gradient-to-br ${mode.color}
                  transition-all duration-300
                  ${!isDisabled && !isSelected ? mode.hoverColor : ''}
                  ${isSelected ? 'opacity-100' : 'opacity-90'}
                `}
              />

              {/* Loading Spinner Overlay */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Icon */}
                <div className="text-6xl mb-4 transform transition-transform group-hover:scale-110">
                  {mode.icon}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2">
                  {mode.title}
                </h3>

                {/* Description */}
                <p className="text-white/90 text-sm">
                  {mode.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        disabled={!!selectedMode}
        className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Skip for now
      </button>
    </div>
  )
}
