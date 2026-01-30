/**
 * useQuizHandlers - Custom hook for quiz-related handlers
 * Extracts quiz flow logic from App.jsx to reduce complexity
 *
 * WB010: After quiz pass, generates world pieces and adds them to user's world
 */
import { useCallback, useRef } from 'react'
import { UI_STATE } from '../constants/appConfig.js'
import logger from '../utils/logger.js'

/**
 * API base URL from environment
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

/**
 * Get client ID from local storage (consistent with useWorldPiece hook)
 */
function getClientId() {
  const storageKey = 'showme_client_id'
  let clientId = localStorage.getItem(storageKey)

  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem(storageKey, clientId)
  }

  return clientId
}

/**
 * Determine zone from topic name using keyword matching
 */
function determineZone(topicName) {
  const topicLower = (topicName || '').toLowerCase()

  // Nature zone keywords
  const natureKeywords = [
    'volcano', 'mountain', 'ocean', 'river', 'forest', 'tree', 'plant',
    'animal', 'dinosaur', 'fish', 'bird', 'insect', 'weather', 'rain',
    'snow', 'earthquake', 'tornado', 'hurricane', 'ecosystem', 'biology',
    'earth', 'rock', 'mineral', 'crystal', 'water', 'nature', 'wildlife',
    'climate', 'environment', 'solar', 'star', 'planet', 'moon', 'sun',
  ]

  // Civilization zone keywords
  const civilizationKeywords = [
    'pyramid', 'castle', 'city', 'building', 'bridge', 'architecture',
    'history', 'war', 'king', 'queen', 'empire', 'civilization', 'invention',
    'machine', 'computer', 'robot', 'car', 'train', 'plane', 'ship',
    'medicine', 'hospital', 'school', 'library', 'museum', 'art', 'music',
    'sport', 'olympics', 'government', 'law', 'economy', 'money', 'trade',
  ]

  if (natureKeywords.some(kw => topicLower.includes(kw))) return 'nature'
  if (civilizationKeywords.some(kw => topicLower.includes(kw))) return 'civilization'
  return 'arcane'
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
  setQuizSlides,
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
   * WB018: Handle quiz completion - evaluate, generate piece, and unlock
   * WB010: After quiz pass, generates world piece image and stores in world state
   */
  const handleQuizComplete = useCallback(async (results) => {
    setQuizResults(results)

    // Check if user passed (>= 60% score)
    const passed = results.percentage >= 60

    if (passed && quizTopicId && quizTopicName) {
      try {
        const clientId = getClientId()
        const zone = determineZone(quizTopicName)

        logger.info('QUIZ', 'Generating world piece for passed quiz', {
          topicName: quizTopicName,
          zone,
          percentage: results.percentage
        })

        // Step 1: Generate world piece image via API
        const generateResponse = await fetch(`${API_BASE}/api/world/piece/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicName: quizTopicName,
            zone,
            summary: '', // Could pass slide summary in future
          }),
        })

        let generatedPiece = null
        if (generateResponse.ok) {
          const generateData = await generateResponse.json()
          generatedPiece = generateData.piece

          // Step 2: Add piece to world state with position
          if (generatedPiece) {
            // Generate random position for this piece
            const pieceX = Math.random() * 80 + 10
            const pieceY = Math.random() * 60 + 20

            // Add required fields for world storage
            // Note: Backend expects position.x/y but frontend display uses x/y directly
            const pieceToStore = {
              ...generatedPiece,
              topicId: quizTopicId,
              name: quizTopicName, // WorldPiece component expects 'name'
              x: pieceX, // Direct x/y for frontend display
              y: pieceY,
              position: {
                // Also store in position object for backend compatibility
                x: pieceX,
                y: pieceY,
              },
            }

            const addResponse = await fetch(`${API_BASE}/api/world/piece`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                clientId,
                piece: pieceToStore,
              }),
            })

            if (addResponse.ok) {
              const addData = await addResponse.json()
              logger.info('QUIZ', 'World piece added successfully', {
                pieceId: generatedPiece.id,
                zone
              })

              // Set unlocked piece for celebration
              setUnlockedPiece({
                ...generatedPiece,
                name: quizTopicName,
                category: zone,
              })
              setShowPieceCelebration(true)
              // Increment world badge for new piece notification
              setWorldBadge(prev => prev + 1)

              // UI008: Check for tier upgrade from world state update
              if (addData.arcaneJustUnlocked) {
                setTierUpgradeInfo({ from: 'growing', to: 'arcane' })
              }
            } else {
              logger.warn('QUIZ', 'Failed to add piece to world', {
                status: addResponse.status
              })
            }
          }
        } else {
          // Fallback: Create a piece with a placeholder icon if image generation fails
          logger.warn('QUIZ', 'Failed to generate piece image, using fallback', {
            status: generateResponse.status
          })

          // Create a fallback piece with an emoji icon
          const fallbackPieceId = `piece_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const fallbackX = Math.random() * 80 + 10
          const fallbackY = Math.random() * 60 + 20

          // Select an icon based on the zone
          const zoneIcons = {
            nature: ['🌿', '🌳', '🌻', '🦋', '🐦'],
            civilization: ['🏛️', '🏰', '🏙️', '🚀', '📚'],
            arcane: ['✨', '🔮', '💫', '⭐', '🌙'],
          }
          const icons = zoneIcons[zone] || zoneIcons.nature
          const icon = icons[Math.floor(Math.random() * icons.length)]

          const fallbackPiece = {
            id: fallbackPieceId,
            topicName: quizTopicName,
            name: quizTopicName, // WorldPiece component expects 'name'
            zone,
            icon, // Emoji icon for display
            imageUrl: null, // No image, will use emoji fallback
            prompt: `Fallback piece for ${quizTopicName}`,
            topicId: quizTopicId,
            x: fallbackX,
            y: fallbackY,
            position: {
              x: fallbackX,
              y: fallbackY,
            },
          }

          // Still try to add the fallback piece to world
          const addFallbackResponse = await fetch(`${API_BASE}/api/world/piece`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientId,
              piece: fallbackPiece,
            }),
          })

          if (addFallbackResponse.ok) {
            logger.info('QUIZ', 'Fallback piece added successfully', {
              pieceId: fallbackPieceId,
              zone
            })

            setUnlockedPiece({
              ...fallbackPiece,
              name: quizTopicName,
              category: zone,
            })
            setShowPieceCelebration(true)
            setWorldBadge(prev => prev + 1)
            generatedPiece = fallbackPiece
          }
        }

        // Step 3: Award XP via evaluate endpoint (handles tier upgrades)
        const evalResponse = await fetch('/api/quiz/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId: quizTopicId,
            topicName: quizTopicName,
            answers: results.answers || [],
            questions: results.questions || [],
            clientId,
            explanationLevel: results.explanationLevel || 'standard',
          }),
        })

        if (evalResponse.ok) {
          const evalData = await evalResponse.json()
          // UI008: Handle tier upgrade celebration from XP award
          if (evalData.tierInfo?.tierUpgrade) {
            setTierUpgradeInfo(evalData.tierInfo.tierUpgrade)
            // Delay tier celebration to show after piece celebration
            if (!generatedPiece) {
              setShowTierCelebration(true)
            }
          }
        }
      } catch (error) {
        logger.error('QUIZ', 'Failed to complete quiz flow', { error: error.message })
      }
    }

    setUiState(UI_STATE.QUIZ_RESULTS)
  }, [quizTopicId, quizTopicName, setQuizResults, setUiState, setUnlockedPiece, setShowPieceCelebration, setWorldBadge, setTierUpgradeInfo, setShowTierCelebration])

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
