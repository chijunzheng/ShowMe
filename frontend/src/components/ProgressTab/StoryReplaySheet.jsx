/**
 * StoryReplaySheet - Full-screen replay of a saved story
 *
 * Renders as a full-screen overlay (fixed inset-0) with StoryPlayback inside.
 * Adds a close button and delete action. Uses neobrutalism design system.
 */

import { useEffect, useCallback, useState } from 'react'
import StoryPlayback from '../LearnModes/Story/StoryPlayback'

/**
 * StoryReplaySheet - Full-screen story replay overlay
 *
 * @param {Object} props
 * @param {Object} props.story - Full story content from loadStoryContent
 * @param {Function} props.onClose - Callback to close the overlay
 * @param {Function} props.onDelete - Callback to delete the story (with confirmation)
 */
export default function StoryReplaySheet({ story, onClose, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleDelete = useCallback(() => {
    if (isDeleting || !story?.id) return

    setIsDeleting(true)
    const confirmed = window.confirm(
      `Delete your story about "${story.topicName}"? This cannot be undone.`
    )

    if (confirmed) {
      onDelete?.(story.id)
    }
    setIsDeleting(false)
  }, [isDeleting, story?.id, story?.topicName, onDelete])

  if (!story) return null

  const conceptsUsed = Array.isArray(story.conceptsFound)
    ? story.conceptsFound.length
    : (story.conceptsFound ?? 0)

  return (
    <div
      className="
        fixed inset-0 z-50
        bg-white dark:bg-slate-900
        animate-[fade-in_0.2s_ease-out]
        flex flex-col
      "
      role="dialog"
      aria-modal="true"
      aria-label={`Story replay: ${story.topicName}`}
    >
      {/* Close button - fixed top-right */}
      <button
        type="button"
        onClick={onClose}
        className="
          fixed top-4 right-4 z-[60]
          w-10 h-10
          flex items-center justify-center
          rounded-xl
          bg-white dark:bg-slate-800
          border-2 border-black dark:border-slate-600
          shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]
          text-slate-600 dark:text-slate-300
          font-bold text-lg
          cursor-pointer
          hover:bg-slate-100 dark:hover:bg-slate-700
          active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
          transition-all duration-150
        "
        aria-label="Close replay"
      >
        {'\u2715'}
      </button>

      {/* Story playback content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <StoryPlayback
          topicName={story.topicName}
          scenes={story.scenes || []}
          conceptsUsed={conceptsUsed}
          totalConcepts={story.totalConcepts ?? 0}
          onFinish={onClose}
        />
      </div>

      {/* Delete button - bottom bar */}
      <div className="flex-shrink-0 px-4 py-3 border-t-2 border-black dark:border-slate-600 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={handleDelete}
          className="
            w-full py-2.5 px-4
            flex items-center justify-center gap-2
            bg-rose-50 dark:bg-rose-900/20
            border-2 border-black dark:border-slate-600
            rounded-xl
            shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
            text-rose-600 dark:text-rose-400
            font-semibold text-sm
            cursor-pointer
            hover:bg-rose-100 dark:hover:bg-rose-900/30
            active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
            transition-all duration-150
          "
        >
          <span aria-hidden="true">{'\uD83D\uDDD1\uFE0F'}</span>
          <span>Delete Story</span>
        </button>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
