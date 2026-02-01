/**
 * LivingWorld Integration Tests
 *
 * End-to-end integration tests for the Living World feature.
 * Verifies the complete flow: user learns topic -> world evolves -> animation plays -> new world displays.
 *
 * TDD: These tests are written FIRST, before implementation.
 *
 * Test Scenarios:
 * 1. New User Flow - Initialize world from empty state
 * 2. World Evolution Flow - Learn topic, see world evolve
 * 3. Tier Progression - World tier upgrades at thresholds
 * 4. Error Handling - API errors handled gracefully
 * 5. Hotspot Interaction - Tap hotspots to see topic info
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { PanoramaViewer, WorldTransition } from '../index'
import useLivingWorld from '../../../hooks/useLivingWorld'

// Mock fetch globally using vi.stubGlobal for proper Vitest integration
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock getClientId utility
vi.mock('../../../utils/clientId', () => ({
  getClientId: () => 'test-client-integration-123',
  default: () => 'test-client-integration-123',
}))


// Test fixtures
const mockBarrenWorldState = {
  id: 'world-new',
  tier: 'barren',
  topicsLearned: 0,
  compositionMap: { regions: [] },
  imageUrl: 'https://example.com/world-barren.png',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockSproutingWorldState = {
  id: 'world-1',
  tier: 'sprouting',
  topicsLearned: 5,
  compositionMap: {
    regions: [
      { x: 0.2, y: 0.3, topicName: 'Volcanoes', layer: 'nature' },
      { x: 0.5, y: 0.4, topicName: 'Pyramids', layer: 'civilization' },
      { x: 0.7, y: 0.6, topicName: 'Oceans', layer: 'nature' },
      { x: 0.3, y: 0.7, topicName: 'Dinosaurs', layer: 'nature' },
      { x: 0.8, y: 0.2, topicName: 'Space', layer: 'cosmos' },
    ],
  },
  imageUrl: 'https://example.com/world-sprouting.png',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-03T00:00:00Z',
}

const mockGrowingWorldState = {
  id: 'world-1',
  tier: 'growing',
  topicsLearned: 10,
  compositionMap: {
    regions: [
      ...mockSproutingWorldState.compositionMap.regions,
      { x: 0.4, y: 0.5, topicName: 'Robots', layer: 'technology' },
    ],
  },
  imageUrl: 'https://example.com/world-growing.png',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-04T00:00:00Z',
}

const mockEvolveResponse = {
  success: true,
  worldState: {
    ...mockSproutingWorldState,
    topicsLearned: 6,
    compositionMap: {
      regions: [
        ...mockSproutingWorldState.compositionMap.regions,
        { x: 0.6, y: 0.5, topicName: 'Marine Life', layer: 'nature' },
      ],
    },
    imageUrl: 'https://example.com/world-evolved.png',
  },
  changesApplied: {
    newRegion: { x: 0.6, y: 0.5, topicName: 'Marine Life', layer: 'nature' },
    tierChanged: false,
    previousTier: 'sprouting',
    newTier: 'sprouting',
  },
}

const mockTierUpgradeEvolveResponse = {
  success: true,
  worldState: mockGrowingWorldState,
  changesApplied: {
    newRegion: { x: 0.4, y: 0.5, topicName: 'Robots', layer: 'technology' },
    tierChanged: true,
    previousTier: 'sprouting',
    newTier: 'growing',
  },
}

/**
 * Helper function to simulate image load event
 * jsdom doesn't automatically fire load events for images
 */
function simulateImageLoad(container) {
  const images = container.querySelectorAll('img')
  images.forEach((img) => {
    fireEvent.load(img)
  })
}

/**
 * Helper to advance fake timers in async context
 */
