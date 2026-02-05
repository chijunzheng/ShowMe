/**
 * QuickPractice Component
 *
 * Section for the Progress Tab that allows quick access to learning modes.
 * Shows mode cards (Mystery, Wonder, Story) and topic picker.
 * Includes "I'm feeling curious!" for random mode + topic selection.
 */

import { useState, useCallback, useMemo } from 'react'
import { getReviewStatus, REVIEW_STATUS } from '../../utils/reviewUtils'
import { ZONE_ICONS } from '../../constants/world'

/**
 * Learning mode configurations
 */
const MODES = [
  {
    id: 'mystery',
    icon: '🔍',
    name: 'Mystery Lab',
    description: 'Solve clues',
    color: 'indigo',
    bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
    borderClass: 'border-indigo-300 dark:border-indigo-700',
    selectedClass: 'ring-2 ring-indigo-500 ring-offset-2',
  },
  {
    id: 'whatif',
    icon: '🌟',
    name: 'Wonder Lab',
    description: 'What if...',
    color: 'amber',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    borderClass: 'border-amber-300 dark:border-amber-700',
    selectedClass: 'ring-2 ring-amber-500 ring-offset-2',
  },
  {
    id: 'story',
    icon: '📖',
    name: 'Story Studio',
    description: 'Create a tale',
    color: 'rose',
    bgClass: 'bg-rose-100 dark:bg-rose-900/30',
    borderClass: 'border-rose-300 dark:border-rose-700',
    selectedClass: 'ring-2 ring-rose-500 ring-offset-2',
  },
]

/**
 * Get status-based ring styling for topic chips
 */
function getTopicStatusClasses(status) {
  switch (status) {
    case REVIEW_STATUS.DUE:
      return 'ring-2 ring-rose-400 dark:ring-rose-500'
    case REVIEW_STATUS.FADING:
      return 'ring-2 ring-amber-400 dark:ring-amber-500'
    default:
      return ''
  }
}

/**
 * QuickPractice - Quick access to learning modes
 *
 * @param {Object} props
 * @param {Array} props.topics - Array of topic objects with topicName, slides, level, lastReviewedAt, zone
 * @param {Function} props.onLaunchMode - Callback (topicName, mode, topicData)
 * @param {Function} props.onTopicSelect - Callback when topic is tapped without mode selected (opens action sheet)
 * @param {Function} props.onAskQuestion - Callback for empty state "Ask a Question" button
 */
export default function QuickPractice({
  topics = [],
  onLaunchMode,
  onTopicSelect,
  onAskQuestion,
}) {
  const [selectedMode, setSelectedMode] = useState(null)

  // Calculate review status for all topics
  const topicsWithStatus = useMemo(() => {
    return topics.map((topic) => ({
      ...topic,
      reviewStatus: getReviewStatus(topic),
    }))
  }, [topics])

  // Handle mode card click
  const handleModeClick = useCallback((modeId) => {
    setSelectedMode((prev) => (prev === modeId ? null : modeId))
  }, [])

  // Handle topic chip click
  const handleTopicClick = useCallback((topic) => {
    if (selectedMode) {
      // Mode is selected - launch immediately
      onLaunchMode?.(topic.topicName, selectedMode, {
        slides: topic.slides,
        level: topic.level,
      })
      setSelectedMode(null)
    } else {
      // No mode selected - open action sheet
      onTopicSelect?.(topic)
    }
  }, [selectedMode, onLaunchMode, onTopicSelect])

  // Handle "I'm feeling curious!" click
  const handleSurpriseMe = useCallback(() => {
    if (topics.length === 0) return

    // Pick random mode and topic
    const randomMode = MODES[Math.floor(Math.random() * MODES.length)]
    const randomTopic = topics[Math.floor(Math.random() * topics.length)]

    onLaunchMode?.(randomTopic.topicName, randomMode.id, {
      slides: randomTopic.slides,
      level: randomTopic.level,
    })
  }, [topics, onLaunchMode])

  // Empty state
  if (topics.length === 0) {
    return (
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Quick Practice
        </h2>
        <div className="text-center py-6">
          <span className="text-4xl mb-3 block" aria-hidden="true">🎓</span>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Learn your first topic to unlock practice modes!
          </p>
          <button
            onClick={onAskQuestion}
            className="
              px-5 py-2.5
              bg-emerald-500 hover:bg-emerald-600
              text-white font-semibold
              rounded-xl
              shadow-md hover:shadow-lg
              transition-all duration-200
              cursor-pointer
            "
          >
            Ask a Question →
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
        Quick Practice
      </h2>

      {/* Mode Cards */}
      <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => handleModeClick(mode.id)}
            className={`
              flex-shrink-0 w-28
              py-3 px-3
              flex flex-col items-center gap-1.5
              rounded-xl border-2
              ${mode.bgClass}
              ${mode.borderClass}
              ${selectedMode === mode.id ? mode.selectedClass : ''}
              cursor-pointer
              hover:scale-[1.02]
              active:scale-[0.98]
              transition-all duration-150
            `}
            aria-pressed={selectedMode === mode.id}
          >
            <span className="text-2xl" aria-hidden="true">{mode.icon}</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {mode.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {mode.description}
            </span>
          </button>
        ))}
      </div>

      {/* "I'm feeling curious!" Button */}
      <button
        onClick={handleSurpriseMe}
        className="
          w-full py-3 px-4 mb-4
          flex items-center justify-center gap-2
          bg-gradient-to-r from-purple-500 to-pink-500
          hover:from-purple-600 hover:to-pink-600
          text-white font-bold
          rounded-xl
          shadow-md hover:shadow-lg
          cursor-pointer
          active:scale-[0.98]
          transition-all duration-200
        "
      >
        <span className="text-xl" aria-hidden="true">🔮</span>
        <span>I'm feeling curious!</span>
      </button>

      {/* Topic Selection Hint */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {selectedMode
          ? `Pick a topic for ${MODES.find((m) => m.id === selectedMode)?.name}:`
          : 'Or pick a topic:'}
      </p>

      {/* Topic Chips */}
      <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
        {topicsWithStatus.map((topic, index) => {
          const zoneIcon = ZONE_ICONS[topic.zone] || '✨'
          const statusClasses = getTopicStatusClasses(topic.reviewStatus)

          return (
            <button
              key={`${topic.topicName}-${index}`}
              onClick={() => handleTopicClick(topic)}
              className={`
                px-3 py-2
                flex items-center gap-1.5
                bg-slate-100 dark:bg-slate-700
                hover:bg-slate-200 dark:hover:bg-slate-600
                rounded-xl
                text-sm font-medium
                text-slate-700 dark:text-slate-200
                cursor-pointer
                transition-all duration-150
                ${statusClasses}
                ${selectedMode ? 'hover:ring-2 hover:ring-primary hover:ring-offset-1' : ''}
              `}
            >
              <span className="text-base" aria-hidden="true">{zoneIcon}</span>
              <span className="truncate max-w-[120px]">{topic.topicName}</span>
            </button>
          )
        })}
      </div>

      {/* Review status legend */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-2 ring-amber-400" />
          <span>Needs review</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-2 ring-rose-400" />
          <span>Overdue</span>
        </div>
      </div>
    </section>
  )
}
