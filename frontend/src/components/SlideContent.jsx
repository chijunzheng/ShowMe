/**
 * SlideContent component - Renders slide content based on type
 * Handles header, section, suggestions, and content slides
 */
import TopicHeader from './TopicHeader.jsx'
import SectionDivider from './SectionDivider.jsx'
import HighlightOverlay from './HighlightOverlay.jsx'
import { FALLBACK_SLIDE_IMAGE_URL } from '../constants/appConfig.js'

/**
 * @param {Object} props
 * @param {Object} props.slide - The slide to render
 * @param {Object|null} props.highlightPosition - Position for highlight overlay
 * @param {Function} props.onSuggestionClick - Handler for suggestion clicks
 */
export default function SlideContent({
  slide,
  highlightPosition,
  onSuggestionClick,
}) {
  function handleImageError(event) {
    if (event.currentTarget.dataset.fallbackApplied) return
    event.currentTarget.dataset.fallbackApplied = 'true'
    event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
  }

  if (slide?.type === 'header') {
    return (
      <div className="absolute inset-0 bg-surface rounded-xl shadow-lg overflow-hidden">
        <TopicHeader
          icon={slide.topicIcon}
          name={slide.topicName}
        />
      </div>
    )
  }

  if (slide?.type === 'section') {
    return (
      <div className="absolute inset-0 bg-surface rounded-xl shadow-lg overflow-hidden">
        <SectionDivider question={slide.question} />
      </div>
    )
  }

  if (slide?.type === 'suggestions') {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl shadow-lg overflow-hidden flex flex-col items-center justify-center p-6 md:p-8">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-800 mb-6 text-center">
          Want to learn more?
        </h3>
        <div className="flex flex-col gap-3 w-full max-w-md">
          {slide?.questions?.map((question, idx) => (
            <button
              key={idx}
              onClick={() => onSuggestionClick(question)}
              className="w-full px-4 py-3 bg-white hover:bg-primary hover:text-white text-gray-700 rounded-lg shadow-sm border border-gray-200 hover:border-primary transition-all duration-200 text-left text-sm md:text-base"
            >
              {question}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Regular content slide with image
  return (
    <div className="absolute inset-0 bg-surface rounded-xl shadow-lg overflow-hidden">
      <img
        src={slide?.imageUrl || FALLBACK_SLIDE_IMAGE_URL}
        alt="Slide diagram"
        className="w-full h-full object-contain"
        onError={handleImageError}
      />
      <HighlightOverlay
        x={highlightPosition?.x}
        y={highlightPosition?.y}
        visible={highlightPosition !== null}
      />
    </div>
  )
}
