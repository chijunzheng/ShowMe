/**
 * TopicNode Component
 * Refined topic pill with glassmorphism aesthetic
 * Clean, readable, with subtle depth
 */

// Category configuration - refined color palette
const CATEGORY_CONFIG = {
  Technology: { color: '#38BDF8', glow: 'shadow-sky-500/20' },
  Science: { color: '#A78BFA', glow: 'shadow-violet-500/20' },
  Biology: { color: '#4ADE80', glow: 'shadow-emerald-500/20' },
  Physics: { color: '#60A5FA', glow: 'shadow-blue-500/20' },
  Space: { color: '#818CF8', glow: 'shadow-indigo-500/20' },
  History: { color: '#FBBF24', glow: 'shadow-amber-500/20' },
  Nature: { color: '#2DD4BF', glow: 'shadow-teal-500/20' },
  Math: { color: '#F87171', glow: 'shadow-red-500/20' },
  Art: { color: '#FCD34D', glow: 'shadow-yellow-500/20' },
  Health: { color: '#F472B6', glow: 'shadow-pink-500/20' },
  Engineering: { color: '#94A3B8', glow: 'shadow-slate-500/20' },
  Chemistry: { color: '#C084FC', glow: 'shadow-purple-500/20' },
  Music: { color: '#FB7185', glow: 'shadow-rose-500/20' },
  Geography: { color: '#5EEAD4', glow: 'shadow-teal-400/20' },
  Economics: { color: '#FDE047', glow: 'shadow-yellow-400/20' },
  Psychology: { color: '#FDA4AF', glow: 'shadow-rose-400/20' },
  Philosophy: { color: '#C4B5FD', glow: 'shadow-violet-400/20' },
  Language: { color: '#FB923C', glow: 'shadow-orange-500/20' },
  General: { color: '#9CA3AF', glow: 'shadow-gray-500/20' },
}

// Category icons
const CATEGORY_ICONS = {
  Technology: '💻',
  Science: '🔬',
  Biology: '🧬',
  Physics: '⚛️',
  Space: '🚀',
  History: '📜',
  Nature: '🌿',
  Math: '📐',
  Art: '🎨',
  Health: '❤️',
  Engineering: '⚙️',
  Chemistry: '🧪',
  Music: '🎵',
  Geography: '🗺️',
  Economics: '💰',
  Psychology: '🧠',
  Philosophy: '💭',
  Language: '📝',
  General: '📚',
}

export function getNodeConfig(category) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.General
}

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.General
}

export default function TopicNode({
  topic,
  position,
  isActive,
  isHighlighted = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) {
  const config = getNodeConfig(topic.category)

  if (!position) return null

  // Truncate long topic names
  const displayName = topic.name.length > 18
    ? topic.name.slice(0, 16) + '...'
    : topic.name

  const isEmphasized = isActive || isHighlighted

  // Calculate follow-up count (slides minus header)
  const followUpCount = topic.followUpCount ??
    (topic.slides?.filter(s => s.type !== 'header').length || 0)

  return (
    <button
      onClick={() => onClick?.(topic)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        absolute transform -translate-x-1/2 -translate-y-1/2
        flex items-center gap-2 px-3 py-1.5
        rounded-full
        text-xs font-medium
        whitespace-nowrap
        transition-all duration-200 ease-out
        backdrop-blur-sm
        ${isEmphasized
          ? `ring-2 ring-offset-2 ring-offset-slate-900 scale-110 z-20 ${config.glow} shadow-lg`
          : 'hover:scale-105 hover:z-10'
        }
      `}
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: isEmphasized ? `${config.color}30` : 'rgba(30, 41, 59, 0.8)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: isEmphasized ? config.color : `${config.color}40`,
        color: isEmphasized ? config.color : '#E2E8F0',
        boxShadow: isEmphasized ? `0 0 20px ${config.color}30` : 'none',
      }}
      title={`${topic.name}${followUpCount > 0 ? ` (${followUpCount} follow-ups)` : ''}`}
    >
      <span className="text-sm leading-none opacity-90">
        {topic.icon || getCategoryIcon(topic.category)}
      </span>
      <span className="tracking-tight">{displayName}</span>
      {followUpCount > 0 && (
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: isEmphasized ? `${config.color}40` : 'rgba(51, 65, 85, 0.8)',
            color: isEmphasized ? config.color : '#94A3B8',
          }}
        >
          +{followUpCount}
        </span>
      )}
    </button>
  )
}

export { CATEGORY_CONFIG, CATEGORY_ICONS }
