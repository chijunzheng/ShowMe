/**
 * Custom hook for slideshow navigation
 * Handles slide navigation, play/pause, keyboard controls, and auto-advance
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { UI_STATE, SLIDE_TIMING } from '../constants/appConfig.js'

const SLIDE_TRANSITION_PAUSE_MS = SLIDE_TIMING.TRANSITION_PAUSE_MS
const MANUAL_FINISH_GRACE_MS = SLIDE_TIMING.MANUAL_FINISH_GRACE_MS

/**
 * Hook for managing slideshow navigation and playback
 * @param {Object} options - Configuration options
 * @param {Array} options.visibleSlides - Array of visible slides (top-level only)
 * @param {Array} options.allTopicSlides - All topic slides (including children)
 * @param {string} options.uiState - Current UI state
 * @param {boolean} options.isVoiceAgentSpeaking - Whether voice agent is speaking
 * @param {boolean} options.isSlideNarrationPlaying - Whether slide narration is playing
 * @param {boolean} options.isSlideNarrationReady - Whether slide narration is ready
 * @param {Function} options.getSlideDuration - Function to get slide duration
 * @param {Function} options.onSlideshowFinished - Callback when slideshow finishes
 * @returns {Object} Navigation state and controls
 */
export default function useSlideshowNavigation({
  visibleSlides = [],
  allTopicSlides = [],
  uiState,
  isVoiceAgentSpeaking = false,
  isSlideNarrationPlaying = false,
  isSlideNarrationReady = false,
  getSlideDuration,
  onSlideshowFinished,
}) {
  // Navigation state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentChildIndex, setCurrentChildIndex] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Refs
  const wasManualNavRef = useRef(false)
  const pauseAfterCurrentSlideRef = useRef(false)
  const manualFinishTimeoutRef = useRef(null)
  const hasFinishedSlideshowRef = useRef(false)
  const [slideshowFinished, setSlideshowFinished] = useState(false)

  // Compute active child slides
  const activeChildSlides = useMemo(() => {
    const currentParent = visibleSlides[currentIndex]
    if (!currentParent) return []
    return allTopicSlides.filter(s => s.parentId === currentParent.id)
  }, [allTopicSlides, visibleSlides, currentIndex])

  // Compute the currently displayed slide (parent or child)
  const displayedSlide = useMemo(() => {
    if (currentChildIndex !== null && activeChildSlides[currentChildIndex]) {
      return activeChildSlides[currentChildIndex]
    }
    return visibleSlides[currentIndex]
  }, [visibleSlides, currentIndex, activeChildSlides, currentChildIndex])

  /**
   * Trigger slideshow finished state
   */
  const triggerSlideshowFinished = useCallback(() => {
    if (hasFinishedSlideshowRef.current) return
    hasFinishedSlideshowRef.current = true
    setSlideshowFinished(true)
    onSlideshowFinished?.()
  }, [onSlideshowFinished])

  /**
   * Reset slideshow finished state
   */
  const resetSlideshowFinished = useCallback(() => {
    hasFinishedSlideshowRef.current = false
    setSlideshowFinished(false)
  }, [])

  /**
   * Navigate to next slide (horizontal)
   */
  const goToNextSlide = useCallback(() => {
    wasManualNavRef.current = true
    setCurrentIndex((prev) => {
      const nextIndex = Math.min(visibleSlides.length - 1, prev + 1)
      if (nextIndex !== prev) {
        setCurrentChildIndex(null)
      }
      return nextIndex
    })
  }, [visibleSlides.length])

  /**
   * Navigate to previous slide (horizontal)
   */
  const goToPrevSlide = useCallback(() => {
    wasManualNavRef.current = true
    setCurrentIndex((prev) => {
      const nextIndex = Math.max(0, prev - 1)
      if (nextIndex !== prev) {
        setCurrentChildIndex(null)
      }
      return nextIndex
    })
  }, [])

  /**
   * Navigate to next child slide (vertical)
   */
  const goToChildNext = useCallback(() => {
    if (activeChildSlides.length === 0) return
    wasManualNavRef.current = true
    setCurrentChildIndex((prev) => {
      if (prev === null) return 0
      return Math.min(activeChildSlides.length - 1, prev + 1)
    })
  }, [activeChildSlides.length])

  /**
   * Navigate to previous child slide (vertical)
   */
  const goToChildPrev = useCallback(() => {
    wasManualNavRef.current = true
    setCurrentChildIndex((prev) => {
      if (prev === null || prev === 0) return null
      return prev - 1
    })
  }, [])

  /**
   * Toggle play/pause
   */
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  /**
   * Navigate to a specific slide index
   */
  const goToSlide = useCallback((index) => {
    if (index < 0 || index >= visibleSlides.length) return
    wasManualNavRef.current = true
    setCurrentIndex(index)
    setCurrentChildIndex(null)
  }, [visibleSlides.length])

  /**
   * Auto-advance for non-audio slides (headers, suggestions)
   */
  useEffect(() => {
    if (uiState !== UI_STATE.SLIDESHOW || !isPlaying || isVoiceAgentSpeaking || visibleSlides.length === 0) {
      return
    }

    const currentSlide = displayedSlide

    // Wait for narration to be ready (header slides are always "ready")
    if (currentSlide?.type !== 'header' && currentSlide?.type !== 'suggestions' && !isSlideNarrationReady) {
      return
    }

    // For regular slides with audio playing, let audio onended handle advancement
    if (currentSlide?.type !== 'header' && currentSlide?.type !== 'suggestions' && isSlideNarrationPlaying) {
      return
    }

    // Get duration for current slide
    const baseDuration = currentSlide?.type === 'header'
      ? 2000
      : getSlideDuration?.(currentSlide) || 5000
    const duration = currentSlide?.type === 'header'
      ? baseDuration
      : baseDuration + SLIDE_TRANSITION_PAUSE_MS

    const timeoutId = setTimeout(() => {
      if (pauseAfterCurrentSlideRef.current) {
        pauseAfterCurrentSlideRef.current = false
        setIsPlaying(false)
        return
      }

      wasManualNavRef.current = false

      // 2D Auto-advance Logic
      if (activeChildSlides.length > 0) {
        if (currentChildIndex === null) {
          setCurrentChildIndex(0)
          return
        } else if (currentChildIndex < activeChildSlides.length - 1) {
          setCurrentChildIndex(prev => prev + 1)
          return
        }
      }

      // Go to next parent
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1
        if (nextIndex >= visibleSlides.length) {
          setIsPlaying(false)
          setTimeout(() => triggerSlideshowFinished(), 0)
          return prev
        }
        setCurrentChildIndex(null)
        return nextIndex
      })
    }, duration)

    return () => clearTimeout(timeoutId)
  }, [
    uiState,
    isPlaying,
    isVoiceAgentSpeaking,
    isSlideNarrationReady,
    isSlideNarrationPlaying,
    currentIndex,
    currentChildIndex,
    activeChildSlides.length,
    visibleSlides,
    displayedSlide,
    getSlideDuration,
    triggerSlideshowFinished,
  ])

  // Keyboard navigation
  useEffect(() => {
    if (uiState !== UI_STATE.SLIDESHOW) {
      return
    }

    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault()
          goToNextSlide()
          break
        case 'ArrowLeft':
          event.preventDefault()
          goToPrevSlide()
          break
        case 'ArrowDown':
          event.preventDefault()
          goToChildNext()
          break
        case 'ArrowUp':
          event.preventDefault()
          goToChildPrev()
          break
        case ' ':
          event.preventDefault()
          togglePlayPause()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [uiState, goToNextSlide, goToPrevSlide, goToChildNext, goToChildPrev, togglePlayPause])

  // Start auto-play when entering slideshow
  useEffect(() => {
    if (uiState === UI_STATE.SLIDESHOW && visibleSlides.length > 0) {
      setIsPlaying(true)
    }
  }, [uiState, visibleSlides.length])

  // Mark slideshow finished when user manually pauses on final slide
  useEffect(() => {
    if (manualFinishTimeoutRef.current) {
      clearTimeout(manualFinishTimeoutRef.current)
      manualFinishTimeoutRef.current = null
    }

    if (uiState !== UI_STATE.SLIDESHOW || slideshowFinished) {
      return
    }

    if (isPlaying || isSlideNarrationPlaying || visibleSlides.length === 0) {
      return
    }

    const isAtLastParent = currentIndex >= visibleSlides.length - 1
    if (!isAtLastParent) {
      return
    }

    const hasChildren = activeChildSlides.length > 0
    const isAtLastChild = hasChildren
      ? currentChildIndex !== null && currentChildIndex >= activeChildSlides.length - 1
      : currentChildIndex === null

    if (!isAtLastChild) {
      return
    }

    manualFinishTimeoutRef.current = setTimeout(() => {
      manualFinishTimeoutRef.current = null
      triggerSlideshowFinished()
    }, MANUAL_FINISH_GRACE_MS)

    return () => {
      if (manualFinishTimeoutRef.current) {
        clearTimeout(manualFinishTimeoutRef.current)
        manualFinishTimeoutRef.current = null
      }
    }
  }, [
    uiState,
    slideshowFinished,
    isPlaying,
    isSlideNarrationPlaying,
    currentIndex,
    currentChildIndex,
    activeChildSlides.length,
    visibleSlides.length,
    triggerSlideshowFinished,
  ])

  return {
    // State
    currentIndex,
    currentChildIndex,
    isPlaying,
    activeChildSlides,
    displayedSlide,
    slideshowFinished,

    // State setters
    setCurrentIndex,
    setCurrentChildIndex,
    setIsPlaying,

    // Navigation
    goToNextSlide,
    goToPrevSlide,
    goToChildNext,
    goToChildPrev,
    goToSlide,
    togglePlayPause,

    // Slideshow completion
    triggerSlideshowFinished,
    resetSlideshowFinished,

    // Refs
    wasManualNavRef,
    pauseAfterCurrentSlideRef,
    hasFinishedSlideshowRef,
  }
}
