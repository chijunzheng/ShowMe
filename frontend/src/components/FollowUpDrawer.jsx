/**
 * FollowUpDrawer component - Mobile drawer for follow-up slide navigation
 * Shows a bottom sheet with parent and child slide thumbnails
 */
import { FALLBACK_SLIDE_IMAGE_URL } from '../constants/appConfig.js'

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the drawer is open
 * @param {Function} props.onClose - Function to close the drawer
 * @param {Object} props.parentSlide - The parent slide object
 * @param {Array} props.activeChildSlides - Array of child slides
 * @param {number|null} props.currentChildIndex - Currently selected child index
 * @param {Function} props.onSelectChild - Function to select a child slide
 */
export default function FollowUpDrawer({
  isOpen,
  onClose,
  parentSlide,
  activeChildSlides,
  currentChildIndex,
  onSelectChild,
}) {
  if (!isOpen || activeChildSlides.length === 0) {
    return null
  }

  function handleSelectMain() {
    onSelectChild(null)
    onClose()
  }

  function handleSelectChild(idx) {
    onSelectChild(idx)
    onClose()
  }

  function handleImageError(event) {
    if (event.currentTarget.dataset.fallbackApplied) return
    event.currentTarget.dataset.fallbackApplied = 'true'
    event.currentTarget.src = FALLBACK_SLIDE_IMAGE_URL
  }

  return (
    <div className="xl:hidden fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close follow-ups drawer"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl p-4 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700">Follow-ups</div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSelectMain}
            className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
              currentChildIndex === null
                ? 'border-primary/40 bg-primary/5'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="w-20 h-14 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
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
              <div className="text-sm font-medium text-gray-700">Main</div>
              <div className="text-xs text-gray-400 line-clamp-2">
                {parentSlide?.subtitle || 'Overview'}
              </div>
            </div>
          </button>

          {activeChildSlides.map((slide, idx) => (
            <button
              key={slide.id || idx}
              onClick={() => handleSelectChild(idx)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                currentChildIndex === idx
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="w-20 h-14 rounded-md bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                <img
                  src={slide?.imageUrl || FALLBACK_SLIDE_IMAGE_URL}
                  alt={`Follow-up ${idx + 1} thumbnail`}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-700">Follow-up slide {idx + 1}</div>
                <div className="text-xs text-gray-400 line-clamp-2">
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
