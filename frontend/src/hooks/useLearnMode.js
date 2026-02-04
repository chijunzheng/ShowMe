/**
 * useLearnMode - Hook for managing learning mode state
 *
 * Handles selection of learning modes (mystery, whatif, story)
 * and loading of mode-specific content from API
 */

import { useState, useCallback } from 'react'
import logger from '../utils/logger'

/**
 * @param {Object} params
 * @param {Array} params.slides - Content slides for the topic
 * @param {string} params.topicName - Topic name
 * @param {string} params.explanationLevel - Difficulty level
 */
export default function useLearnMode({ slides = [], topicName = '', explanationLevel = 'standard' }) {
  const [selectedMode, setSelectedMode] = useState(null)
  const [modeContent, setModeContent] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Select a learning mode and fetch its content
   * @param {'mystery' | 'whatif' | 'story'} mode
   */
  const selectMode = useCallback(async (mode) => {
    if (!mode || !['mystery', 'whatif', 'story'].includes(mode)) {
      logger.error('LEARN_MODE', 'Invalid mode selected', { mode })
      return
    }

    setSelectedMode(mode)
    setIsLoading(true)
    setError(null)

    try {
      // Prepare slides payload
      const slidesPayload = slides
        .filter(s => s.type !== 'header' && s.type !== 'suggestions')
        .map(slide => ({
          subtitle: typeof slide.subtitle === 'string' ? slide.subtitle : '',
          script: typeof slide.script === 'string' ? slide.script : '',
        }))
        .filter(slide => slide.subtitle || slide.script)

      if (slidesPayload.length === 0) {
        throw new Error('No content slides available')
      }

      // Map mode to API endpoint
      const endpointMap = {
        mystery: '/api/learn/mystery',
        whatif: '/api/learn/whatif',
        story: '/api/learn/story',
      }

      const response = await fetch(endpointMap[mode], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: slidesPayload,
          topicName,
          explanationLevel,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Failed to load ${mode} mode`)
      }

      const data = await response.json()
      setModeContent(data)

      logger.info('LEARN_MODE', `Loaded ${mode} content`, { topicName })
    } catch (err) {
      logger.error('LEARN_MODE', `Failed to load ${mode}`, { error: err.message })
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [slides, topicName, explanationLevel])

  /**
   * Reset mode state (e.g., when user goes back)
   */
  const resetMode = useCallback(() => {
    setSelectedMode(null)
    setModeContent(null)
    setError(null)
  }, [])

  return {
    selectedMode,
    modeContent,
    isLoading,
    error,
    selectMode,
    resetMode,
  }
}
