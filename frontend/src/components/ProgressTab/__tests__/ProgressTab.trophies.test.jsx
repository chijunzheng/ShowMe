/**
 * ProgressTab Trophy Row Tests
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ProgressTab from '../ProgressTab'

vi.mock('../../../hooks/useKnowledgeGraph', () => ({
  default: () => ({
    nodes: [],
    edges: [],
    clusters: [],
    gaps: [],
    explorerRank: null,
    isLoading: false,
  }),
}))

const sampleTrophies = [
  {
    id: 'CURIOUS_MIND',
    name: 'Curious Mind',
    description: 'Asked your first question',
    icon: 'lightbulb',
    earnedAt: new Date().toISOString(),
  },
]

describe('ProgressTab trophy row', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders trophies when provided', () => {
    render(
      <ProgressTab
        topics={[]}
        trophies={sampleTrophies}
        trophiesLoading={false}
        totalXP={0}
        streak={0}
        onReviewSlideshow={() => {}}
        onLaunchMode={() => {}}
        onSelectSuggestedTopic={() => {}}
        graphNodes={[]}
        graphEdges={[]}
        graphClusters={[]}
        graphGaps={[]}
        graphIsLoading={false}
      />
    )

    expect(screen.getByText('Curious Mind')).toBeInTheDocument()
  })

  it('renders the trophy showcase inside the overlay container', () => {
    render(
      <ProgressTab
        topics={[]}
        trophies={sampleTrophies}
        trophiesLoading={false}
        totalXP={0}
        streak={0}
        onReviewSlideshow={() => {}}
        onLaunchMode={() => {}}
        onSelectSuggestedTopic={() => {}}
        graphNodes={[]}
        graphEdges={[]}
        graphClusters={[]}
        graphGaps={[]}
        graphIsLoading={false}
      />
    )

    const overlay = screen.getByTestId('progress-overlay')
    const showcase = screen.getByTestId('trophy-showcase')
    expect(overlay).toContainElement(showcase)
  })
})
