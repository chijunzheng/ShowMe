/**
 * QuizSlidePreview - Displays a slide diagram thumbnail with tap-to-zoom
 * Used in quiz questions to provide visual context from the learning content
 */
import { useState, useCallback } from 'react'

/**
 * @param {Object} props
 * @param {string} props.imageUrl - URL of the slide diagram image
 * @param {string} props.alt - Alt text for accessibility
 * @param {boolean} props.isCompact - Use compact size (default: false)
 * @param {string} props.className - Additional CSS classes
 */
export default function QuizSlidePreview({
  imageUrl,
  alt = 'Slide diagram',
  isCompact = false,
  className = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggleExpand()
    }
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false)
    }
  }, [isExpanded, handleToggleExpand])

  const handleImageError = useCallback(() => {
    setImageError(true)
  }, [])

  // Don't render if no image or error loading
  if (!imageUrl || imageError) {
    return null
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggleExpand}
        onKeyDown={handleKeyDown}
        className={`
          relative cursor-pointer group
          ${isCompact ? 'w-24 h-14' : 'w-full max-w-xs'}
          ${className}
        `}
        aria-label={`${alt}. Tap to expand`}
      >
        <div className={`
          relative overflow-hidden rounded-lg
          border-2 border-gray-200 dark:border-gray-700
          bg-gray-100 dark:bg-gray-800
          transition-all duration-200
          group-hover:border-primary-400 dark:group-hover:border-primary-500
          group-hover:shadow-md
          ${isCompact ? 'aspect-video' : 'aspect-video'}
        `}>
          <img
            src={imageUrl}
            alt={alt}
            onError={handleImageError}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Expand hint overlay */}
          <div className="
            absolute inset-0 bg-black/0 group-hover:bg-black/20
            transition-colors duration-200
            flex items-center justify-center
          ">
            <div className="
              opacity-0 group-hover:opacity-100
              transition-opacity duration-200
              bg-white/90 dark:bg-gray-900/90
              rounded-full p-2 shadow-lg
            ">
              <svg
                className="w-5 h-5 text-gray-700 dark:text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* "Tap to view" label for mobile */}
        <p className="
          text-xs text-gray-400 dark:text-gray-500
          text-center mt-1
          sm:hidden
        ">
          Tap to view
        </p>
      </div>

      {/* Expanded modal overlay */}
      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded diagram view"
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/80 backdrop-blur-sm
            animate-fade-in
          "
          onClick={handleToggleExpand}
          onKeyDown={handleKeyDown}
        >
          {/* Close button */}
          <button
            onClick={handleToggleExpand}
            className="
              absolute top-4 right-4
              p-2 rounded-full
              bg-white/10 hover:bg-white/20
              text-white
              transition-colors
            "
            aria-label="Close expanded view"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Expanded image */}
          <div
            className="
              max-w-[90vw] max-h-[85vh]
              rounded-xl overflow-hidden
              shadow-2xl
              animate-scale-in
            "
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageUrl}
              alt={alt}
              className="w-full h-full object-contain bg-white dark:bg-gray-900"
            />
          </div>

          {/* Hint text */}
          <p className="
            absolute bottom-6
            text-white/60 text-sm
          ">
            Tap anywhere to close
          </p>
        </div>
      )}
    </>
  )
}
