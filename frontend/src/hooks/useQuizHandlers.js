/**
 * useQuizHandlers - Custom hook for quiz-related handlers
 * Extracts quiz flow logic from App.jsx to reduce complexity
 */
import { useCallback } from 'react'
import { UI_STATE } from '../constants/appConfig.js'
import logger from '../utils/logger.js'

/**
 * @param {Object} params - Hook parameters
 * @param {Object} params.activeTopic - Currently active topic
 * @param {string} params.wsClientId - WebSocket client ID
 * @param {Object} params.visibleSlidesRef - Ref to visible slides
 * @param {Function} params.setIsLoadingQuiz - Setter for quiz loading state
 * @param {Function} params.setQuizTopicId - Setter for quiz topic ID
 * @param {Function} params.setQuizTopicName - Setter for quiz topic name
 * @param {Function} params.setQuizQuestions - Setter for quiz questions
 * @param {Function} params.setQuizResults - Setter for quiz results
 * @param {Function} params.setUiState - Setter for UI state
 * @param {Function} params.setUnlockedPiece - Setter for unlocked piece
 * @param {Function} params.setShowPieceCelebration - Setter for piece celebration visibility
 * @param {Function} params.setWorldBadge - Setter for world badge count
 * @param {Function} params.setTierUpgradeInfo - Setter for tier upgrade info
 * @param {Function} params.setShowTierCelebration - Setter for tier celebration visibility
 * @param {Function} params.setActiveTab - Setter for active tab
 * @param {Function} params.refreshWorldStats - Function to refresh world stats
 * @param {string} params.quizTopicId - Current quiz topic ID
 * @param {string} params.quizTopicName - Current quiz topic name
 * @param {Object|null} params.tierUpgradeInfo - Tier upgrade info if pending
 * @returns {Object} Quiz handler functions
 */
