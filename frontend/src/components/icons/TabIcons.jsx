/**
 * TabIcons - Emoji-based icons for bottom tab navigation
 * Uses emojis for a friendly, kid-friendly appearance
 *
 * Active: Full color, full opacity
 * Inactive: Reduced opacity only (no grayscale - keeps color visible)
 */

export function LearnIcon({ active = false, className = '' }) {
  return (
    <span
      className={`text-2xl transition-opacity ${active ? '' : 'opacity-50'} ${className}`}
      role="img"
      aria-label="Learn"
    >
      💡
    </span>
  )
}

export function WorldIcon({ active = false, className = '' }) {
  return (
    <span
      className={`text-2xl transition-opacity ${active ? '' : 'opacity-50'} ${className}`}
      role="img"
      aria-label="World"
    >
      🌍
    </span>
  )
}

export function QuizIcon({ active = false, className = '' }) {
  return (
    <span
      className={`text-2xl transition-opacity ${active ? '' : 'opacity-50'} ${className}`}
      role="img"
      aria-label="Quiz"
    >
      🧠
    </span>
  )
}
