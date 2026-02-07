import { describe, it, expect } from 'vitest'
import {
  filterGapsWithConnections,
  shouldAutoRecluster,
  normalizeGapTargetCount,
  shouldResetSeenGapSuggestions,
} from '../useKnowledgeGraph'

describe('useKnowledgeGraph utils', () => {
  describe('filterGapsWithConnections', () => {
    it('removes gaps without any connection ids', () => {
      const gaps = [
        { id: 'g1', suggestedTopic: 'A', connectsTo: ['n1'] },
        { id: 'g2', suggestedTopic: 'B', connectsTo: [] },
        { id: 'g3', suggestedTopic: 'C', connectsTo: null },
        { id: 'g4', suggestedTopic: 'D', relatedNodeIds: ['n2'] },
      ]

      const filtered = filterGapsWithConnections(gaps)

      expect(filtered.map((gap) => gap.id)).toEqual(['g1', 'g4'])
    })
  })

  describe('shouldAutoRecluster', () => {
    it('returns true when under limit and debounce elapsed', () => {
      const result = shouldAutoRecluster({
        nodeCount: 20,
        lastReclusterAt: 0,
        now: 5000,
        limit: 40,
        debounceMs: 2000,
      })

      expect(result).toBe(true)
    })

    it('returns false when over limit', () => {
      const result = shouldAutoRecluster({
        nodeCount: 50,
        lastReclusterAt: 0,
        now: 5000,
        limit: 40,
        debounceMs: 2000,
      })

      expect(result).toBe(false)
    })

    it('returns false when debounce has not elapsed', () => {
      const result = shouldAutoRecluster({
        nodeCount: 20,
        lastReclusterAt: 4000,
        now: 5000,
        limit: 40,
        debounceMs: 2000,
      })

      expect(result).toBe(false)
    })
  })

  describe('gap refresh option helpers', () => {
    it('normalizes target count to defaults and bounds', () => {
      expect(normalizeGapTargetCount(undefined)).toBe(6)
      expect(normalizeGapTargetCount(0)).toBe(1)
      expect(normalizeGapTargetCount(999)).toBe(10)
      expect(normalizeGapTargetCount(5)).toBe(5)
    })

    it('resets seen suggestions only when fresh set is requested and insufficient', () => {
      expect(shouldResetSeenGapSuggestions({
        requireFreshSet: true,
        targetCount: 5,
        resultCount: 3,
        seenCount: 5,
      })).toBe(true)

      expect(shouldResetSeenGapSuggestions({
        requireFreshSet: true,
        targetCount: 5,
        resultCount: 5,
        seenCount: 5,
      })).toBe(false)

      expect(shouldResetSeenGapSuggestions({
        requireFreshSet: false,
        targetCount: 5,
        resultCount: 2,
        seenCount: 5,
      })).toBe(false)
    })
  })
})
