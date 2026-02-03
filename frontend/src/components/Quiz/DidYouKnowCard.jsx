/**
 * DidYouKnowCard - Fun fact display card component
 *
 * Displays an engaging "Did You Know?" card with an emoji and fun fact text.
 * Used during loading states or as educational tidbits in quizzes.
 *
 * @param {Object} props
 * @param {Object} props.funFact - The fun fact to display
 * @param {string} props.funFact.emoji - Emoji to display with the fact
 * @param {string} props.funFact.text - The fun fact text content
 * @param {boolean} props.show - Whether to show the card (default: true)
 */

import PropTypes from 'prop-types'

export default function DidYouKnowCard({ funFact, show = true }) {
  // Handle null/undefined funFact gracefully
  if (!funFact || !show) {
    return null
  }

  const { emoji = '', text = '' } = funFact

  return (
    <article
      data-testid="did-you-know-card"
      role="complementary"
      aria-label="Fun fact"
      className={`
        w-full max-w-md
        p-6
        rounded-2xl
        bg-gradient-to-br from-amber-50 to-yellow-100
        border-2 border-amber-200
        shadow-lg
        animate-fade-in
        transition-all duration-300
        hover:shadow-xl
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-2xl"
          aria-hidden="true"
        >
          💡
        </span>
        <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide">
          Did You Know?
        </h3>
      </div>

      {/* Content */}
      <div className="flex items-start gap-4">
        {/* Emoji */}
        {emoji && (
          <span
            data-testid="fun-fact-emoji"
            className="text-4xl flex-shrink-0"
            role="img"
            aria-hidden="true"
          >
            {emoji}
          </span>
        )}

        {/* Text */}
        <p className="text-gray-700 text-base leading-relaxed flex-1">
          {text}
        </p>
      </div>

      {/* Inline keyframes for animations */}
      <style>{`
        @keyframes fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </article>
  )
}

DidYouKnowCard.propTypes = {
  funFact: PropTypes.shape({
    emoji: PropTypes.string,
    text: PropTypes.string,
  }),
  show: PropTypes.bool,
}
