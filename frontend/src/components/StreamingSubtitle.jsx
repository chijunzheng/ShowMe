import { useState, useEffect, useRef } from 'react'
import { SUBTITLE_STREAMING_CONFIG } from '../constants/appConfig.js'

/**
 * StreamingSubtitle - Karaoke-style subtitle display with smooth gradient reveal
 * Characters are revealed with a soft fade at the edge for smooth appearance
 *
 * @param {Object} props - Component props
 * @param {string} props.text - The full subtitle text to display
 * @param {number} props.duration - Total audio duration in milliseconds
 * @param {boolean} props.isPlaying - Whether audio is currently playing
 * @param {boolean} props.showAll - If true, show all text immediately (for manual navigation)
 * @param {Object} props.audioRef - React ref to the audio element for precise sync
 */
function StreamingSubtitle({ text, duration, isPlaying, showAll = false, audioRef }) {
  // Progress percentage (0-100) for the reveal animation
  const [progress, setProgress] = useState(0)
  // Animation frame ID for cleanup
  const animationFrameRef = useRef(null)

  // Total character count for linear progress calculation
  const totalChars = text ? text.length : 0

  // Reset progress when text changes (new slide)
  useEffect(() => {
    setProgress(0)
  }, [text])

  // Animation loop - sync progress to audio.currentTime
  useEffect(() => {
    if (showAll) {
      setProgress(100)
      return
    }

    if (!isPlaying) {
      // Stop animation when paused, keep current progress
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    const tick = () => {
      const audio = audioRef?.current
      if (!audio || !duration || duration <= 0) {
        animationFrameRef.current = requestAnimationFrame(tick)
        return
      }

      // Calculate progress as percentage of audio playback (exact 1:1 sync)
      const currentMs = audio.currentTime * 1000
      const newProgress = Math.min(
        100,
        (currentMs / duration) * 100 * SUBTITLE_STREAMING_CONFIG.SPEED_MULTIPLIER
      )

      setProgress(newProgress)

      // Continue animation if not complete
      if (newProgress < 100) {
        animationFrameRef.current = requestAnimationFrame(tick)
      }
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlaying, showAll, duration, audioRef])

  // Fallback: if audio doesn't start within 500ms, show all text
  useEffect(() => {
    if (!isPlaying && !showAll && progress === 0) {
      const fallbackTimeout = setTimeout(() => {
        setProgress(prev => prev === 0 ? 100 : prev)
      }, 500)
      return () => clearTimeout(fallbackTimeout)
    }
  }, [isPlaying, showAll, progress])

  // Handle empty or invalid text
  if (!text || typeof text !== 'string') {
    return null
  }

  const displayProgress = showAll ? 100 : progress

  // Linear character reveal: directly map audio progress to character count
  const charsToShow = Math.round((displayProgress / 100) * totalChars)

  // Gradient fade configuration
  // Index 0 = last revealed char (faintest), index 3 = 4th from edge (almost solid)
  const FADE_CHARS = 4
  const fadeOpacities = [0.15, 0.4, 0.7, 0.9]

  // Pre-split text into characters (memoized via useMemo would be better for perf)
  const characters = text.split('')

  return (
    <span>
      {characters.map((char, i) => {
        // Determine character state: revealed (solid), fading, or hidden
        const isRevealed = i < charsToShow
        const distanceFromEdge = charsToShow - 1 - i // 0 = last revealed, 1 = second last, etc.

        let opacity
        if (!isRevealed) {
          // Hidden - use visibility instead of opacity for better perf
          opacity = 0
        } else if (distanceFromEdge < FADE_CHARS && charsToShow < text.length) {
          // In fade zone (near the reveal edge)
          opacity = fadeOpacities[distanceFromEdge] ?? 0.15
        } else {
          // Fully revealed
          opacity = 1
        }

        return (
          <span
            key={i}
            style={{
              opacity,
              transition: 'opacity 80ms linear',
            }}
          >
            {char}
          </span>
        )
      })}
    </span>
  )
}

export default StreamingSubtitle
