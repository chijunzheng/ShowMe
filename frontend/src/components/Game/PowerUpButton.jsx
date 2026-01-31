/**
 * PowerUpButton Component
 *
 * PHASE-5: Power-Ups System
 * Individual power-up button with icon, name, count badge,
 * activation animation, and tooltip.
 *
 * Props:
 * - powerUp: { id, name, icon, description }
 * - count: number of items owned
 * - onActivate: callback when activated
 * - disabled: force disabled state
 * - isActive: whether effect is currently active
 */

function PowerUpButton({
  powerUp,
  count = 0,
  onActivate,
  disabled = false,
  isActive = false,
}) {
  const isDisabled = disabled || count === 0 || isActive

  const handleClick = () => {
    if (!isDisabled && onActivate) {
      onActivate(powerUp.id)
    }
  }

  // Build aria-label based on state
  const getAriaLabel = () => {
    if (isActive) {
      return `${powerUp.name} power-up (active)`
    }
    if (count === 0) {
      return `${powerUp.name} power-up (none available)`
    }
    return `Activate ${powerUp.name} power-up (${count} remaining)`
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={powerUp.description}
      aria-label={getAriaLabel()}
      className={`
        relative flex flex-col items-center justify-center
        px-3 py-2 min-h-[44px] min-w-[60px]
        rounded-xl border-2 transition-all duration-200
        ${isDisabled
          ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-50'
          : 'border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 hover:scale-105 active:scale-95'
        }
        ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
    >
      {/* Icon */}
      <span
        className="text-xl leading-none"
        data-testid={`powerup-icon-${powerUp.id}`}
      >
        {powerUp.icon}
      </span>

      {/* Name */}
      <span className="text-xs font-medium mt-1 text-gray-700">
        {powerUp.name}
      </span>

      {/* Count Badge */}
      <span
        data-testid="power-up-count"
        className={`
          absolute -top-1 -right-1
          min-w-[20px] h-5 px-1
          flex items-center justify-center
          text-xs font-bold rounded-full
          ${count > 0 ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'}
        `}
      >
        {count}
      </span>

      {/* Active Indicator */}
      {isActive && (
        <span
          data-testid="active-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-500 animate-pulse"
        />
      )}
    </button>
  )
}

export default PowerUpButton
