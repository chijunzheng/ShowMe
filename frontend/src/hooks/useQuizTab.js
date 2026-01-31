/**
 * useQuizTab Hook
 * Manages Quiz Tab state for the dedicated quiz experience
 *
 * States:
 * - home: Quiz home screen with mode selection
 * - active: Active quiz in progress
 * - results: Quiz results display
 */

import { useState, useCallback } from 'react'

export function useQuizTab() {
  // Quiz tab screen state: 'home' | 'active' | 'results'
  const [quizTabState, setQuizTabState] = useState('home')

  // Selected quiz mode (review, challenge, etc.)
  const [selectedQuizMode, setSelectedQuizMode] = useState(null)

  // Selected topic for quiz
  const [selectedQuizTopic, setSelectedQuizTopic] = useState(null)

  /**
   * Start a quiz with specified mode and topic
   */
  const startQuiz = useCallback(({ mode, topic }) => {
    setSelectedQuizMode(mode)
    setSelectedQuizTopic(topic)
    setQuizTabState('active')
  }, [])

  /**
   * Complete quiz and show results
   */
  const completeQuiz = useCallback(() => {
    setQuizTabState('results')
  }, [])

  /**
   * Return to quiz home screen
   */
  const returnToQuizHome = useCallback(() => {
    setQuizTabState('home')
    setSelectedQuizMode(null)
    setSelectedQuizTopic(null)
  }, [])

  /**
   * Reset quiz state entirely
   */
  const resetQuizTab = useCallback(() => {
    setQuizTabState('home')
    setSelectedQuizMode(null)
    setSelectedQuizTopic(null)
  }, [])

  return {
    quizTabState,
    setQuizTabState,
    selectedQuizMode,
    setSelectedQuizMode,
    selectedQuizTopic,
    setSelectedQuizTopic,

    startQuiz,
    completeQuiz,
    returnToQuizHome,
    resetQuizTab,
  }
}

export default useQuizTab
