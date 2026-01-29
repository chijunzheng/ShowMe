/**
 * useSocraticHandlers - Custom hook for Socratic mode handlers
 * Extracts Socratic mode logic from App.jsx to reduce complexity
 */
import { useCallback } from 'react'
import { UI_STATE } from '../constants/appConfig.js'

/**
 * @param {Object} params - Hook parameters
 * @param {Function} params.setUiState - Setter for UI state
 * @param {Function} params.setSocraticSlides - Setter for Socratic slides
 * @param {Function} params.recordSocraticAnswered - Gamification tracker for Socratic answers
 * @param {Object} params.handleQuestionRef - Ref to handleQuestion function
 * @returns {Object} Socratic handler functions
 */
export default function useSocraticHandlers({
  setUiState,
  setSocraticSlides,
  recordSocraticAnswered,
  handleQuestionRef,
}) {
  /**
   * SOCRATIC-003: Handle Socratic mode completion
   */
  const handleSocraticComplete = useCallback(() => {
    setUiState(UI_STATE.HOME)
    setSocraticSlides([])
  }, [setUiState, setSocraticSlides])

  /**
   * SOCRATIC-003: Handle Socratic skip
   */
  const handleSocraticSkip = useCallback(() => {
    setUiState(UI_STATE.HOME)
    setSocraticSlides([])
  }, [setUiState, setSocraticSlides])

  /**
   * SOCRATIC-003: Handle follow-up from Socratic feedback
   */
  const handleSocraticFollowUp = useCallback((question) => {
    setUiState(UI_STATE.LISTENING)
    setSocraticSlides([])
    // Record Socratic answer for gamification
    recordSocraticAnswered()
    // Trigger the follow-up question
    const runHandleQuestion = handleQuestionRef.current
    if (runHandleQuestion) {
      runHandleQuestion(question)
    }
  }, [setUiState, setSocraticSlides, recordSocraticAnswered, handleQuestionRef])

  return {
    handleSocraticComplete,
    handleSocraticSkip,
    handleSocraticFollowUp,
  }
}