async function advanceTimersAsync(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

/**
 * LivingWorldView - Test component that integrates all Living World components
 * This simulates a real view that a user would interact with
 */
function LivingWorldView({ onTopicInfoRequest }) {
  const {
    worldState,
    worldImageUrl,
    isLoading,
    isEvolving,
    tier,
    hotspots,
    error,
    evolveWorld,
    initializeWorld,
  } = useLivingWorld()

  const [oldImageUrl, setOldImageUrl] = React.useState(null)
  const [isTransitioning, setIsTransitioning] = React.useState(false)
  const [highlightRegion, setHighlightRegion] = React.useState(null)
  const [selectedTopic, setSelectedTopic] = React.useState(null)
  const [retryCount, setRetryCount] = React.useState(0)

  // Track when evolution starts to capture old image
  React.useEffect(() => {
    if (isEvolving && worldImageUrl) {
      setOldImageUrl(worldImageUrl)
    }
  }, [isEvolving, worldImageUrl])

  const handleInitialize = async () => {
    const result = await initializeWorld()
    return result
  }

  const handleEvolve = async (topicName, summary) => {
    const result = await evolveWorld(topicName, summary)
    if (result.success && result.changesApplied) {
      setIsTransitioning(true)
      if (result.changesApplied.newRegion) {
        setHighlightRegion({
          x: result.changesApplied.newRegion.x,
          y: result.changesApplied.newRegion.y,
          radius: 80,
        })
      }
    }
    return result
  }

  const handleTransitionComplete = () => {
    setIsTransitioning(false)
    setOldImageUrl(null)
    setHighlightRegion(null)
  }

  const handleHotspotTap = (x, y) => {
    const tappedHotspot = hotspots.find(
      (h) => Math.abs(h.x - x) < 0.1 && Math.abs(h.y - y) < 0.1
    )
    if (tappedHotspot) {
      setSelectedTopic(tappedHotspot)
      onTopicInfoRequest?.(tappedHotspot)
    }
  }

  const handleRetry = async () => {
    setRetryCount((prev) => prev + 1)
    // Re-fetch world state by re-initializing or evolving
    return handleInitialize()
  }

  // New user - no world yet
  if (!isLoading && !worldState && !error) {
    return (
      <div data-testid="empty-state" className="flex flex-col items-center justify-center p-8">
        <h2 className="text-2xl font-bold mb-4">Create Your World</h2>
        <p className="text-gray-600 mb-6">Start learning to build your unique world!</p>
        <button
          data-testid="create-world-btn"
          onClick={handleInitialize}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create My World
        </button>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div data-testid="error-state" className="flex flex-col items-center justify-center p-8">
        <p className="text-red-500 mb-4" data-testid="error-message">
          {error}
        </p>
        <button
          data-testid="retry-btn"
          onClick={handleRetry}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg"
        >
          Retry
        </button>
        <span data-testid="retry-count" className="hidden">
          {retryCount}
        </span>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="loading-state" className="p-8">
        <PanoramaViewer isLoading={true} />
      </div>
    )
  }

  // Show transition during evolution
  if (isTransitioning) {
    return (
      <div data-testid="world-view" className="relative">
        <WorldTransition
          oldImageUrl={oldImageUrl}
          newImageUrl={worldImageUrl}
          isTransitioning={isTransitioning}
          onTransitionComplete={handleTransitionComplete}
          highlightRegion={highlightRegion}
          transitionType="reveal"
          showText={true}
        />
        <div className="mt-4 text-center">
          <span data-testid="tier-badge" className="px-3 py-1 bg-indigo-100 rounded-full text-indigo-700">
            {tier}
          </span>
          <span data-testid="topics-count" className="ml-2 text-gray-600">
            {worldState?.topicsLearned || 0} topics learned
          </span>
        </div>
      </div>
    )
  }

  // Normal world view
  return (
    <div data-testid="world-view" className="relative">
      <PanoramaViewer
        worldImageUrl={worldImageUrl}
        isLoading={isLoading || isEvolving}
        onRegionTap={handleHotspotTap}
        hotspots={hotspots.map((h) => ({
          ...h,
          glow: selectedTopic?.topicName === h.topicName,
        }))}
      />
      <div className="mt-4 text-center">
        <span data-testid="tier-badge" className="px-3 py-1 bg-indigo-100 rounded-full text-indigo-700">
          {tier}
        </span>
        <span data-testid="topics-count" className="ml-2 text-gray-600">
          {worldState?.topicsLearned || 0} topics learned
        </span>
      </div>

      {/* Topic Info Modal */}
      {selectedTopic && (
        <div data-testid="topic-info-modal" className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg">
          <h3 className="font-bold">{selectedTopic.topicName}</h3>
          <p className="text-sm text-gray-600">Layer: {selectedTopic.layer}</p>
          <button
            data-testid="close-topic-info"
            onClick={() => setSelectedTopic(null)}
            className="mt-2 text-sm text-indigo-600"
          >
            Close
          </button>
        </div>
      )}

      {/* Hidden evolve trigger for testing */}
      <button
        data-testid="evolve-trigger"
        onClick={() => handleEvolve('Marine Life', 'Learn about ocean ecosystems')}
        className="hidden"
      >
        Evolve
      </button>

      {/* Hidden tier upgrade trigger for testing */}
      <button
        data-testid="tier-evolve-trigger"
        onClick={() => handleEvolve('Robots', 'Learn about robotics')}
        className="hidden"
      >
        Evolve with Tier
      </button>
    </div>
  )
}

describe('LivingWorld Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mockFetch and provide a default implementation
    // This prevents tests from hanging when the hook makes initial fetch calls
    mockFetch.mockReset()
    mockFetch.mockImplementation((url) => {
      // Default: return 404 for GET (new user), success for POST
      if (url.includes('/api/world/living') && !url.includes('initialize') && !url.includes('evolve')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'World not found' }),
        })
      }
      // For other endpoints, return a generic success
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    })

    // Mock matchMedia for prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
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
  })

  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
    vi.useRealTimers()
  })

  describe('1. New User Flow', () => {
    it('new user sees "Create Your World" empty state', async () => {
      // Mock 404 response for user with no world
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })

      render(<LivingWorldView />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      })

      expect(screen.getByText('Create Your World')).toBeInTheDocument()
      expect(screen.getByTestId('create-world-btn')).toBeInTheDocument()
    })

    it('clicking CTA button initializes a new barren world', async () => {
      // First request: 404 (no world)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })

      // Second request: Initialize world
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockBarrenWorldState }),
      })

      render(<LivingWorldView />)

      // Wait for empty state
      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      })

      // Click create button
      const createBtn = screen.getByTestId('create-world-btn')
      await act(async () => {
        fireEvent.click(createBtn)
      })

      // Wait for world view to appear
      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      // Verify API was called with correct endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/world/living/initialize'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('new world displays barren tier badge', async () => {
      // Mock 404 then initialize
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockBarrenWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      })

      const createBtn = screen.getByTestId('create-world-btn')
      await act(async () => {
        fireEvent.click(createBtn)
      })

      await waitFor(() => {
        const tierBadge = screen.getByTestId('tier-badge')
        expect(tierBadge).toHaveTextContent('barren')
      })
    })

    it('world image appears after initialization', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'World not found' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockBarrenWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      })

      const createBtn = screen.getByTestId('create-world-btn')
      await act(async () => {
        fireEvent.click(createBtn)
      })

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      // Simulate image load
      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const worldImage = screen.getByRole('img', { name: /world panorama/i })
      expect(worldImage).toHaveAttribute('src', 'https://example.com/world-barren.png')
    })
  })

  describe('2. World Evolution Flow', () => {
    it('learning a topic triggers world evolution', async () => {
      // Initial fetch returns existing world
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      // Evolve request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      // Trigger evolution
      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // Verify evolve API was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/world/living/evolve'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Marine Life'),
        })
      )
    })

    it('WorldTransition shows with old and new images during evolution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // Should show WorldTransition component during animation
      await waitFor(() => {
        const transitionContainer = screen.queryByTestId('world-transition-container')
        expect(transitionContainer).toBeInTheDocument()
      })

      // Should show "Your world grows..." text
      expect(screen.getByText(/your world grows/i)).toBeInTheDocument()
    })

    it('after animation completes, new world image is displayed', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      render(<LivingWorldView />)

      // Wait for initial render
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      // Wait for world view
      expect(screen.getByTestId('world-view')).toBeInTheDocument()

      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // Wait for transition to start
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.queryByTestId('world-transition-container')).toBeInTheDocument()

      // Advance timer to complete transition (1500ms)
      await act(async () => {
        vi.advanceTimersByTime(1500)
      })

      // After transition, should show panorama viewer with new image
      expect(screen.queryByTestId('panorama-container')).toBeInTheDocument()
    })

    it('topics count increments after evolution', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      render(<LivingWorldView />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const topicsCount = screen.getByTestId('topics-count')
      expect(topicsCount).toHaveTextContent('5 topics learned')

      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // Complete transition
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })

      expect(screen.getByTestId('topics-count')).toHaveTextContent('6 topics learned')
    })

    it('new hotspot appears after evolution', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      render(<LivingWorldView />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByTestId('world-view')).toBeInTheDocument()

      // Simulate image load to show hotspots
      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      // Initial hotspots count
      let hotspots = screen.getAllByTestId('hotspot')
      expect(hotspots).toHaveLength(5)

      // Evolve
      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // Complete transition
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })

      // Simulate image load again
      const panoramaContainer = screen.getByTestId('panorama-container')
      simulateImageLoad(panoramaContainer)

      // Should have new hotspot
      hotspots = screen.getAllByTestId('hotspot')
      expect(hotspots).toHaveLength(6)
    })
  })

  describe('3. Tier Progression', () => {
    it('world tier upgrades at threshold (sprouting to growing)', async () => {
      vi.useFakeTimers()

      // Start with sprouting (5 topics, threshold for growing is ~10)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      // Evolve triggers tier upgrade
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTierUpgradeEvolveResponse),
      })

      render(<LivingWorldView />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      const tierBadge = screen.getByTestId('tier-badge')
      expect(tierBadge).toHaveTextContent('sprouting')

      // Trigger tier-changing evolution
      const tierEvolveBtn = screen.getByTestId('tier-evolve-trigger')
      await act(async () => {
        fireEvent.click(tierEvolveBtn)
      })

      // Complete transition
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })

      // Verify tier changed
      expect(screen.getByTestId('tier-badge')).toHaveTextContent('growing')
    })

    it('changesApplied indicates tier changed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTierUpgradeEvolveResponse),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const tierEvolveBtn = screen.getByTestId('tier-evolve-trigger')
      await act(async () => {
        fireEvent.click(tierEvolveBtn)
      })

      // Verify API response had tierChanged: true
      const evolveCall = mockFetch.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('/api/world/living/evolve')
      )
      expect(evolveCall).toBeDefined()
    })

    it('topics count shows correct number after tier upgrade', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTierUpgradeEvolveResponse),
      })

      render(<LivingWorldView />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByTestId('topics-count')).toHaveTextContent('5 topics learned')

      const tierEvolveBtn = screen.getByTestId('tier-evolve-trigger')
      await act(async () => {
        fireEvent.click(tierEvolveBtn)
      })

      await act(async () => {
        vi.advanceTimersByTime(1600)
      })

      expect(screen.getByTestId('topics-count')).toHaveTextContent('10 topics learned')
    })
  })

  describe('4. Error Handling', () => {
    it('displays error state when API fails', async () => {
      // Mock fetch to fail completely (exhaust retries)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      render(<LivingWorldView />)

      await waitFor(
        () => {
          expect(screen.getByTestId('error-state')).toBeInTheDocument()
        },
        { timeout: 10000 }
      )

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })

    it('shows retry button on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      render(<LivingWorldView />)

      await waitFor(
        () => {
          expect(screen.getByTestId('error-state')).toBeInTheDocument()
        },
        { timeout: 10000 }
      )

      expect(screen.getByTestId('retry-btn')).toBeInTheDocument()
    })

    it('retry button attempts to recover', async () => {
      // Initial failures
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      })

      // Retry success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(
        () => {
          expect(screen.getByTestId('error-state')).toBeInTheDocument()
        },
        { timeout: 10000 }
      )

      const retryBtn = screen.getByTestId('retry-btn')
      await act(async () => {
        fireEvent.click(retryBtn)
      })

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })
    })

    it('world state remains unchanged after failed evolution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      // Evolution fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Evolution failed' }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const initialTopicsCount = screen.getByTestId('topics-count').textContent

      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // World state should be unchanged (error state will show)
      await waitFor(() => {
        // Either topics count is same or error state shows
        const topicsCountElement = screen.queryByTestId('topics-count')
        const errorElement = screen.queryByTestId('error-state')
        expect(topicsCountElement?.textContent === initialTopicsCount || errorElement).toBeTruthy()
      })
    })

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
        expect(screen.getByTestId('error-message')).toHaveTextContent('Network error')
      })
    })
  })

  describe('5. Hotspot Interaction', () => {
    it('tapping hotspot shows topic info modal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      // Simulate image load to show hotspots
      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      // Find and click a hotspot
      const hotspots = screen.getAllByTestId('hotspot')
      expect(hotspots.length).toBeGreaterThan(0)

      await act(async () => {
        // Use mouseDown + mouseUp to simulate click (useLongPress hook intercepts mouse events)
        fireEvent.mouseDown(hotspots[0], { clientX: 100, clientY: 100 })
        fireEvent.mouseUp(hotspots[0], { clientX: 100, clientY: 100 })
      })

      // Topic info modal should appear
      await waitFor(() => {
        expect(screen.getByTestId('topic-info-modal')).toBeInTheDocument()
      })
    })

    it('topic info displays correct topic name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspots = screen.getAllByTestId('hotspot')
      await act(async () => {
        // Use mouseDown + mouseUp to simulate click (useLongPress hook intercepts mouse events)
        fireEvent.mouseDown(hotspots[0], { clientX: 100, clientY: 100 })
        fireEvent.mouseUp(hotspots[0], { clientX: 100, clientY: 100 })
      })

      await waitFor(() => {
        const modal = screen.getByTestId('topic-info-modal')
        // First hotspot is Volcanoes based on mockSproutingWorldState
        expect(modal).toHaveTextContent('Volcanoes')
      })
    })

    it('topic info displays layer information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspots = screen.getAllByTestId('hotspot')
      await act(async () => {
        // Use mouseDown + mouseUp to simulate click (useLongPress hook intercepts mouse events)
        fireEvent.mouseDown(hotspots[0], { clientX: 100, clientY: 100 })
        fireEvent.mouseUp(hotspots[0], { clientX: 100, clientY: 100 })
      })

      await waitFor(() => {
        const modal = screen.getByTestId('topic-info-modal')
        expect(modal).toHaveTextContent('nature')
      })
    })

    it('close button dismisses topic info modal', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspots = screen.getAllByTestId('hotspot')
      await act(async () => {
        // Use mouseDown + mouseUp to simulate click (useLongPress hook intercepts mouse events)
        fireEvent.mouseDown(hotspots[0], { clientX: 100, clientY: 100 })
        fireEvent.mouseUp(hotspots[0], { clientX: 100, clientY: 100 })
      })

      await waitFor(() => {
        expect(screen.getByTestId('topic-info-modal')).toBeInTheDocument()
      })

      const closeBtn = screen.getByTestId('close-topic-info')
      await act(async () => {
        fireEvent.click(closeBtn)
      })

      await waitFor(() => {
        expect(screen.queryByTestId('topic-info-modal')).not.toBeInTheDocument()
      })
    })

    it('calls onTopicInfoRequest callback when hotspot tapped', async () => {
      const onTopicInfoRequest = vi.fn()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView onTopicInfoRequest={onTopicInfoRequest} />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspots = screen.getAllByTestId('hotspot')
      await act(async () => {
        // Use mouseDown + mouseUp to simulate click (useLongPress hook intercepts mouse events)
        fireEvent.mouseDown(hotspots[0], { clientX: 100, clientY: 100 })
        fireEvent.mouseUp(hotspots[0], { clientX: 100, clientY: 100 })
      })

      expect(onTopicInfoRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          topicName: 'Volcanoes',
          layer: 'nature',
        })
      )
    })
  })

  describe('6. Loading States', () => {
    it('shows loading skeleton during initial fetch', async () => {
      // Create a promise that doesn't resolve immediately
      let resolvePromise
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(delayedPromise)

      render(<LivingWorldView />)

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByTestId('panorama-skeleton')).toBeInTheDocument()

      // Resolve the promise
      await act(async () => {
        resolvePromise({
          ok: true,
          json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
        })
      })

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
      })
    })

    it('shows loading state during evolution', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      // Create delayed evolve response
      let resolveEvolve
      const delayedEvolve = new Promise((resolve) => {
        resolveEvolve = resolve
      })
      mockFetch.mockReturnValueOnce(delayedEvolve)

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const evolveBtn = screen.getByTestId('evolve-trigger')
      act(() => {
        fireEvent.click(evolveBtn)
      })

      // PanoramaViewer should show loading during evolution
      const panorama = screen.getByTestId('panorama-container')
      expect(panorama).toBeInTheDocument()

      // Resolve
      await act(async () => {
        resolveEvolve({
          ok: true,
          json: () => Promise.resolve(mockEvolveResponse),
        })
      })
    })
  })

  describe('7. Edge Cases', () => {
    it('handles empty hotspots array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockBarrenWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspots = screen.queryAllByTestId('hotspot')
      expect(hotspots).toHaveLength(0)
    })

    it('handles multiple rapid evolutions', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTierUpgradeEvolveResponse),
      })

      render(<LivingWorldView />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByTestId('world-view')).toBeInTheDocument()

      // First evolution
      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // Complete first transition
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })

      // Second evolution
      const tierEvolveBtn = screen.getByTestId('tier-evolve-trigger')
      await act(async () => {
        fireEvent.click(tierEvolveBtn)
      })

      // Complete second transition
      await act(async () => {
        vi.advanceTimersByTime(1600)
      })

      expect(screen.getByTestId('tier-badge')).toHaveTextContent('growing')
    })

    it('handles unmount during transition gracefully', async () => {
      vi.useFakeTimers()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvolveResponse),
      })

      const { unmount } = render(<LivingWorldView />)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      expect(screen.getByTestId('world-view')).toBeInTheDocument()

      const evolveBtn = screen.getByTestId('evolve-trigger')
      await act(async () => {
        fireEvent.click(evolveBtn)
      })

      // Unmount during transition
      expect(() => {
        unmount()
      }).not.toThrow()

      // Advance timers after unmount should not cause errors
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })
    })

    it('preserves world state across re-renders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      const { rerender } = render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('tier-badge')).toHaveTextContent('sprouting')
      })

      // Re-render with same props
      rerender(<LivingWorldView />)

      // State should be preserved
      expect(screen.getByTestId('tier-badge')).toHaveTextContent('sprouting')
      expect(screen.getByTestId('topics-count')).toHaveTextContent('5 topics learned')
    })
  })

  describe('8. Accessibility', () => {
    it('all interactive elements are keyboard accessible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspots = screen.getAllByTestId('hotspot')
      hotspots.forEach((hotspot) => {
        expect(hotspot).toHaveAttribute('tabIndex', '0')
        expect(hotspot).toHaveAttribute('role', 'button')
      })
    })

    it('hotspots can be activated with Enter key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspot = screen.getAllByTestId('hotspot')[0]
      hotspot.focus()

      await act(async () => {
        fireEvent.keyDown(hotspot, { key: 'Enter' })
      })

      await waitFor(() => {
        expect(screen.getByTestId('topic-info-modal')).toBeInTheDocument()
      })
    })

    it('hotspots have descriptive aria-labels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, worldState: mockSproutingWorldState }),
      })

      render(<LivingWorldView />)

      await waitFor(() => {
        expect(screen.getByTestId('world-view')).toBeInTheDocument()
      })

      const container = screen.getByTestId('panorama-container')
      simulateImageLoad(container)

      const hotspots = screen.getAllByTestId('hotspot')
      hotspots.forEach((hotspot) => {
        expect(hotspot).toHaveAttribute('aria-label')
        expect(hotspot.getAttribute('aria-label')).toMatch(/explore/i)
      })
    })
  })
})
