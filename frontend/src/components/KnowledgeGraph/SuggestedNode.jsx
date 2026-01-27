/**
 * SuggestedNode Component
 * Renders a suggested "next topic" as a dashed pill
 * Positioned at cluster edges to guide learning
 */

import { getNodeConfig } from './TopicNode'

export default function SuggestedNode({
  suggestion,
  position,
  category = 'General',
  onClick,
  style = {},
}) {
  const config = getNodeConfig(category)

  if (!position) return null

  // Truncate long suggestion labels
  const displayLabel = suggestion.label.length > 18
    ? suggestion.label.slice(0, 16) + '...'
    : suggestion.label

  return (
    <button
      onClick={() => onClick?.(suggestion)}
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        flex items-center gap-1.5 px-2 py-1
        rounded-full
        text-[10px] font-medium
        whitespace-nowrap
        transition-all duration-200
        border border-dashed
        border-slate-500/50 hover:border-slate-400/70
        bg-slate-800/30 hover:bg-slate-700/40
        text-slate-400 hover:text-slate-300
        cursor-pointer
        opacity-70 hover:opacity-100
        hover:scale-105
      `}
      style={{
        left: position.x,
        top: position.y,
        ...style,
      }}
      title={`Suggested: ${suggestion.label}`}
    >
      <span className="text-slate-500">+</span>
      <span className="truncate max-w-[90px]">{displayLabel}</span>
    </button>
  )
}
