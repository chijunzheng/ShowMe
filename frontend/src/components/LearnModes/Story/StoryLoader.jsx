import PropTypes from "prop-types";

/**
 * StoryLoader - Engaging loader for story preparation.
 *
 * Displays rotating story stage copy and an optional fun fact while
 * the story payload is generated.
 */
export default function StoryLoader({ stageText, funFact }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
      <div className="max-w-xl w-full space-y-6 animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-pink-200 dark:border-pink-700 border-t-pink-600 dark:border-t-pink-300 rounded-full animate-spin" />
          <p
            role="status"
            aria-live="polite"
            data-testid="story-loader-stage"
            className="text-sm text-pink-700 dark:text-pink-300 font-semibold"
          >
            {stageText}
          </p>
        </div>

        {funFact?.text && (
          <article
            role="status"
            aria-live="polite"
            data-testid="story-loader-fun-fact"
            className="bg-white/85 dark:bg-gray-800/85 border border-pink-200 dark:border-pink-700 rounded-2xl p-5 shadow-md"
          >
            <p className="text-sm font-bold uppercase tracking-wide text-pink-700 dark:text-pink-300 mb-2">
              Did you know?
            </p>
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">
                {funFact.emoji || "💡"}
              </span>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {funFact.text}
              </p>
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

StoryLoader.propTypes = {
  stageText: PropTypes.string.isRequired,
  funFact: PropTypes.shape({
    emoji: PropTypes.string,
    text: PropTypes.string,
  }),
};
