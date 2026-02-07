/**
 * DueForReview Component
 *
 * Shows topics that need review based on spaced repetition thresholds.
 * Topics are sorted by urgency (most overdue first).
 */

import { useMemo } from 'react'
import { getDaysSinceReview, getReviewStatus, REVIEW_STATUS } from '../../utils/reviewUtils'
import { ZONE_ICONS } from '../../constants/world'

/**
 * DueForReview - Section showing topics needing review
 *
 * @param {Object} props
 * @param {Array} props.topics - All topics (will be filtered to due/fading)
 * @param {Function} props.onTopicSelect - Callback when a topic is clicked
 */
export default function DueForReview({ topics = [], onTopicSelect }) {
  // Filter and sort topics by review urgency
  const dueTopics = useMemo(() => {
    return topics
      .map((topic) => ({
        ...topic,
        reviewStatus: getReviewStatus(topic),
        daysSince: getDaysSinceReview(topic),
      }))
      .filter((topic) =>
        topic.reviewStatus === REVIEW_STATUS.DUE ||
        topic.reviewStatus === REVIEW_STATUS.FADING
      )
      .sort((a, b) => b.daysSince - a.daysSince) // Most overdue first
      .slice(0, 5) // Show max 5
  }, [topics])

  if (dueTopics.length === 0) return null

  return (
    <section className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl" aria-hidden="true">⚠️</span>
        <h2 className="text-base font-semibold text-amber-800 dark:text-amber-200">
          {dueTopics.length} {dueTopics.length === 1 ? 'topic needs' : 'topics need'} review
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {dueTopics.map((topic, index) => {
          const zoneIcon = ZONE_ICONS[topic.zone] || '✨'
          const isOverdue = topic.reviewStatus === REVIEW_STATUS.DUE

          return (
            <button
              key={`${topic.topicName}-${index}`}
              onClick={() => onTopicSelect?.(topic)}
              className={`
                px-3 py-2
                flex items-center gap-2
                rounded-xl
                font-medium text-sm
                cursor-pointer
                transition-all duration-150
                hover:scale-[1.02]
                active:scale-[0.98]
                ${isOverdue
                  ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-700'
                  : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                }
              `}
            >
              <span className="text-base" aria-hidden="true">{zoneIcon}</span>
              <span className="truncate max-w-[150px]">{topic.topicName}</span>
              <span className="text-xs opacity-70">
                {topic.daysSince}d
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
