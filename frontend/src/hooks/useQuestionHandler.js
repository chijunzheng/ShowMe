/**
 * Custom hook for handling user questions (voice or text input)
 * Manages query classification, API calls, topic/slide state updates
 */
import { useCallback, useRef, useEffect } from 'react'
import logger from '../utils/logger.js'
import { classifyQuery, requestChitchatResponse } from '../utils/classificationApi.js'
import {
  UI_STATE,
  GENERATION_TIMEOUT,
  VOICE_AGENT_SCRIPT,
} from '../constants/appConfig.js'
import {
  persistTopicSlides,
  createHeaderSlide,
} from '../utils/topicStorage.js'
import {
  createSectionDivider,
} from '../utils/slideHelpers.js'

/**
 * Hook for handling user questions and triggering generation
 * @param {Object} options - Configuration options
 * @returns {Object} Question handler and ref
 */
export default function useQuestionHandler({
  // State setters
  setUiState,
  setEngagement,
  setTopics,
  setActiveTopicId,
  setCurrentIndex,
  setCurrentChildIndex,
  setIsPlaying,
  setGenerationProgress,
  setIsStillWorking,
  setIsPreparingFollowUp,
  setIsSlideRevealPending,
  setQuestionQueue,
  setVoiceAgentQueue,
  setLastTranscription,
  setLiveTranscription,
  setTextInput,
  setErrorMessage,
  setLastFailedQuery,
  setIsColdStart,
  setHighlightPosition,
  setIsRaiseHandPending,
  setIsMicEnabled,
  setAllowAutoListen,
  // Refs
  abortControllerRef,
  stillWorkingTimerRef,
  currentQueryRef,
  spokenFunFactRef,
  pauseAfterCurrentSlideRef,
  hasFinishedSlideshowRef,
  raiseHandRequestRef,
  selectedLevelRef,
  slideResponseAudioRef,
  // Values/dependencies
  wsClientId,
  activeTopic,
  topics,
  uiState,
  visibleSlides,
  currentIndex,
  isListening,
  isRaiseHandPending,
  isMicEnabled,
  allowAutoListen,
  isSlideRevealPending,
  // Callbacks
  enqueueVoiceAgentMessage,
  clearFunFactRefresh,
  showToast,
  queueSlidesReadyTransition,
  pruneSlideCache,
  stopListening,
  interruptActiveAudio,
  recordQuestionAsked,
  setSlideshowFinished,
}) {
  // Ref to store the handleQuestion function for external access
  const handleQuestionRef = useRef(null)

  /**
   * Handle a user question (from voice or text input)
   * Classifies the query, handles follow-up vs new topic, manages slide cache
   */
  const handleQuestion = useCallback(async (query, options = {}) => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return
    const { source = 'text' } = options

    if (source !== 'voice' && uiState === UI_STATE.SLIDESHOW) {
      pauseAfterCurrentSlideRef.current = false
      interruptActiveAudio()
      setIsPlaying(false)
    }

    // Lower the hand after a question so listening only resumes on explicit raise.
    raiseHandRequestRef.current = false
    if (isRaiseHandPending) {
      setIsRaiseHandPending(false)
    }
    if (isMicEnabled) {
      setIsMicEnabled(false)
    }
    if (allowAutoListen) {
      setAllowAutoListen(false)
    }
    if (isListening) {
      stopListening()
    }

    if (uiState === UI_STATE.GENERATING || (isSlideRevealPending && uiState !== UI_STATE.SLIDESHOW)) {
      setQuestionQueue((prev) => [trimmedQuery, ...prev])
      showToast('Question queued')
      enqueueVoiceAgentMessage('Got it. I will answer that right after this.')
      return
    }

    if (uiState === UI_STATE.ERROR) {
      setUiState(UI_STATE.LISTENING)
    }

    setLastTranscription(trimmedQuery)
    if (source !== 'voice') {
      setLiveTranscription('')
    }
    setTextInput('')
    setErrorMessage('')

    // Create AbortController for timeout handling
    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    // Start timing for full generation pipeline
    logger.time('GENERATION', 'full-pipeline')

    try {
      // Classify the query to determine if it's a follow-up, new topic, slide question, or chitchat
      const classifyResult = await classifyQuery({
        query: trimmedQuery,
        signal,
        activeTopic,
        topics,
        uiState,
        visibleSlides,
        currentIndex,
      })

      if (classifyResult.classification === 'chitchat') {
        try {
          const chitchatResult = await requestChitchatResponse({
            query: trimmedQuery,
            signal,
            activeTopicName: activeTopic?.name,
          })
          const responseText = chitchatResult?.responseText ||
            classifyResult.responseText ||
            "I'm ready to help. What would you like to learn?"
          setVoiceAgentQueue([])
          enqueueVoiceAgentMessage(responseText, { priority: 'high' })
          logger.timeEnd('GENERATION', 'full-pipeline')
          return
        } catch (error) {
          if (error.name === 'AbortError') {
            setUiState(UI_STATE.LISTENING)
            return
          }
          const fallbackText = classifyResult.responseText ||
            "I'm ready to help. What would you like to learn?"
          setVoiceAgentQueue([])
          enqueueVoiceAgentMessage(fallbackText, { priority: 'high' })
          logger.timeEnd('GENERATION', 'full-pipeline')
          return
        }
      }

      // Handle complexity for follow-ups
      if (classifyResult.classification === 'follow_up' && classifyResult.complexity) {
        const complexity = classifyResult.complexity
        logger.info('GENERATION', 'Handling follow-up with complexity', { complexity })

        if (complexity === 'trivial') {
          // Trivial: Voice only response (reuse slide_question logic)
          logger.info('GENERATION', 'Trivial complexity - using verbal response')
          classifyResult.classification = 'slide_question'
        } else if (complexity === 'complex') {
          // Complex: Voice choice/prompt
          logger.info('GENERATION', 'Complex complexity - asking for clarification')
          const complexPrompt = "That's a really big topic with many details. I can focus on the history, the mechanism, or real-world examples. Which would you like?"
          enqueueVoiceAgentMessage(complexPrompt, { priority: 'high' })
          setVoiceAgentQueue([])
          setUiState(UI_STATE.SLIDESHOW)
          logger.timeEnd('GENERATION', 'full-pipeline')
          return
        }
      }

      // Handle slide_question classification - verbal response only
      if (classifyResult.classification === 'slide_question') {
        logger.info('API', 'Handling slide question (verbal response only)', {
          classification: 'slide_question',
        })

        // Clear the "Still working..." timer early since this is fast
        if (stillWorkingTimerRef.current) {
          clearTimeout(stillWorkingTimerRef.current)
          stillWorkingTimerRef.current = null
        }
        setIsStillWorking(false)

        // Get current slide context for the response
        const currentSlide = visibleSlides[currentIndex]
        const slideContext = {
          subtitle: currentSlide?.subtitle || '',
          topicName: activeTopic?.name || '',
        }

        // Call the respond API for verbal-only response
        logger.time('API', 'respond-request')
        logger.info('API', 'POST /api/generate/respond', {
          endpoint: '/api/generate/respond',
          method: 'POST',
        })

        try {
          const response = await fetch('/api/generate/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: trimmedQuery,
              currentSlide: slideContext,
            }),
            signal,
          })

          logger.timeEnd('API', 'respond-request')

          if (!response.ok) {
            logger.error('API', 'Respond request failed', {
              status: response.status,
            })
            throw new Error(`Respond API failed: ${response.status}`)
          }

          const respondData = await response.json()
          logger.info('API', 'Respond API returned', {
            hasAudio: !!respondData.audioUrl,
            hasHighlight: !!respondData.highlight,
          })

          // Show highlight overlay if coordinates were returned
          if (respondData.highlight) {
            setHighlightPosition(respondData.highlight)
            logger.debug('UI', 'Showing highlight overlay', respondData.highlight)
          }

          // Play the verbal response audio
          if (respondData.audioUrl) {
            // Stop any existing slide response audio
            if (slideResponseAudioRef.current) {
              slideResponseAudioRef.current.pause()
            }

            const audio = new Audio(respondData.audioUrl)
            slideResponseAudioRef.current = audio

            // When audio ends, clear the highlight
            audio.onended = () => {
              logger.debug('UI', 'Slide response audio ended, clearing highlight')
              setHighlightPosition(null)
              slideResponseAudioRef.current = null
            }

            audio.onerror = () => {
              logger.warn('AUDIO', 'Slide response audio playback error')
              setHighlightPosition(null)
              slideResponseAudioRef.current = null
            }

            // Start playback
            audio.play().catch((err) => {
              logger.warn('AUDIO', 'Slide response autoplay blocked', { error: err.message })
              setTimeout(() => {
                setHighlightPosition(null)
              }, respondData.duration || 3000)
            })
          } else {
            // No audio - clear highlight after a delay
            if (respondData.highlight) {
              setTimeout(() => {
                setHighlightPosition(null)
              }, respondData.duration || 3000)
            }
          }

          // Stay in slideshow state - no new slides generated
          logger.timeEnd('GENERATION', 'full-pipeline')
          setUiState(UI_STATE.SLIDESHOW)
          return

        } catch (error) {
          if (error.name === 'AbortError') {
            logger.debug('API', 'Respond request aborted by user')
            setUiState(UI_STATE.LISTENING)
            return
          }
          logger.error('API', 'Slide question response failed', {
            error: error.message,
          })
          setLastFailedQuery(query)
          setErrorMessage('Could not answer your question. Please try again.')
          setUiState(UI_STATE.ERROR)
          return
        }
      }

      // Reset engagement from previous queries and transition to generating state
      setEngagement(null)
      setVoiceAgentQueue([])
      spokenFunFactRef.current = null
      clearFunFactRefresh()
      currentQueryRef.current = trimmedQuery
      setIsColdStart(false)
      setUiState(UI_STATE.GENERATING)

      // Record activity for gamification
      recordQuestionAsked()
      setIsStillWorking(false)
      setIsPreparingFollowUp(false)
      setIsSlideRevealPending(false)
      enqueueVoiceAgentMessage(VOICE_AGENT_SCRIPT.GENERATION_START, { priority: 'high' })
      // Reset generation progress for new query
      setGenerationProgress({ stage: null, message: '', slidesReady: 0, totalSlides: 0 })
      // Reset the slideshow finished flags when starting new generation
      hasFinishedSlideshowRef.current = false
      setSlideshowFinished(false)

      // Start "Still working..." timer
      stillWorkingTimerRef.current = setTimeout(() => {
        setIsStillWorking(true)
      }, GENERATION_TIMEOUT.STILL_WORKING_MS)

      // Log engagement API request
      logger.time('API', 'engagement-request')
      logger.info('API', 'POST /api/generate/engagement', {
        endpoint: '/api/generate/engagement',
        method: 'POST',
      })

      // Start engagement call immediately for fast feedback
      const engagementPromise = fetch('/api/generate/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedQuery, explanationLevel: selectedLevelRef.current }),
        signal,
      })
        .then((res) => {
          logger.timeEnd('API', 'engagement-request')
          logger.info('API', 'Engagement response received', {
            status: res.status,
          })
          if (!res.ok) throw new Error(`Engagement API failed: ${res.status}`)
          return res.json()
        })
        .then((data) => {
          if (abortControllerRef.current?.signal !== signal) return null
          setEngagement(data)
          return data
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            logger.warn('API', 'Engagement request failed (non-critical)', {
              error: err.message,
            })
          }
        })

      const isFollowUp = classifyResult.classification === 'follow_up'
      // Get parent slide for 2D navigation (follow-up slides nest under current slide)
      const followUpParentSlide = isFollowUp ? visibleSlides[currentIndex] : null
      const followUpParentId = followUpParentSlide && !['header', 'suggestions'].includes(followUpParentSlide.type)
        ? followUpParentSlide.id
        : null

      if (isFollowUp) {
        setIsPreparingFollowUp(true)
      }

      let generateData
      let newTopicData = null

      if (isFollowUp && activeTopic) {
        // Follow-up query appends slides to current topic
        logger.time('API', 'follow-up-request')
        logger.info('API', 'POST /api/generate/follow-up', {
          endpoint: '/api/generate/follow-up',
          method: 'POST',
          topicId: activeTopic.id,
        })

        const response = await fetch('/api/generate/follow-up', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmedQuery,
            topicId: activeTopic.id,
            conversationHistory: [],
            clientId: wsClientId,
            explanationLevel: activeTopic.explanationLevel || selectedLevelRef.current,
            complexity: classifyResult.complexity,
            parentId: followUpParentId,
          }),
          signal,
        })

        logger.timeEnd('API', 'follow-up-request')
        logger.info('API', 'Follow-up response received', {
          status: response.status,
        })

        if (!response.ok) {
          logger.error('API', 'Follow-up request failed', {
            status: response.status,
          })
          throw new Error(`Follow-up API failed: ${response.status}`)
        }

        generateData = await response.json()
      } else {
        // New topic - generate with header card
        logger.time('API', 'generate-request')
        logger.info('API', 'POST /api/generate', {
          endpoint: '/api/generate',
          method: 'POST',
        })

        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmedQuery,
            topicId: null,
            conversationHistory: [],
            clientId: wsClientId,
            explanationLevel: selectedLevelRef.current,
          }),
          signal,
        })

        logger.timeEnd('API', 'generate-request')
        logger.info('API', 'Generate response received', {
          status: response.status,
        })

        if (!response.ok) {
          logger.error('API', 'Generate request failed', {
            status: response.status,
          })
          throw new Error(`Generate API failed: ${response.status}`)
        }

        generateData = await response.json()
        newTopicData = generateData.topic
      }

      // Clear the "Still working..." timer on success
      if (stillWorkingTimerRef.current) {
        clearTimeout(stillWorkingTimerRef.current)
        stillWorkingTimerRef.current = null
      }
      setIsStillWorking(false)
      setIsPreparingFollowUp(false)
      setIsSlideRevealPending(false)

      // Wait for engagement to complete before transitioning
      const engagementData = await engagementPromise

      setIsPreparingFollowUp(false)

      // Extract suggested questions for the suggestions slide
      const suggestedQuestions = engagementData?.suggestedQuestions || []

      // Update state based on whether it's a follow-up or new topic
      if (isFollowUp && activeTopic && generateData.slides?.length > 0) {
        // Append new slides to current topic, navigate to first new slide
        const previousSlideCount = activeTopic.slides?.length || 0
        const previousChildCount = followUpParentId
          ? (activeTopic.slides || []).filter((slide) => slide?.parentId === followUpParentId).length
          : 0
        const previousTopLevelCount = (activeTopic.slides || []).filter(s => !s.parentId).length
        const firstNewTopLevelIndex = 1 + previousTopLevelCount // +1 for header slide
        const safeParentIndex = Math.min(
          currentIndex,
          Math.max(1 + previousTopLevelCount - 1, 0)
        )
        const now = Date.now()
        // Create section divider for top-level follow-ups (not nested children)
        const sectionDivider = !followUpParentId
          ? createSectionDivider(activeTopic.id, trimmedQuery)
          : null
        const nextSlides = [
          ...(activeTopic.slides || []),
          ...(sectionDivider ? [sectionDivider] : []),
          ...generateData.slides,
        ]

        logger.info('STATE', 'Appending slides to existing topic', {
          topicId: activeTopic.id,
          topicName: activeTopic.name,
          newSlidesCount: generateData.slides.length,
          previousSlidesCount: previousSlideCount,
        })

        // Get current version ID for persistence
        const currentVersion = activeTopic.versions?.[activeTopic.currentVersionIndex ?? 0]
        persistTopicSlides(activeTopic.id, nextSlides, currentVersion?.id)

        setTopics((prev) => {
          const updated = prev.map((topic) => {
            if (topic.id !== activeTopic.id) return topic
            const versionIndex = topic.currentVersionIndex ?? 0
            const updatedVersions = Array.isArray(topic.versions)
              ? topic.versions.map((v, idx) =>
                  idx === versionIndex ? { ...v, slides: nextSlides } : v
                )
              : topic.versions
            return {
              ...topic,
              slides: nextSlides,
              versions: updatedVersions,
              suggestedQuestions,
              lastAccessedAt: now,
            }
          })
          return pruneSlideCache(updated, activeTopic.id)
        })

        // Navigate to the first new slide after appending
        if (followUpParentId) {
          setCurrentIndex(safeParentIndex)
          setCurrentChildIndex(previousChildCount)
        } else {
          setCurrentChildIndex(null)
          setCurrentIndex(firstNewTopLevelIndex)
        }
        logger.timeEnd('GENERATION', 'full-pipeline')
        // Prefetch TTS for first new slide before transitioning
        await queueSlidesReadyTransition(generateData.slides, 0)

      } else if (newTopicData && generateData.slides?.length > 0) {
        // Create new topic with header card
        const now = Date.now()
        const initialLevel = selectedLevelRef.current

        const newTopic = {
          id: newTopicData.id,
          name: newTopicData.name,
          icon: newTopicData.icon,
          query: trimmedQuery,
          headerSlide: createHeaderSlide(newTopicData),
          slides: generateData.slides,
          suggestedQuestions,
          explanationLevel: initialLevel,
          createdAt: now,
          lastAccessedAt: now,
          versions: [{
            id: `v_${newTopicData.id}_${now}`,
            explanationLevel: initialLevel,
            slides: generateData.slides,
            createdAt: now,
          }],
          currentVersionIndex: 0,
        }

        logger.info('STATE', 'Creating new topic', {
          topicId: newTopic.id,
          topicName: newTopic.name,
          topicIcon: newTopic.icon,
          slidesCount: generateData.slides.length,
        })

        // Persist slides with the initial version ID
        const initialVersionId = newTopic.versions[0].id
        persistTopicSlides(newTopic.id, newTopic.slides, initialVersionId)

        // Add the new topic
        setTopics((prev) => pruneSlideCache([newTopic, ...prev], newTopic.id))

        // Set the new topic as active and show its header slide
        setActiveTopicId(newTopic.id)
        setCurrentIndex(0)
        logger.timeEnd('GENERATION', 'full-pipeline')
        // Prefetch TTS for first content slide before transitioning
        await queueSlidesReadyTransition(generateData.slides, 0)

      } else {
        // No slides returned - stay in generating state with a message
        logger.warn('GENERATION', 'No slides returned from API')
        setUiState(UI_STATE.LISTENING)
      }
    } catch (error) {
      // Clear timers on error
      if (stillWorkingTimerRef.current) {
        clearTimeout(stillWorkingTimerRef.current)
        stillWorkingTimerRef.current = null
      }
      setIsStillWorking(false)

      // Handle abort/cancellation
      if (error.name === 'AbortError') {
        logger.debug('API', 'Request cancelled by user')
        setUiState(UI_STATE.LISTENING)
        return
      }

      // Handle network errors
      logger.error('API', 'Generation request failed', {
        error: error.message,
        errorName: error.name,
      })
      setLastFailedQuery(query)
      setErrorMessage('Something went wrong. Please check your connection and try again.')
      setUiState(UI_STATE.ERROR)
    }
  }, [
    uiState,
    isSlideRevealPending,
    isRaiseHandPending,
    isMicEnabled,
    allowAutoListen,
    isListening,
    activeTopic,
    topics,
    visibleSlides,
    currentIndex,
    wsClientId,
    setUiState,
    setEngagement,
    setTopics,
    setActiveTopicId,
    setCurrentIndex,
    setCurrentChildIndex,
    setIsPlaying,
    setGenerationProgress,
    setIsStillWorking,
    setIsPreparingFollowUp,
    setIsSlideRevealPending,
    setQuestionQueue,
    setVoiceAgentQueue,
    setLastTranscription,
    setLiveTranscription,
    setTextInput,
    setErrorMessage,
    setLastFailedQuery,
    setIsColdStart,
    setHighlightPosition,
    setIsRaiseHandPending,
    setIsMicEnabled,
    setAllowAutoListen,
    enqueueVoiceAgentMessage,
    clearFunFactRefresh,
    showToast,
    queueSlidesReadyTransition,
    pruneSlideCache,
    stopListening,
    interruptActiveAudio,
    recordQuestionAsked,
    setSlideshowFinished,
  ])

  // Keep ref updated with latest handleQuestion
  useEffect(() => {
    handleQuestionRef.current = handleQuestion
  }, [handleQuestion])

  return {
    handleQuestion,
    handleQuestionRef,
  }
}
