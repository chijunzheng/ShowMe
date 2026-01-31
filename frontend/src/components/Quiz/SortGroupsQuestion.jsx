/**
 * SortGroupsQuestion - Category Sorting game for K-5 students
 * Sort 4-6 items into 2 category buckets
 *
 * Features:
 * - Two group zones at top (buckets)
 * - Draggable items below
 * - Mobile: tap item to select, tap bucket to place
 * - Desktop: drag and drop support
 * - Visual feedback during interaction
 * - Dark mode support
 */
import { useState, useCallback } from 'react'

/**
 * @param {Object} props
 * @param {string} props.question - The question text (e.g., "Sort these into the right groups!")
 * @param {string[]} props.items - Array of items to sort
 * @param {Array} props.groups - Array of 2 groups, each with { name, icon }
 * @param {Object} props.correctSorting - Correct mapping { groupName: [items] }
 * @param {Function} props.onAnswer - Callback with user's sorting { groupName: [items] }
 * @param {boolean} props.showFeedback - Whether to show feedback state
 * @param {Object} props.userAnswer - User's submitted sorting (for feedback)
 * @param {string} props.explanation - Explanation shown after answering
 */
export default function SortGroupsQuestion({
  question = "Sort these into the right groups!",
  items = [],
  groups = [],
  correctSorting = {},
  onAnswer,
  showFeedback = false,
  userAnswer,
  explanation,
}) {
  // Track which group each item has been placed in
  // groupAssignments: { groupName: [itemName, ...] }
  const [groupAssignments, setGroupAssignments] = useState(() => {
    if (showFeedback && userAnswer) {
      return userAnswer
    }
    // Initialize empty arrays for each group
    const initial = {}
    groups.forEach(g => {
      initial[g.name] = []
    })
    return initial
  })

  // Track which item is currently selected (for tap-to-place on mobile)
  const [selectedItem, setSelectedItem] = useState(null)
  // Track which item is being dragged
  const [draggedItem, setDraggedItem] = useState(null)
  // Track which group is being hovered over during drag
  const [dragOverGroup, setDragOverGroup] = useState(null)

  // Get items that haven't been placed yet
  const getAvailableItems = useCallback(() => {
    const placedItems = new Set()
    Object.values(groupAssignments).forEach(groupItems => {
      groupItems.forEach(item => placedItems.add(item))
    })
    return items.filter(item => !placedItems.has(item))
  }, [groupAssignments, items])

  // Handle clicking on an available item (select for tap-to-place)
  const handleItemClick = useCallback((item) => {
    if (showFeedback) return

    if (selectedItem === item) {
      setSelectedItem(null)
    } else {
      setSelectedItem(item)
    }
  }, [showFeedback, selectedItem])

  // Handle clicking on a group (place selected item)
  const handleGroupClick = useCallback((groupName) => {
    if (showFeedback) return

    if (selectedItem !== null) {
      setGroupAssignments(prev => {
        const newAssignments = { ...prev }
        // Remove item from any previous group
        Object.keys(newAssignments).forEach(gName => {
          newAssignments[gName] = newAssignments[gName].filter(i => i !== selectedItem)
        })
        // Add to new group
        newAssignments[groupName] = [...newAssignments[groupName], selectedItem]
        return newAssignments
      })
      setSelectedItem(null)
    }
  }, [showFeedback, selectedItem])

  // Handle removing an item from a group (tap to return)
  const handleRemoveFromGroup = useCallback((groupName, item) => {
    if (showFeedback) return

    setGroupAssignments(prev => {
      const newAssignments = { ...prev }
      newAssignments[groupName] = newAssignments[groupName].filter(i => i !== item)
      return newAssignments
    })
  }, [showFeedback])

  // Drag and drop handlers
  const handleDragStart = useCallback((e, item) => {
    if (showFeedback) return
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item)
  }, [showFeedback])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverGroup(null)
  }, [])

  const handleDragOver = useCallback((e, groupName) => {
    if (showFeedback) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverGroup(groupName)
  }, [showFeedback])

  const handleDragLeave = useCallback(() => {
    setDragOverGroup(null)
  }, [])

  const handleDrop = useCallback((e, groupName) => {
    if (showFeedback) return
    e.preventDefault()
    const item = e.dataTransfer.getData('text/plain')

    if (item) {
      setGroupAssignments(prev => {
        const newAssignments = { ...prev }
        // Remove item from any previous group
        Object.keys(newAssignments).forEach(gName => {
          newAssignments[gName] = newAssignments[gName].filter(i => i !== item)
        })
        // Add to new group
        newAssignments[groupName] = [...newAssignments[groupName], item]
        return newAssignments
      })
    }

    setDraggedItem(null)
    setDragOverGroup(null)
    setSelectedItem(null)
  }, [showFeedback])

  // Submit answer
  const handleSubmit = useCallback(() => {
    const allItemsPlaced = getAvailableItems().length === 0
    if (!allItemsPlaced) return

    onAnswer?.(groupAssignments)
  }, [groupAssignments, onAnswer, getAvailableItems])

  // Check if all items are placed
  const allItemsPlaced = getAvailableItems().length === 0

  // Check if an item is in the correct group (for feedback)
  const isItemCorrect = (groupName, item) => {
    if (!showFeedback) return null
    const correctItems = correctSorting[groupName] || []
    return correctItems.includes(item)
  }

  // Check if entire group is correct
  const isGroupCorrect = (groupName) => {
    if (!showFeedback || !userAnswer) return null
    const userItems = userAnswer[groupName] || []
    const correctItems = correctSorting[groupName] || []

    // Check if user has exactly the correct items
    if (userItems.length !== correctItems.length) return false
    return userItems.every(item => correctItems.includes(item))
  }

  // Get group styling based on state
  const getGroupClasses = (groupName) => {
    const isHovered = dragOverGroup === groupName
    const groupCorrect = isGroupCorrect(groupName)

    const baseClasses = `
      flex-1 min-h-[140px] p-4 rounded-2xl
      border-3 transition-all duration-200
      flex flex-col
    `

    if (showFeedback) {
      if (groupCorrect) {
        return `${baseClasses}
          border-green-500 bg-green-50 dark:bg-green-900/20
          ring-2 ring-green-500/30
        `
      } else {
        return `${baseClasses}
          border-amber-500 bg-amber-50 dark:bg-amber-900/20
          ring-2 ring-amber-500/30
        `
      }
    }

    if (isHovered) {
      return `${baseClasses}
        border-primary-500 bg-primary-50 dark:bg-primary-900/20
        ring-2 ring-primary-500/30
        scale-[1.02]
      `
    }

    return `${baseClasses}
      border-gray-200 dark:border-gray-700
      bg-gray-50 dark:bg-gray-800/50
      hover:border-primary-300 hover:bg-primary-50/50
      dark:hover:border-primary-600 dark:hover:bg-primary-900/10
      cursor-pointer
    `
  }

  // Get item chip styling
  const getItemChipClasses = (item, inGroup = false, groupName = null) => {
    const isSelected = selectedItem === item
    const isDragging = draggedItem === item
    const itemCorrect = groupName ? isItemCorrect(groupName, item) : null

    const baseClasses = `
      inline-flex items-center justify-center
      px-3 py-2 rounded-xl
      border-2 transition-all duration-200
      text-sm font-medium
      select-none
    `

    if (showFeedback && inGroup) {
      if (itemCorrect) {
        return `${baseClasses}
          border-green-500 bg-green-100 dark:bg-green-800/40
          text-green-800 dark:text-green-200
        `
      } else {
        return `${baseClasses}
          border-red-500 bg-red-100 dark:bg-red-800/40
          text-red-800 dark:text-red-200
        `
      }
    }

    if (isDragging) {
      return `${baseClasses}
        border-primary-500 bg-primary-100 dark:bg-primary-800/40
        text-primary-800 dark:text-primary-200
        opacity-50 scale-95
      `
    }

    if (isSelected) {
      return `${baseClasses}
        border-primary-500 bg-primary-500 text-white
        ring-2 ring-primary-500/50
        shadow-lg scale-105
      `
    }

    if (inGroup) {
      return `${baseClasses}
        border-primary-300 dark:border-primary-600
        bg-primary-100 dark:bg-primary-800/40
        text-primary-800 dark:text-primary-200
        hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
        cursor-pointer
      `
    }

    return `${baseClasses}
      border-gray-200 dark:border-gray-600
      bg-white dark:bg-gray-800
      text-gray-700 dark:text-gray-200
      hover:border-primary-400 hover:bg-primary-50
      dark:hover:border-primary-500 dark:hover:bg-primary-900/20
      hover:shadow-md hover:scale-[1.02]
      active:scale-95
      cursor-grab active:cursor-grabbing
    `
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
            Drag items or tap to select, then tap a group to place
          </p>
        )}
      </div>

      {/* Group Buckets */}
      <div className="flex gap-4 mb-6">
        {groups.map((group) => (
          <div
            key={group.name}
            className={getGroupClasses(group.name)}
            onClick={() => handleGroupClick(group.name)}
            onDragOver={(e) => handleDragOver(e, group.name)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, group.name)}
            role="region"
            aria-label={`${group.name} group`}
          >
            {/* Group Header */}
            <div className="flex items-center justify-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
              <span className="text-2xl">{group.icon}</span>
              <span className="font-bold text-gray-800 dark:text-gray-100">
                {group.name}
              </span>
              {showFeedback && isGroupCorrect(group.name) && (
                <span className="text-green-500">✓</span>
              )}
            </div>

            {/* Items in this group */}
            <div className="flex flex-wrap gap-2 flex-1 content-start min-h-[60px]">
              {groupAssignments[group.name]?.map((item) => (
                <div
                  key={item}
                  className={getItemChipClasses(item, true, group.name)}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveFromGroup(group.name, item)
                  }}
                  draggable={!showFeedback}
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  role="button"
                  tabIndex={0}
                  aria-label={`${item} in ${group.name}. ${showFeedback ? '' : 'Click to remove'}`}
                >
                  {item}
                  {showFeedback && isItemCorrect(group.name, item) && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                  {showFeedback && !isItemCorrect(group.name, item) && (
                    <span className="ml-1 text-red-600">✗</span>
                  )}
                </div>
              ))}
              {groupAssignments[group.name]?.length === 0 && !showFeedback && (
                <span className="text-gray-400 dark:text-gray-500 text-sm italic">
                  Drop items here
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Available items */}
      {!showFeedback && availableItems.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">
            Items to sort:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {availableItems.map((item) => (
              <div
                key={item}
                className={getItemChipClasses(item)}
                onClick={() => handleItemClick(item)}
                draggable={!showFeedback}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                role="button"
                tabIndex={0}
                aria-label={`Item: ${item}`}
                aria-pressed={selectedItem === item}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleItemClick(item)
                  }
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct sorting display (shown in feedback if wrong) */}
      {showFeedback && groups.some(g => !isGroupCorrect(g.name)) && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-300 dark:border-green-700">
          <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
            Correct sorting:
          </p>
          <div className="flex gap-4">
            {groups.map((group) => (
              <div key={group.name} className="flex-1">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {group.icon} {group.name}:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {(correctSorting[group.name] || []).join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explanation (shown in feedback) */}
      {showFeedback && explanation && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
            {explanation}
          </p>
        </div>
      )}

      {/* Submit button (only shown before feedback) */}
      {!showFeedback && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={!allItemsPlaced}
            className={`
              px-8 py-3 rounded-full font-medium
              transition-all duration-200 transform
              ${allItemsPlaced
                ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
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
          Now tap a group to place "{selectedItem}"
        </p>
      )}
    </div>
  )
}
