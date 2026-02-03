/**
 * TreeQuizReaction Component
 *
 * Displays visual reactions on the Magical Tree when quiz results occur.
 * Features phase-based animations (enter, active, exit), particle effects,
 * and encouraging messages.
 *
 * Reaction Types:
 * - pass: Shimmer effect with leaves (emerald)
 * - perfect: Growth animation with sparkles (amber)
 * - boss_victory: Dance animation with fireworks (purple)
 * - streak: Quick glow with streaks (cyan)
 * - fail: Gentle droop with encouraging message (slate)
 *
 * @param {Object} props
 * @param {Object} props.reaction - Reaction data { type, score, topicName, streakCount, timestamp }
 * @param {Function} props.onComplete - Callback when reaction animation ends
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { getReactionConfig, PARTICLE_CONFIGS } from './treeReactionConfig'
import {
  playEvolutionSound,
  playTierUpSound,
  playBossVictorySound,
  playStreakSound,
} from '@/utils/soundEffects'

/**
 * Animation phase durations in milliseconds
 */
const PHASE_TIMING = {
  enter: 300,
  exitBuffer: 300, // Time before end to start exit phase
}

/**
 * Sound effect function mapping
 */
const SOUND_FUNCTIONS = {
  playEvolutionSound,
  playTierUpSound,
  playBossVictorySound,
  playStreakSound,
}

/**
 * Color class mappings for each reaction type
 */
const COLOR_CLASSES = {
  emerald: 'bg-emerald-500/20 border-emerald-400',
  amber: 'bg-amber-500/20 border-amber-400',
  purple: 'bg-purple-500/20 border-purple-400',
  cyan: 'bg-cyan-500/20 border-cyan-400',
  slate: 'bg-slate-500/20 border-slate-400',
}

/**
 * Animation class mappings for each animation type
 */
const ANIMATION_CLASSES = {
  shimmer: 'animate-shimmer shimmer',
  growth: 'animate-growth growth',
  dance: 'animate-dance dance',
  glow: 'animate-glow glow',
  gentle_droop: 'animate-droop gentle-droop droop',
}

/**
 * Particles Component - Renders particle effects for reactions
 */
