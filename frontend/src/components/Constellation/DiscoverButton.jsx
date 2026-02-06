/**
 * DiscoverButton Component
 *
 * Floating action button that triggers LLM-powered topic discovery.
 * Uses translucent dark glass style to match the cosmic space theme.
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
        px-5 h-14 rounded-2xl
        bg-stardust
        border-2 border-stardust-100
        ring-1 ring-white/40
        shadow-[0_0_30px_rgba(255,216,102,0.65)]
        hover:bg-stardust-500 hover:shadow-[0_0_40px_rgba(255,216,102,0.75)]
        text-white text-base font-extrabold tracking-wide
        flex items-center justify-center gap-2
        transition-all duration-150
        focus:outline-none focus:ring-2 focus:ring-stardust/70 focus:ring-offset-2 focus:ring-offset-night-900
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
