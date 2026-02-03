/**
 * BossBattleIntro - Boss battle intro cutscene component
 *
 * Displays a dramatic intro animation when a boss battle begins.
 * Features full-screen overlay, phased text animation, and screen shake effect.
 * Plays intro sound and calls onComplete after animation finishes.
 *
 * @param {Object} props
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {Function} props.onComplete - Callback when intro animation completes
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { getBossStyle, getIntroMessages, BOSS_BATTLE_CONFIG } from '@/hooks/game/bossBattleConfig'
import { playBossIntroSound } from '@/utils/soundEffects'

/**
 * Level-specific class mappings for styling.
 */
const LEVEL_CLASSES = {
  simple: 'from-emerald-900/95 to-green-800/95 simple',
  standard: 'from-cyan-900/95 to-blue-800/95 standard',
  deep: 'from-violet-900/95 to-purple-800/95 deep',
}

export default function BossBattleIntro({ level, onComplete }) {
  const [animationPhase, setAnimationPhase] = useState(0)

  // Get level-specific configuration with fallback
  const bossStyle = useMemo(() => getBossStyle(level), [level])
  const introMessages = useMemo(() => getIntroMessages(level), [level])

  // Select a random intro message
  const introMessage = useMemo(() => {
    const index = Math.floor(Math.random() * introMessages.length)
    return introMessages[index]
  }, [introMessages])

  // Get level class with fallback
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple

  // Memoized onComplete handler to prevent re-renders
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete()
    }
  }, [onComplete])

  // Play sound on mount and set up animation phases
  useEffect(() => {
    // Play intro sound with error handling
    try {
      playBossIntroSound()
    } catch {
      // Audio may not be available, silently continue
    }

    // Animate through phases
    const phase1Timer = setTimeout(() => setAnimationPhase(1), 300)
    const phase2Timer = setTimeout(() => setAnimationPhase(2), 800)
    const phase3Timer = setTimeout(() => setAnimationPhase(3), 1400)

    // Call onComplete after intro duration
    const completeTimer = setTimeout(handleComplete, BOSS_BATTLE_CONFIG.timing.introDuration)

    return () => {
      clearTimeout(phase1Timer)
      clearTimeout(phase2Timer)
      clearTimeout(phase3Timer)
      clearTimeout(completeTimer)
    }
  }, [handleComplete])

  return (
    <div
      data-testid="boss-battle-intro"
      role="alert"
      aria-live="assertive"
      className={`
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-gradient-to-br ${levelClass}
        animate-pulse
        ${animationPhase >= 1 ? 'scale-100' : 'scale-95'}
        transition-transform duration-300
      `}
    >
      {/* Screen shake container */}
      <div
        className={`
          flex flex-col items-center justify-center text-center px-6
          ${animationPhase >= 2 ? 'animate-shake' : ''}
        `}
        style={{
          animation: animationPhase >= 2 ? 'shake 0.5s ease-in-out' : 'none',
        }}
      >
        {/* Boss icon with entrance animation */}
        <div
          className={`
            text-7xl mb-6
            ${animationPhase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
            transition-all duration-500 ease-out
            ${animationPhase >= 3 ? 'animate-bounce' : ''}
          `}
          aria-hidden="true"
        >
          {bossStyle.icon}
        </div>

        {/* Boss name with fade-in */}
        <h2
          className={`
            text-3xl font-bold text-white mb-4
            ${animationPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            transition-all duration-400 ease-out
          `}
        >
          {bossStyle.name}
        </h2>

        {/* Intro message with late fade-in */}
        <p
          className={`
            text-xl text-white/90 max-w-md
            ${animationPhase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            transition-all duration-300 ease-out
          `}
        >
          {introMessage}
        </p>

        {/* BOSS BATTLE indicator */}
        <div
          className={`
            mt-8 px-6 py-2 rounded-full
            bg-white/20 backdrop-blur-sm
            border-2 border-white/30
            ${animationPhase >= 3 ? 'opacity-100' : 'opacity-0'}
            transition-opacity duration-300
          `}
        >
          <span className="text-lg font-bold text-white tracking-widest">
            BOSS BATTLE
          </span>
        </div>
      </div>

      {/* Inline keyframes for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}

BossBattleIntro.propTypes = {
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  onComplete: PropTypes.func,
}
