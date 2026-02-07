import { describe, expect, it } from 'vitest'
import {
  buildInferredCategoryEdges,
  buildVisualCategoryClusters,
} from '../constellationCategoryGraph'

describe('constellationCategoryGraph', () => {
  describe('buildVisualCategoryClusters', () => {
    it('groups nodes by normalized category with deterministic node ordering', () => {
      const nodes = [
        { id: 'n3', name: 'Gamma', category: 'Science' },
        { id: 'n1', name: 'Zeta Current', category: '  Marine   Biology ' },
        { id: 'n2', name: 'Alpha Reef', category: 'marine biology' },
      ]

      const clusters = buildVisualCategoryClusters(nodes)

      expect(clusters).toEqual([
        {
          id: 'visual_category_marine_biology',
          key: 'marine biology',
          name: 'Marine Biology',
          color: '#0EA5E9',
          icon: '\u{1F433}',
          nodeIds: ['n2', 'n1'],
        },
        {
          id: 'visual_category_science',
          key: 'science',
          name: 'Science',
          color: '#10B981',
          icon: '\u{1F52C}',
          nodeIds: ['n3'],
        },
      ])
    })
  })

  describe('buildInferredCategoryEdges', () => {
    it('returns no inferred links when same-category nodes are already connected', () => {
      const nodes = [
        { id: 'n1', name: 'Alpha', category: 'science' },
        { id: 'n2', name: 'Beta', category: 'science' },
      ]
      const edges = [{ id: 'e1', from: 'n1', to: 'n2' }]

      expect(buildInferredCategoryEdges(nodes, edges)).toEqual([])
    })

    it('connects disconnected same-category components with minimal deterministic links', () => {
      const nodes = [
        { id: 'n1', name: 'Zeta', category: 'science' },
        { id: 'n2', name: 'Alpha', category: 'science' },
        { id: 'n3', name: 'Delta', category: 'science' },
        { id: 'n4', name: 'Beta', category: 'science' },
      ]
      const edges = [{ id: 'e1', from: 'n1', to: 'n2' }]

      const inferred = buildInferredCategoryEdges(nodes, edges)
      expect(inferred).toEqual([
        {
          id: 'inferred_category_science_n2_n4',
          from: 'n2',
          to: 'n4',
          categoryKey: 'science',
          inferred: true,
        },
        {
          id: 'inferred_category_science_n4_n3',
          from: 'n4',
          to: 'n3',
          categoryKey: 'science',
          inferred: true,
        },
      ])
    })

    it('does not infer links for general category', () => {
      const nodes = [
        { id: 'n1', name: 'Mystery One', category: 'general' },
        { id: 'n2', name: 'Mystery Two', category: 'general' },
      ]

      expect(buildInferredCategoryEdges(nodes, [])).toEqual([])
    })

    it('returns deterministic output regardless of input node order', () => {
      const nodesA = [
        { id: 'n1', name: 'Zeta', category: 'science' },
        { id: 'n2', name: 'Alpha', category: 'science' },
        { id: 'n3', name: 'Delta', category: 'science' },
        { id: 'n4', name: 'Beta', category: 'science' },
      ]
      const nodesB = [...nodesA].reverse()
      const edges = [{ id: 'e1', from: 'n1', to: 'n2' }]

      expect(buildInferredCategoryEdges(nodesA, edges)).toEqual(
        buildInferredCategoryEdges(nodesB, edges)
      )
    })
  })
})
