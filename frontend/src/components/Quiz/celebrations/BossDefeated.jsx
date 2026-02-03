/**
 * BossDefeated - Boss victory celebration component
 *
 * Displays a celebratory overlay when the player defeats a boss.
 * Features confetti effects, XP bonus display, and victory sound.
 * Automatically dismisses after the victory duration.
 *
 * @param {Object} props
 * @param {'simple'|'standard'|'deep'} props.level - Difficulty level for styling
 * @param {number} props.xpBonus - XP bonus to display (default: 25)
 * @param {boolean} props.show - Whether to show the celebration
 * @param {Function} props.onComplete - Callback when celebration ends
 */

import { useEffect, useMemo, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { getBossStyle, BOSS_BATTLE_CONFIG } from '@/hooks/game/bossBattleConfig'
import { playBossVictorySound } from '@/utils/soundEffects'

/**
 * Level-specific class mappings for victory styling.
 */
const LEVEL_CLASSES = {
  simple: 'from-emerald-500/95 to-green-600/95 simple',
  standard: 'from-cyan-500/95 to-blue-600/95 standard',
  deep: 'from-violet-500/95 to-purple-600/95 deep',
}

export default function BossDefeated({ level, xpBonus = 25, show, onComplete }) {
  const soundPlayedRef = useRef(false)

  // Get level-specific configuration with fallback
  const bossStyle = useMemo(() => getBossStyle(level), [level])
  const levelClass = LEVEL_CLASSES[level] || LEVEL_CLASSES.simple

  // Memoized onComplete handler
  const handleComplete = useCallback(() => {
    if (onComplete) {
      onComplete()
    }
  }, [onComplete])

  // Play sound and set timer when shown
  useEffect(() => {
    if (!show) {
      soundPlayedRef.current = false
      return
    }

    // Play victory sound with error handling
    if (!soundPlayedRef.current) {
      try {
        playBossVictorySound()
      } catch {
        // Audio may not be available, silently continue
      }
      soundPlayedRef.current = true
    }

    // Call onComplete after victory duration
    const timer = setTimeout(handleComplete, BOSS_BATTLE_CONFIG.timing.victoryDuration)

    return () => {
      clearTimeout(timer)
    }
  }, [show, handleComplete])

  // Don't render if not shown
  if (!show) {
    return null
  }

  return (
    <div
      data-testid="boss-defeated"
      role="status"
      aria-live="polite"
      className={`
        fixed inset-0 z-50
        flex flex-col items-center justify-center
        bg-gradient-to-br ${levelClass}
        animate-scale-in
        celebration confetti
      `}
    >
      {/* Confetti particles */}
      <div data-testid="confetti" className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 rounded-full animate-confetti"
            style={{
              left: `${10 + (i * 7)}%`,
              top: '-10%',
              backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#22C55E', '#3B82F6'][i % 6],
              animationDelay: `${i * 0.1}s`,
              animationDuration: '2s',
            }}
          />
        ))}
      </div>

      {/* Victory content */}
      <div className="relative z-10 text-center px-6">
        {/* Victory icon with bounce animation */}
        <div className="text-7xl mb-4 animate-bounce">
          <span aria-hidden="true">{bossStyle.icon}</span>
        </div>

        {/* Victory message */}
        <h2 className="text-3xl font-bold text-white mb-2 animate-pulse">
          Boss Defeated!
        </h2>

        <p className="text-xl text-white/90 mb-6">
          You beat the {bossStyle.name}!
        </p>

        {/* XP Bonus display */}
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30">
          <span className="text-2xl" aria-hidden="true">
            +
          </span>
          <span className="text-3xl font-bold text-yellow-300">
            {xpBonus}
          </span>
          <span className="text-xl text-white font-medium">
            XP Bonus!
          </span>
        </div>
      </div>

      {/* Inline keyframes for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
        @keyframes scale-in {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

BossDefeated.propTypes = {
  level: PropTypes.oneOf(['simple', 'standard', 'deep']),
  xpBonus: PropTypes.number,
  show: PropTypes.bool,
  onComplete: PropTypes.func,
}
