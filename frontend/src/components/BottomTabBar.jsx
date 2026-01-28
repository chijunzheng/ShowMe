/**
 * BottomTabBar Component (UI001)
 *
 * A fixed bottom navigation bar with two tabs: Learn and World.
 * Replaces the topic sidebar navigation for mobile-first design.
 *
 * Features:
 * - Fixed to bottom of screen with safe area inset support
 * - Two tabs with icons: Learn (microphone) and World (globe/island)
 * - Active tab highlighting with colored fill
 * - Optional badge on World tab for new unlocked pieces
 * - Dark mode support
 * - Keyboard accessible (Tab + Enter/Space)
 * - 44px+ touch targets for mobile accessibility
 *
 * @param {Object} props - Component props
 * @param {'learn' | 'world'} props.activeTab - Currently active tab
 * @param {Function} props.onTabChange - Callback when tab is clicked, receives tab name
 * @param {number} [props.worldBadge] - Optional badge count for World tab (new pieces)
 * @param {boolean} [props.hasSidebar] - Whether sidebar is visible (offsets bar on desktop)
 */
function BottomTabBar({ activeTab = 'learn', onTabChange, worldBadge = 0, hasSidebar = false }) {
  /**
   * Handle tab click/keyboard activation
   */
  const handleTabClick = (tab) => {
    if (onTabChange) {
      onTabChange(tab)
    }
  }

  /**
   * Handle keyboard activation (Enter or Space)
   */
  const handleKeyDown = (event, tab) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleTabClick(tab)
    }
  }

  return (
    <nav
      className={`
        fixed bottom-0 right-0 z-40
        ${hasSidebar ? 'left-0 md:left-64' : 'left-0'}
        h-16 safe-bottom
        bg-white dark:bg-slate-800
        border-t border-gray-200 dark:border-slate-700
        shadow-lg
      `}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-full max-w-screen-md mx-auto">
        {/* Learn Tab */}
        <button
          onClick={() => handleTabClick('learn')}
          onKeyDown={(e) => handleKeyDown(e, 'learn')}
          className={`
            flex-1 flex flex-col items-center justify-center
            min-h-[44px] min-w-[44px]
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset
            ${activeTab === 'learn'
              ? 'text-primary dark:text-primary-400'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
            }
          `}
          aria-label="Learn"
          aria-current={activeTab === 'learn' ? 'page' : undefined}
          role="tab"
          tabIndex={0}
        >
          {/* Microphone Icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6"
            fill={activeTab === 'learn' ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={activeTab === 'learn' ? 0 : 2}
          >
            {activeTab === 'learn' ? (
              // Filled microphone for active state
              <path
                d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
              />
            ) : (
              // Outline microphone for inactive state
              <>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </>
            )}
          </svg>
          <span className="text-xs mt-1 font-medium">Learn</span>
        </button>

        {/* World Tab */}
        <button
          onClick={() => handleTabClick('world')}
          onKeyDown={(e) => handleKeyDown(e, 'world')}
          className={`
            flex-1 flex flex-col items-center justify-center
            min-h-[44px] min-w-[44px]
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset
            relative
            ${activeTab === 'world'
              ? 'text-primary dark:text-primary-400'
              : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'
            }
          `}
          aria-label={worldBadge > 0 ? `World, ${worldBadge} new items` : 'World'}
          aria-current={activeTab === 'world' ? 'page' : undefined}
          role="tab"
          tabIndex={0}
        >
          {/* Globe/Island Icon */}
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6"
              fill={activeTab === 'world' ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={activeTab === 'world' ? 0 : 2}
            >
              {activeTab === 'world' ? (
                // Filled globe for active state
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                />
              ) : (
                // Outline globe for inactive state
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              )}
            </svg>

            {/* Badge for new pieces */}
            {worldBadge > 0 && (
              <span
                className="
                  absolute -top-1 -right-1
                  min-w-[18px] h-[18px]
                  flex items-center justify-center
                  px-1
                  bg-red-500 text-white
                  text-[10px] font-bold
                  rounded-full
                  animate-bounce-in
                "
                aria-hidden="true"
              >
                {worldBadge > 99 ? '99+' : worldBadge}
              </span>
            )}
          </div>
          <span className="text-xs mt-1 font-medium">World</span>
        </button>
      </div>
    </nav>
  )
}

export default BottomTabBar
