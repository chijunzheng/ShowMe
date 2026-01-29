/**
 * ProgressDots component - Slide navigation dots
 * Shows different styles for header, section, suggestions, and content slides
 */

/**
 * @param {Object} props
 * @param {Array} props.slides - Array of visible slides
 * @param {Array} props.allTopicSlides - All topic slides (to check for children)
 * @param {number} props.currentIndex - Current slide index
 * @param {number|null} props.currentChildIndex - Current child index
 * @param {Function} props.onSlideSelect - Handler for slide selection
 * @param {Object} props.wasManualNavRef - Ref to track manual navigation
 */
export default function ProgressDots({
  slides,
  allTopicSlides,
  currentIndex,
  currentChildIndex,
  onSlideSelect,
  wasManualNavRef,
}) {
  function handleSlideClick(index) {
    wasManualNavRef.current = true
    onSlideSelect(index)
  }

  function getAriaLabel(slide, index, totalSlides) {
    if (slide.type === 'header') {
      return `Go to ${slide.topicName} topic header`
    }
    if (slide.type === 'section') {
      return 'Go to follow-up section'
    }
    if (slide.type === 'suggestions') {
      return 'Go to suggested questions'
    }
    return `Go to slide ${index + 1} of ${totalSlides}`
  }

  function getDotClassName(slide, index, isActive) {
    const isHeader = slide.type === 'header'
    const isSection = slide.type === 'section'
    const isSuggestions = slide.type === 'suggestions'

    if (isHeader) {
      return `w-4 h-3 rounded ${isActive ? 'bg-primary' : 'bg-gray-400'}`
    }
    if (isSection) {
      return `w-3 h-3 rounded-sm ${isActive ? 'bg-indigo-500' : 'bg-gray-300'}`
    }
    if (isSuggestions) {
      return `w-3 h-3 rotate-45 ${isActive ? 'bg-primary' : 'bg-gray-300'}`
    }
    return `w-3 h-3 rounded-full ${isActive ? 'bg-primary' : 'bg-gray-300'}`
  }

  return (
    <div
      className="flex items-center gap-1 flex-wrap justify-center"
      role="tablist"
      aria-label="Slide navigation"
    >
      {slides.map((slide, i) => {
        const hasChildren = allTopicSlides.some(s => s.parentId === slide.id)
        const isActive = i === currentIndex

        return (
          <button
            key={slide.id}
            onClick={() => handleSlideClick(i)}
            role="tab"
            aria-selected={isActive}
            aria-label={getAriaLabel(slide, i, slides.length)}
            className="p-2 transition-colors cursor-pointer hover:scale-125 relative"
          >
            <span className={`block ${getDotClassName(slide, i, isActive)}`} />
            {hasChildren && !isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full" />
            )}
            {hasChildren && isActive && currentChildIndex === null && (
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-primary text-xs animate-bounce">
                &#9660;
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
