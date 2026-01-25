import { useState, useEffect, useRef, useMemo } from 'react'

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

  // Calculate cumulative weights for each CHARACTER for smooth reveal
  // Word weights are spread across their characters for natural pacing
  const { charWeights, totalWeight } = useMemo(() => {
    if (!text) return { charWeights: [], totalWeight: 0 }

    const weights = []
    let cumWeight = 0

    // Split into words while preserving spaces
    const wordList = text.split(/(\s+)/).filter(w => w.length > 0)

    for (const word of wordList) {
      let wordWeight

      // Whitespace has minimal weight
      if (/^\s+$/.test(word)) {
        wordWeight = 0.3
      } else {
        // Base weight: character count (proxy for syllables/pronunciation time)
        wordWeight = word.length

        // Add weight for punctuation pauses (natural speech rhythm)
        if (/[.!?]$/.test(word)) wordWeight += 4        // Full stop - longer pause
        else if (/\.\.\./.test(word)) wordWeight += 6   // Ellipsis - dramatic pause
        else if (/[,;:]$/.test(word)) wordWeight += 2   // Comma - short pause
      }

      // Spread word weight across its characters for smooth reveal
      const weightPerChar = wordWeight / word.length
      for (let i = 0; i < word.length; i++) {
        cumWeight += weightPerChar
        weights.push(cumWeight)
      }
    }

    return { charWeights: weights, totalWeight: cumWeight }
  }, [text])

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
      const newProgress = Math.min(100, (currentMs / duration) * 100)

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

  // Character-based reveal: find how many chars to show based on weighted progress
  const targetWeight = (displayProgress / 100) * totalWeight
  let charsToShow = 0

  for (let i = 0; i < charWeights.length; i++) {
    if (charWeights[i] <= targetWeight) {
      charsToShow = i + 1
    } else {
      break
    }
  }

  // Gradient fade: split revealed text into solid + fading edge
  const FADE_CHARS = 4 // Number of characters in the fade gradient
  const solidEnd = Math.max(0, charsToShow - FADE_CHARS)
  const solidText = text.slice(0, solidEnd)

  // Fading characters with decreasing opacity
  const fadeChars = text.slice(solidEnd, charsToShow).split('')
  const fadeOpacities = [0.85, 0.6, 0.35, 0.15] // Gradient from visible to faint

  const unrevealedText = text.slice(charsToShow)

  // When showing all or near end, no fade needed
  if (showAll || charsToShow >= text.length - 2) {
    return (
      <span>
        {text.slice(0, charsToShow)}
        <span className="invisible">{unrevealedText}</span>
      </span>
    )
  }

  return (
    <span>
      {solidText}
      {fadeChars.map((char, i) => (
        <span
          key={i}
          style={{ opacity: fadeOpacities[i] || 0.15 }}
        >
          {char}
        </span>
      ))}
      {/* Invisible placeholder to maintain full text width for proper centering */}
      <span className="invisible">{unrevealedText}</span>
    </span>
  )
}

export default StreamingSubtitle
