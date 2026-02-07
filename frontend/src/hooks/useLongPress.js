/**
 * useLongPress Hook
 *
 * Detects long-press gestures on touch and mouse devices.
 * Returns event handlers to attach to elements.
 *
 * Features:
 * - Configurable hold duration (default: 500ms)
 * - Cancels on movement (prevents accidental triggers)
 * - Works with both touch and mouse events
 * - Returns position for action bar placement
 */

import { useCallback, useRef } from 'react'

/**
 * Default long-press duration in milliseconds
 */
const DEFAULT_DELAY = 500

/**
 * Maximum movement (in pixels) before canceling long-press
 */
const MOVE_THRESHOLD = 10

/**
 * useLongPress - Detects long-press gestures
 *
 * @param {Function} onLongPress - Callback when long-press is detected: ({ x, y }) => void
 * @param {Object} [options] - Configuration options
 * @param {number} [options.delay=500] - Hold duration in ms
 * @param {Function} [options.onClick] - Optional click callback (short press)
 * @returns {Object} Event handlers to spread onto element
 */
export default function useLongPress(onLongPress, options = {}) {
  const { delay = DEFAULT_DELAY, onClick } = options

  // Refs for tracking state
  const timerRef = useRef(null)
  const startPositionRef = useRef({ x: 0, y: 0 })
  const isLongPressRef = useRef(false)
  const isActiveRef = useRef(false)

  /**
   * Clear the long-press timer
   */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  /**
   * Start the long-press timer
   */
  const startTimer = useCallback(
    (clientX, clientY) => {
      isActiveRef.current = true
      isLongPressRef.current = false
      startPositionRef.current = { x: clientX, y: clientY }

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true
        onLongPress?.({ x: clientX, y: clientY })
      }, delay)
    },
    [delay, onLongPress]
  )

  /**
   * Check if movement exceeds threshold
   */
  const hasMovedTooMuch = useCallback((clientX, clientY) => {
    const dx = Math.abs(clientX - startPositionRef.current.x)
    const dy = Math.abs(clientY - startPositionRef.current.y)
    return dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD
  }, [])

  /**
   * Handle start of press (mouse down / touch start)
   */
  const handleStart = useCallback(
    (e) => {
      // Get coordinates from mouse or touch event
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      startTimer(clientX, clientY)
    },
    [startTimer]
  )

  /**
   * Handle movement during press
   */
  const handleMove = useCallback(
    (e) => {
      if (!isActiveRef.current) return

      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY

      if (hasMovedTooMuch(clientX, clientY)) {
        clearTimer()
        isActiveRef.current = false
      }
    },
    [clearTimer, hasMovedTooMuch]
  )

  /**
   * Handle end of press
   */
  const handleEnd = useCallback(
    (e) => {
      clearTimer()

      // If it was a short press and not a long press, trigger onClick
      if (isActiveRef.current && !isLongPressRef.current && onClick) {
        onClick(e)
      }

      isActiveRef.current = false
      isLongPressRef.current = false
    },
    [clearTimer, onClick]
  )

  /**
   * Handle cancel (mouse leave, touch cancel)
   */
  const handleCancel = useCallback(() => {
    clearTimer()
    isActiveRef.current = false
    isLongPressRef.current = false
  }, [clearTimer])

  // Return event handlers to spread onto element
  return {
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: handleCancel,
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    onTouchCancel: handleCancel,
  }
}
