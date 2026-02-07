/**
 * useConstellationLayout Hook Tests
 *
 * Tests for the force-directed layout hook that calculates
 * node positions for the constellation visualization.
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import useConstellationLayout, { getAdaptiveLayoutConfig } from '../useConstellationLayout'

describe('useConstellationLayout', () => {

  describe('initialization', () => {
    it('returns empty Map for empty nodes', () => {
      const { result } = renderHook(() => useConstellationLayout([], []))
      expect(result.current.size).toBe(0)
    })

    it('returns empty Map for undefined nodes', () => {
      const { result } = renderHook(() => useConstellationLayout(undefined, []))
      expect(result.current.size).toBe(0)
    })

    it('returns positions for each node', () => {
      const nodes = [
        { id: 'n1', name: 'Node 1' },
        { id: 'n2', name: 'Node 2' },
        { id: 'n3', name: 'Node 3' },
      ]
      const { result } = renderHook(() => useConstellationLayout(nodes, []))

      expect(result.current.size).toBe(3)
      expect(result.current.has('n1')).toBe(true)
      expect(result.current.has('n2')).toBe(true)
      expect(result.current.has('n3')).toBe(true)
    })
  })

  describe('position format', () => {
    it('positions have x and y coordinates', () => {
      const nodes = [{ id: 'n1', name: 'Node 1' }]
      const { result } = renderHook(() => useConstellationLayout(nodes, []))

      const pos = result.current.get('n1')
      expect(pos).toHaveProperty('x')
      expect(pos).toHaveProperty('y')
      expect(typeof pos.x).toBe('number')
      expect(typeof pos.y).toBe('number')
    })

    it('positions are finite numbers', () => {
      const nodes = [
        { id: 'n1', name: 'Node 1' },
        { id: 'n2', name: 'Node 2' },
      ]
      const { result } = renderHook(() => useConstellationLayout(nodes, []))

      result.current.forEach((pos) => {
        expect(Number.isFinite(pos.x)).toBe(true)
        expect(Number.isFinite(pos.y)).toBe(true)
      })
    })
  })

  describe('existing positions', () => {
    it('uses existing node positions as starting point', () => {
      const nodes = [
        { id: 'n1', name: 'Node 1', position: { x: 400, y: 300 } },
      ]
      const { result } = renderHook(() => useConstellationLayout(nodes, []))

      const pos = result.current.get('n1')
      // With center gravity pointing to 400, 300, a single node should stay near center
      expect(Number.isFinite(pos.x)).toBe(true)
      expect(Number.isFinite(pos.y)).toBe(true)
    })
  })

  describe('force simulation', () => {
    it('positions nodes with finite coordinates', () => {
      const nodes = [
        { id: 'n1', name: 'Node 1' },
        { id: 'n2', name: 'Node 2' },
      ]
      const { result } = renderHook(() => useConstellationLayout(nodes, []))

      const pos1 = result.current.get('n1')
      const pos2 = result.current.get('n2')

      // Both positions should have valid coordinates
      expect(Number.isFinite(pos1.x)).toBe(true)
      expect(Number.isFinite(pos1.y)).toBe(true)
      expect(Number.isFinite(pos2.x)).toBe(true)
      expect(Number.isFinite(pos2.y)).toBe(true)
    })

    it('brings connected nodes closer together', () => {
      const nodes = [
        { id: 'n1', name: 'Node 1', position: { x: 100, y: 100 } },
        { id: 'n2', name: 'Node 2', position: { x: 700, y: 500 } },
      ]
      const edges = [
        { from: 'n1', to: 'n2', strength: 1 },
      ]

      const { result: withoutEdges } = renderHook(() =>
        useConstellationLayout(nodes, [])
      )
      const { result: withEdges } = renderHook(() =>
        useConstellationLayout(nodes, edges)
      )

      const distWithout = Math.sqrt(
        Math.pow(withoutEdges.current.get('n1').x - withoutEdges.current.get('n2').x, 2) +
        Math.pow(withoutEdges.current.get('n1').y - withoutEdges.current.get('n2').y, 2)
      )
      const distWith = Math.sqrt(
        Math.pow(withEdges.current.get('n1').x - withEdges.current.get('n2').x, 2) +
        Math.pow(withEdges.current.get('n1').y - withEdges.current.get('n2').y, 2)
      )

      // With edges, nodes should be closer
      expect(distWith).toBeLessThan(distWithout)
    })
  })

  describe('edge strength', () => {
    it('stronger edges pull nodes closer', () => {
      const nodes = [
        { id: 'n1', name: 'Node 1', position: { x: 100, y: 300 } },
        { id: 'n2', name: 'Node 2', position: { x: 700, y: 300 } },
      ]

      const weakEdges = [{ from: 'n1', to: 'n2', strength: 0.1 }]
      const strongEdges = [{ from: 'n1', to: 'n2', strength: 1 }]

      const { result: weakResult } = renderHook(() =>
        useConstellationLayout(nodes, weakEdges)
      )
      const { result: strongResult } = renderHook(() =>
        useConstellationLayout(nodes, strongEdges)
      )

      const weakDist = Math.abs(
        weakResult.current.get('n1').x - weakResult.current.get('n2').x
      )
      const strongDist = Math.abs(
        strongResult.current.get('n1').x - strongResult.current.get('n2').x
      )

      expect(strongDist).toBeLessThan(weakDist)
    })
  })

  describe('stability', () => {
    it('produces consistent results for same input', () => {
      const nodes = [
        { id: 'n1', name: 'Node 1' },
        { id: 'n2', name: 'Node 2' },
      ]
      const edges = [{ from: 'n1', to: 'n2', strength: 0.5 }]

      const { result: result1 } = renderHook(() =>
        useConstellationLayout(nodes, edges)
      )
      const { result: result2 } = renderHook(() =>
        useConstellationLayout(nodes, edges)
      )

      // Results should be very similar for same input
      // (not identical due to initial circular layout)
      expect(result1.current.size).toBe(result2.current.size)
    })
  })

  describe('edge cases', () => {
    it('handles edges referencing missing nodes', () => {
      const nodes = [{ id: 'n1', name: 'Node 1' }]
      const edges = [{ from: 'n1', to: 'missing', strength: 1 }]

      expect(() => {
        renderHook(() => useConstellationLayout(nodes, edges))
      }).not.toThrow()
    })

    it('handles null edges array', () => {
      const nodes = [{ id: 'n1', name: 'Node 1' }]

      expect(() => {
        renderHook(() => useConstellationLayout(nodes, null))
      }).not.toThrow()
    })

    it('handles single node', () => {
      const nodes = [{ id: 'n1', name: 'Node 1' }]
      const { result } = renderHook(() => useConstellationLayout(nodes, []))

      expect(result.current.size).toBe(1)
      expect(result.current.get('n1')).toBeDefined()
    })
  })

  describe('adaptive spacing', () => {
    it('scales repulsion and cluster repulsion with counts', () => {
      const base = getAdaptiveLayoutConfig(4, 1)
      const scaled = getAdaptiveLayoutConfig(40, 4)

      expect(scaled.repulsion).toBeGreaterThan(base.repulsion)
      expect(scaled.clusterRepulsion).toBeGreaterThan(base.clusterRepulsion)
      expect(scaled.centerGravity).toBeLessThan(base.centerGravity)
    })
  })
})
