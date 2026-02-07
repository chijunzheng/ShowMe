/**
 * SuggestedTopicSheet Component
 *
 * Bottom sheet that appears when a suggested topic (gap) is selected.
 * Shows topic details, connections, and a difficulty picker before starting.
 */

import { useCallback, useEffect, useMemo } from 'react'

const LEVEL_OPTIONS = [
  { id: 'simple', label: 'Simple', emoji: '\u{1F331}', desc: 'Everyday language' },
  { id: 'standard', label: 'Standard', emoji: '\u{1F4DA}', desc: 'Key concepts' },
  { id: 'deep', label: 'Deep', emoji: '\u{1F52C}', desc: 'Technical depth' },
]

/**
 * SuggestedTopicSheet - Bottom sheet for suggested topics
 *
 * @param {Object} props
 * @param {Object|null} props.gap - Gap data { suggestedTopic, curiosityHook, connectsTo }
 * @param {boolean} props.isOpen - Whether the sheet is visible
 * @param {Function} props.onClose - Callback when sheet is closed
 * @param {Function} props.onStart - Callback when user starts learning (gap, level)
 * @param {Array} props.nodes - Graph nodes for resolving connections
 * @param {string} props.selectedLevel - Current difficulty level
 * @param {Function} props.setSelectedLevel - Setter for difficulty level
 */
export default function SuggestedTopicSheet({
  gap,
  isOpen,
  onClose,
  onStart,
  nodes = [],
  selectedLevel = 'standard',
  setSelectedLevel,
}) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }, [onClose])

  const handleStart = useCallback(() => {
    if (!gap?.suggestedTopic) return
    onStart?.(gap, selectedLevel)
  }, [gap, onStart, selectedLevel])

  const connectedTopics = useMemo(() => {
    const connectIds = gap?.connectsTo || []
    if (!Array.isArray(connectIds) || connectIds.length === 0) return []

    const nameById = new Map(nodes.map((node) => [node.id, node.name]))
    return connectIds.map((id) => nameById.get(id)).filter(Boolean)
  }, [gap, nodes])

  if (!isOpen || !gap) return null

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
      aria-labelledby="suggested-topic-title"
    >
      <div
        className="
          w-full max-w-lg mx-4
          bg-white dark:bg-slate-900
          border-4 border-black dark:border-slate-600
          rounded-3xl
          shadow-[6px_6px_0_0_#000] dark:shadow-[6px_6px_0_0_#475569]
          p-5 pb-8
          animate-[scale-in_0.25s_ease-out]
          max-h-[85vh] overflow-y-auto
        "
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Suggested Topic
            </p>
            <h2
              id="suggested-topic-title"
              className="text-2xl font-bold text-slate-900 dark:text-white truncate"
            >
              {gap.suggestedTopic}
            </h2>
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

        {gap.curiosityHook && (
          <div className="mb-5 rounded-2xl border-2 border-black/80 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 p-4 shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]">
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
              {gap.curiosityHook}
            </p>
          </div>
        )}

        {connectedTopics.length > 0 && (
          <section className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Connects To
            </h3>
            <div className="flex flex-wrap gap-2">
              {connectedTopics.map((topic) => (
                <span
                  key={topic}
                  className="
                    px-3 py-1.5
                    bg-slate-100 dark:bg-slate-800
                    border-2 border-black dark:border-slate-600
                    rounded-full
                    shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569]
                    text-sm font-medium
                    text-slate-700 dark:text-slate-200
                  "
                >
                  {topic}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mb-6" role="radiogroup" aria-label="Difficulty level">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Difficulty
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {LEVEL_OPTIONS.map((level) => {
              const isSelected = selectedLevel === level.id
              return (
                <button
                  key={level.id}
                  onClick={() => setSelectedLevel?.(level.id)}
                  role="radio"
                  aria-checked={isSelected}
                  className={`
                    py-3 px-2
                    rounded-xl
                    border-2 border-black dark:border-slate-600
                    cursor-pointer
                    transition-all duration-150
                    flex flex-col items-center gap-1
                    ${isSelected
                      ? 'bg-indigo-600 text-white shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-[2px_2px_0_0_#000] dark:shadow-[2px_2px_0_0_#475569] hover:bg-slate-50 dark:hover:bg-slate-700'
                    }
                    active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
                  `}
                >
                  <span className="text-xl">{level.emoji}</span>
                  <span className="font-semibold text-sm">{level.label}</span>
                  <span className={`text-[10px] leading-tight ${isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'}`}>
                    {level.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <button
          onClick={handleStart}
          className="
            w-full py-3 px-4
            flex items-center justify-center gap-2
            bg-indigo-600
            border-2 border-black dark:border-slate-600
            rounded-xl
            shadow-[4px_4px_0_0_#000] dark:shadow-[4px_4px_0_0_#475569]
            text-white
            font-bold text-base
            cursor-pointer
            hover:bg-indigo-500
            active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
            transition-all duration-150
          "
        >
          Start Learning
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
