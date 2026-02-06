/**
 * SlideReference - Display thumbnail reference to a lesson slide
 *
 * Shows a small preview of a referenced slide that can be tapped to view full-size.
 * Used in Mystery Lab clues to reference specific slides.
 */

import { useState } from 'react'
import { vibrateShort } from '../../../utils/haptics'

/**
 * @param {Object} props
 * @param {number} props.slideRef - 1-indexed slide reference number
 * @param {Array} props.slides - Array of lesson slides
 * @param {string} props.caption - Optional caption text to display below thumbnail
 */
export default function SlideReference({ slideRef, slides = [], caption }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Validate slideRef and get the actual slide
  const slide = getSlideFromRef(slideRef, slides)

  // Handle invalid references
  if (!slide) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic p-2">
        Slide reference not found
      </div>
    )
  }

  const handleThumbnailClick = () => {
    vibrateShort()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    vibrateShort()
    setIsModalOpen(false)
  }

  return (
    <>
      {/* Thumbnail */}
      <div className="inline-block">
        <button
          onClick={handleThumbnailClick}
          className="group relative w-48 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {/* 16:9 aspect ratio container */}
          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={`Slide ${slideRef}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                No image
              </div>
            )}
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                <svg
                  className="w-6 h-6 text-gray-800 dark:text-gray-200"
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
        </button>

        {/* Caption */}
        {caption && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {caption}
          </p>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          {/* Modal Content */}
          <div
            className="relative max-w-4xl max-h-[90vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute -top-12 right-0 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close"
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

            {/* Full-size Image */}
            <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-2xl">
              {slide.imageUrl ? (
                <img
                  src={slide.imageUrl}
                  alt={`Slide ${slideRef}`}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
              ) : (
                <div className="w-full aspect-video flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                  No image available
                </div>
              )}

              {/* Subtitle */}
              {slide.subtitle && (
                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Get slide from 1-indexed reference
 * @param {number} slideRef - 1-indexed slide reference
 * @param {Array} slides - Array of slides
 * @returns {Object|null} The referenced slide or null
 */
function getSlideFromRef(slideRef, slides) {
  // Validate inputs
  if (slideRef === null || slideRef === undefined) {
    return null
  }

  if (!Array.isArray(slides) || slides.length === 0) {
    return null
  }

  // Convert 1-indexed to 0-indexed
  const index = slideRef - 1

  // Check bounds
  if (index < 0 || index >= slides.length) {
    return null
  }

  return slides[index]
}
