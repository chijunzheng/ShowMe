/**
 * RewardPopup Component
 * GAMIFY-004: Reward celebration overlay with animations
 *
 * Displays earned rewards with:
 * - Modal overlay
 * - Animated XP counter
 * - Item icons (if items earned)
 * - Confetti effect
 * - "Awesome!" close button
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Item icon mapping
 */
const ITEM_ICONS = {
  star: '★',
  badge: '🏅',
  trophy: '🏆',
  gem: '💎',
  crown: '👑',
  heart: '❤️',
  lightning: '⚡',
  fire: '🔥',
}

/**
 * Item rarity colors
 */
const RARITY_CLASSES = {
  common: 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600',
  uncommon: 'bg-green-50 dark:bg-green-900/30 border-green-400',
  rare: 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 rare',
  epic: 'bg-purple-50 dark:bg-purple-900/30 border-purple-400',
  legendary: 'bg-amber-50 dark:bg-amber-900/30 border-amber-400 gold special',
}

/**
 * Generate confetti pieces
 */
function generateConfetti(count = 40) {
  const colors = ['#6366F1', '#06B6D4', '#F59E0B', '#22C55E', '#EC4899', '#8B5CF6']

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
  }))
}

/**
 * @param {Object} props
 * @param {Object} props.rewards - { xp: number, items: Array<{ id, name, icon, rarity }> }
 * @param {Function} props.onClose - Callback when popup is closed
 */
export default function RewardPopup({ rewards, onClose }) {
  const [displayedXp, setDisplayedXp] = useState(0)
  const [confetti, setConfetti] = useState([])
  const contentRef = useRef(null)

  // Early return for null/undefined rewards
  if (!rewards) {
    return null
  }

  const { xp = 0, items = [] } = rewards

  // Animate XP counter
  useEffect(() => {
    if (xp <= 0) {
      setDisplayedXp(xp)
      return
    }

    const duration = 800 // ms
    const steps = 30
    const increment = xp / steps
    const stepDuration = duration / steps
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayedXp(xp)
        clearInterval(interval)
      } else {
        setDisplayedXp(Math.floor(increment * currentStep))
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [xp])

  // Generate confetti on mount
  useEffect(() => {
    setConfetti(generateConfetti())
  }, [])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }, [onClose])

  // Handle content click (prevent closing)
  const handleContentClick = useCallback((e) => {
    e.stopPropagation()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      data-testid="reward-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reward-popup-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        data-testid="reward-popup-backdrop"
        onClick={handleBackdropClick}
      />

      {/* Confetti */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        data-testid="confetti"
        aria-hidden="true"
      >
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${piece.x}%`,
              top: '-20px',
              width: `${piece.size}px`,
              height: `${piece.size}px`,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              transform: `rotate(${piece.rotation}deg)`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-10 w-full max-w-sm mx-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl animate-scale-in"
        data-testid="reward-popup-content"
        onClick={handleContentClick}
      >
        {/* Title */}
        <h2
          id="reward-popup-title"
          className="text-center text-xl font-bold text-gray-900 dark:text-white mb-6"
        >
          Rewards Earned!
        </h2>

        {/* XP Counter */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg animate-bounce-once"
            data-testid="xp-counter"
          >
            <div className="text-center">
              <span className="text-2xl font-bold text-white">
                +{displayedXp.toLocaleString()}
              </span>
              <span className="block text-xs text-white/80 font-medium">XP</span>
            </div>

            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
          </div>
        </div>

        {/* Items Section */}
        {items.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center mb-3">
              Items Received
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className={`
                    flex flex-col items-center p-3 rounded-xl border-2 transition-all
                    ${RARITY_CLASSES[item.rarity] || RARITY_CLASSES.common}
                    animate-scale-in
                  `}
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                  data-testid="reward-item"
                >
                  <span className="text-2xl mb-1">
                    {ITEM_ICONS[item.icon] || '🎁'}
                  </span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={() => onClose?.()}
          className="
            w-full py-3 px-4
            bg-gradient-to-r from-primary to-cyan-500
            text-white font-semibold rounded-xl
            shadow-lg shadow-primary/25
            hover:shadow-xl hover:shadow-primary/30
            active:scale-[0.98]
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
          "
          aria-label="Awesome! Close popup"
        >
          Awesome!
        </button>
      </div>
    </div>
  )
}
