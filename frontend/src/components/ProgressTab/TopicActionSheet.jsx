/**
 * TopicActionSheet Component
 *
 * Bottom sheet that appears when a topic is selected.
 * Shows topic info and actions: Review Slideshow, Practice Modes, Connections.
 * Uses neubrutalism style with bold borders and hard shadows.
 */

import { useCallback, useEffect, useRef } from 'react'
import { getDaysSinceReview, getReviewStatus, REVIEW_STATUS } from '../../utils/reviewUtils'
import { ZONE_ICONS } from '../../constants/world'

/**
 * Mode button configurations
 */
const PRACTICE_MODES = [
  {
    id: 'mystery',
    icon: '🔍',
    name: 'Mystery Lab',
    description: 'Solve clues',
    color: 'indigo',
  },
  {
    id: 'whatif',
    icon: '🌟',
    name: 'Wonder Lab',
    description: 'What if...',
    color: 'amber',
  },
  {
    id: 'story',
    icon: '📖',
    name: 'Story Studio',
    description: 'Create a tale',
    color: 'rose',
  },
]

/**
 * Get color classes for a practice mode
 */
function getModeColorClasses(color) {
  const colors = {
    indigo: 'bg-indigo-100 border-indigo-900 text-indigo-900 hover:bg-indigo-200',
    amber: 'bg-amber-100 border-amber-900 text-amber-900 hover:bg-amber-200',
    rose: 'bg-rose-100 border-rose-900 text-rose-900 hover:bg-rose-200',
    emerald: 'bg-emerald-100 border-emerald-900 text-emerald-900 hover:bg-emerald-200',
  }
  return colors[color] || colors.indigo
}

/**
 * TopicActionSheet - Bottom sheet for topic actions
 *
 * @param {Object} props
 * @param {Object|null} props.topic - Topic data { topicName, zone, lastReviewedAt, relatedTopics, slides, level }
 * @param {boolean} props.isOpen - Whether the sheet is visible
 * @param {Function} props.onClose - Callback when sheet is closed
 * @param {Function} props.onReviewSlideshow - Callback for Review Slideshow action
 * @param {Function} props.onLaunchMode - Callback for launching a practice mode (topicName, mode, topicData)
 * @param {Function} props.onSelectRelatedTopic - Callback when a related topic chip is clicked
 */
export default function TopicActionSheet({
  topic,
  isOpen,
  onClose,
  onReviewSlideshow,
  onLaunchMode,
  onSelectRelatedTopic,
}) {
  const sheetRef = useRef(null)

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when sheet is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }, [onClose])

  // Handle mode button click
  const handleModeClick = useCallback((mode) => {
    onLaunchMode?.(topic?.topicName, mode.id, {
      slides: topic?.slides,
      level: topic?.level,
    })
  }, [topic, onLaunchMode])

  // Handle review slideshow click
  const handleReviewClick = useCallback(() => {
    onReviewSlideshow?.(topic?.topicName)
  }, [topic, onReviewSlideshow])

  // Handle related topic click
  const handleRelatedClick = useCallback((relatedTopicName) => {
    onSelectRelatedTopic?.(relatedTopicName)
  }, [onSelectRelatedTopic])

  if (!isOpen || !topic) return null

  const topicIcon = topic.icon || ZONE_ICONS[topic.zone] || '✨'
  const reviewStatus = getReviewStatus(topic)
  const daysSince = getDaysSinceReview(topic)
  const relatedTopics = topic.relatedTopics || []

  const reviewText = reviewStatus === REVIEW_STATUS.DUE
    ? 'Review overdue!'
    : daysSince === 0
      ? 'Reviewed today'
      : `Reviewed ${daysSince} day${daysSince === 1 ? '' : 's'} ago`

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/40 backdrop-blur-sm
        animate-[fade-in_0.2s_ease-out]
      "
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-sheet-title"
    >
      <div
        ref={sheetRef}
        className="
          w-full max-w-lg mx-4
          bg-white dark:bg-slate-900
          border-4 border-black dark:border-slate-600
          rounded-3xl
          shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#475569]
          p-5 pb-6
          animate-[scale-in_0.2s_ease-out]
          max-h-[85vh] overflow-y-auto
        "
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl" aria-hidden="true">{topicIcon}</span>
              <h2
                id="topic-sheet-title"
                className="text-xl font-bold text-slate-900 dark:text-white truncate"
              >
                {topic.topicName}
              </h2>
            </div>
            <p className={`text-sm font-medium ${
              reviewStatus === REVIEW_STATUS.DUE
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}>
              {reviewText}
            </p>
          </div>
          <button
            onClick={onClose}
            className="
              w-10 h-10 flex items-center justify-center
              rounded-xl
              bg-slate-100 dark:bg-slate-800
              border-2 border-black dark:border-slate-600
              shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]
              text-slate-600 dark:text-slate-300
              font-bold text-lg
              cursor-pointer
              hover:bg-slate-200 dark:hover:bg-slate-700
              active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
              transition-all duration-150
            "
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Watch Again Section */}
        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Watch Again
          </h3>
          <button
            onClick={handleReviewClick}
            className="
              w-full py-3 px-4
              flex items-center justify-center gap-2
              bg-sky-100 dark:bg-sky-900/30
              border-2 border-black dark:border-slate-600
              rounded-xl
              shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#475569]
              text-sky-900 dark:text-sky-100
              font-bold text-base
              cursor-pointer
              hover:bg-sky-200 dark:hover:bg-sky-900/50
              active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
              transition-all duration-150
            "
          >
            <span aria-hidden="true">▶</span>
            <span>Review Slideshow</span>
          </button>
        </section>

        {/* Practice Modes Section */}
        <section className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Practice Modes
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {PRACTICE_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeClick(mode)}
                className={`
                  py-3 px-3
                  flex flex-col items-center gap-1
                  border-2 border-black dark:border-slate-600
                  rounded-xl
                  shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
                  font-semibold
                  cursor-pointer
                  active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
                  transition-all duration-150
                  ${getModeColorClasses(mode.color)}
                `}
              >
                <span className="text-2xl" aria-hidden="true">{mode.icon}</span>
                <span className="text-sm">{mode.name}</span>
                <span className="text-xs opacity-70">{mode.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Connections Section */}
        {relatedTopics.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Connections
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedTopics.map((relatedTopic, index) => (
                <button
                  key={`${relatedTopic}-${index}`}
                  onClick={() => handleRelatedClick(relatedTopic)}
                  className="
                    px-3 py-1.5
                    bg-slate-100 dark:bg-slate-800
                    border-2 border-black dark:border-slate-600
                    rounded-full
                    shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]
                    text-sm font-medium
                    text-slate-700 dark:text-slate-200
                    cursor-pointer
                    hover:bg-slate-200 dark:hover:bg-slate-700
                    active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
                    transition-all duration-150
                  "
                >
                  {relatedTopic}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
