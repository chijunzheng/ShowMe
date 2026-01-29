/**
 * FollowUpPanel component - Desktop side panel for follow-up slide navigation
 * Shows on screens 1400px and wider
 */
import { FALLBACK_SLIDE_IMAGE_URL } from '../constants/appConfig.js'

/**
 * @param {Object} props
 * @param {Object} props.parentSlide - The parent slide object
 * @param {Array} props.activeChildSlides - Array of child slides
 * @param {number|null} props.currentChildIndex - Currently selected child index
 * @param {Function} props.onSelectChild - Function to select a child slide
 * @param {Object} props.wasManualNavRef - Ref to track manual navigation
 */
export default function FollowUpPanel({
  parentSlide,
  activeChildSlides,
  currentChildIndex,
  onSelectChild,
  wasManualNavRef,
}) {
  if (activeChildSlides.length === 0) {
    return null
  }

  function handleSelectMain() {
    wasManualNavRef.current = true
    onSelectChild(null)
  }

  function handleSelectChild(idx) {
    wasManualNavRef.current = true
    onSelectChild(idx)
  }

  function handleImageError(event) {
    if (event.currentTarget.dataset.fallbackApplied) return
    event.currentTarget.dataset.fallbackApplied = 'true'
    event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
  }

  return (
    <div className="hidden min-[1400px]:block absolute left-full top-0 bottom-0 translate-x-6 z-20">
      <div className="h-full w-52 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Follow-ups</span>
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            {activeChildSlides.length}
          </span>
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-1">
          <button
            onClick={handleSelectMain}
            aria-label="Back to main slide"
            className={`group flex h-full w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
              currentChildIndex === null
                ? 'border-primary/40 bg-primary/5'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="w-16 h-11 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
              {parentSlide?.imageUrl ? (
                <img
                  src={parentSlide.imageUrl}
                  alt="Main slide thumbnail"
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-700">Main</div>
              <div className="text-[10px] text-gray-400 line-clamp-1">
                {parentSlide?.subtitle || 'Overview'}
              </div>
            </div>
          </button>

          {activeChildSlides.map((slide, idx) => (
            <button
              key={slide.id || idx}
              onClick={() => handleSelectChild(idx)}
              aria-label={`Go to follow-up ${idx + 1}`}
              className={`group flex h-full w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                currentChildIndex === idx
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="w-16 h-11 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                <img
                  src={slide?.imageUrl || FALLBACK_SLIDE_IMAGE_URL}
                  alt={`Follow-up ${idx + 1} thumbnail`}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-700">Follow-up slide {idx + 1}</div>
                <div className="text-[10px] text-gray-400 line-clamp-1">
                  {slide?.subtitle || 'More detail'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
