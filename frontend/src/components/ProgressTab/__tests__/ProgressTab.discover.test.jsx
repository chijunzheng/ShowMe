import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState } from 'react'
import ProgressTab from '../ProgressTab'

vi.mock('../../../hooks/useKnowledgeGraph', () => ({
  default: () => ({
    nodes: [],
    edges: [],
    clusters: [],
    gaps: [],
    explorerRank: null,
    isLoading: false,
    refreshGaps: vi.fn(),
  }),
}))

vi.mock('../../Dashboard', () => ({
  StatsBar: () => <div data-testid="stats-bar" />,
  StatDetailSheet: () => null,
}))

vi.mock('../../Constellation', () => ({
  Constellation: ({ gaps = [], onDiscover, isDiscovering }) => (
    <div>
      <button onClick={onDiscover} disabled={isDiscovering} aria-label="discover trigger">
        discover
      </button>
      <div data-testid="gaps-list">
        {gaps.map((gap) => (
          <span key={gap.id}>{gap.suggestedTopic}</span>
        ))}
      </div>
    </div>
  ),
}))

vi.mock('../TopicActionSheet', () => ({
  default: () => null,
}))

vi.mock('../SuggestedTopicSheet', () => ({
  default: () => null,
}))

const FIRST_GAPS = [
  { id: 'g1', suggestedTopic: 'Gap One', connectsTo: ['n1'] },
  { id: 'g2', suggestedTopic: 'Gap Two', connectsTo: ['n1'] },
  { id: 'g3', suggestedTopic: 'Gap Three', connectsTo: ['n1'] },
  { id: 'g4', suggestedTopic: 'Gap Four', connectsTo: ['n1'] },
  { id: 'g5', suggestedTopic: 'Gap Five', connectsTo: ['n1'] },
]

const SECOND_GAPS = [
  { id: 'g6', suggestedTopic: 'New Gap One', connectsTo: ['n1'] },
  { id: 'g7', suggestedTopic: 'New Gap Two', connectsTo: ['n1'] },
  { id: 'g8', suggestedTopic: 'New Gap Three', connectsTo: ['n1'] },
  { id: 'g9', suggestedTopic: 'New Gap Four', connectsTo: ['n1'] },
  { id: 'g10', suggestedTopic: 'New Gap Five', connectsTo: ['n1'] },
]

function DiscoverHarness({ onDiscoverSpy }) {
  const [gaps, setGaps] = useState([])
  const callCountRef = useRef(0)

  const onDiscoverSuggestions = async (options) => {
    onDiscoverSpy(options)
    callCountRef.current += 1
    const nextGaps = callCountRef.current === 1 ? FIRST_GAPS : SECOND_GAPS
    setGaps(nextGaps)
    return nextGaps
  }

  return (
    <ProgressTab
      topics={[{ topicId: 't1', topicName: 'Ocean Mapping' }]}
      onReviewSlideshow={() => {}}
      onLaunchMode={() => {}}
      totalXP={0}
      streak={0}
      trophies={[]}
      onSelectSuggestedTopic={() => {}}
      onDiscoverSuggestions={onDiscoverSuggestions}
      selectedLevel="standard"
      setSelectedLevel={() => {}}
      graphNodes={[]}
      graphEdges={[]}
      graphClusters={[]}
      graphGaps={gaps}
      graphIsLoading={false}
    />
  )
}

describe('ProgressTab discover behavior', () => {
  it('calls discover with fresh-set options', async () => {
    const onDiscoverSpy = vi.fn()
    render(<DiscoverHarness onDiscoverSpy={onDiscoverSpy} />)

    fireEvent.click(screen.getByLabelText('discover trigger'))

    await waitFor(() => {
      expect(onDiscoverSpy).toHaveBeenCalledTimes(1)
    })
    expect(onDiscoverSpy).toHaveBeenCalledWith({
      targetCount: 5,
      requireFreshSet: true,
    })
  })

  it('replaces visible suggestions with the latest discovered set', async () => {
    const onDiscoverSpy = vi.fn()
    render(<DiscoverHarness onDiscoverSpy={onDiscoverSpy} />)

    fireEvent.click(screen.getByLabelText('discover trigger'))
    await waitFor(() => {
      expect(screen.getByText('Gap One')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('discover trigger'))
    await waitFor(() => {
      expect(screen.getByText('New Gap One')).toBeInTheDocument()
    })

    expect(screen.queryByText('Gap One')).not.toBeInTheDocument()
    expect(screen.getByText('New Gap Five')).toBeInTheDocument()
  })
})
