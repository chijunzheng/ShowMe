/**
 * Haptics Utility
 *
 * Provides haptic feedback for quiz interactions using the Vibration API.
 * All functions include feature detection and graceful error handling
 * for browsers/devices that don't support haptics.
 */

/**
 * Check if haptic feedback is supported
 * @returns {boolean} True if navigator.vibrate is available
 */
export function isHapticsSupported() {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

/**
 * Safely call navigator.vibrate with error handling
 * @param {number | number[]} pattern - Vibration pattern
 */
function safeVibrate(pattern) {
  if (!isHapticsSupported()) {
    return
  }
  try {
    navigator.vibrate(pattern)
  } catch {
    // Silently ignore vibration errors (e.g., permission denied)
  }
}

/**
 * Short vibration for option select
 * Quick tactile feedback when user taps an answer option
 */
export function vibrateShort() {
  safeVibrate(10)
}

/**
 * Success pattern for correct answer
 * Two quick pulses to celebrate correct answers
 * Pattern: [vibrate 30ms, pause 50ms, vibrate 30ms]
 */
export function vibrateSuccess() {
  safeVibrate([30, 50, 30])
}

/**
 * Building pattern for streak milestone
 * Escalating pulses to build excitement for streaks
 * Pattern: [vibrate 20ms, pause 30ms, vibrate 40ms, pause 30ms, vibrate 60ms]
 */
export function vibrateStreak() {
  safeVibrate([20, 30, 40, 30, 60])
}

/**
 * Single longer buzz for incorrect answer
 * Distinct feedback to indicate wrong answer
 */
export function vibrateError() {
  safeVibrate(100)
}
