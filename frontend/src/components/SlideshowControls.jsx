/**
 * SlideshowControls component - Navigation buttons for slideshow
 * Includes prev/next, play/pause, and vertical navigation for child slides
 */

/**
 * @param {Object} props
 * @param {number} props.currentIndex - Current slide index
 * @param {number|null} props.currentChildIndex - Current child slide index
 * @param {number} props.slideCount - Total number of slides
 * @param {number} props.childCount - Number of child slides
 * @param {boolean} props.isPlaying - Whether slideshow is playing
 * @param {Function} props.goToPrevSlide - Handler for previous slide
 * @param {Function} props.goToNextSlide - Handler for next slide
 * @param {Function} props.goToChildPrev - Handler for previous child
 * @param {Function} props.goToChildNext - Handler for next child
 * @param {Function} props.togglePlayPause - Handler for play/pause toggle
 */
export default function SlideshowControls({
  currentIndex,
  currentChildIndex,
  slideCount,
  childCount,
  isPlaying,
  goToPrevSlide,
  goToNextSlide,
  goToChildPrev,
  goToChildNext,
  togglePlayPause,
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Vertical controls - up arrow (only visible if children exist) */}
      {childCount > 0 && (
        <button
          onClick={goToChildPrev}
          disabled={currentChildIndex === null}
          className={`p-2 rounded-full transition-colors ${
            currentChildIndex === null ? 'text-gray-200' : 'text-primary hover:bg-gray-100'
          }`}
        >
          <span aria-hidden="true">&#9650;</span>
        </button>
      )}

      {/* Horizontal controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={goToPrevSlide}
          disabled={currentIndex === 0}
          aria-label="Previous slide"
          className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
            currentIndex === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:text-primary hover:bg-gray-100'
          }`}
        >
          <span aria-hidden="true">&#9664;</span>
        </button>
        <button
          onClick={togglePlayPause}
          aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}
          className="p-3 min-w-[44px] min-h-[44px] bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
        >
          <span aria-hidden="true">{isPlaying ? '\u275A\u275A' : '\u25B6'}</span>
        </button>
        <button
          onClick={goToNextSlide}
          disabled={currentIndex === slideCount - 1}
          aria-label="Next slide"
          className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors ${
            currentIndex === slideCount - 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:text-primary hover:bg-gray-100'
          }`}
        >
          <span aria-hidden="true">&#9654;</span>
        </button>
      </div>

      {/* Vertical controls - down arrow (only visible if children exist) */}
      {childCount > 0 && (
        <button
          onClick={goToChildNext}
          disabled={currentChildIndex === childCount - 1}
          className={`p-2 rounded-full transition-colors ${
            currentChildIndex === childCount - 1 ? 'text-gray-200' : 'text-primary hover:bg-gray-100'
          }`}
        >
          <span aria-hidden="true">&#9660;</span>
        </button>
      )}
    </div>
  )
}
