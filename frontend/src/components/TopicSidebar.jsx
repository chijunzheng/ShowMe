import { useState, useEffect, useCallback } from 'react'

/**
 * TopicSidebar Component (CORE016 & CORE017)
 *
 * Displays a navigable list of topics with icons and names.
 * Features:
 * - Desktop: Always visible on the left side (~250px wide)
 * - Mobile: Collapsible via hamburger menu button
 * - Active topic highlighting
 * - "+ New Topic" button to return to listening state
 * - Click navigation to jump to topic header slides
 *
 * @param {Object} props - Component props
 * @param {Array} props.topics - Array of topic objects with {id, name, icon, headerSlide, slides}
 * @param {Object|null} props.activeTopic - Currently active topic (last in array)
 * @param {Array} props.allSlides - Flat array of all slides for index calculation
 * @param {Function} props.onNavigateToTopic - Callback when topic is clicked, receives slide index
 * @param {Function} props.onNewTopic - Callback when "+ New Topic" is clicked
 */
function TopicSidebar({
  topics,
  activeTopic,
  allSlides,
  onNavigateToTopic,
  onNewTopic,
}) {
  // Mobile sidebar open/closed state
  const [isOpen, setIsOpen] = useState(false)

  /**
   * Calculate the slide index for a topic's header slide
   * @param {string} topicId - ID of the topic to find
   * @returns {number} Index of the header slide in allSlides array
   */
  const getTopicHeaderIndex = useCallback((topicId) => {
    return allSlides.findIndex(
      (slide) => slide.type === 'header' && slide.topicId === topicId
    )
  }, [allSlides])

  /**
   * Handle topic click - navigate to header slide and close mobile menu
   */
  const handleTopicClick = useCallback((topicId) => {
    const headerIndex = getTopicHeaderIndex(topicId)
    if (headerIndex !== -1 && onNavigateToTopic) {
      onNavigateToTopic(headerIndex)
    }
    // Close mobile menu after navigation
    setIsOpen(false)
  }, [getTopicHeaderIndex, onNavigateToTopic])

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
   * Close sidebar when pressing Escape key
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

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
              return (
                <li key={topic.id}>
                  <button
                    onClick={() => handleTopicClick(topic.id)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3
                      min-h-[44px] rounded-lg
                      text-left transition-all duration-200
                      hover:bg-gray-100
                      focus:outline-none focus:ring-2 focus:ring-primary/50
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

                    {/* Topic name */}
                    <span className="truncate">
                      {topic.name}
                    </span>
                  </button>
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
