/**
 * MyStoriesSheet - Grid of saved story cards
 *
 * Rendered inside StatDetailSheet when statType === 'stories'.
 * Shows story cards with thumbnails, topic names, dates, and concept counts.
 * Uses neobrutalism design system with bold borders and hard shadows.
 */

import { useState, useCallback } from 'react'

/**
 * Format a date into a human-readable relative string.
 * Returns "Today", "Yesterday", or a short date like "Feb 6".
 */
function formatRelativeDate(dateInput) {
  if (!dateInput) return ''

  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((todayStart - dateStart) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * StoryCard - Individual card displaying a saved story's metadata
 */
function StoryCard({ story, onSelect, onDelete }) {
  const [isConfirming, setIsConfirming] = useState(false)

  const handleSelect = useCallback(() => {
    onSelect?.(story.id)
  }, [onSelect, story.id])

  const handleDelete = useCallback((e) => {
    // Prevent the card click from firing
    e.stopPropagation()

    if (isConfirming) return

    setIsConfirming(true)
    const confirmed = window.confirm(
      `Delete your story about "${story.topicName}"? This cannot be undone.`
    )

    if (confirmed) {
      onDelete?.(story.id)
    }
    setIsConfirming(false)
  }, [onDelete, story.id, story.topicName, isConfirming])

  const dateLabel = formatRelativeDate(story.createdAt)
  const conceptLabel = `${story.conceptCount ?? 0}/${story.totalConcepts ?? 0}`

  return (
    <button
      type="button"
      onClick={handleSelect}
      className="
        w-full text-left
        bg-white dark:bg-slate-800
        border-2 border-black dark:border-slate-600
        rounded-xl
        shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
        overflow-hidden
        cursor-pointer
        hover:shadow-[4px_4px_0_0_#000] dark:hover:shadow-[4px_4px_0_0_#475569]
        active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1
      "
    >
      {/* Scene thumbnail */}
      <div className="aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
        {story.firstSceneImageUrl ? (
          <img
            src={story.firstSceneImageUrl}
            alt={`Scene from ${story.topicName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-40" aria-hidden="true">
              {'\uD83C\uDFA8'}
            </span>
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="p-2.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
          {story.topicName}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dateLabel}{dateLabel && conceptLabel ? ' \u00B7 ' : ''}{conceptLabel} {'\u2728'}
          </span>
          <button
            type="button"
            onClick={handleDelete}
            className="
              w-7 h-7
              flex items-center justify-center
              rounded-lg
              text-slate-400 dark:text-slate-500
              hover:text-rose-500 dark:hover:text-rose-400
              hover:bg-rose-50 dark:hover:bg-rose-900/20
              transition-colors duration-150
              focus:outline-none
            "
            aria-label={`Delete story about ${story.topicName}`}
          >
            {'\uD83D\uDDD1\uFE0F'}
          </button>
        </div>
      </div>
    </button>
  )
}

/**
 * EmptyState - Shown when no stories have been saved
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <span className="text-5xl mb-4" aria-hidden="true">
        {'\uD83D\uDCD6'}
      </span>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
        Complete Story Studio to save your first story!
      </p>
    </div>
  )
}

/**
 * MyStoriesSheet - Grid of saved story cards
 *
 * @param {Object} props
 * @param {Array} props.stories - Metadata array from useStoryStorage
 * @param {Function} props.onSelectStory - Callback when a story card is tapped
 * @param {Function} props.onDeleteStory - Callback when a story is deleted (after confirmation)
 */
export default function MyStoriesSheet({
  stories = [],
  onSelectStory,
  onDeleteStory,
}) {
  const safeStories = Array.isArray(stories) ? stories : []

  if (safeStories.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">
          {'\uD83D\uDCD6'}
        </span>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          My Stories ({safeStories.length})
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
        {safeStories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            onSelect={onSelectStory}
            onDelete={onDeleteStory}
          />
        ))}
      </div>
    </div>
  )
}
