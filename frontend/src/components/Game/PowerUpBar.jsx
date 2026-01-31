/**
 * PowerUpBar Component
 *
 * PHASE-5: Power-Ups System
 * Horizontal bar showing available power-ups with activation controls.
 *
 * Props:
 * - inventory: { [itemId]: count } object
 * - activeEffects: Array of active timed effects
 * - onActivatePowerUp: callback when power-up is activated
 */

import PowerUpButton from './PowerUpButton'

/**
 * Power-up definitions with icons and descriptions
 */
const POWER_UP_DEFINITIONS = [
  {
    id: 'hint_boost',
    name: 'Hint',
    icon: '\u{1F4A1}', // lightbulb
    description: 'Get a helpful hint on your next question',
  },
  {
    id: 'xp_multiplier',
    name: '2x XP',
    icon: '\u{2728}', // sparkles
    description: 'Double XP for 60 seconds',
  },
  {
    id: 'skip_token',
    name: 'Skip',
    icon: '\u{23E9}', // fast forward
    description: 'Skip a question without penalty',
  },
]

/**
 * Format remaining time for display
 * @param {number} ms - Milliseconds remaining
 * @returns {string} Formatted time (e.g., "45s")
 */
function formatRemainingTime(ms) {
  if (!ms || ms <= 0) return ''
  const seconds = Math.ceil(ms / 1000)
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${seconds}s`
}

function PowerUpBar({
  inventory,
  activeEffects,
  onActivatePowerUp,
}) {
  const safeInventory = inventory || {}
  const safeActiveEffects = activeEffects || []

  /**
   * Check if a power-up effect is currently active
   */
  const isEffectActive = (powerUpId) => {
    return safeActiveEffects.some((effect) => effect.id === powerUpId)
  }

  /**
   * Get the active effect for a power-up
   */
  const getActiveEffect = (powerUpId) => {
    return safeActiveEffects.find((effect) => effect.id === powerUpId)
  }

  /**
   * Handle power-up activation
   */
  const handleActivate = (powerUpId) => {
    if (onActivatePowerUp) {
      onActivatePowerUp(powerUpId)
    }
  }

  return (
    <div
      data-testid="power-up-bar"
      role="toolbar"
      aria-label="Power-ups"
      className="flex gap-2 p-2 bg-white/80 backdrop-blur-sm rounded-xl shadow-sm"
    >
      {POWER_UP_DEFINITIONS.map((powerUp) => {
        const count = safeInventory[powerUp.id] || 0
        const isActive = isEffectActive(powerUp.id)
        const activeEffect = getActiveEffect(powerUp.id)

        return (
          <div key={powerUp.id} className="relative">
            <PowerUpButton
              powerUp={powerUp}
              count={count}
              onActivate={handleActivate}
              isActive={isActive}
            />
            {/* Timer display for active effects */}
            {isActive && activeEffect?.remainingMs && (
              <span
                data-testid="effect-timer"
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium text-primary whitespace-nowrap"
              >
                {formatRemainingTime(activeEffect.remainingMs)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PowerUpBar
