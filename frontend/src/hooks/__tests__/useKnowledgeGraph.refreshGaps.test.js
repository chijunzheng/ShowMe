import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

function makeGap(topic, idSuffix) {
  return {
    id: `gap-${idSuffix}`,
    suggestedTopic: topic,
    type: 'deepen',
    connectsTo: ['n1'],
    reasoning: 'Reason',
    curiosityHook: 'Hook',
  }
}

function makeGraph() {
  return {
    nodes: [
      { id: 'n1', name: 'Ocean Mapping', category: 'geography', masteryScores: { slideshow: 1 } },
      { id: 'n2', name: 'Model Training', category: 'technology', masteryScores: { slideshow: 1 } },
      { id: 'n3', name: 'Jellyfish Brains', category: 'marine biology', masteryScores: { slideshow: 1 } },
    ],
    edges: [],
    clusters: [
      { id: 'cluster_geography', name: 'Geography', nodeIds: ['n1'], color: '#06B6D4' },
      { id: 'cluster_technology', name: 'Technology', nodeIds: ['n2'], color: '#6366F1' },
      { id: 'cluster_marine_biology', name: 'Marine Biology', nodeIds: ['n3'], color: '#0EA5E9' },
    ],
    gaps: [],
    explorerRank: { level: 1, title: 'Stargazer', icon: '\u{1F52D}', topicsToNextRank: 3 },
  }
}

vi.mock('../../utils/graphMigration', () => ({
  migrateFromStorage: () => ({ migrated: false, graph: null, error: null }),
  loadGraphFromStorage: () => makeGraph(),
  saveGraphToStorage: () => true,
  determineCategory: () => 'general',
  createInitialClusters: () => [],
}))

import useKnowledgeGraph from '../useKnowledgeGraph'

describe('useKnowledgeGraph refreshGaps', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends seen suggestions as excludeTopics when requireFreshSet is enabled', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gaps: [
            makeGap('Hydrothermal Vents', 1),
            makeGap('Sonar Imaging', 2),
            makeGap('Underwater Robotics', 3),
            makeGap('Thermal Gradients', 4),
            makeGap('Marine Sensor Networks', 5),
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gaps: [
            makeGap('Deep Sea Chemistry', 6),
            makeGap('Acoustic Mapping', 7),
            makeGap('Bioluminescence Signals', 8),
            makeGap('Pressure Adaptation', 9),
            makeGap('Abyssal Ecosystems', 10),
          ],
        }),
      })

    const { result } = renderHook(() => useKnowledgeGraph())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.refreshGaps({ targetCount: 5, requireFreshSet: true })
    })

    await act(async () => {
      await result.current.refreshGaps({ targetCount: 5, requireFreshSet: true })
    })

    expect(fetch).toHaveBeenCalledTimes(2)
    const secondRequestBody = JSON.parse(fetch.mock.calls[1][1].body)
    expect(secondRequestBody.targetCount).toBe(5)
    expect(secondRequestBody.excludeTopics).toEqual(
      expect.arrayContaining([
        'hydrothermalvents',
        'sonarimaging',
        'underwaterrobotics',
        'thermalgradients',
        'marinesensornetworks',
      ])
    )
  })

  it('resets seen suggestions once when fresh set is exhausted', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gaps: [
            makeGap('Hydrothermal Vents', 1),
            makeGap('Sonar Imaging', 2),
            makeGap('Underwater Robotics', 3),
            makeGap('Thermal Gradients', 4),
            makeGap('Marine Sensor Networks', 5),
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gaps: [
            makeGap('Deep Sea Chemistry', 6),
            makeGap('Acoustic Mapping', 7),
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gaps: [
            makeGap('Deep Sea Chemistry', 8),
            makeGap('Acoustic Mapping', 9),
            makeGap('Bioluminescence Signals', 10),
            makeGap('Pressure Adaptation', 11),
            makeGap('Abyssal Ecosystems', 12),
          ],
        }),
      })

    const { result } = renderHook(() => useKnowledgeGraph())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.refreshGaps({ targetCount: 5, requireFreshSet: true })
    })

    await act(async () => {
      await result.current.refreshGaps({ targetCount: 5, requireFreshSet: true })
    })

    expect(fetch).toHaveBeenCalledTimes(3)
    const secondRequestBody = JSON.parse(fetch.mock.calls[1][1].body)
    const thirdRequestBody = JSON.parse(fetch.mock.calls[2][1].body)
    expect(secondRequestBody.excludeTopics.length).toBeGreaterThan(0)
    expect(thirdRequestBody.excludeTopics).toEqual([])
    expect(result.current.gaps).toHaveLength(5)
  })
})
