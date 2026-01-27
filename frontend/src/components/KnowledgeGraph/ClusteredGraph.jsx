/**
 * ClusteredGraph Component
 * Clean, organized knowledge map with category clusters
 * Uses HTML elements instead of canvas for better readability
 */

import { useMemo, useState } from 'react'

// Category configuration with colors and icons
const CATEGORY_CONFIG = {
  Technology: { color: '#0EA5E9', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/30', icon: '💻' },
  Science: { color: '#8B5CF6', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30', icon: '🔬' },
  Biology: { color: '#22C55E', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30', icon: '🧬' },
  Physics: { color: '#3B82F6', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', icon: '⚛️' },
  Space: { color: '#6366F1', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30', icon: '🚀' },
  History: { color: '#D97706', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', icon: '📜' },
  Nature: { color: '#10B981', bgColor: 'bg-teal-500/10', borderColor: 'border-teal-500/30', icon: '🌿' },
  Math: { color: '#EF4444', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30', icon: '📐' },
  Art: { color: '#F59E0B', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', icon: '🎨' },
  Health: { color: '#EC4899', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30', icon: '❤️' },
  Engineering: { color: '#64748B', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/30', icon: '⚙️' },
  General: { color: '#6B7280', bgColor: 'bg-gray-500/10', borderColor: 'border-gray-500/30', icon: '📚' },
}

function TopicPill({ topic, isActive, onClick }) {
  const config = CATEGORY_CONFIG[topic.category] || CATEGORY_CONFIG.General

  return (
    <button
      onClick={() => onClick?.(topic)}
      className={`
        group flex items-center gap-2 px-3 py-1.5
        rounded-lg text-left
        transition-all duration-200
        hover:scale-[1.02]
        ${isActive
          ? 'bg-primary/20 border-primary/50 ring-1 ring-primary/30'
          : `${config.bgColor} border ${config.borderColor} hover:border-opacity-60`
        }
      `}
    >
      <span className="text-sm flex-shrink-0">{topic.icon || config.icon}</span>
      <span className={`
        text-xs font-medium truncate max-w-[120px]
        ${isActive ? 'text-primary' : 'text-slate-200'}
      `}>
        {topic.name}
      </span>
    </button>
  )
}

function CategoryCluster({ category, topics, activeTopicId, onTopicClick }) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.General
  const [isExpanded, setIsExpanded] = useState(true)

  if (topics.length === 0) return null

  return (
    <div className="mb-4">
      {/* Category header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 mb-2 w-full text-left group"
      >
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
          style={{ backgroundColor: `${config.color}20` }}
        >
          {config.icon}
        </span>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex-1">
          {category}
        </span>
        <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {topics.length}
        </span>
        <svg
          className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Topics grid */}
      {isExpanded && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {topics.map((topic) => (
            <TopicPill
              key={topic.id}
              topic={topic}
              isActive={topic.id === activeTopicId}
              onClick={onTopicClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ClusteredGraph({
  topics = [],
  activeTopicId,
  onTopicClick,
  className = '',
}) {
  // Group topics by category
  const clusters = useMemo(() => {
    const grouped = {}

    topics.forEach(topic => {
      const category = topic.category || 'General'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(topic)
    })

    // Sort categories by topic count (most topics first)
    const sortedCategories = Object.entries(grouped)
      .sort((a, b) => b[1].length - a[1].length)

    return sortedCategories
  }, [topics])

  if (topics.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-slate-500 px-6">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-sm">Ask a question to start building your knowledge map</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-3 overflow-y-auto ${className}`}>
      {clusters.map(([category, categoryTopics]) => (
        <CategoryCluster
          key={category}
          category={category}
          topics={categoryTopics}
          activeTopicId={activeTopicId}
          onTopicClick={onTopicClick}
        />
      ))}
    </div>
  )
}
