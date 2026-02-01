/**
 * useQuizHandlers - Custom hook for quiz-related handlers
 * Extracts quiz flow logic from App.jsx to reduce complexity
 *
 * WB010: After quiz pass, generates world pieces and adds them to user's world
 */
import { useCallback, useRef } from 'react'
import { UI_STATE } from '../constants/appConfig.js'
import logger from '../utils/logger.js'
import { getClientId } from '../utils/clientId'
import { buildLivingWorldSummaryFromSlides } from '../utils/livingWorldSummary.js'
import { determineZone, selectPieceIcon, generatePieceId } from './useWorldPiece.js'

const POSITION_RANGE = {
  minX: 8,
  maxX: 92,
  minY: 15,
  maxY: 85,
}

function createPiecePosition() {
  const rangeX = POSITION_RANGE.maxX - POSITION_RANGE.minX
  const rangeY = POSITION_RANGE.maxY - POSITION_RANGE.minY

  return {
    x: Math.round(POSITION_RANGE.minX + Math.random() * rangeX),
    y: Math.round(POSITION_RANGE.minY + Math.random() * rangeY),
  }
}

/**
 * @param {Object} params - Hook parameters
 * @param {Object} params.activeTopic - Currently active topic
 * @param {string} params.wsClientId - WebSocket client ID
 * @param {Object} params.visibleSlidesRef - Ref to visible slides
 * @param {Function} params.setIsLoadingQuiz - Setter for quiz loading state
 * @param {Function} params.setQuizTopicId - Setter for quiz topic ID
 * @param {Function} params.setQuizTopicName - Setter for quiz topic name
 * @param {Function} params.setQuizQuestions - Setter for quiz questions
 * @param {Function} params.setQuizSlides - Setter for quiz slides (with images for visual questions)
 * @param {Function} params.setQuizResults - Setter for quiz results
 * @param {Function} params.setUiState - Setter for UI state
 * @param {Function} params.showPieceUnlock - Celebration hook: show piece unlock celebration
 * @param {Function} params.dismissPieceCelebration - Celebration hook: dismiss piece celebration
 * @param {Function} params.setWorldBadge - Setter for world badge count
 * @param {Function} params.showTierUpgrade - Celebration hook: show tier upgrade celebration
 * @param {Function} params.dismissTierCelebration - Celebration hook: dismiss tier celebration
 * @param {Function} params.setActiveTab - Setter for active tab
 * @param {Function} params.refreshWorldStats - Function to refresh world stats
 * @param {Function} [params.checkEvolutions] - Evolution hook: check for piece evolutions
 * @param {string} params.quizTopicId - Current quiz topic ID
 * @param {string} params.quizTopicName - Current quiz topic name
 * @param {Object|null} params.tierUpgradeInfo - Tier upgrade info if pending
 * @param {Function} [params.evolveWorld] - Living World: Function to evolve world after quiz pass
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
  setQuizSlides,
  setQuizResults,
  setUiState,
  showPieceUnlock,
  dismissPieceCelebration,
  setWorldBadge,
  showTierUpgrade,
  dismissTierCelebration,
  setActiveTab,
  refreshWorldStats,
  checkEvolutions,
  quizTopicId,
  quizTopicName,
  tierUpgradeInfo,
  evolveWorld, // Living World: Function to evolve world after quiz pass
}) {
  const quizSummaryRef = useRef('')

  const createWorldPiece = useCallback(async ({ topicId, topicName, summary }) => {
    if (!topicId || !topicName) {
      return { piece: null, error: 'Missing topic info for world piece' }
    }

    const zone = determineZone(topicName)
    const icon = selectPieceIcon(topicName, zone)
    const clientId = getClientId()
    let generatedPiece = null

    try {
      const generateResponse = await fetch('/api/world/piece/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicName,
          zone,
          summary,
        }),
      })

      if (generateResponse.ok) {
        const generateData = await generateResponse.json()
        generatedPiece = generateData.piece || null
      } else {
        const errorData = await generateResponse.json().catch(() => ({}))
        logger.warn('WORLD', 'Piece image generation failed, using fallback', {
          error: errorData?.error || `status_${generateResponse.status}`,
        })
      }
    } catch (error) {
      logger.warn('WORLD', 'Piece image generation error, using fallback', { error: error.message })
    }

    const piece = {
      id: generatedPiece?.id || generatePieceId(),
      topicId,
      topicName,
      name: topicName,
      zone,
      icon,
      imageUrl: generatedPiece?.imageUrl || null,
      prompt: generatedPiece?.prompt || null,
      position: createPiecePosition(),
    }

    try {
      const addResponse = await fetch('/api/world/piece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          piece,
        }),
      })

      if (!addResponse.ok) {
        const errorData = await addResponse.json().catch(() => ({}))
        return { piece: null, error: errorData?.error || 'Failed to add piece to world' }
      }

      return { piece, error: null }
    } catch (error) {
      return { piece: null, error: error.message }
    }
  }, [determineZone, selectPieceIcon, generatePieceId])

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

      quizSummaryRef.current = buildLivingWorldSummaryFromSlides(contentSlides)

      const languageSample = slidesPayload.find(slide => slide.subtitle || slide.script)
      const languageText = languageSample?.subtitle || languageSample?.script || ''
      const language = /[\u4e00-\u9fff]/.test(languageText) ? 'zh' : 'en'

      // Get explanation level from topic (affects question types and difficulty)
      const explanationLevel = activeTopic.explanationLevel || 'standard'

      const response = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: slidesPayload,
          topicName: activeTopic.name || 'this topic',
          language,
          explanationLevel,
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
      // Store full slides with images for visual quiz questions
      setQuizSlides(contentSlides)
      setUiState(UI_STATE.QUIZ)
    } catch (error) {
      logger.error('QUIZ', 'Failed to generate quiz', { error: error.message })
      setQuizQuestions([])
      setUiState(UI_STATE.QUIZ_PROMPT)
    } finally {
      setIsLoadingQuiz(false)
    }
  }, [activeTopic, visibleSlidesRef, setIsLoadingQuiz, setQuizTopicId, setQuizTopicName, setQuizQuestions, setQuizSlides, setUiState])

  /**
   * Handle quiz completion - evaluate and evolve world
   * Living World: After quiz pass, evolves the world with the learned topic
   */
  const handleQuizComplete = useCallback(async (results) => {
    setQuizResults(results)
    setUiState(UI_STATE.QUIZ_COMPLETING)

    const passed = results?.passed ?? results.percentage >= 60
    const effectiveTopicName = quizTopicName || activeTopic?.name || activeTopic?.topicName || null
    const effectiveTopicId = quizTopicId
      || activeTopic?.id
      || activeTopic?.topicId
      || effectiveTopicName
      || null

    if (passed && effectiveTopicId && effectiveTopicName) {
      try {
        const clientId = getClientId()
        const summaryFromSlides = quizSummaryRef.current
          || buildLivingWorldSummaryFromSlides(visibleSlidesRef.current || [])

        logger.info('QUIZ', 'Evolving Living World for passed quiz', {
          topicName: effectiveTopicName,
          percentage: results.percentage,
          hasSummary: !!summaryFromSlides,
        })

        // Living World: Evolve the world with the learned topic
        if (evolveWorld) {
          const evolutionResult = await evolveWorld(
            effectiveTopicName,
            summaryFromSlides
          )

          if (evolutionResult.success) {
            logger.info('QUIZ', 'Living World evolved successfully', {
              topicName: effectiveTopicName,
              tier: evolutionResult.changesApplied?.newTier,
              changesApplied: evolutionResult.changesApplied
            })

            // Increment world badge for notification
            setWorldBadge(prev => prev + 1)

            // Check for tier upgrade
            if (evolutionResult.changesApplied?.tierChanged) {
              showTierUpgrade({
                from: evolutionResult.changesApplied.previousTier,
                to: evolutionResult.changesApplied.newTier
              })
            }
          } else {
            logger.warn('QUIZ', 'Living World evolution failed', {
              error: evolutionResult.error
            })
          }
        } else {
          logger.warn('QUIZ', 'evolveWorld function not available, skipping evolution')
        }

        // World piece unlock flow
        const pieceResult = await createWorldPiece({
          topicId: effectiveTopicId,
          topicName: effectiveTopicName,
          summary: summaryFromSlides,
        })

        if (pieceResult?.piece) {
          showPieceUnlock(pieceResult.piece)
          checkEvolutions?.(pieceResult.piece)
        } else if (pieceResult?.error) {
          logger.warn('QUIZ', 'World piece unlock failed', { error: pieceResult.error })
        }

        // Award XP via evaluate endpoint (handles additional tier upgrades)
        const questionsForEval = Array.isArray(results.questions) ? results.questions : []
        const answersForEval = Array.isArray(results.answers)
          ? results.answers.map((answer) => {
              const question = questionsForEval.find(q => q?.id === answer?.questionId)
              return {
                questionId: answer?.questionId,
                answer: answer?.userAnswer ?? answer?.answer,
                type: answer?.type || question?.type,
              }
            })
          : []

        const evalResponse = await fetch('/api/quiz/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: effectiveTopicId,
            topicName: effectiveTopicName,
            answers: answersForEval,
            questions: questionsForEval,
            clientId,
            explanationLevel: results.explanationLevel || 'standard',
          }),
        })

        if (evalResponse.ok) {
          const evalData = await evalResponse.json()
          // Handle tier upgrade celebration from XP award
          if (evalData.tierInfo?.tierUpgrade) {
            showTierUpgrade(evalData.tierInfo.tierUpgrade)
          }
        }
      } catch (error) {
        logger.error('QUIZ', 'Failed to complete quiz flow', { error: error.message })
      } finally {
        refreshWorldStats()
      }
    }

    setUiState(UI_STATE.QUIZ_RESULTS)
  }, [
    activeTopic,
    quizTopicId,
    quizTopicName,
    visibleSlidesRef,
    setQuizResults,
    setUiState,
    setWorldBadge,
    showTierUpgrade,
    evolveWorld,
    createWorldPiece,
    showPieceUnlock,
    checkEvolutions,
    refreshWorldStats,
  ])

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
    dismissPieceCelebration()
    // UI002: Refresh world stats after piece unlock
    refreshWorldStats()
    // UI008: Show tier celebration if pending after piece celebration
    if (tierUpgradeInfo) {
      showTierUpgrade(tierUpgradeInfo)
    } else {
      setUiState(UI_STATE.HOME)
    }
  }, [tierUpgradeInfo, refreshWorldStats, dismissPieceCelebration, showTierUpgrade, setUiState])

  /**
   * WB018: Handle view world from celebration
   */
  const handleViewWorldFromCelebration = useCallback(() => {
    dismissPieceCelebration()
    // UI002: Refresh world stats after piece unlock
    refreshWorldStats()
    // UI008: Show tier celebration if pending, then go to world
    if (tierUpgradeInfo) {
      showTierUpgrade(tierUpgradeInfo)
    } else {
      setActiveTab('world')
      setWorldBadge(0) // Clear badge since they're viewing world
      setUiState(UI_STATE.HOME)
    }
  }, [tierUpgradeInfo, refreshWorldStats, dismissPieceCelebration, showTierUpgrade, setActiveTab, setWorldBadge, setUiState])

  /**
   * UI008: Handle tier celebration close
   */
  const handleTierCelebrationClose = useCallback(() => {
    dismissTierCelebration()
    setUiState(UI_STATE.HOME)
  }, [dismissTierCelebration, setUiState])

  /**
   * UI008: Handle view world from tier celebration
   */
  const handleTierViewWorld = useCallback(() => {
    dismissTierCelebration()
    setActiveTab('world')
    setWorldBadge(0) // Clear badge since they're viewing world
    setUiState(UI_STATE.HOME)
  }, [dismissTierCelebration, setActiveTab, setWorldBadge, setUiState])

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
