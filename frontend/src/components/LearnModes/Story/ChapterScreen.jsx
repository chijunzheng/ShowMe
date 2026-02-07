/**
 * ChapterScreen - Chapter view with story choice cards
 *
 * Shows chapter prompt, 2-3 choice cards, and optional "write your own" input.
 * Each chapter advances the story with the kid's selection.
 */

import { useState } from 'react'
import PropTypes from 'prop-types'
import StoryChoiceCard from './StoryChoiceCard'
import ConceptCards from './ConceptCards'
import { vibrateShort } from '../../../utils/haptics'

const CHAPTER_LABELS = {
  1: 'The Beginning',
  2: 'The Adventure',
  3: 'The Ending',
}

const MIN_CUSTOM_TEXT_LENGTH = 10

export default function ChapterScreen({
  chapter,
  chapterData,
  conceptCards = [],
  conceptsFound = new Set(),
  previousIllustration = null,
  onSelectChoice,
  onCustomInput,
}) {
  const [selectedChoiceId, setSelectedChoiceId] = useState(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customText, setCustomText] = useState('')

  const chapterLabel = CHAPTER_LABELS[chapter] || `Chapter ${chapter}`
  const isSelectionMade = selectedChoiceId !== null

  const handleSelectChoice = (choice) => {
    if (isSelectionMade) return
    setSelectedChoiceId(choice.id)
    // Brief delay to show selection animation before advancing
    setTimeout(() => {
      onSelectChoice?.(choice)
    }, 400)
  }

  const handleCustomSubmit = () => {
    if (customText.trim().length < MIN_CUSTOM_TEXT_LENGTH) return
    vibrateShort()
    const syntheticChoice = {
      id: `custom-${chapter}`,
      emoji: '✏️',
      text: customText.trim(),
      conceptHints: [],
    }
    setSelectedChoiceId(syntheticChoice.id)
    setTimeout(() => {
      onCustomInput?.(syntheticChoice)
    }, 400)
  }

  const handleToggleCustom = () => {
    vibrateShort()
    setShowCustomInput(prev => !prev)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
      <div className="max-w-2xl w-full space-y-6 animate-fade-in">
        {/* Previous Chapter Illustration */}
        {previousIllustration && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-pink-200 dark:border-pink-700 shadow-lg">
            <img
              src={previousIllustration}
              alt="Previous chapter scene"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Chapter Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-pink-100 dark:bg-pink-900/30 rounded-full mb-3">
            <span className="text-sm font-semibold text-pink-700 dark:text-pink-300">
              Chapter {chapter} of 3
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            {chapterData?.icon || '📖'} {chapterLabel}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {chapterData?.prompt || 'What happens in your story?'}
          </p>
        </div>

        {/* Choice Cards */}
        <div className="space-y-3">
          {(chapterData?.choices || []).map((choice) => (
            <StoryChoiceCard
              key={choice.id}
              choice={choice}
              isSelected={selectedChoiceId === choice.id}
              isDisabled={isSelectionMade && selectedChoiceId !== choice.id}
              onSelect={handleSelectChoice}
            />
          ))}
        </div>

        {/* Or Divider */}
        {!isSelectionMade && (
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
            <span className="text-sm text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
          </div>
        )}

        {/* Write Your Own */}
        {!isSelectionMade && (
          <div>
            {!showCustomInput ? (
              <button
                onClick={handleToggleCustom}
                className="w-full py-3 text-sm text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors flex items-center justify-center gap-2"
              >
                <span>✏️</span>
                <span>Write your own...</span>
              </button>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-gray-200 dark:border-slate-700 p-4 space-y-3">
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Write what happens next..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-700"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {customText.trim().length < MIN_CUSTOM_TEXT_LENGTH
                      ? `${MIN_CUSTOM_TEXT_LENGTH - customText.trim().length} more characters needed`
                      : 'Ready to submit!'
                    }
                  </span>
                  <button
                    onClick={handleCustomSubmit}
                    disabled={customText.trim().length < MIN_CUSTOM_TEXT_LENGTH}
                    className="px-5 py-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200"
                  >
                    Use This
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Compact Concept Cards */}
        {conceptCards.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Story Ingredients
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {conceptsFound.size} / {conceptCards.length} found
              </span>
            </div>
            <ConceptCards
              conceptCards={conceptCards}
              conceptsFound={conceptsFound}
              compact
            />
          </div>
        )}
      </div>
    </div>
  )
}

ChapterScreen.propTypes = {
  chapter: PropTypes.number.isRequired,
  chapterData: PropTypes.shape({
    prompt: PropTypes.string,
    icon: PropTypes.string,
    choices: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      emoji: PropTypes.string,
      text: PropTypes.string.isRequired,
      conceptHints: PropTypes.arrayOf(PropTypes.string),
    })),
  }),
  conceptCards: PropTypes.array,
  conceptsFound: PropTypes.instanceOf(Set),
  previousIllustration: PropTypes.string,
  onSelectChoice: PropTypes.func,
  onCustomInput: PropTypes.func,
}
