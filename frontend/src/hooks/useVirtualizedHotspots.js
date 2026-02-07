/**
 * useVirtualizedHotspots Hook
 *
 * Filters hotspots to only render those visible in the current viewport,
 * improving performance on large worlds with many hotspots.
 *
 * Features:
 * - Viewport-based filtering with configurable padding buffer
 * - Memoized calculations for optimal performance
 * - Graceful fallbacks for edge cases
 * - Reports visibility statistics
 *
 * Usage:
 * ```jsx
 * const { visibleHotspots, hiddenCount, isVirtualizing } = useVirtualizedHotspots({
 *   hotspots: allHotspots,
 *   viewportRect: { x: 0.2, y: 0.3, width: 0.5, height: 0.4 },
 *   padding: 0.1,
 *   enabled: true,
 * })
 * ```
 */

import { useMemo } from 'react'

/**
 * Default padding around viewport (10% buffer)
 */
const DEFAULT_PADDING = 0.1

/**
 * Threshold for considering viewport as "full view" (no filtering needed)
 * When viewport width and height are both >= this value, skip filtering
 */
const FULL_VIEW_THRESHOLD = 0.99

/**
 * Check if viewport represents full view (zoom level ~1)
 *
 * @param {Object|null} viewportRect - Viewport bounds
 * @returns {boolean} True if viewport shows full world
 */
function isFullView(viewportRect) {
  if (!viewportRect) return true

  return (
    viewportRect.width >= FULL_VIEW_THRESHOLD &&
    viewportRect.height >= FULL_VIEW_THRESHOLD
  )
}

/**
 * Calculate expanded viewport bounds with padding
 *
 * @param {Object} viewportRect - Viewport { x, y, width, height }
 * @param {number} padding - Padding amount (0-1 normalized)
 * @returns {Object} Bounds { left, right, top, bottom }
 */
function calculateBounds(viewportRect, padding) {
  return {
    left: Math.max(0, viewportRect.x - padding),
    right: Math.min(1, viewportRect.x + viewportRect.width + padding),
    top: Math.max(0, viewportRect.y - padding),
    bottom: Math.min(1, viewportRect.y + viewportRect.height + padding),
  }
}

/**
 * Check if a hotspot is within the given bounds
 *
 * @param {Object} hotspot - Hotspot with x, y coordinates (0-1 normalized)
 * @param {Object} bounds - Bounds { left, right, top, bottom }
 * @returns {boolean} True if hotspot is within bounds
 */
function isHotspotInBounds(hotspot, bounds) {
  return (
    hotspot.x >= bounds.left &&
    hotspot.x <= bounds.right &&
    hotspot.y >= bounds.top &&
    hotspot.y <= bounds.bottom
  )
}

/**
 * useVirtualizedHotspots - Filters hotspots to only those visible in viewport
 *
 * @param {Object} options - Configuration options
 * @param {Array<{x: number, y: number, topicName: string}>} [options.hotspots=[]] - All hotspots with normalized coordinates (0-1)
 * @param {{x: number, y: number, width: number, height: number}|null} [options.viewportRect=null] - Current viewport (0-1 normalized)
 * @param {number} [options.padding=0.1] - Extra padding around viewport (0.1 = 10% buffer)
 * @param {boolean} [options.enabled=true] - Enable/disable virtualization
 * @returns {{visibleHotspots: Array, hiddenCount: number, isVirtualizing: boolean}} Virtualization result
 */
export default function useVirtualizedHotspots({
  hotspots = [],
  viewportRect = null,
  padding = DEFAULT_PADDING,
  enabled = true,
} = {}) {
  const result = useMemo(() => {
    // Handle empty hotspots array
    const safeHotspots = Array.isArray(hotspots) ? hotspots : []

    if (safeHotspots.length === 0) {
      return {
        visibleHotspots: [],
        hiddenCount: 0,
        isVirtualizing: false,
      }
    }

    // Skip filtering if disabled, no viewport, or full view
    const shouldVirtualize =
      enabled && viewportRect !== null && !isFullView(viewportRect)

    if (!shouldVirtualize) {
      return {
        visibleHotspots: safeHotspots,
        hiddenCount: 0,
        isVirtualizing: false,
      }
    }

    // Calculate expanded bounds with padding
    const bounds = calculateBounds(viewportRect, padding)

    // Filter hotspots within bounds
    const visibleHotspots = safeHotspots.filter((hotspot) =>
      isHotspotInBounds(hotspot, bounds)
    )

    return {
      visibleHotspots,
      hiddenCount: safeHotspots.length - visibleHotspots.length,
      isVirtualizing: true,
    }
  }, [hotspots, viewportRect, padding, enabled])

  return result
}

/**
 * Utility to check if virtualization would benefit performance
 * Useful for deciding whether to enable virtualization
 *
 * @param {number} hotspotCount - Total number of hotspots
 * @param {number} [threshold=50] - Minimum count to recommend virtualization
 * @returns {boolean} True if virtualization is recommended
 */
export function shouldVirtualize(hotspotCount, threshold = 50) {
  return hotspotCount >= threshold
}
