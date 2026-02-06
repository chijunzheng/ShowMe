/**
 * DiscoverButton Component
 *
 * Floating action button that triggers LLM-powered topic discovery.
 * Matches neobrutalism style of zoom controls.
 */

/**
 * DiscoverButton - LLM-powered topic suggestion trigger
 *
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Handler when button is clicked
 * @param {boolean} props.isLoading - Loading state (pulse animation)
 */
export default function DiscoverButton({ onClick, isLoading = false }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        px-4 h-12 rounded-xl
        bg-slate-800/90 border-2 border-black dark:border-slate-600
        shadow-[3px_3px_0_0_#000] dark:shadow-[3px_3px_0_0_#475569]
        hover:bg-slate-700/90
        active:shadow-none active:translate-x-[3px] active:translate-y-[3px]
        text-white text-sm font-bold
        flex items-center justify-center gap-2
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950
        disabled:opacity-70 disabled:cursor-not-allowed
        ${isLoading ? 'pointer-events-none animate-pulse' : ''}
      `}
      aria-label={isLoading ? 'Discovering topics...' : 'Discover related topics'}
    >
      <span aria-hidden="true">✨</span>
      <span>{isLoading ? 'Discovering...' : 'Discover'}</span>
    </button>
  )
}
