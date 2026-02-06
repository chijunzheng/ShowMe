import { describe, it, expect } from 'vitest'
import { filterGapsWithConnections, shouldAutoRecluster } from '../useKnowledgeGraph'

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
})
