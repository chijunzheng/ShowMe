import { useState, useEffect } from 'react'

/**
 * OwlAvatar - The friendly AI tutor mascot
 *
 * States:
 * - idle: Gentle breathing, occasional blink
 * - listening: Eyes wider, pulsing glow
 * - speaking: Beak animates, eyes happy
 * - thinking: Eyes look up, slight wobble
 */
function OwlAvatar({
  isListening = false,
  isSpeaking = false,
  isThinking = false,
  audioLevel = 0,
  size = 'lg' // 'sm', 'md', 'lg'
}) {
  const [isBlinking, setIsBlinking] = useState(false)
  const [beakOpen, setBeakOpen] = useState(false)

  // Random blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (Math.random() > 0.7 && !isListening) {
        setIsBlinking(true)
        setTimeout(() => setIsBlinking(false), 150)
      }
    }, 2000)
    return () => clearInterval(blinkInterval)
  }, [isListening])

  // Beak animation when speaking
  useEffect(() => {
    if (isSpeaking) {
      const beakInterval = setInterval(() => {
        setBeakOpen(prev => !prev)
      }, 150)
      return () => clearInterval(beakInterval)
    } else {
      setBeakOpen(false)
    }
  }, [isSpeaking])

  // Size classes
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  // Eye size based on state
  const eyeScale = isListening ? 1.1 : 1
  const pupilSize = isListening ? 8 : 6

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Glow effect when listening */}
      {isListening && (
        <div
          className="absolute inset-0 rounded-full bg-primary/20 animate-ping"
          style={{ animationDuration: '1.5s' }}
        />
      )}

      {/* Main owl SVG */}
      <svg
        viewBox="0 0 100 100"
        className={`
          w-full h-full transition-transform duration-300
          ${isListening ? 'scale-105' : ''}
          ${isThinking ? 'animate-bounce' : ''}
          ${!isListening && !isSpeaking && !isThinking ? 'animate-breathe' : ''}
        `}
      >
        {/* Body */}
        <ellipse
          cx="50"
          cy="58"
          rx="35"
          ry="32"
          className="fill-primary"
        />

        {/* Belly */}
        <ellipse
          cx="50"
          cy="65"
          rx="22"
          ry="20"
          className="fill-primary/80"
        />

        {/* Belly pattern */}
        <ellipse
          cx="50"
          cy="68"
          rx="16"
          ry="14"
          fill="#E0E7FF"
        />

        {/* Head */}
        <circle
          cx="50"
          cy="35"
          r="28"
          className="fill-primary"
        />

        {/* Ear tufts */}
        <path
          d="M28 18 L35 28 L25 28 Z"
          className="fill-primary"
        />
        <path
          d="M72 18 L65 28 L75 28 Z"
          className="fill-primary"
        />

        {/* Face disc (lighter area around eyes) */}
        <ellipse
          cx="50"
          cy="38"
          rx="22"
          ry="18"
          fill="#C7D2FE"
        />

        {/* Left eye white */}
        <ellipse
          cx="40"
          cy="36"
          rx={10 * eyeScale}
          ry={isBlinking ? 1 : 12 * eyeScale}
          fill="white"
          className="transition-all duration-100"
        />

        {/* Right eye white */}
        <ellipse
          cx="60"
          cy="36"
          rx={10 * eyeScale}
          ry={isBlinking ? 1 : 12 * eyeScale}
          fill="white"
          className="transition-all duration-100"
        />

        {/* Left pupil */}
        {!isBlinking && (
          <circle
            cx={40 + (isThinking ? -2 : 0)}
            cy={36 + (isThinking ? -3 : isSpeaking ? 2 : 0)}
            r={pupilSize}
            fill="#1E293B"
            className="transition-all duration-200"
          />
        )}

        {/* Right pupil */}
        {!isBlinking && (
          <circle
            cx={60 + (isThinking ? 2 : 0)}
            cy={36 + (isThinking ? -3 : isSpeaking ? 2 : 0)}
            r={pupilSize}
            fill="#1E293B"
            className="transition-all duration-200"
          />
        )}

        {/* Eye shine */}
        {!isBlinking && (
          <>
            <circle cx="43" cy="33" r="2" fill="white" />
            <circle cx="63" cy="33" r="2" fill="white" />
          </>
        )}

        {/* Beak */}
        <path
          d={beakOpen
            ? "M45 48 L50 58 L55 48 Z"
            : "M45 48 L50 54 L55 48 Z"
          }
          fill="#F59E0B"
          className="transition-all duration-100"
        />

        {/* Feet */}
        <ellipse cx="40" cy="88" rx="8" ry="4" fill="#F59E0B" />
        <ellipse cx="60" cy="88" rx="8" ry="4" fill="#F59E0B" />

        {/* Wings (subtle) */}
        <ellipse
          cx="22"
          cy="55"
          rx="8"
          ry="15"
          className="fill-primary/80"
          transform="rotate(-15 22 55)"
        />
        <ellipse
          cx="78"
          cy="55"
          rx="8"
          ry="15"
          className="fill-primary/80"
          transform="rotate(15 78 55)"
        />
      </svg>

      {/* Audio level indicator (subtle ring) */}
      {isListening && audioLevel > 0.1 && (
        <div
          className="absolute inset-0 rounded-full border-4 border-primary/40 transition-transform duration-75"
          style={{
            transform: `scale(${1 + audioLevel * 0.3})`,
            opacity: audioLevel
          }}
        />
      )}
    </div>
  )
}

export default OwlAvatar
