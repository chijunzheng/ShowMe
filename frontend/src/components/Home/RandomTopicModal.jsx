/**
 * RandomTopicModal Component
 * Displays a random AI-generated topic and lets user select complexity level
 *
 * Features:
 * - Loading state while fetching random topic
 * - Topic reveal with emoji and category
 * - Level selection buttons (Simple, Standard, Deep)
 * - "Try Another" button for new topic
 * - Backdrop click to close
 */

import { useState, useEffect, useCallback } from 'react'
import { LEVEL_CONFIG, EXPLANATION_LEVEL } from '../../constants/appConfig.js'

const API_BASE = import.meta.env.VITE_API_URL || ''

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Called when modal should close
 * @param {Function} props.onSelectLevel - Called with (topic, level) when user selects a level
 */
export default function RandomTopicModal({
  isOpen,
  onClose,
  onSelectLevel,
}) {
  const [topic, setTopic] = useState(null)
  const [category, setCategory] = useState(null)
  const [emoji, setEmoji] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch a random topic from the API
  const fetchRandomTopic = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE}/api/random-topic`)

      if (!response.ok) {
        throw new Error('Failed to fetch random topic')
      }

      const data = await response.json()
      setTopic(data.topic)
      setCategory(data.category || 'General')
      setEmoji(data.emoji || '✨')
    } catch (err) {
      console.error('[RandomTopicModal] Fetch error:', err)
      setError('Oops! Could not get a random topic. Try again?')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on open
  useEffect(() => {
    if (isOpen && !topic && !isLoading) {
      fetchRandomTopic()
    }
  }, [isOpen, topic, isLoading, fetchRandomTopic])

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow close animation
      const timer = setTimeout(() => {
        setTopic(null)
        setCategory(null)
        setEmoji(null)
        setError(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Handle level selection
  function handleLevelSelect(level) {
    if (topic) {
      onSelectLevel(topic, level)
    }
  }

  // Handle backdrop click
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={`
        fixed inset-0 z-50
        bg-black/50 backdrop-blur-sm
        flex items-center justify-center
        p-4
        animate-fade-in
      `}
      onClick={handleBackdropClick}
    >
      <div
        className={`
          w-full max-w-md
          bg-white dark:bg-slate-800
          rounded-2xl
          shadow-2xl
          overflow-hidden
          animate-scale-in
        `}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span>🎲</span>
              Surprise Me!
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Loading state */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Finding something interesting...</p>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={fetchRandomTopic}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Topic display */}
          {topic && !isLoading && !error && (
            <>
              {/* Topic card */}
              <div className="text-center mb-6">
                <div className="text-5xl mb-3 animate-bounce-once">
                  {emoji}
                </div>
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                  {category}
                </p>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  {topic}
                </h3>
              </div>

              {/* Level selection */}
              <p className="text-sm text-gray-500 text-center mb-4">
                Pick your depth:
              </p>

              <div className="space-y-2">
                {Object.entries(LEVEL_CONFIG).map(([level, config]) => (
                  <button
                    key={level}
                    onClick={() => handleLevelSelect(level)}
                    className={`
                      w-full p-3 rounded-xl
                      flex items-center gap-3
                      bg-gray-50 dark:bg-slate-700
                      hover:bg-primary-50 dark:hover:bg-primary-900/30
                      border-2 border-transparent hover:border-primary-300 dark:hover:border-primary-600
                      transition-all duration-200
                      active:scale-[0.98]
                    `}
                  >
                    <span className="text-2xl">{config.icon}</span>
                    <div className="text-left flex-1">
                      <span className="font-medium text-gray-800 dark:text-gray-100">
                        {config.title}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {config.description}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Try another */}
              <button
                onClick={fetchRandomTopic}
                className="w-full mt-4 py-2 text-sm text-primary-500 hover:text-primary-600 transition-colors"
              >
                🔄 Try another topic
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
