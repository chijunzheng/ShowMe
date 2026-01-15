/**
 * FunFactCard - Displays an engaging fun fact during slideshow generation
 *
 * Shows an emoji icon alongside the fact text to keep users entertained
 * while waiting for slides to be generated. The card appears within 2 seconds
 * of triggering generation using data from the /api/generate/engagement endpoint.
 *
 * @param {Object} props - Component props
 * @param {Object} props.funFact - Fun fact object from engagement API
 * @param {string} props.funFact.emoji - Emoji icon representing the topic
 * @param {string} props.funFact.text - The fun fact text content
 */
function FunFactCard({ funFact }) {
  // Guard against missing or incomplete data
  if (!funFact || !funFact.text) {
    return null
  }

  return (
    <div
      className="w-full max-w-md p-5 bg-primary/10 rounded-xl animate-fade-in-up"
      role="status"
      aria-live="polite"
      aria-label="Fun fact while you wait"
    >
      {/* Emoji icon - large display for visual engagement */}
      {funFact.emoji && (
        <span
          className="text-3xl block mb-3"
          role="img"
          aria-hidden="true"
        >
          {funFact.emoji}
        </span>
      )}

      {/* Fun fact text */}
      <p className="text-gray-700 leading-relaxed">
        {funFact.text}
      </p>

      {/* Subtle label to indicate this is a fun fact */}
      <p className="mt-3 text-xs text-gray-400 uppercase tracking-wide font-semibold">
        Did you know?
      </p>
    </div>
  )
}

export default FunFactCard
