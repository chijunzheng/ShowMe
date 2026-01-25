import { useState, useEffect, useRef } from 'react'

/**
 * StreamingSubtitle - Karaoke-style subtitle display with left-to-right reveal
 * Text is revealed smoothly from left to right, synced to audio playback progress
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

      // Calculate progress as percentage of audio playback
      const currentMs = audio.currentTime * 1000
      // Use 95% of duration so text finishes slightly before audio ends
      const effectiveDuration = duration * 0.95
      const newProgress = Math.min(100, (currentMs / effectiveDuration) * 100)

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

  return (
    <span className="relative inline-block w-full">
      {/* Background text (dimmed, always visible) */}
      <span className="opacity-30">
        {text}
      </span>
      {/* Revealed text (clipped to progress %) */}
      <span
        className="absolute inset-0 overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - displayProgress}% 0 0)`,
        }}
      >
        <span className="opacity-100">
          {text}
        </span>
      </span>
    </span>
  )
}

export default StreamingSubtitle
