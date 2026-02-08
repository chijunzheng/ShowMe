/**
 * Streak Utilities
 *
 * Derives streak counts from an activeDates array.
 * More reliable than stored counters which can drift due to timezone mismatches.
 */

/**
 * Get today's date key in YYYY-MM-DD format (local time).
 * @returns {string}
 */
function getLocalDateKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Derive current and longest streak from an activeDates array.
 * Handles dates stored in either UTC or local time by comparing
 * the last active date against yesterday (local) using >= comparison.
 *
 * @param {string[]} activeDates - Array of date strings (YYYY-MM-DD or ISO)
 * @returns {{ current: number, longest: number }}
 */
export function computeStreaksFromDates(activeDates) {
  if (!Array.isArray(activeDates) || activeDates.length === 0) {
    return { current: 0, longest: 0 }
  }

  const sorted = [...new Set(activeDates.map(d => d.split('T')[0]))]
    .filter(Boolean)
    .sort()

  if (sorted.length === 0) return { current: 0, longest: 0 }

  // Compute longest streak
  let longest = 1
  let currentRun = 1

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00')
    const curr = new Date(sorted[i] + 'T00:00:00')
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      currentRun++
      longest = Math.max(longest, currentRun)
    } else if (diffDays > 1) {
      currentRun = 1
    }
  }

  // Check if the streak is current: last active date must be
  // >= yesterday (local time). Uses >= to handle UTC-stored dates
  // that may appear 1 day ahead of local time.
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getLocalDateKey(yesterday)

  const lastDate = sorted[sorted.length - 1]
  if (lastDate < yesterdayKey) {
    return { current: 0, longest }
  }

  // Count backward from the last date to find current streak length
  let current = 1
  for (let i = sorted.length - 2; i >= 0; i--) {
    const prev = new Date(sorted[i] + 'T00:00:00')
    const curr = new Date(sorted[i + 1] + 'T00:00:00')
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      current++
    } else {
      break
    }
  }

  return { current, longest: Math.max(longest, current) }
}
