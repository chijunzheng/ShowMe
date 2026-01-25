import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

/**
 * StreamingSubtitle - Karaoke-style subtitle display with progressive word reveal
 * CORE036: Words appear progressively as audio plays, with punctuation-aware pacing
 *
 * @param {Object} props - Component props
 * @param {string} props.text - The full subtitle text to display
 * @param {number} props.duration - Total audio duration in milliseconds
 * @param {boolean} props.isPlaying - Whether audio is currently playing
 * @param {boolean} props.showAll - If true, show all words immediately (for manual navigation)
 * @param {Function} props.onComplete - Callback when all words have been revealed
 */
function StreamingSubtitle({ text, duration, isPlaying, showAll = false, onComplete }) {
  // Track how many words have been revealed
  const [revealedCount, setRevealedCount] = useState(0)
  // Track elapsed time for accurate pacing
  const elapsedTimeRef = useRef(0)
  // Last timestamp for calculating delta time
  const lastTickRef = useRef(null)
  // Animation frame ID for cleanup
  const animationFrameRef = useRef(null)
  // Track if onComplete has been called to prevent double-firing
  const completedRef = useRef(false)
  // Track previous isPlaying state to detect transitions
  const prevIsPlayingRef = useRef(isPlaying)

  // Parse text into words with their timing weights
  // Punctuation after words adds extra pause time
  const wordData = useMemo(() => {
    if (!text || typeof text !== 'string') {
      return []
    }

    // Split on whitespace, keeping the punctuation attached
    const rawWords = text.split(/\s+/).filter(word => word.length > 0)

    return rawWords.map((word, index) => {
      // Calculate weight based on trailing punctuation
      let weight = 1.0

      // Check for dramatic pause (ellipsis)
      if (word.includes('...')) {
        weight += 0.75
      }
      // Check for sentence-ending punctuation
      else if (/[.!?]$/.test(word)) {
        weight += 0.5
      }
      // Check for mid-sentence pause punctuation
      else if (/[,;:]$/.test(word)) {
        weight += 0.25
      }

      return {
        word,
        weight,
        index,
      }
    })
  }, [text])

  // Calculate timing for each word based on weights
  const wordTimings = useMemo(() => {
    if (wordData.length === 0 || !duration || duration <= 0) {
      return []
    }

    // Calculate total weight
    const totalWeight = wordData.reduce((sum, w) => sum + w.weight, 0)
    if (totalWeight === 0) {
      return []
    }

    // Calculate time per unit weight
    // Reserve a small buffer at the end (5%) to ensure we finish slightly early
    const effectiveDuration = duration * 0.95
    const timePerWeight = effectiveDuration / totalWeight

    // Calculate cumulative time for each word reveal
    let cumulativeTime = 0
    return wordData.map((w, index) => {
      const timing = {
        ...w,
        revealAt: cumulativeTime,
      }
      cumulativeTime += w.weight * timePerWeight
      return timing
    })
  }, [wordData, duration])

  // Reset state when text or duration changes
  useEffect(() => {
    setRevealedCount(0)
    elapsedTimeRef.current = 0
    lastTickRef.current = null
    completedRef.current = false
  }, [text, duration])

  // SYNC FIX: Reset timer when transitioning from not-playing to playing
  // This ensures subtitle animation starts fresh when audio actually begins
  useEffect(() => {
    if (isPlaying && !prevIsPlayingRef.current) {
      // Transition from not-playing to playing - reset timer for fresh sync
      elapsedTimeRef.current = 0
      lastTickRef.current = null
      setRevealedCount(0)
      completedRef.current = false
    }
    prevIsPlayingRef.current = isPlaying
  }, [isPlaying])

  // Handle showAll prop - reveal everything immediately
  useEffect(() => {
    if (showAll && wordData.length > 0) {
      setRevealedCount(wordData.length)
    }
  }, [showAll, wordData.length])

  // Fallback timeout: if audio doesn't start playing within 500ms, show all words
  // This ensures subtitles are always visible even when TTS fails
  useEffect(() => {
    // Only set fallback if we have words, audio isn't playing, showAll is false, and no words revealed yet
    if (wordData.length > 0 && !isPlaying && !showAll && revealedCount === 0) {
      const fallbackTimeout = setTimeout(() => {
        // After 500ms, if still no words revealed, show all as fallback
        setRevealedCount(prev => {
          if (prev === 0) {
            return wordData.length
          }
          return prev
        })
      }, 500)

      return () => clearTimeout(fallbackTimeout)
    }
  }, [wordData.length, isPlaying, showAll, revealedCount])

  // Animation loop for progressive reveal
  const tick = useCallback((timestamp) => {
    if (!isPlaying || showAll) {
      lastTickRef.current = null
      return
    }

    // Calculate delta time
    if (lastTickRef.current === null) {
      lastTickRef.current = timestamp
    }
    const deltaTime = timestamp - lastTickRef.current
    lastTickRef.current = timestamp

    // Update elapsed time
    elapsedTimeRef.current += deltaTime

    // Determine how many words should be revealed based on elapsed time
    let newRevealedCount = 0
    for (let i = 0; i < wordTimings.length; i++) {
      if (elapsedTimeRef.current >= wordTimings[i].revealAt) {
        newRevealedCount = i + 1
      } else {
        break
      }
    }

    // Update state if count changed
    setRevealedCount(prev => {
      if (newRevealedCount > prev) {
        return newRevealedCount
      }
      return prev
    })

    // Check if all words are revealed
    if (newRevealedCount >= wordTimings.length && !completedRef.current) {
      completedRef.current = true
      if (onComplete) {
        onComplete()
      }
    }

    // Continue animation if not all words revealed
    if (newRevealedCount < wordTimings.length) {
      animationFrameRef.current = requestAnimationFrame(tick)
    }
  }, [isPlaying, showAll, wordTimings, onComplete])

  // Start/stop animation based on isPlaying
  useEffect(() => {
    if (isPlaying && !showAll && wordTimings.length > 0 && revealedCount < wordTimings.length) {
      // Start animation
      animationFrameRef.current = requestAnimationFrame(tick)
    } else {
      // Pause - just stop the animation, keep state
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      lastTickRef.current = null
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlaying, showAll, wordTimings.length, revealedCount, tick])

  // Handle empty or invalid text
  if (!text || typeof text !== 'string' || wordData.length === 0) {
    return null
  }

  // If showAll or no duration, show everything
  const displayCount = showAll || !duration || duration <= 0 ? wordData.length : revealedCount

  return (
    <span className="inline">
      {wordData.map((item, index) => {
        const isRevealed = index < displayCount

        return (
          <span
            key={index}
            className={`transition-opacity duration-200 ${
              isRevealed ? 'opacity-100' : 'opacity-0'
            }`}
            aria-hidden={!isRevealed}
          >
            {item.word}
            {index < wordData.length - 1 ? ' ' : ''}
          </span>
        )
      })}
    </span>
  )
}

export default StreamingSubtitle
