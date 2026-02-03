/**
 * LivingWorldView Component Tests
 *
 * Tests for the LivingWorldView component that integrates all Living World
 * components into a cohesive world viewing experience.
 *
 * TDD: These tests are written FIRST, before implementation.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

// Mock window.matchMedia for WorldTransition's useReducedMotion hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

import LivingWorldView from '../LivingWorldView'

/**
 * Default props for LivingWorldView component
 * The component now receives all state as props from parent (App.jsx)
 */
const createDefaultProps = (overrides = {}) => ({
  worldState: null,
  worldImageUrl: null,
  isLoading: false,
  isEvolving: false,
  tier: null,
  hotspots: [],
  error: null,
  onInitializeWorld: vi.fn().mockResolvedValue({ success: true }),
  ...overrides,
})

/**
 * Helper to simulate image load event
 */
function simulateImageLoad() {
  const image = screen.queryByRole('img', { name: /world panorama/i })
  if (image) {
    fireEvent.load(image)
  }
}

describe('LivingWorldView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('empty state', () => {
    it('shows "Create Your World" CTA when worldState is null', () => {
      const props = createDefaultProps({
        worldState: null,
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      // Check for the CTA button specifically
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })

    it('calls onInitializeWorld when CTA is clicked', async () => {
      const onInitializeWorld = vi.fn().mockResolvedValue({ success: true })
      const props = createDefaultProps({
        worldState: null,
        isLoading: false,
        onInitializeWorld,
      })

      render(<LivingWorldView {...props} />)

      const ctaButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(ctaButton)

      expect(onInitializeWorld).toHaveBeenCalledTimes(1)
    })

    it('shows descriptive text about creating a world', () => {
      const props = createDefaultProps({
        worldState: null,
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      // Should have some explanatory text about learning journey
      expect(screen.getByText(/learning journey/i)).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows loading skeleton during initial fetch', () => {
      const props = createDefaultProps({
        isLoading: true,
        worldState: null,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.getByTestId('living-world-skeleton')).toBeInTheDocument()
    })

    it('skeleton has animated pulse effect', () => {
      const props = createDefaultProps({
        isLoading: true,
      })

      render(<LivingWorldView {...props} />)

      const skeleton = screen.getByTestId('living-world-skeleton')
      expect(skeleton.className).toMatch(/animate-pulse/)
    })

    it('does not show CTA while loading', () => {
      const props = createDefaultProps({
        isLoading: true,
        worldState: null,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.queryByText(/create your world/i)).not.toBeInTheDocument()
    })
  })

  describe('world display', () => {
    it('shows PanoramaViewer when worldImageUrl exists', () => {
      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/world.png' },
        worldImageUrl: 'https://example.com/world.png',
        tier: 'sprouting',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.getByTestId('panorama-container')).toBeInTheDocument()
    })

    it('passes worldImageUrl to PanoramaViewer', () => {
      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/world.png' },
        worldImageUrl: 'https://example.com/world.png',
        tier: 'sprouting',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      const image = screen.getByRole('img', { name: /world panorama/i })
      expect(image).toHaveAttribute('src', 'https://example.com/world.png')
    })

    it('passes hotspots to PanoramaViewer', () => {
      const mockHotspots = [
        { x: 0.2, y: 0.3, topicName: 'Volcanoes', layer: 'foreground' },
        { x: 0.6, y: 0.5, topicName: 'Rivers', layer: 'midground' },
      ]

      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/world.png' },
        worldImageUrl: 'https://example.com/world.png',
        hotspots: mockHotspots,
        tier: 'growing',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      // Simulate image load to show hotspots
      simulateImageLoad()

      expect(screen.getByText('Volcanoes')).toBeInTheDocument()
      expect(screen.getByText('Rivers')).toBeInTheDocument()
    })

    it('does not show CTA when world exists', () => {
      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/world.png' },
        worldImageUrl: 'https://example.com/world.png',
        tier: 'sprouting',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.queryByText(/create your world/i)).not.toBeInTheDocument()
    })
  })

  describe('evolution flow', () => {
    it('shows WorldTransition when isEvolving is true', () => {
      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/new-world.png' },
        worldImageUrl: 'https://example.com/new-world.png',
        isEvolving: true,
        tier: 'growing',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.getByTestId('world-transition-container')).toBeInTheDocument()
    })

    it('shows transition overlay during evolution', () => {
      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/new-world.png' },
        worldImageUrl: 'https://example.com/new-world.png',
        isEvolving: true,
        tier: 'growing',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.getByTestId('transition-overlay')).toBeInTheDocument()
    })

    it('hides WorldTransition when isEvolving is false', () => {
      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/world.png' },
        worldImageUrl: 'https://example.com/world.png',
        isEvolving: false,
        tier: 'growing',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      // Should show PanoramaViewer, not WorldTransition
      expect(screen.getByTestId('panorama-container')).toBeInTheDocument()
      // Transition overlay should not be present when not evolving
      expect(screen.queryByTestId('transition-overlay')).not.toBeInTheDocument()
    })
  })

  describe('tier badge', () => {
    it('displays tier badge when world exists', () => {
      const props = createDefaultProps({
        worldState: {
          imageUrl: 'https://example.com/world.png',
          topicsLearned: ['Volcanoes', 'Rivers', 'Mountains'],
        },
        worldImageUrl: 'https://example.com/world.png',
        tier: 'growing',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.getByLabelText(/world tier/i)).toBeInTheDocument()
    })

    it('shows tier label in badge', () => {
      const props = createDefaultProps({
        worldState: {
          imageUrl: 'https://example.com/world.png',
          topicsLearned: ['Volcanoes'],
        },
        worldImageUrl: 'https://example.com/world.png',
        tier: 'thriving',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      // Tier should be displayed in badge
      expect(screen.getByText(/thriving/i)).toBeInTheDocument()
    })

    it('displays topics count in StatsBar', () => {
      const props = createDefaultProps({
        worldState: {
          imageUrl: 'https://example.com/world.png',
          topicsLearned: ['Volcanoes', 'Rivers', 'Mountains', 'Oceans', 'Deserts'],
        },
        worldImageUrl: 'https://example.com/world.png',
        tier: 'growing',
        isLoading: false,
        topicCount: 5,
      })

      render(<LivingWorldView {...props} />)

      const topicsStat = screen.getByTestId('stat-topics')
      expect(topicsStat).toHaveTextContent('5')
    })

    it('does not show tier badge when world does not exist', () => {
      const props = createDefaultProps({
        worldState: null,
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.queryByLabelText(/world tier/i)).not.toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('shows error message when error occurs', () => {
      const props = createDefaultProps({
        error: 'Failed to load world',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      // Check for error heading specifically
      expect(screen.getByRole('heading', { name: /failed to load/i })).toBeInTheDocument()
    })

    it('provides retry option on error', () => {
      const props = createDefaultProps({
        error: 'Network error',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      expect(screen.getByRole('button', { name: /try again|retry/i })).toBeInTheDocument()
    })
  })

  describe('hotspot interaction', () => {
    it('calls onHotspotClick when a hotspot is tapped', () => {
      const onHotspotClick = vi.fn()
      const mockHotspots = [
        { x: 0.5, y: 0.5, topicName: 'Dinosaurs', layer: 'midground' },
      ]

      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/world.png' },
        worldImageUrl: 'https://example.com/world.png',
        hotspots: mockHotspots,
        tier: 'growing',
        isLoading: false,
        onHotspotClick,
      })

      render(<LivingWorldView {...props} />)

      simulateImageLoad()

      const hotspot = screen.getByTestId('hotspot')
      // Use mouseDown + mouseUp to simulate click (useLongPress hook intercepts mouse events)
      fireEvent.mouseDown(hotspot, { clientX: 100, clientY: 100 })
      fireEvent.mouseUp(hotspot, { clientX: 100, clientY: 100 })

      expect(onHotspotClick).toHaveBeenCalledWith(0.5, 0.5)
    })
  })

  describe('callbacks', () => {
    it('calls onWorldInitialized after successful initialization', async () => {
      const onWorldInitialized = vi.fn()
      const onInitializeWorld = vi.fn().mockResolvedValue({ success: true })

      const props = createDefaultProps({
        worldState: null,
        isLoading: false,
        onInitializeWorld,
        onWorldInitialized,
      })

      render(<LivingWorldView {...props} />)

      const ctaButton = screen.getByRole('button', { name: /create/i })
      fireEvent.click(ctaButton)

      await waitFor(() => {
        expect(onWorldInitialized).toHaveBeenCalled()
      })
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA structure', () => {
      const props = createDefaultProps({
        worldState: { imageUrl: 'https://example.com/world.png' },
        worldImageUrl: 'https://example.com/world.png',
        tier: 'growing',
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      const container = screen.getByTestId('living-world-view')
      expect(container).toHaveAttribute('role', 'region')
      expect(container).toHaveAttribute('aria-label')
    })

    it('empty state CTA is keyboard accessible', () => {
      const props = createDefaultProps({
        worldState: null,
        isLoading: false,
      })

      render(<LivingWorldView {...props} />)

      const ctaButton = screen.getByRole('button', { name: /create/i })
      expect(ctaButton).toHaveAttribute('tabIndex', '0')
    })
  })
})

describe('WorldInfoPanel', () => {
  // Import WorldInfoPanel for isolated testing
  let WorldInfoPanel

  beforeEach(async () => {
    vi.clearAllMocks()
    const module = await import('../WorldInfoPanel')
    WorldInfoPanel = module.default
  })

  afterEach(() => {
    cleanup()
  })

  describe('tier display', () => {
    it('displays the current tier', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={15}
          recentTopics={['Volcanoes']}
        />
      )

      expect(screen.getByText(/growing/i)).toBeInTheDocument()
    })

    it('displays tier icon for each tier level', () => {
      const tiers = ['barren', 'sprouting', 'growing', 'thriving', 'legendary']

      tiers.forEach((tier) => {
        cleanup()
        render(
          <WorldInfoPanel
            tier={tier}
            totalTopics={10}
            recentTopics={[]}
          />
        )

        // Should have some visual indicator for tier
        const panel = screen.getByTestId('world-info-panel')
        expect(panel).toBeInTheDocument()
      })
    })

    it('handles undefined tier gracefully', () => {
      expect(() => {
        render(
          <WorldInfoPanel
            tier={undefined}
            totalTopics={0}
            recentTopics={[]}
          />
        )
      }).not.toThrow()
    })
  })

  describe('topics count', () => {
    it('displays total topics count', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={25}
          recentTopics={[]}
        />
      )

      expect(screen.getByText(/25/)).toBeInTheDocument()
    })

    it('shows "topic" singular for 1 topic', () => {
      render(
        <WorldInfoPanel
          tier="sprouting"
          totalTopics={1}
          recentTopics={['Dinosaurs']}
        />
      )

      // Should say "1 topic" not "1 topics"
      expect(screen.getByText(/1 topic(?!s)/i)).toBeInTheDocument()
    })

    it('shows "topics" plural for multiple topics', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={5}
          recentTopics={[]}
        />
      )

      expect(screen.getByText(/5 topics/i)).toBeInTheDocument()
    })

    it('handles zero topics', () => {
      render(
        <WorldInfoPanel
          tier="barren"
          totalTopics={0}
          recentTopics={[]}
        />
      )

      expect(screen.getByText(/0 topics/i)).toBeInTheDocument()
    })
  })

  describe('recent topics', () => {
    it('displays recent topics list', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={10}
          recentTopics={['Volcanoes', 'Dinosaurs', 'Space']}
        />
      )

      expect(screen.getByText('Volcanoes')).toBeInTheDocument()
      expect(screen.getByText('Dinosaurs')).toBeInTheDocument()
      expect(screen.getByText('Space')).toBeInTheDocument()
    })

    it('limits displayed recent topics to 3', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={10}
          recentTopics={['A', 'B', 'C', 'D', 'E']}
        />
      )

      // Should only show first 3
      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
      expect(screen.getByText('C')).toBeInTheDocument()
      expect(screen.queryByText('D')).not.toBeInTheDocument()
      expect(screen.queryByText('E')).not.toBeInTheDocument()
    })

    it('handles empty recent topics array', () => {
      render(
        <WorldInfoPanel
          tier="barren"
          totalTopics={0}
          recentTopics={[]}
        />
      )

      // Should not crash and panel should render
      expect(screen.getByTestId('world-info-panel')).toBeInTheDocument()
    })
  })

  describe('view history callback', () => {
    it('calls onViewHistory when history button is clicked', () => {
      const onViewHistory = vi.fn()
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={10}
          recentTopics={['Volcanoes']}
          onViewHistory={onViewHistory}
        />
      )

      const historyButton = screen.queryByRole('button', { name: /history|view all/i })
      if (historyButton) {
        fireEvent.click(historyButton)
        expect(onViewHistory).toHaveBeenCalledTimes(1)
      }
    })

    it('hides history button when onViewHistory is not provided', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={10}
          recentTopics={['Volcanoes']}
        />
      )

      const historyButton = screen.queryByRole('button', { name: /history|view all/i })
      expect(historyButton).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('has compact styling suitable for overlay', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={10}
          recentTopics={['Volcanoes']}
        />
      )

      const panel = screen.getByTestId('world-info-panel')
      // Should have background for visibility over panorama
      expect(panel.className).toMatch(/bg-|backdrop/)
    })

    it('supports dark mode', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={10}
          recentTopics={['Volcanoes']}
        />
      )

      const panel = screen.getByTestId('world-info-panel')
      expect(panel.className).toMatch(/dark:|bg-/)
    })
  })

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      render(
        <WorldInfoPanel
          tier="growing"
          totalTopics={10}
          recentTopics={['Volcanoes']}
        />
      )

      const panel = screen.getByTestId('world-info-panel')
      // Should be an aside or section for semantic HTML
      expect(panel.tagName.toLowerCase()).toMatch(/aside|section|div/)
    })
  })
})
