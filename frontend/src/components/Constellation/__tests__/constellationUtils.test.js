/**
 * Constellation Utils Tests
 *
 * Tests for utility functions used by the constellation components.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateGapPosition,
  getEdgeLabel,
  getClusterBoundary,
  getBrightnessLevel,
  calculateFitZoom,
  isPointVisible,
  formatMastery,
} from '../constellationUtils'

describe('constellationUtils', () => {
  describe('calculateGapPosition', () => {
    it('returns random position when gap has no connections', () => {
      const gap = { id: 'g1', suggestedTopic: 'Test', connectsTo: [] }
      const positions = new Map()

      const result = calculateGapPosition(gap, positions, [])

      expect(result.x).toBeGreaterThanOrEqual(300)
      expect(result.x).toBeLessThanOrEqual(500)
      expect(result.y).toBeGreaterThanOrEqual(200)
      expect(result.y).toBeLessThanOrEqual(400)
    })

    it('returns random position when connectsTo is undefined', () => {
      const gap = { id: 'g1', suggestedTopic: 'Test' }
      const positions = new Map()

      const result = calculateGapPosition(gap, positions, [])

      expect(result.x).toBeDefined()
      expect(result.y).toBeDefined()
    })

    it('returns center position when connected nodes not found', () => {
      const gap = { id: 'g1', suggestedTopic: 'Test', connectsTo: ['missing1', 'missing2'] }
      const positions = new Map()

      const result = calculateGapPosition(gap, positions, [])

      expect(result.x).toBe(400)
      expect(result.y).toBe(300)
    })

    it('positions near connected nodes with offset', () => {
      const gap = { id: 'g1', suggestedTopic: 'Test', connectsTo: ['n1', 'n2'] }
      const positions = new Map([
        ['n1', { x: 100, y: 100 }],
        ['n2', { x: 200, y: 200 }],
      ])

      const result = calculateGapPosition(gap, positions, [])

      // Should be near the centroid (150, 150) with offset of 60
      const avgX = 150
      const avgY = 150
      const distanceFromCenter = Math.sqrt(
        Math.pow(result.x - avgX, 2) + Math.pow(result.y - avgY, 2)
      )

      expect(distanceFromCenter).toBeCloseTo(60, 0)
    })
  })

  describe('getEdgeLabel', () => {
    it('returns "Builds on" for prerequisite', () => {
      expect(getEdgeLabel('prerequisite')).toBe('Builds on')
    })

    it('returns "Extends" for extends', () => {
      expect(getEdgeLabel('extends')).toBe('Extends')
    })

    it('returns "Contrasts with" for contrasts', () => {
      expect(getEdgeLabel('contrasts')).toBe('Contrasts with')
    })

    it('returns "Applied to" for applies', () => {
      expect(getEdgeLabel('applies')).toBe('Applied to')
    })

    it('returns "Bridges to" for bridges', () => {
      expect(getEdgeLabel('bridges')).toBe('Bridges to')
    })

    it('returns "Related to" for unknown type', () => {
      expect(getEdgeLabel('unknown')).toBe('Related to')
    })
  })

  describe('getClusterBoundary', () => {
    it('returns null when less than 3 nodes', () => {
      const cluster = { id: 'c1', nodeIds: ['n1', 'n2'] }
      const positions = new Map([
        ['n1', { x: 100, y: 100 }],
        ['n2', { x: 200, y: 200 }],
      ])

      expect(getClusterBoundary(cluster, positions)).toBeNull()
    })

    it('returns null when no nodes found', () => {
      const cluster = { id: 'c1', nodeIds: ['missing'] }
      const positions = new Map()

      expect(getClusterBoundary(cluster, positions)).toBeNull()
    })

    it('calculates correct centroid for cluster', () => {
      const cluster = { id: 'c1', nodeIds: ['n1', 'n2', 'n3'] }
      const positions = new Map([
        ['n1', { x: 0, y: 0 }],
        ['n2', { x: 300, y: 0 }],
        ['n3', { x: 150, y: 300 }],
      ])

      const result = getClusterBoundary(cluster, positions)

      expect(result.cx).toBe(150)
      expect(result.cy).toBe(100)
    })

    it('includes padding in radius', () => {
      const cluster = { id: 'c1', nodeIds: ['n1', 'n2', 'n3'] }
      const positions = new Map([
        ['n1', { x: 0, y: 0 }],
        ['n2', { x: 100, y: 0 }],
        ['n3', { x: 50, y: 100 }],
      ])

      const result = getClusterBoundary(cluster, positions)

      // Radius should include 30px padding
      expect(result.radius).toBeGreaterThan(30)
    })
  })

  describe('getBrightnessLevel', () => {
    it('returns "dim" for mastery < 0.25', () => {
      expect(getBrightnessLevel(0)).toBe('dim')
      expect(getBrightnessLevel(0.1)).toBe('dim')
      expect(getBrightnessLevel(0.24)).toBe('dim')
    })

    it('returns "glow" for mastery 0.25-0.5', () => {
      expect(getBrightnessLevel(0.25)).toBe('glow')
      expect(getBrightnessLevel(0.35)).toBe('glow')
      expect(getBrightnessLevel(0.49)).toBe('glow')
    })

    it('returns "bright" for mastery 0.5-0.75', () => {
      expect(getBrightnessLevel(0.5)).toBe('bright')
      expect(getBrightnessLevel(0.6)).toBe('bright')
      expect(getBrightnessLevel(0.74)).toBe('bright')
    })

    it('returns "brilliant" for mastery >= 0.75', () => {
      expect(getBrightnessLevel(0.75)).toBe('brilliant')
      expect(getBrightnessLevel(0.9)).toBe('brilliant')
      expect(getBrightnessLevel(1)).toBe('brilliant')
    })
  })

  describe('calculateFitZoom', () => {
    it('returns 1 for empty positions', () => {
      const positions = new Map()
      expect(calculateFitZoom(positions, 800, 600)).toBe(1)
    })

    it('calculates zoom to fit content', () => {
      const positions = new Map([
        ['n1', { x: 0, y: 0 }],
        ['n2', { x: 400, y: 300 }],
      ])

      const zoom = calculateFitZoom(positions, 800, 600, 50)

      expect(zoom).toBeGreaterThan(0.3)
      expect(zoom).toBeLessThanOrEqual(2)
    })

    it('clamps zoom to min 0.3', () => {
      const positions = new Map([
        ['n1', { x: 0, y: 0 }],
        ['n2', { x: 10000, y: 10000 }],
      ])

      const zoom = calculateFitZoom(positions, 800, 600)

      expect(zoom).toBeGreaterThanOrEqual(0.3)
    })

    it('clamps zoom to max 2', () => {
      const positions = new Map([
        ['n1', { x: 100, y: 100 }],
        ['n2', { x: 110, y: 110 }],
      ])

      const zoom = calculateFitZoom(positions, 800, 600)

      expect(zoom).toBeLessThanOrEqual(2)
    })
  })

  describe('isPointVisible', () => {
    const viewport = { x: 0, y: 0, scale: 1 }
    const viewportWidth = 800
    const viewportHeight = 600

    it('returns true for point inside viewport', () => {
      const point = { x: 400, y: 300 }
      expect(isPointVisible(point, viewport, viewportWidth, viewportHeight)).toBe(true)
    })

    it('returns true for point at edge with margin', () => {
      const point = { x: -40, y: 300 }
      expect(isPointVisible(point, viewport, viewportWidth, viewportHeight)).toBe(true)
    })

    it('returns false for point far outside viewport', () => {
      const point = { x: -200, y: 300 }
      expect(isPointVisible(point, viewport, viewportWidth, viewportHeight)).toBe(false)
    })

    it('accounts for viewport transform', () => {
      const scaledViewport = { x: 100, y: 100, scale: 2 }
      const point = { x: 200, y: 200 }

      // Screen position would be 200*2 + 100 = 500, 200*2 + 100 = 500
      expect(isPointVisible(point, scaledViewport, viewportWidth, viewportHeight)).toBe(true)
    })
  })

  describe('formatMastery', () => {
    it('formats 0 as "0%"', () => {
      expect(formatMastery(0)).toBe('0%')
    })

    it('formats 1 as "100%"', () => {
      expect(formatMastery(1)).toBe('100%')
    })

    it('formats 0.5 as "50%"', () => {
      expect(formatMastery(0.5)).toBe('50%')
    })

    it('rounds to nearest integer', () => {
      expect(formatMastery(0.333)).toBe('33%')
      expect(formatMastery(0.666)).toBe('67%')
    })
  })
})
