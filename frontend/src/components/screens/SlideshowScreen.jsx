/**
 * SlideshowScreen component - Displays the slideshow with slides, controls, and navigation
 * Displayed when uiState is SLIDESHOW and activeTab is 'learn'
 */
import SlideContent from '../SlideContent.jsx'
import SlideshowControls from '../SlideshowControls.jsx'
import LevelIndicator from '../LevelIndicator.jsx'
import ProgressDots from '../ProgressDots.jsx'
import FollowUpDrawer from '../FollowUpDrawer.jsx'
import FollowUpPanel from '../FollowUpPanel.jsx'
import StreamingSubtitle from '../StreamingSubtitle.jsx'

/**
 * @param {Object} props
 * @param {Object} props.displayedSlide - The currently displayed slide
 * @param {Object} props.parentSlide - The parent slide (for follow-up context)
 * @param {Array} props.visibleSlides - All visible top-level slides
 * @param {Array} props.allTopicSlides - All slides including children
 * @param {Array} props.activeChildSlides - Child slides of current parent
 * @param {number} props.currentIndex - Current slide index
 * @param {number|null} props.currentChildIndex - Current child index (null if showing parent)
 * @param {boolean} props.isPreparingFollowUp - Whether follow-up is being prepared
 * @param {Object|null} props.highlightPosition - Position for annotation highlight
 * @param {Function} props.handleSuggestionClick - Handler for suggestion clicks
 * @param {Function} props.setCurrentIndex - Setter for slide index
 * @param {Function} props.setCurrentChildIndex - Setter for child index
 * @param {boolean} props.isFollowUpDrawerOpen - Whether follow-up drawer is open
 * @param {Function} props.setIsFollowUpDrawerOpen - Setter for drawer state
 * @param {Object} props.wasManualNavRef - Ref tracking manual navigation
 * @param {Function} props.getSlideDuration - Function to get slide duration
 * @param {boolean} props.isSlideNarrationPlaying - Whether narration is playing
 * @param {Object} props.slideAudioRef - Ref for slide audio element
 * @param {boolean} props.isPlaying - Whether slideshow is playing
 * @param {Function} props.goToPrevSlide - Navigate to previous slide
 * @param {Function} props.goToNextSlide - Navigate to next slide
 * @param {Function} props.goToChildPrev - Navigate to previous child
 * @param {Function} props.goToChildNext - Navigate to next child
 * @param {Function} props.togglePlayPause - Toggle play/pause state
 * @param {Array} props.questionQueue - Queued questions
 * @param {Object} props.activeTopic - Currently active topic
 * @param {Function} props.handleRegenerate - Handler for regenerating at different level
 * @param {Function} props.handleVersionSwitch - Handler for switching versions
 * @param {boolean} props.isRegenerating - Whether regeneration is in progress
 */
export default function SlideshowScreen({
  displayedSlide,
  parentSlide,
  visibleSlides,
  allTopicSlides,
  activeChildSlides,
  currentIndex,
  currentChildIndex,
  isPreparingFollowUp,
  highlightPosition,
  handleSuggestionClick,
  setCurrentIndex,
  setCurrentChildIndex,
  isFollowUpDrawerOpen,
  setIsFollowUpDrawerOpen,
  wasManualNavRef,
  getSlideDuration,
  isSlideNarrationPlaying,
  slideAudioRef,
  isPlaying,
  goToPrevSlide,
  goToNextSlide,
  goToChildPrev,
  goToChildNext,
  togglePlayPause,
  questionQueue,
  activeTopic,
  handleRegenerate,
  handleVersionSwitch,
  isRegenerating,
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-4 md:px-0">
      {isPreparingFollowUp && (
        <div className="px-3 py-1 text-xs text-primary bg-primary/10 rounded-full">
          Preparing your follow-up...
        </div>
      )}
      <div className="w-full flex flex-col items-center gap-4">
        <div className="w-full relative overflow-visible">
          {/* F050: Slide content with fade transition - key triggers animation on slide change */}
          {/* F043, F044: handles both header and content slides */}
          <div
            key={displayedSlide?.id || `slide-${currentIndex}-${currentChildIndex}`}
            className="slide-fade w-full relative"
          >
            <div className="relative w-full aspect-video overflow-visible">
              <SlideContent
                slide={displayedSlide}
                highlightPosition={highlightPosition}
                onSuggestionClick={handleSuggestionClick}
              />

              <FollowUpPanel
                parentSlide={parentSlide}
                activeChildSlides={activeChildSlides}
                currentChildIndex={currentChildIndex}
                onSelectChild={setCurrentChildIndex}
                wasManualNavRef={wasManualNavRef}
              />
            </div>

            {/* Subtitle - only shown for content slides */}
            {/* CORE036: Streaming subtitles with karaoke-style word reveal */}
            {displayedSlide?.type !== 'header' && displayedSlide?.type !== 'suggestions' && (
              <div className="mt-4">
                {/* F091: Show "Key Takeaways" badge for conclusion slides */}
                {displayedSlide?.isConclusion && (
                  <div className="flex justify-center mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                      Key Takeaways
                    </span>
                  </div>
                )}
                <p className="text-base text-center line-clamp-5">
                  <StreamingSubtitle
                    text={displayedSlide?.subtitle}
                    duration={getSlideDuration(displayedSlide)}
                    isPlaying={isSlideNarrationPlaying}
                    showAll={wasManualNavRef.current}
                    audioRef={slideAudioRef}
                  />
                </p>
              </div>
            )}
          </div>
        </div>

        {activeChildSlides.length > 0 && (
          <button
            onClick={() => setIsFollowUpDrawerOpen(true)}
            className="min-[1400px]:hidden inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 text-xs text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          >
            <span className="font-medium">Follow-ups</span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              {activeChildSlides.length}
            </span>
          </button>
        )}

        {/* F044, F057: Progress dots - show slides for current topic with 44px touch target */}
        <ProgressDots
          slides={visibleSlides}
          allTopicSlides={allTopicSlides}
          currentIndex={currentIndex}
          currentChildIndex={currentChildIndex}
          onSlideSelect={(i) => { setCurrentIndex(i); setCurrentChildIndex(null); }}
          wasManualNavRef={wasManualNavRef}
        />

        {/* Controls - arrow buttons and play/pause */}
        <SlideshowControls
          currentIndex={currentIndex}
          currentChildIndex={currentChildIndex}
          slideCount={visibleSlides.length}
          childCount={activeChildSlides.length}
          isPlaying={isPlaying}
          goToPrevSlide={goToPrevSlide}
          goToNextSlide={goToNextSlide}
          goToChildPrev={goToChildPrev}
          goToChildNext={goToChildNext}
          togglePlayPause={togglePlayPause}
        />

        {/* Queue indicator - shows number of questions waiting (F048) */}
        {questionQueue.length > 0 && (
          <p className="text-sm text-gray-400 mt-2">
            {questionQueue.length} question{questionQueue.length > 1 ? 's' : ''} queued
          </p>
        )}

        {/* Level indicator with regenerate button and version switcher */}
        <LevelIndicator
          activeTopic={activeTopic}
          handleRegenerate={handleRegenerate}
          handleVersionSwitch={handleVersionSwitch}
          isRegenerating={isRegenerating}
        />
      </div>

      <FollowUpDrawer
        isOpen={isFollowUpDrawerOpen}
        onClose={() => setIsFollowUpDrawerOpen(false)}
        parentSlide={parentSlide}
        activeChildSlides={activeChildSlides}
        currentChildIndex={currentChildIndex}
        onSelectChild={setCurrentChildIndex}
      />
    </div>
  )
}
