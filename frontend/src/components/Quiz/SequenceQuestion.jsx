/**
 * SequenceQuestion - Drag-and-drop ordering game for middle school students
 * Put items in the correct sequence by dragging or tapping
 *
 * Features:
 * - Numbered drop slots (1, 2, 3...)
 * - Available items displayed as draggable chips below
 * - Mobile: tap item to select, tap slot to place
 * - Desktop: drag and drop support
 * - Visual feedback during interaction
 * - Check Answer button
 * - Dark mode support
 */
import { useState, useCallback } from 'react'

/**
 * @param {Object} props
 * @param {string} props.question - The question prompt (e.g., "Put these steps in order:")
 * @param {string[]} props.items - Array of items to order
 * @param {Function} props.onAnswer - Callback with array of indices representing user's order
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {number[]} props.correctOrder - Array of indices representing correct order
 * @param {number[]} props.userOrder - User's submitted order (for feedback)
 */
export default function SequenceQuestion({
  question,
  items = [],
  onAnswer,
  showFeedback = false,
  correctOrder = [],
  userOrder = [],
}) {
  // Track which items have been placed in slots
  // slotContents[slotIndex] = itemIndex or null
  const [slotContents, setSlotContents] = useState(
    showFeedback ? userOrder.map((idx, i) => idx) : Array(items.length).fill(null)
  )
  // Track which item is currently selected (for tap-to-place on mobile)
  const [selectedItem, setSelectedItem] = useState(null)
  // Track which item is being dragged
  const [draggedItem, setDraggedItem] = useState(null)
  // Track which slot is being hovered over during drag
  const [dragOverSlot, setDragOverSlot] = useState(null)

  // Get items that haven't been placed yet
  const getAvailableItems = useCallback(() => {
    const placedItems = new Set(slotContents.filter(idx => idx !== null))
    return items.map((_, idx) => idx).filter(idx => !placedItems.has(idx))
  }, [slotContents, items])

  // Handle clicking on an available item (select for tap-to-place)
  const handleItemClick = useCallback((itemIndex) => {
    if (showFeedback) return

    if (selectedItem === itemIndex) {
      // Deselect if clicking the same item
      setSelectedItem(null)
    } else {
      setSelectedItem(itemIndex)
    }
  }, [showFeedback, selectedItem])

  // Handle clicking on a slot
  const handleSlotClick = useCallback((slotIndex) => {
    if (showFeedback) return

    if (selectedItem !== null) {
      // Place selected item in this slot
      setSlotContents(prev => {
        const newSlots = [...prev]
        // If slot already has an item, swap it back to available
        // Place the selected item
        newSlots[slotIndex] = selectedItem
        return newSlots
      })
      setSelectedItem(null)
    } else if (slotContents[slotIndex] !== null) {
      // Remove item from slot (return to available)
      setSlotContents(prev => {
        const newSlots = [...prev]
        newSlots[slotIndex] = null
        return newSlots
      })
    }
  }, [showFeedback, selectedItem, slotContents])

  // Drag and drop handlers for desktop
  const handleDragStart = useCallback((e, itemIndex) => {
    if (showFeedback) return
    setDraggedItem(itemIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemIndex.toString())
  }, [showFeedback])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverSlot(null)
  }, [])

  const handleDragOver = useCallback((e, slotIndex) => {
    if (showFeedback) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot(slotIndex)
  }, [showFeedback])

  const handleDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])

  const handleDrop = useCallback((e, slotIndex) => {
    if (showFeedback) return
    e.preventDefault()
    const itemIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)

    if (!isNaN(itemIndex)) {
      setSlotContents(prev => {
        const newSlots = [...prev]
        // Remove item from any previous slot
        const prevSlotIndex = newSlots.indexOf(itemIndex)
        if (prevSlotIndex !== -1) {
          newSlots[prevSlotIndex] = null
        }
        // Place in new slot
        newSlots[slotIndex] = itemIndex
        return newSlots
      })
    }

    setDraggedItem(null)
    setDragOverSlot(null)
    setSelectedItem(null)
  }, [showFeedback])

  // Handle dragging from a slot (to reorder)
  const handleSlotDragStart = useCallback((e, slotIndex) => {
    if (showFeedback) return
    const itemIndex = slotContents[slotIndex]
    if (itemIndex === null) return

    setDraggedItem(itemIndex)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemIndex.toString())

    // Remove from current slot after drag starts
    setTimeout(() => {
      setSlotContents(prev => {
        const newSlots = [...prev]
        newSlots[slotIndex] = null
        return newSlots
      })
    }, 0)
  }, [showFeedback, slotContents])

  // Submit answer
  const handleSubmit = useCallback(() => {
    // Check if all slots are filled
    const allFilled = slotContents.every(idx => idx !== null)
    if (!allFilled) return

    onAnswer?.(slotContents)
  }, [slotContents, onAnswer])

  // Check if all slots are filled
  const allSlotsFilled = slotContents.every(idx => idx !== null)

  // Determine if a specific position is correct (for feedback)
  const isPositionCorrect = (slotIndex) => {
    if (!showFeedback) return null
    return userOrder[slotIndex] === correctOrder[slotIndex]
  }

  // Get slot styling based on state
  const getSlotClasses = (slotIndex) => {
    const hasItem = slotContents[slotIndex] !== null
    const isHovered = dragOverSlot === slotIndex
    const positionCorrect = isPositionCorrect(slotIndex)

    const baseClasses = `
      relative flex items-center gap-3
      min-h-[56px] px-4 py-3 rounded-xl
      border-2 transition-all duration-200
    `

    if (showFeedback) {
      if (positionCorrect) {
        return `${baseClasses}
          border-success bg-success/10
          ring-2 ring-success/30
        `
      } else {
        return `${baseClasses}
          border-red-500 bg-red-500/10
          ring-2 ring-red-500/30
        `
      }
    }

    if (isHovered) {
      return `${baseClasses}
        border-primary bg-primary/10
        ring-2 ring-primary/30
        scale-[1.02]
      `
    }

    if (hasItem) {
      return `${baseClasses}
        border-primary/50 bg-primary/5
        hover:border-primary hover:bg-primary/10
        cursor-pointer
      `
    }

    // Empty slot
    return `${baseClasses}
      border-dashed border-gray-300 dark:border-slate-600
      bg-gray-50 dark:bg-slate-800/50
      hover:border-primary/50 hover:bg-primary/5
      cursor-pointer
    `
  }

  // Get chip styling for available items
  const getChipClasses = (itemIndex) => {
    const isSelected = selectedItem === itemIndex
    const isDragging = draggedItem === itemIndex

    const baseClasses = `
      inline-flex items-center justify-center
      px-4 py-3 rounded-xl
      border-2 transition-all duration-200
      text-sm font-medium
      cursor-grab active:cursor-grabbing
      select-none
    `

    if (isDragging) {
      return `${baseClasses}
        border-primary bg-primary/20
        text-primary-600 dark:text-primary-400
        opacity-50 scale-95
      `
    }

    if (isSelected) {
      return `${baseClasses}
        border-primary bg-primary text-white
        ring-2 ring-primary/50
        shadow-lg scale-105
      `
    }

    return `${baseClasses}
      border-gray-200 dark:border-slate-600
      bg-white dark:bg-slate-800
      text-gray-700 dark:text-gray-200
      hover:border-primary/50 hover:bg-primary/5
      hover:shadow-md hover:scale-[1.02]
      active:scale-95
    `
  }

  // Get number badge styling
  const getNumberBadgeClasses = (slotIndex) => {
    const positionCorrect = isPositionCorrect(slotIndex)

    const baseClasses = `
      flex-shrink-0 w-8 h-8 rounded-lg
      flex items-center justify-center
      font-bold text-sm
    `

    if (showFeedback) {
      if (positionCorrect) {
        return `${baseClasses} bg-success text-white`
      } else {
        return `${baseClasses} bg-red-500 text-white`
      }
    }

    return `${baseClasses} bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300`
  }

  const availableItems = getAvailableItems()

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Question text */}
      <div className="mb-6 text-center">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100 leading-relaxed">
          {question}
        </h3>
        {!showFeedback && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Drag items or tap to select, then tap a slot to place
          </p>
        )}
      </div>

      {/* Drop slots */}
      <div className="space-y-3 mb-8">
        {items.map((_, slotIndex) => {
          const itemIndex = slotContents[slotIndex]
          const itemText = itemIndex !== null ? items[itemIndex] : null
          const positionCorrect = isPositionCorrect(slotIndex)

          return (
            <div
              key={slotIndex}
              className={getSlotClasses(slotIndex)}
              onClick={() => handleSlotClick(slotIndex)}
              onDragOver={(e) => handleDragOver(e, slotIndex)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slotIndex)}
              draggable={itemIndex !== null && !showFeedback}
              onDragStart={(e) => handleSlotDragStart(e, slotIndex)}
              onDragEnd={handleDragEnd}
              role="listitem"
              aria-label={`Slot ${slotIndex + 1}: ${itemText || 'empty'}`}
            >
              {/* Number badge */}
              <span className={getNumberBadgeClasses(slotIndex)}>
                {slotIndex + 1}
              </span>

              {/* Item content or placeholder */}
              <span className={`flex-1 text-base ${
                itemText
                  ? 'text-gray-800 dark:text-gray-100'
                  : 'text-gray-400 dark:text-gray-500 italic'
              }`}>
                {itemText || 'Drop item here'}
              </span>

              {/* Feedback icons */}
              {showFeedback && positionCorrect && (
                <span className="flex-shrink-0 text-success">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                  </svg>
                </span>
              )}
              {showFeedback && positionCorrect === false && (
                <span className="flex-shrink-0 text-red-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
                  </svg>
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Available items (chips) */}
      {!showFeedback && availableItems.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">
            Available items:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {availableItems.map((itemIndex) => (
              <div
                key={itemIndex}
                className={getChipClasses(itemIndex)}
                onClick={() => handleItemClick(itemIndex)}
                draggable={!showFeedback}
                onDragStart={(e) => handleDragStart(e, itemIndex)}
                onDragEnd={handleDragEnd}
                role="button"
                tabIndex={0}
                aria-label={`Item: ${items[itemIndex]}`}
                aria-pressed={selectedItem === itemIndex}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleItemClick(itemIndex)
                  }
                }}
              >
                {items[itemIndex]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct order display (shown in feedback if wrong) */}
      {showFeedback && !userOrder.every((idx, i) => idx === correctOrder[i]) && (
        <div className="mb-6 p-4 bg-success/10 dark:bg-success/20 rounded-xl border border-success/30">
          <p className="text-sm font-medium text-success-600 dark:text-success-400 mb-2">
            Correct order:
          </p>
          <ol className="space-y-1">
            {correctOrder.map((itemIndex, slotIndex) => (
              <li key={slotIndex} className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{slotIndex + 1}.</span> {items[itemIndex]}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Submit button (only shown before feedback) */}
      {!showFeedback && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!allSlotsFilled}
            className={`
              px-8 py-3 rounded-full font-medium
              transition-all duration-200 transform
              ${allSlotsFilled
                ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Check Answer
          </button>
        </div>
      )}

      {/* Hint for mobile users */}
      {!showFeedback && selectedItem !== null && (
        <p className="text-center text-sm text-primary font-medium mt-4 animate-pulse">
          Now tap a numbered slot to place the item
        </p>
      )}
    </div>
  )
}