function Particles({ type, config }) {
  const particles = useMemo(() => {
    if (!config) return []

    return [...Array(config.count)].map((_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${-10 - Math.random() * 10}%`,
      color: config.colors[i % config.colors.length],
      delay: `${(i * 0.08).toFixed(2)}s`,
      duration: `${(1.5 + Math.random() * 1).toFixed(2)}s`,
      size: type === 'fireworks' ? 8 : type === 'sparkles' ? 6 : 5,
    }))
  }, [config, type])

  if (!config || particles.length === 0) return null

  return (
    <div
      data-testid={`particles-${type}`}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          data-particle
          className="absolute rounded-full animate-particle-fall"
          style={{
            left: p.left,
            top: p.top,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  )
}

Particles.propTypes = {
  type: PropTypes.string.isRequired,
  config: PropTypes.shape({
    count: PropTypes.number.isRequired,
    colors: PropTypes.arrayOf(PropTypes.string).isRequired,
    speed: PropTypes.number.isRequired,
  }),
}

/**
 * TreeQuizReaction - Main reaction overlay component
 */
export default function TreeQuizReaction({ reaction, onComplete }) {
  const [phase, setPhase] = useState('enter')
  const soundPlayedRef = useRef(false)
  const reactionKeyRef = useRef(null)

  // Get normalized reaction type (fallback to 'pass' for unknown types)
  const normalizedType = useMemo(() => {
    if (!reaction?.type) return null
    const validTypes = ['pass', 'perfect', 'boss_victory', 'streak', 'fail']
    return validTypes.includes(reaction.type) ? reaction.type : 'pass'
  }, [reaction?.type])

  // Get reaction config
  const config = useMemo(() => {
    if (!normalizedType) return null
    return getReactionConfig(normalizedType)
  }, [normalizedType])

  // Get particle config
  const particleConfig = useMemo(() => {
    if (!config?.particles) return null
    return PARTICLE_CONFIGS[config.particles] || null
  }, [config])

  // Play sound effect (with error handling)
  const playSound = useCallback(() => {
    if (!config?.sound || soundPlayedRef.current) return

    const soundFn = SOUND_FUNCTIONS[config.sound]
    if (soundFn) {
      try {
        soundFn()
      } catch {
        // Audio may not be available, silently continue
      }
    }
    soundPlayedRef.current = true
  }, [config])

  // Handle sound effect
  useEffect(() => {
    if (!reaction || !config) {
      soundPlayedRef.current = false
      return
    }

    // Create a unique key for this reaction to detect changes
    const reactionKey = `${reaction.type}-${reaction.timestamp || Date.now()}`

    // If this is a new reaction, reset and play sound
    if (reactionKeyRef.current !== reactionKey) {
      reactionKeyRef.current = reactionKey
      soundPlayedRef.current = false
      setPhase('enter')
      playSound()
    }
  }, [reaction, config, playSound])

  // Handle phase transitions and completion timer
  useEffect(() => {
    if (!reaction || !config) {
      return
    }

    // Phase transitions
    const enterDuration = PHASE_TIMING.enter
    const totalDuration = config.duration
    const exitStart = totalDuration - PHASE_TIMING.exitBuffer

    // Enter -> Active
    const enterTimer = setTimeout(() => {
      setPhase('active')
    }, enterDuration)

    // Active -> Exit
    const exitTimer = setTimeout(() => {
      setPhase('exit')
    }, exitStart)

    // Complete callback
    const completeTimer = setTimeout(() => {
      onComplete?.()
    }, totalDuration)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(exitTimer)
      clearTimeout(completeTimer)
    }
  }, [reaction, config, onComplete])

  // Don't render if no reaction
  if (!reaction || !config) {
    return null
  }

  const colorClass = COLOR_CLASSES[config.color] || COLOR_CLASSES.emerald
  const animationClass = ANIMATION_CLASSES[config.animation] || ANIMATION_CLASSES.shimmer

  return (
    <div
      data-testid="tree-quiz-reaction"
      data-reaction-type={normalizedType}
      data-phase={phase}
      aria-hidden="true"
      className={`
        absolute inset-0 z-40
        flex flex-col items-center justify-center
        rounded-xl border-2
        ${colorClass}
        ${animationClass}
        transition-all duration-300
        ${phase === 'enter' ? 'opacity-0 scale-95' : ''}
        ${phase === 'active' ? 'opacity-100 scale-100' : ''}
        ${phase === 'exit' ? 'opacity-0 scale-95' : ''}
      `}
    >
      {/* Particle effects */}
      {particleConfig && (
        <Particles type={config.particles} config={particleConfig} />
      )}

      {/* Message display */}
      {config.message && (
        <div
          data-testid="reaction-message"
          className={`
            relative z-10
            px-4 py-2
            rounded-lg
            bg-white/90 dark:bg-gray-800/90
            shadow-lg
            text-center
          `}
        >
          {/* Topic name if provided */}
          {reaction.topicName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {reaction.topicName}
            </p>
          )}

          {/* Main message */}
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {config.message}
          </p>
        </div>
      )}

      {/* Streak count display */}
      {normalizedType === 'streak' && reaction.streakCount && (
        <div
          data-testid="streak-count"
          className="
            relative z-10
            px-6 py-3
            rounded-full
            bg-cyan-500/90
            text-white
            text-3xl font-bold
            animate-bounce
          "
        >
          {reaction.streakCount}
        </div>
      )}

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes particle-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(120vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-particle-fall {
          animation: particle-fall 2s ease-out forwards;
        }
        @keyframes shimmer {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.3);
          }
        }
        .animate-shimmer {
          animation: shimmer 1s ease-in-out infinite;
        }
        @keyframes growth {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        .animate-growth {
          animation: growth 1.5s ease-in-out infinite;
        }
        @keyframes dance {
          0%, 100% {
            transform: translateX(0) rotate(0deg);
          }
          25% {
            transform: translateX(-5px) rotate(-2deg);
          }
          75% {
            transform: translateX(5px) rotate(2deg);
          }
        }
        .animate-dance {
          animation: dance 0.5s ease-in-out infinite;
        }
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(6, 182, 212, 0.8);
          }
        }
        .animate-glow {
          animation: glow 0.8s ease-in-out infinite;
        }
        @keyframes droop {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(3px);
          }
        }
        .animate-droop {
          animation: droop 1s ease-in-out;
        }
      `}</style>
    </div>
  )
}

TreeQuizReaction.propTypes = {
  reaction: PropTypes.shape({
    type: PropTypes.string.isRequired,
    score: PropTypes.number,
    topicName: PropTypes.string,
    streakCount: PropTypes.number,
    timestamp: PropTypes.number,
  }),
  onComplete: PropTypes.func,
}
