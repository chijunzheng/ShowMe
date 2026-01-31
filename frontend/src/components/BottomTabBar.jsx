/**
 * BottomTabBar Component (UI001)
 *
 * A fixed bottom navigation bar with three tabs: Learn, World, and Quiz.
 * Replaces the topic sidebar navigation for mobile-first design.
 *
 * Features:
 * - Fixed to bottom of screen with safe area inset support
 * - Three tabs with icons: Learn (microphone), World (globe), Quiz (question)
 * - Active tab highlighting with colored fill and background
 * - Optional badges on World and Quiz tabs
 * - Dark mode support
 * - Keyboard accessible (Tab + Enter/Space)
 * - 44px+ touch targets for mobile accessibility
 *
 * @param {Object} props - Component props
 * @param {'learn' | 'world' | 'quiz'} props.activeTab - Currently active tab
 * @param {Function} props.onTabChange - Callback when tab is clicked, receives tab name
 * @param {number} [props.worldBadge] - Optional badge count for World tab (new pieces)
 * @param {number} [props.quizBadge] - Optional badge count for Quiz tab (topics to review)
 * @param {boolean} [props.hasSidebar] - Whether sidebar is visible (offsets bar on desktop)
 */
import { LearnIcon, WorldIcon, QuizIcon } from './icons/TabIcons'

function BottomTabBar({ activeTab = 'learn', onTabChange, worldBadge = 0, quizBadge = 0, hasSidebar = false }) {
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

  const tabs = [
    { id: 'learn', label: 'Learn', Icon: LearnIcon, badge: 0 },
    { id: 'world', label: 'World', Icon: WorldIcon, badge: worldBadge },
    { id: 'quiz', label: 'Quiz', Icon: QuizIcon, badge: quizBadge },
  ]

  return (
    <nav
      className={`
        fixed bottom-0 right-0 z-40
        ${hasSidebar ? 'left-0 md:left-64' : 'left-0'}
        h-16 safe-bottom
        bg-cream-50 dark:bg-night-800
        border-t border-cream-200 dark:border-night-600
        shadow-[0_-2px_10px_rgba(0,0,0,0.05)]
      `}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-full max-w-screen-md mx-auto">
        {tabs.map(({ id, label, Icon, badge }) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            onKeyDown={(e) => handleKeyDown(e, id)}
            className={`
              flex-1 flex flex-col items-center justify-center
              min-h-[44px] min-w-[44px]
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset
              relative
              ${activeTab === id
                ? 'text-primary dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
              }
            `}
            aria-label={badge > 0 ? `${label}, ${badge} new items` : label}
            aria-current={activeTab === id ? 'page' : undefined}
            role="tab"
            tabIndex={0}
          >
            <div className={`
              flex flex-col items-center gap-0.5 px-3 py-1 rounded-full transition-all
              ${activeTab === id ? 'bg-primary-100' : ''}
            `}>
              <div className="relative">
                <Icon active={activeTab === id} />

                {/* Badge */}
                {badge > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-2
                      min-w-[16px] h-[16px]
                      flex items-center justify-center
                      px-1
                      bg-accent text-white
                      text-[10px] font-bold
                      rounded-full
                    "
                    aria-hidden="true"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">{label}</span>
            </div>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default BottomTabBar
