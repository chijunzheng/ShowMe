import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * TopicSidebar Component (CORE016 & CORE017)
 *
 * Displays a navigable list of topics with icons and names.
 * Features:
 * - Desktop: Always visible on the left side (~250px wide)
 * - Mobile: Collapsible via hamburger menu button
 * - Active topic highlighting
 * - "+ New Topic" button to return to listening state
 * - Click navigation to switch active topic
 * - Rename and delete options via "..." menu
 *
 * @param {Object} props - Component props
 * @param {Array} props.topics - Array of topic objects with {id, name, icon, headerSlide, slides}
 * @param {Object|null} props.activeTopic - Currently active topic
 * @param {Function} props.onNavigateToTopic - Callback when topic is clicked, receives topicId
 * @param {Function} props.onNewTopic - Callback when "+ New Topic" is clicked
 * @param {Function} props.onRenameTopic - Callback when topic is renamed, receives (topicId, newName)
 * @param {Function} props.onDeleteTopic - Callback when topic is deleted, receives topicId
 */
function TopicSidebar({
  topics,
  activeTopic,
  onNavigateToTopic,
  onNewTopic,
  onRenameTopic,
  onDeleteTopic,
}) {
  // Mobile sidebar open/closed state
  const [isOpen, setIsOpen] = useState(false)
  // Track which topic's menu is open
  const [menuOpenForTopic, setMenuOpenForTopic] = useState(null)
  // Track menu position for dropdown
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  // Track which topic is being renamed
  const [renamingTopicId, setRenamingTopicId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef(null)
  const menuRef = useRef(null)
  const menuButtonRefs = useRef({})

  /**
   * Handle topic click - switch active topic and close mobile menu
   */
  const handleTopicClick = useCallback((topicId) => {
    // Don't navigate if we're renaming this topic
    if (renamingTopicId === topicId) return

    if (onNavigateToTopic) {
      onNavigateToTopic(topicId)
    }
    // Close mobile menu after navigation
    setIsOpen(false)
  }, [onNavigateToTopic, renamingTopicId])

  /**
   * Handle new topic button click
   */
  const handleNewTopicClick = useCallback(() => {
    if (onNewTopic) {
      onNewTopic()
    }
    // Close mobile menu
    setIsOpen(false)
  }, [onNewTopic])

  /**
   * Toggle mobile sidebar
   */
  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  /**
   * Toggle topic menu and calculate position
   */
  const handleMenuClick = useCallback((e, topicId) => {
    e.stopPropagation()

    if (menuOpenForTopic === topicId) {
      setMenuOpenForTopic(null)
      return
    }

    // Get button position for dropdown placement
    const button = menuButtonRefs.current[topicId]
    if (button) {
      const rect = button.getBoundingClientRect()
      setMenuPosition({
        top: rect.top,
        left: rect.right + 8, // 8px gap from button
      })
    }

    setMenuOpenForTopic(topicId)
  }, [menuOpenForTopic])

  /**
   * Start renaming a topic
   */
  const handleRenameClick = useCallback((e, topic) => {
    e.stopPropagation()
    setMenuOpenForTopic(null)
    setRenamingTopicId(topic.id)
    setRenameValue(topic.name)
  }, [])

  /**
   * Submit rename
   */
  const handleRenameSubmit = useCallback((topicId) => {
    const trimmed = renameValue.trim()
    if (trimmed && onRenameTopic) {
      onRenameTopic(topicId, trimmed)
    }
    setRenamingTopicId(null)
    setRenameValue('')
  }, [renameValue, onRenameTopic])

  /**
   * Cancel rename
   */
  const handleRenameCancel = useCallback(() => {
    setRenamingTopicId(null)
    setRenameValue('')
  }, [])

  /**
   * Handle rename input keydown
   */
  const handleRenameKeyDown = useCallback((e, topicId) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleRenameSubmit(topicId)
    } else if (e.key === 'Escape') {
      handleRenameCancel()
    }
  }, [handleRenameSubmit, handleRenameCancel])

  /**
   * Handle delete click
   */
  const handleDeleteClick = useCallback((e, topicId) => {
    e.stopPropagation()
    setMenuOpenForTopic(null)
    if (onDeleteTopic) {
      onDeleteTopic(topicId)
    }
  }, [onDeleteTopic])

  /**
   * Close menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenForTopic(null)
      }
    }

    if (menuOpenForTopic) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpenForTopic])

  /**
   * Focus rename input when it appears
   */
  useEffect(() => {
    if (renamingTopicId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingTopicId])

  /**
   * Close sidebar when pressing Escape key
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (renamingTopicId) {
          handleRenameCancel()
        } else if (menuOpenForTopic) {
          setMenuOpenForTopic(null)
        } else if (isOpen) {
          setIsOpen(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, menuOpenForTopic, renamingTopicId, handleRenameCancel])

  /**
   * Prevent body scroll when mobile sidebar is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Don't render anything if there are no topics
  if (topics.length === 0) {
    return null
  }

  return (
    <>
      {/* Mobile hamburger button - fixed position, top left */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={isOpen}
        aria-controls="topic-sidebar"
      >
        {isOpen ? (
          // X icon when open
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Hamburger icon when closed
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        id="topic-sidebar"
        className={`
          fixed top-0 left-0 h-full z-40
          w-64 bg-white border-r border-gray-200
          flex flex-col
          transition-transform duration-300 ease-in-out
          md:translate-x-0 md:static md:z-auto md:flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Topic navigation"
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Topics</h2>
        </div>

        {/* Topic list */}
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1" role="list">
            {topics.map((topic) => {
              const isActive = activeTopic?.id === topic.id
              const isRenaming = renamingTopicId === topic.id
              const isMenuOpen = menuOpenForTopic === topic.id

              return (
                <li key={topic.id} className="relative">
                  <div
                    onClick={() => handleTopicClick(topic.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3
                      min-h-[44px] rounded-lg
                      text-left transition-all duration-200
                      hover:bg-gray-100 cursor-pointer
                      focus:outline-none focus:ring-2 focus:ring-primary/50
                      group
                      ${isActive
                        ? 'bg-primary/10 text-primary font-medium border-l-4 border-primary'
                        : 'text-gray-700'
                      }
                    `}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {/* Topic icon */}
                    <span
                      className="text-2xl flex-shrink-0 select-none"
                      role="img"
                      aria-hidden="true"
                    >
                      {topic.icon}
                    </span>

                    {/* Topic name or rename input */}
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, topic.id)}
                        onBlur={() => handleRenameSubmit(topic.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 px-2 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    ) : (
                      <span className="truncate flex-1">{topic.name}</span>
                    )}

                    {/* More options button */}
                    {!isRenaming && (
                      <button
                        ref={(el) => (menuButtonRefs.current[topic.id] = el)}
                        onClick={(e) => handleMenuClick(e, topic.id)}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-gray-200 transition-opacity"
                        aria-label="Topic options"
                        aria-haspopup="true"
                        aria-expanded={isMenuOpen}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-gray-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Dropdown menu - positioned to the right, overlapping main content */}
                  {isMenuOpen && (
                    <div
                      ref={menuRef}
                      className="fixed z-[100] w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-fade-in"
                      style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                      }}
                      role="menu"
                    >
                      <button
                        onClick={(e) => handleRenameClick(e, topic)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        role="menuitem"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Rename
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, topic.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        role="menuitem"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        {/* New Topic button at bottom */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleNewTopicClick}
            className="
              w-full flex items-center justify-center gap-2
              px-4 py-3 min-h-[44px]
              bg-primary text-white font-medium
              rounded-lg
              hover:bg-primary/90
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
              transition-colors
            "
          >
            {/* Plus icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Topic
          </button>
        </div>
      </aside>
    </>
  )
}

export default TopicSidebar
