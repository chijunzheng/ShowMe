/**
 * TabIcons - Emoji-based icons for bottom tab navigation
 * Uses emojis for a friendly, kid-friendly appearance
 */

export function LearnIcon({ active = false, className = '' }) {
  return (
    <span
      className={`text-2xl ${active ? '' : 'grayscale opacity-60'} ${className}`}
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
      className={`text-2xl ${active ? '' : 'grayscale opacity-60'} ${className}`}
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
      className={`text-2xl ${active ? '' : 'grayscale opacity-60'} ${className}`}
      role="img"
      aria-label="Quiz"
    >
      🧠
    </span>
  )
}
