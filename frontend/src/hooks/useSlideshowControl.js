/**
 * Custom hook for slideshow control
 * Consolidates navigation, playback, and auto-advance logic
 * Includes chapter-based segment computation for the Knowledge Constellation feature
 */
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { UI_STATE, SLIDE_TIMING } from '../constants/appConfig.js'

const SLIDE_TRANSITION_PAUSE_MS = SLIDE_TIMING.TRANSITION_PAUSE_MS
const MANUAL_FINISH_GRACE_MS = SLIDE_TIMING.MANUAL_FINISH_GRACE_MS

/**
 * Hook for managing slideshow control
 * @param {Object} options - Configuration options
 * @returns {Object} Slideshow control state and functions
 */
export default function useSlideshowControl({
  visibleSlides,
  allTopicSlides,
  uiState,
  isVoiceAgentSpeaking,
  isSlideNarrationPlaying,
  isSlideNarrationReady,
  getSlideDuration,
  activeTopic,
}) {
  // Navigation state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentChildIndex, setCurrentChildIndex] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [slideshowFinished, setSlideshowFinished] = useState(false)
  const [isChapterPickerOpen, setIsChapterPickerOpen] = useState(false)

  // Refs
  const wasManualNavRef = useRef(false)
  const pauseAfterCurrentSlideRef = useRef(false)
  const manualFinishTimeoutRef = useRef(null)
  const hasFinishedSlideshowRef = useRef(false)
  const isPlayingRef = useRef(false)

  // Sync isPlaying to ref
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Compute active child slides
  const activeChildSlides = useMemo(() => {
    const currentParent = visibleSlides[currentIndex]
    if (!currentParent) return []
    return allTopicSlides.filter(s => s.parentId === currentParent.id)
  }, [allTopicSlides, visibleSlides, currentIndex])

  // Compute the currently displayed slide
  const displayedSlide = useMemo(() => {
    if (currentChildIndex !== null && activeChildSlides[currentChildIndex]) {
      return activeChildSlides[currentChildIndex]
    }
    return visibleSlides[currentIndex]
  }, [visibleSlides, currentIndex, activeChildSlides, currentChildIndex])

  const parentSlide = visibleSlides[currentIndex] || null

  // Chapter-based segments: each parent + its children = one segment
  const segments = useMemo(() => {
    return visibleSlides.map((parent) => {
      const children = allTopicSlides.filter((s) => s.parentId === parent.id)
      let label
      if (parent.type === 'header') {
        label = parent.topicName || activeTopic?.name || 'Overview'
      } else if (parent.title) {
        label = parent.title
      } else if (parent.subtitle) {
        // Fallback for older slides without title: use first few words
        label = parent.subtitle.split(' ').slice(0, 4).join(' ').replace(/[.,!?]$/, '')
      } else {
        label = 'Slide'
      }
      return {
        id: parent.id,
        label,
        slides: [parent, ...children],
        depth: 0,
      }
    })
  }, [visibleSlides, allTopicSlides, activeTopic])

  // Segment position derived from current navigation state
  const currentSegmentIndex = currentIndex
  const currentSlideInSegment =
    currentChildIndex === null ? 0 : currentChildIndex + 1

  // Close chapter picker when slide changes
  useEffect(() => {
    setIsChapterPickerOpen(false)
  }, [currentIndex, activeChildSlides.length])

  /**
   * Trigger slideshow finished state
   */
  const triggerSlideshowFinished = useCallback(() => {
    if (hasFinishedSlideshowRef.current) return
    hasFinishedSlideshowRef.current = true
    setSlideshowFinished(true)
  }, [])

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

  // Segment index maps 1:1 to parent slide index since each parent = one segment
  const goToSegment = goToSlide

  // Keyboard navigation
  useEffect(() => {
    if (uiState !== UI_STATE.SLIDESHOW) return

    const handleKeyDown = (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return

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

  // Auto-advance for non-audio slides
  useEffect(() => {
    if (uiState !== UI_STATE.SLIDESHOW || !isPlaying || isVoiceAgentSpeaking || visibleSlides.length === 0) {
      return
    }

    const currentSlide = displayedSlide

    if (currentSlide?.type !== 'header' && currentSlide?.type !== 'suggestions' && !isSlideNarrationReady) {
      return
    }

    if (currentSlide?.type !== 'header' && currentSlide?.type !== 'suggestions' && isSlideNarrationPlaying) {
      return
    }

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

      if (activeChildSlides.length > 0) {
        if (currentChildIndex === null) {
          setCurrentChildIndex(0)
          return
        } else if (currentChildIndex < activeChildSlides.length - 1) {
          setCurrentChildIndex(prev => prev + 1)
          return
        }
      }

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

  // Manual finish detection
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
    slideshowFinished,
    isChapterPickerOpen,
    activeChildSlides,
    displayedSlide,
    parentSlide,

    // Chapter segments
    segments,
    currentSegmentIndex,
    currentSlideInSegment,

    // State setters
    setCurrentIndex,
    setCurrentChildIndex,
    setIsPlaying,
    setSlideshowFinished,
    setIsChapterPickerOpen,

    // Navigation
    goToNextSlide,
    goToPrevSlide,
    goToChildNext,
    goToChildPrev,
    goToSlide,
    goToSegment,
    togglePlayPause,

    // Slideshow completion
    triggerSlideshowFinished,
    resetSlideshowFinished,

    // Refs
    wasManualNavRef,
    pauseAfterCurrentSlideRef,
    hasFinishedSlideshowRef,
    isPlayingRef,
  }
}