export default function useQuizHandlers({
  activeTopic,
  wsClientId,
  visibleSlidesRef,
  setIsLoadingQuiz,
  setQuizTopicId,
  setQuizTopicName,
  setQuizQuestions,
  setQuizResults,
  setUiState,
  setUnlockedPiece,
  setShowPieceCelebration,
  setWorldBadge,
  setTierUpgradeInfo,
  setShowTierCelebration,
  setActiveTab,
  refreshWorldStats,
  quizTopicId,
  quizTopicName,
  tierUpgradeInfo,
}) {
  /**
   * WB018: Start quiz flow - fetch questions from API
   */
  const handleStartQuiz = useCallback(async () => {
    if (!activeTopic) return

    setIsLoadingQuiz(true)
    setQuizTopicId(activeTopic.id)
    setQuizTopicName(activeTopic.name || 'this topic')

    try {
      // Get content slides for quiz generation
      const contentSlides = visibleSlidesRef.current?.filter(s => s.type !== 'header' && s.type !== 'suggestions') || []
      if (contentSlides.length === 0) {
        throw new Error('No content slides available for quiz')
      }

      const slidesPayload = contentSlides
        .map(slide => ({
          subtitle: typeof slide.subtitle === 'string' ? slide.subtitle : '',
          script: typeof slide.script === 'string' ? slide.script : '',
        }))
        .filter(slide => slide.subtitle || slide.script)

      if (slidesPayload.length === 0) {
        throw new Error('No usable slide text available for quiz')
      }

      const languageSample = slidesPayload.find(slide => slide.subtitle || slide.script)
      const languageText = languageSample?.subtitle || languageSample?.script || ''
      const language = /[\u4e00-\u9fff]/.test(languageText) ? 'zh' : 'en'

      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: slidesPayload,
          topicName: activeTopic.name || 'this topic',
          language,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || 'Failed to generate quiz')
      }

      const data = await response.json()
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Quiz generation returned no questions')
      }
      setQuizQuestions(data.questions || [])
      setUiState(UI_STATE.QUIZ)
    } catch (error) {
      logger.error('QUIZ', 'Failed to generate quiz', { error: error.message })
      setQuizQuestions([])
      setUiState(UI_STATE.QUIZ_PROMPT)
    } finally {
      setIsLoadingQuiz(false)
    }
  }, [activeTopic, visibleSlidesRef, setIsLoadingQuiz, setQuizTopicId, setQuizTopicName, setQuizQuestions, setUiState])

  /**
   * WB018: Handle quiz completion - evaluate and potentially unlock piece
   */
  const handleQuizComplete = useCallback(async (results) => {
    setQuizResults(results)

    // Check if user passed (>= 60% score)
    const passed = results.percentage >= 60

    if (passed && quizTopicId) {
      try {
        // Evaluate quiz and unlock piece via API
        const response = await fetch('/api/quiz/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: quizTopicId,
            topicName: quizTopicName,
            results,
            clientId: wsClientId,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.piece) {
            setUnlockedPiece(data.piece)
            setShowPieceCelebration(true)
            // Increment world badge for new piece notification
            setWorldBadge(prev => prev + 1)
          }
          // UI008: Handle tier upgrade celebration
          if (data.tierUpgrade) {
            setTierUpgradeInfo(data.tierUpgrade)
            // Delay tier celebration to show after piece celebration if both occur
            if (!data.piece) {
              setShowTierCelebration(true)
            }
          }
        }
      } catch (error) {
        logger.error('QUIZ', 'Failed to evaluate quiz', { error: error.message })
      }
    }

    setUiState(UI_STATE.QUIZ_RESULTS)
  }, [quizTopicId, quizTopicName, wsClientId, setQuizResults, setUiState, setUnlockedPiece, setShowPieceCelebration, setWorldBadge, setTierUpgradeInfo, setShowTierCelebration])

  /**
   * WB018: Handle quiz skip
   */
  const handleQuizSkip = useCallback(() => {
    setQuizQuestions([])
    setQuizResults(null)
    setUiState(UI_STATE.HOME)
  }, [setQuizQuestions, setQuizResults, setUiState])

  /**
   * WB018: Handle quiz prompt skip (before quiz starts)
   */
  const handleQuizPromptSkip = useCallback(() => {
    setQuizQuestions([])
    setQuizResults(null)
    setUiState(UI_STATE.HOME)
  }, [setQuizQuestions, setQuizResults, setUiState])

  /**
   * WB018: Handle piece celebration close
   */
  const handlePieceCelebrationClose = useCallback(() => {
    setShowPieceCelebration(false)
    setUnlockedPiece(null)
    // UI002: Refresh world stats after piece unlock
    refreshWorldStats()
    // UI008: Show tier celebration if pending after piece celebration
    if (tierUpgradeInfo) {
      setShowTierCelebration(true)
    } else {
      setUiState(UI_STATE.HOME)
    }
  }, [tierUpgradeInfo, refreshWorldStats, setShowPieceCelebration, setUnlockedPiece, setShowTierCelebration, setUiState])

  /**
   * WB018: Handle view world from celebration
   */
  const handleViewWorldFromCelebration = useCallback(() => {
    setShowPieceCelebration(false)
    setUnlockedPiece(null)
    // UI002: Refresh world stats after piece unlock
    refreshWorldStats()
    // UI008: Show tier celebration if pending, then go to world
    if (tierUpgradeInfo) {
      setShowTierCelebration(true)
    } else {
      setActiveTab('world')
      setWorldBadge(0) // Clear badge since they're viewing world
      setUiState(UI_STATE.HOME)
    }
  }, [tierUpgradeInfo, refreshWorldStats, setShowPieceCelebration, setUnlockedPiece, setShowTierCelebration, setActiveTab, setWorldBadge, setUiState])

  /**
   * UI008: Handle tier celebration close
   */
  const handleTierCelebrationClose = useCallback(() => {
    setShowTierCelebration(false)
    setTierUpgradeInfo(null)
    setUiState(UI_STATE.HOME)
  }, [setShowTierCelebration, setTierUpgradeInfo, setUiState])

  /**
   * UI008: Handle view world from tier celebration
   */
  const handleTierViewWorld = useCallback(() => {
    setShowTierCelebration(false)
    setTierUpgradeInfo(null)
    setActiveTab('world')
    setWorldBadge(0) // Clear badge since they're viewing world
    setUiState(UI_STATE.HOME)
  }, [setShowTierCelebration, setTierUpgradeInfo, setActiveTab, setWorldBadge, setUiState])

  /**
   * WB018: Handle continue from quiz results
   */
  const handleQuizResultsContinue = useCallback(() => {
    setQuizQuestions([])
    setQuizResults(null)
    setUiState(UI_STATE.HOME)
  }, [setQuizQuestions, setQuizResults, setUiState])

  return {
    handleStartQuiz,
    handleQuizComplete,
    handleQuizSkip,
    handleQuizPromptSkip,
    handlePieceCelebrationClose,
    handleViewWorldFromCelebration,
    handleTierCelebrationClose,
    handleTierViewWorld,
    handleQuizResultsContinue,
  }
}
