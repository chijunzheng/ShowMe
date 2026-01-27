/**
 * ArcaneReveal Component
 * WB017: Full-screen celebration animation when the arcane zone is unlocked
 *
 * This component displays a dramatic animation with:
 * - Clouds parting to reveal the arcane zone
 * - "The Arcane Zone Awakens!" text
 * - Star/magic particle effects
 * - Auto-dismisses after animation or on tap/click
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * Generate random star positions for the particle effect
 * @param {number} count - Number of stars to generate
 * @returns {Array} Array of star objects with position and animation properties
 */
function generateStars(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 2,
    duration: Math.random() * 2 + 1,
  }))
}

/**
 * ArcaneReveal - Dramatic reveal animation for arcane zone unlock
 *
 * @param {Object} props - Component props
 * @param {Function} props.onComplete - Callback when animation completes or is dismissed
 */
function ArcaneReveal({ onComplete }) {
  // Animation phase states
  const [phase, setPhase] = useState('clouds') // 'clouds' -> 'reveal' -> 'text' -> 'fade'
  const [stars] = useState(() => generateStars(50))

  /**
   * Progress through animation phases automatically
   */
  useEffect(() => {
    const timers = []

    // Phase 1: Clouds part (0-1.5s)
    timers.push(setTimeout(() => setPhase('reveal'), 1500))

    // Phase 2: Stars appear and shine (1.5-3s)
    timers.push(setTimeout(() => setPhase('text'), 3000))

    // Phase 3: Text display (3-5.5s)
    timers.push(setTimeout(() => setPhase('fade'), 5500))

    // Phase 4: Fade out and complete (5.5-6.5s)
    timers.push(setTimeout(() => {
      onComplete?.()
    }, 6500))

    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  /**
   * Allow user to skip animation by clicking
   */
  const handleClick = useCallback(() => {
    onComplete?.()
  }, [onComplete])

  /**
   * Allow user to skip animation with keyboard
   */
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onComplete?.()
    }
  }, [onComplete])

  return (
    <div
      className={`
        fixed inset-0 z-50
        flex items-center justify-center
        bg-gradient-to-b from-slate-900 via-indigo-950 to-purple-950
        cursor-pointer
        transition-opacity duration-1000
        ${phase === 'fade' ? 'opacity-0' : 'opacity-100'}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Arcane zone awakening celebration. Click or press any key to dismiss."
    >
      {/* Stars/magic particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <div
            key={star.id}
            className={`
              absolute rounded-full bg-white
              ${phase === 'reveal' || phase === 'text' ? 'opacity-100' : 'opacity-0'}
              transition-opacity duration-500
            `}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animation: phase === 'reveal' || phase === 'text'
                ? `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`
                : 'none',
            }}
          />
        ))}
      </div>

      {/* Parting clouds effect */}
      <div
        className={`
          absolute inset-0 overflow-hidden pointer-events-none
          transition-all duration-1500 ease-out
        `}
      >
        {/* Top cloud layer */}
        <div
          className={`
            absolute inset-x-0 h-1/2
            bg-gradient-to-b from-slate-600/90 via-slate-700/80 to-transparent
            transition-transform duration-1500 ease-out
            ${phase !== 'clouds' ? '-translate-y-full' : 'translate-y-0'}
          `}
        >
          {/* Cloud texture */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: `
                radial-gradient(ellipse 60% 40% at 30% 80%, rgba(100, 116, 139, 0.6) 0%, transparent 70%),
                radial-gradient(ellipse 80% 50% at 70% 70%, rgba(100, 116, 139, 0.5) 0%, transparent 60%),
                radial-gradient(ellipse 50% 30% at 50% 90%, rgba(100, 116, 139, 0.4) 0%, transparent 50%)
              `,
            }}
          />
        </div>

        {/* Bottom cloud layer */}
        <div
          className={`
            absolute inset-x-0 bottom-0 h-1/2
            bg-gradient-to-t from-slate-600/90 via-slate-700/80 to-transparent
            transition-transform duration-1500 ease-out
            ${phase !== 'clouds' ? 'translate-y-full' : 'translate-y-0'}
          `}
        >
          {/* Cloud texture */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background: `
                radial-gradient(ellipse 60% 40% at 30% 20%, rgba(100, 116, 139, 0.6) 0%, transparent 70%),
                radial-gradient(ellipse 80% 50% at 70% 30%, rgba(100, 116, 139, 0.5) 0%, transparent 60%),
                radial-gradient(ellipse 50% 30% at 50% 10%, rgba(100, 116, 139, 0.4) 0%, transparent 50%)
              `,
            }}
          />
        </div>
      </div>

      {/* Central glow effect */}
      <div
        className={`
          absolute w-64 h-64 rounded-full
          bg-gradient-radial from-purple-500/30 via-indigo-500/20 to-transparent
          transition-all duration-1000
          ${phase === 'reveal' || phase === 'text' ? 'scale-150 opacity-100' : 'scale-50 opacity-0'}
        `}
        style={{
          animation: phase === 'reveal' || phase === 'text'
            ? 'pulse 2s ease-in-out infinite'
            : 'none',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center px-8">
        {/* Arcane symbol */}
        <div
          className={`
            mx-auto w-24 h-24 mb-6
            flex items-center justify-center
            rounded-full
            bg-gradient-to-br from-purple-500/40 to-indigo-600/40
            border-2 border-purple-400/50
            shadow-lg shadow-purple-500/30
            transition-all duration-700
            ${phase === 'reveal' || phase === 'text'
              ? 'scale-100 opacity-100 rotate-0'
              : 'scale-50 opacity-0 rotate-180'}
          `}
        >
          <span
            className="text-5xl"
            style={{
              filter: 'drop-shadow(0 0 10px rgba(168, 85, 247, 0.6))',
            }}
          >
            &#x2728;
          </span>
        </div>

        {/* Title text */}
        <h1
          className={`
            text-3xl sm:text-4xl md:text-5xl font-bold
            text-transparent bg-clip-text
            bg-gradient-to-r from-purple-300 via-white to-indigo-300
            drop-shadow-lg
            transition-all duration-700
            ${phase === 'text' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
          style={{
            textShadow: '0 0 30px rgba(168, 85, 247, 0.5)',
          }}
        >
          The Arcane Zone Awakens!
        </h1>

        {/* Subtitle */}
        <p
          className={`
            mt-4 text-lg sm:text-xl
            text-purple-200/80
            transition-all duration-700 delay-200
            ${phase === 'text' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          Mysteries await those who seek knowledge
        </p>

        {/* Tap to continue hint */}
        <p
          className={`
            mt-8 text-sm
            text-white/40
            transition-all duration-500 delay-500
            ${phase === 'text' ? 'opacity-100' : 'opacity-0'}
          `}
        >
          Tap anywhere to continue
        </p>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        .transition-duration-1500 {
          transition-duration: 1500ms;
        }

        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-stops));
        }
      `}</style>
    </div>
  )
}

export default ArcaneReveal
