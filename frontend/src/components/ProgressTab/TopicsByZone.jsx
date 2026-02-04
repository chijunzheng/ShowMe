/**
 * TopicsByZone Component
 *
 * Displays topics grouped by zone (Nature, Civilization, Arcane).
 * Collapsible sections for better organization.
 */

import { useMemo, useState, useCallback } from 'react'
import { getReviewStatus, REVIEW_STATUS } from '../../utils/reviewUtils'
import { ZONE_ICONS } from '../../constants/world'

/**
 * Zone configuration
 */
const ZONES = [
  { id: 'nature', label: 'Nature', icon: '🌿', color: 'emerald' },
  { id: 'civilization', label: 'Civilization', icon: '🏛️', color: 'sky' },
  { id: 'arcane', label: 'Arcane', icon: '✨', color: 'purple' },
]

/**
 * Get color classes for zone
 */
function getZoneClasses(zoneId) {
  const colors = {
    nature: {
      header: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    civilization: {
      header: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200',
      border: 'border-sky-200 dark:border-sky-800/50',
    },
    arcane: {
      header: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200',
      border: 'border-purple-200 dark:border-purple-800/50',
    },
  }
  return colors[zoneId] || colors.nature
}

/**
 * ZoneSection - Collapsible section for a zone
 */
function ZoneSection({ zone, topics, onTopicSelect }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const colorClasses = getZoneClasses(zone.id)

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  if (topics.length === 0) return null

  return (
    <div className={`rounded-xl border ${colorClasses.border} overflow-hidden`}>
      {/* Zone Header */}
      <button
        onClick={handleToggle}
        className={`
          w-full px-4 py-3
          flex items-center justify-between
          ${colorClasses.header}
          cursor-pointer
          transition-colors duration-150
        `}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">{zone.icon}</span>
          <span className="font-semibold">{zone.label}</span>
          <span className="text-sm opacity-70">({topics.length})</span>
        </div>
        <span
          className={`
            transform transition-transform duration-200
            ${isExpanded ? 'rotate-180' : 'rotate-0'}
          `}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {/* Topics */}
      {isExpanded && (
        <div className="p-3 bg-white dark:bg-slate-800/50">
          <div className="flex flex-wrap gap-2">
            {topics.map((topic, index) => {
              const status = getReviewStatus(topic)
              const statusRing = status === REVIEW_STATUS.DUE
                ? 'ring-2 ring-rose-400'
                : status === REVIEW_STATUS.FADING
                  ? 'ring-2 ring-amber-400'
                  : ''

              return (
                <button
                  key={`${topic.topicName}-${index}`}
                  onClick={() => onTopicSelect?.(topic)}
                  className={`
                    px-3 py-1.5
                    bg-slate-100 dark:bg-slate-700
                    hover:bg-slate-200 dark:hover:bg-slate-600
                    rounded-lg
                    text-sm font-medium
                    text-slate-700 dark:text-slate-200
                    cursor-pointer
                    transition-all duration-150
                    ${statusRing}
                  `}
                >
                  {topic.topicName}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * TopicsByZone - Topics grouped by zone
 *
 * @param {Object} props
 * @param {Array} props.topics - All topics
 * @param {Function} props.onTopicSelect - Callback when a topic is clicked
 */
export default function TopicsByZone({ topics = [], onTopicSelect }) {
  // Group topics by zone
  const groupedTopics = useMemo(() => {
    const groups = { nature: [], civilization: [], arcane: [] }

    topics.forEach((topic) => {
      const zone = topic.zone || 'nature'
      if (groups[zone]) {
        groups[zone].push(topic)
      } else {
        groups.nature.push(topic)
      }
    })

    return groups
  }, [topics])

  if (topics.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        Your Topics
      </h2>
      <div className="space-y-3">
        {ZONES.map((zone) => (
          <ZoneSection
            key={zone.id}
            zone={zone}
            topics={groupedTopics[zone.id]}
            onTopicSelect={onTopicSelect}
          />
        ))}
      </div>
    </section>
  )
}
