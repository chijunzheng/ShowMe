/**
 * LivingWorldView Component
 *
 * Main container that integrates all Living World components into a cohesive
 * world viewing experience. Manages the display of panoramic world views,
 * evolution transitions, and world information.
 *
 * Features:
 * - Empty state with "Create Your World" CTA for new users
 * - Loading skeleton during initial fetch
 * - PanoramaViewer for displaying the world image with hotspots
 * - WorldTransition for smooth evolution animations
 * - Tier badge overlay for world status
 * - Error handling with retry option
 *
 * Phase 2-4 Gamification Features:
 * - ConnectionLine: SVG lines connecting related topics
 * - Minimap: Navigation minimap when zoomed in (visible at zoom > 1.2)
 * - DiscoveryPopover: Suggestion popover for undiscovered connections
 * - TrophyBadge: For milestone achievements display (available for integration)
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import PanoramaViewer from './PanoramaViewer'
import WorldTransition from './WorldTransition'
import ConnectionLine from './ConnectionLine'
import DiscoveryPopover from './DiscoveryPopover'
import Minimap from './Minimap'
import { TreeSeed } from '../MagicalTree'
import { StatsBar, TrophyShowcase } from '../Dashboard'
import SmartPrompt from '../WorldView/SmartPrompt'
import WorldFAB from '../WorldView/WorldFAB'
import SuggestionPanel from '../WorldView/SuggestionPanel'
import QuickActionBar from '../WorldView/QuickActionBar'
import useSuggestions from '../../hooks/useSuggestions'

const REVIEW_THRESHOLD_DAYS = 7
const REVIEW_SLEEPY_DAYS = 14

/**
 * Loading skeleton component
 */
function LoadingSkeleton() {
  return (
    <div
      data-testid="living-world-skeleton"
      className="
        w-full aspect-video
        bg-slate-200 dark:bg-slate-700
        rounded-lg
        animate-pulse
        flex flex-col items-center justify-center gap-4
      "
    >
      {/* Placeholder shapes */}
      <div className="w-3/4 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
      <div className="w-1/2 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
      <div className="w-2/3 h-4 bg-slate-300 dark:bg-slate-600 rounded" />
    </div>
  )
}

function RegeneratingOverlay({ progress }) {
  const total = Number.isFinite(progress?.total) ? progress.total : 0
  const current = Number.isFinite(progress?.current) ? progress.current : 0
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-xs bg-white/90 rounded-2xl shadow-xl px-5 py-4 text-center" role="status" aria-live="polite">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-base font-semibold text-gray-700">Regenerating world...</p>
        {total > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {current}/{total} topics
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Empty state component for new users
 */
function EmptyState({ onCreateWorld, isCreating }) {
  return (
    <div
      className="
        w-full aspect-video
        bg-gradient-to-b from-slate-300 to-slate-500
        dark:from-slate-700 dark:to-slate-900
        rounded-lg
        flex flex-col items-center justify-center
        p-6
      "
    >
      {/* World icon */}
      <div className="mb-4">
        <span className="text-5xl" role="img" aria-hidden="true">
          🌍
        </span>
      </div>

      {/* Headline */}
      <h2 className="text-xl md:text-2xl font-bold text-white mb-2 text-center drop-shadow-lg">
        Create Your World
      </h2>

      {/* Description */}
      <p className="text-white/80 text-sm md:text-base mb-6 text-center max-w-sm">
        Start your learning journey and watch your world grow with each new topic you explore.
      </p>

      {/* CTA Button */}
      <button
        onClick={onCreateWorld}
        disabled={isCreating}
        tabIndex={0}
        className="
          px-6 py-3
          rounded-xl
          bg-white text-slate-700
          font-semibold
          hover:bg-white/90 hover:scale-105
          active:scale-95
          transition-all duration-200
          shadow-lg hover:shadow-xl
          focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-slate-500
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        "
        aria-label="Create your world"
      >
        {isCreating ? 'Creating...' : 'Create Your World'}
      </button>
    </div>
  )
}

/**
 * Error state component
 */
function ErrorState({ message, onRetry }) {
  return (
    <div
      className="
        w-full aspect-video
        bg-gradient-to-b from-slate-400 to-slate-600
        dark:from-slate-600 dark:to-slate-800
        rounded-lg
        flex flex-col items-center justify-center
        p-6
      "
    >
      <div className="text-4xl mb-4">😔</div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Failed to load world
      </h2>
      <p className="text-white/70 text-center mb-6 max-w-sm">
        {message || 'Something went wrong. Please try again.'}
      </p>
      <button
        onClick={onRetry}
        className="
          px-5 py-2.5
          rounded-lg
          bg-white/20 text-white
          font-medium
          hover:bg-white/30
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-white/50
        "
        aria-label="Try again"
      >
        Try Again
      </button>
    </div>
  )
}

/**
 * LivingWorldView - Main container for the Living World feature
 *
 * @param {Object} props - Component props
 * @param {Object} props.worldState - Current world state from parent
 * @param {string} props.worldImageUrl - URL of the world image
 * @param {boolean} props.isLoading - Whether world is loading
 * @param {boolean} props.isEvolving - Whether world is evolving
 * @param {string} props.tier - Current world tier
 * @param {Array} props.hotspots - Array of hotspot objects
 * @param {string} props.error - Error message if any
 * @param {Function} props.onInitializeWorld - Callback to initialize world
 * @param {Function} [props.onHotspotClick] - Callback when a hotspot is clicked
 * @param {Function} [props.onWorldInitialized] - Callback after world is created
 * @param {Function} [props.onViewHistory] - Callback to view history
 * @param {Function} [props.onStartLearning] - Callback to start learning
 * @param {Array} [props.pieces] - World pieces for collectibles and SmartPrompt
 * @param {Object} [props.streak] - Streak data for SmartPrompt
 * @param {Function} [props.onPromptAction] - Callback for SmartPrompt actions
 * @param {Function} [props.onFABAction] - Callback for FAB actions
 * @param {Function} [props.onSelectSuggestedTopic] - Callback when a suggested topic is selected
 * @param {Function} [props.onReviewPiece] - Callback to review a specific piece
 * @param {Function} [props.onQuizPiece] - Callback to quiz a specific piece
 * @param {Function} [props.onLearnTopic] - Callback to learn a specific topic
 * @param {Function} [props.onRegenerateWorld] - Callback to regenerate the living world
 * @param {boolean} [props.isRegeneratingWorld] - Whether a regeneration is in progress
 * @param {Object} [props.regenerationProgress] - Progress { current, total } for regeneration
 * @param {string} [props.treeLevel] - Tree level: seed, sprout, sapling, young, mature, magical
 * @param {number} [props.topicCount] - Total number of topics learned
 * @param {number} [props.totalXP] - Total XP earned (defaults to topicCount * 100)
 * @param {Array} [props.trophies] - Array of earned trophies
 */
function LivingWorldView({
  worldState,
  worldImageUrl,
  isLoading,
  isEvolving,
  tier,
  hotspots,
  error,
  onInitializeWorld,
  onHotspotClick,
  onWorldInitialized,
  onViewHistory,
  onStartLearning,
  pieces = [],
  streak = {},
  onPromptAction,
  onFABAction,
  onSelectSuggestedTopic,
  onReviewPiece,
  onQuizPiece,
  onLearnTopic,
  onRegenerateWorld,
  isRegeneratingWorld = false,
  regenerationProgress = { current: 0, total: 0 },
  // Tree-specific props
  treeLevel = 'seed',
  topicCount = 0,
  totalXP = null,
  trophies = [],
}) {

  // State for SuggestionPanel
  const [isSuggestionPanelOpen, setIsSuggestionPanelOpen] = useState(false)

  // Selected piece for detail actions
  const [selectedPiece, setSelectedPiece] = useState(null)

  // State for QuickActionBar (shown on long-press of hotspot)
  const [actionBarData, setActionBarData] = useState(null)

  // Minimap state - track viewport and zoom for navigation
  const [viewportRect, setViewportRect] = useState({ x: 0, y: 0, width: 1, height: 1 })
  const [currentZoom, setCurrentZoom] = useState(1)

  // Discovery popover state - for suggesting related topics
  const [discoveryPopover, setDiscoveryPopover] = useState({
    isOpen: false,
    position: { x: 0, y: 0 },
    suggestions: [],
  })

  // Container ref and dimensions for ConnectionLine component
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

  // Ref to InteractiveCanvas for minimap navigation
  const canvasRef = useRef(null)

  // Fetch suggestions when panel is open
  const { suggestions, isLoading: suggestionsLoading } = useSuggestions({
    pieces,
    limit: 5,
    autoFetch: isSuggestionPanelOpen,
  })

  // Track previous image URL for transitions
  const previousImageRef = useRef(null)

  // Track if we're currently creating a world
  const isCreatingRef = useRef(false)

  /**
   * Normalize coordinates to 0-1 range for map rendering
   */
  const normalizeCoordinate = useCallback((value) => {
    if (!Number.isFinite(value)) return 0.5
    if (value >= 0 && value <= 1) return value
    if (value > 1 && value <= 100) return value / 100
    if (value > 100 && value <= 1000) return value / 1000
    return Math.max(0, Math.min(1, value / 1000))
  }, [])

  const getDaysSinceReview = useCallback((piece) => {
    const dateStr = piece?.lastReviewedAt || piece?.unlockedAt
    if (!dateStr) return 0
    const reviewDate = new Date(dateStr)
    if (Number.isNaN(reviewDate.getTime())) return 0
    const diffMs = Date.now() - reviewDate.getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  }, [])

  const getReviewStatus = useCallback((piece) => {
    const days = getDaysSinceReview(piece)
    if (days > REVIEW_SLEEPY_DAYS) return 'due'
    if (days > REVIEW_THRESHOLD_DAYS) return 'fading'
    return 'fresh'
  }, [getDaysSinceReview])

  const collectibleHotspots = useMemo(() => {
    if (!Array.isArray(pieces) || pieces.length === 0) return []

    const goldenRatio = 0.618033988749895

    return pieces.map((piece, index) => {
      const fallbackX = ((index * goldenRatio) % 1) * 70 + 15
      const fallbackY = ((index * goldenRatio * 1.5) % 1) * 50 + 25
      const position = piece?.position || {}
      const status = getReviewStatus(piece)

      return {
        x: Number.isFinite(position.x) ? position.x : fallbackX,
        y: Number.isFinite(position.y) ? position.y : fallbackY,
        topicName: piece.topicName || piece.name || `Topic ${index + 1}`,
        piece,
        status,
        glow: status === 'due',
      }
    })
  }, [pieces, getReviewStatus])

  const displayHotspots = collectibleHotspots.length > 0 ? collectibleHotspots : hotspots

  const normalizedHotspots = useMemo(() => {
    if (!Array.isArray(displayHotspots)) return []
    return displayHotspots.map((hotspot) => ({
      ...hotspot,
      x: normalizeCoordinate(hotspot.x),
      y: normalizeCoordinate(hotspot.y),
    }))
  }, [displayHotspots, normalizeCoordinate])

  /**
   * Track container size for ConnectionLine component
   */
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new ResizeObserver(([entry]) => {
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    })
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  /**
   * Handle create world CTA click
   */
  const handleCreateWorld = useCallback(async () => {
    if (isCreatingRef.current) {
      return
    }

    isCreatingRef.current = true
    const result = await onInitializeWorld()
    isCreatingRef.current = false

    if (result.success) {
      onWorldInitialized?.()
    }
  }, [onInitializeWorld, onWorldInitialized])

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    // Re-fetch by reloading the page for now
    // In production, this would call a refetch method
    window.location.reload()
  }, [])

  /**
   * Handle region tap on panorama
   */
  const handleRegionTap = useCallback((payload, y) => {
    if (payload && typeof payload === 'object') {
      setSelectedPiece(payload)
      onHotspotClick?.(payload)
      return
    }

    onHotspotClick?.(payload, y)
  }, [onHotspotClick])

  /**
   * Handle transition completion
   */
  const handleTransitionComplete = useCallback(() => {
    // Update previous image reference after transition
    previousImageRef.current = worldImageUrl
  }, [worldImageUrl])

  /**
   * Handle FAB action with suggestions support
   */
  const handleFABAction = useCallback((actionId) => {
    if (actionId === 'suggestions') {
      setIsSuggestionPanelOpen(true)
    } else {
      onFABAction?.(actionId)
    }
  }, [onFABAction])

  /**
   * Handle selecting a suggested topic
   */
  const handleSelectTopic = useCallback((topicName) => {
    setIsSuggestionPanelOpen(false)
    onSelectSuggestedTopic?.(topicName)
  }, [onSelectSuggestedTopic])

  /**
   * Close suggestion panel
   */
  const handleCloseSuggestions = useCallback(() => {
    setIsSuggestionPanelOpen(false)
  }, [])

  /**
   * Handle long-press on a hotspot - show QuickActionBar
   */
  const handleHotspotLongPress = useCallback(({ piece, position }) => {
    setActionBarData({ piece, position })
  }, [])

  /**
   * Handle action from QuickActionBar
   */
  const handleQuickAction = useCallback((actionId) => {
    if (actionBarData?.piece) {
      // Map actions to appropriate callbacks
      if (actionId === 'review') {
        onReviewPiece?.(actionBarData.piece)
      } else if (actionId === 'quiz') {
        onQuizPiece?.(actionBarData.piece)
      } else if (actionId === 'related') {
        setSelectedPiece(actionBarData.piece)
      } else if (actionId === 'suggestions') {
        setIsSuggestionPanelOpen(true)
      }
    }
    setActionBarData(null)
  }, [actionBarData, onReviewPiece, onQuizPiece])

  const handleCloseSelectedPiece = useCallback(() => {
    setSelectedPiece(null)
  }, [])

  const handleReviewSelectedPiece = useCallback(() => {
    if (!selectedPiece) return
    onReviewPiece?.(selectedPiece)
    setSelectedPiece(null)
  }, [onReviewPiece, selectedPiece])

  const handleQuizSelectedPiece = useCallback(() => {
    if (!selectedPiece) return
    onQuizPiece?.(selectedPiece)
    setSelectedPiece(null)
  }, [onQuizPiece, selectedPiece])

  const handleLearnSelectedPiece = useCallback(() => {
    if (!selectedPiece) return
    onLearnTopic?.(selectedPiece)
    setSelectedPiece(null)
  }, [onLearnTopic, selectedPiece])

  /**
   * Close QuickActionBar
   */
  const handleCloseActionBar = useCallback(() => {
    setActionBarData(null)
  }, [])

  /**
   * Handle zoom change from PanoramaViewer
   */
  const handleZoomChange = useCallback((zoom) => {
    setCurrentZoom(zoom)
  }, [])

  /**
   * Handle viewport change from PanoramaViewer
   */
  const handleViewportChange = useCallback((rect) => {
    setViewportRect(rect)
  }, [])

  /**
   * Handle minimap navigation - center view on clicked position
   */
  const handleMinimapNavigate = useCallback((x, y) => {
    if (!canvasRef.current) return

    // Convert normalized coordinates to canvas position
    // Need to calculate the transform to center the view on the clicked point
    const containerWidth = containerSize.width || 1
    const containerHeight = containerSize.height || 1

    // Calculate the position offset to center on (x, y)
    // When zoomed in, we need to translate to bring the target point to center
    const targetX = -x * containerWidth * currentZoom + containerWidth / 2
    const targetY = -y * containerHeight * currentZoom + containerHeight / 2

    canvasRef.current.setTransform(targetX, targetY, currentZoom, 200)
  }, [containerSize, currentZoom])

  /**
   * Handle selecting a topic from discovery popover
   */
  const handleSelectDiscoveryTopic = useCallback((topicName) => {
    setDiscoveryPopover((prev) => ({ ...prev, isOpen: false }))
    onSelectSuggestedTopic?.(topicName)
  }, [onSelectSuggestedTopic])

  /**
   * Generate connections between adjacent learned topics
   * Creates a simple linear chain connecting sequential hotspots
   */
  const generateConnections = useCallback((hotspotList) => {
    if (!hotspotList || hotspotList.length < 2) return []

    // Connect each hotspot to its nearest neighbor (simple heuristic)
    return hotspotList.slice(0, -1).map((from, i) => ({
      from: { x: from.x, y: from.y, topicName: from.topicName },
      to: { x: hotspotList[i + 1].x, y: hotspotList[i + 1].y, topicName: hotspotList[i + 1].topicName },
      strength: 0.7,
      discovered: true,
    }))
  }, [])

  // Extract topics learned from pieces when available, otherwise fall back to world state
  const topicsLearned = pieces.length > 0
    ? pieces.map((piece) => piece.topicName || piece.name).filter(Boolean)
    : Array.isArray(worldState?.topicsLearned)
      ? worldState.topicsLearned
      : []

  const totalTopics = pieces.length > 0
    ? pieces.length
    : typeof worldState?.totalTopics === 'number'
      ? worldState.totalTopics
      : topicsLearned.length

  const tierLabels = {
    barren: 'Barren',
    sprouting: 'Sprouting',
    growing: 'Growing',
    thriving: 'Thriving',
    legendary: 'Legendary',
  }

  const tierIcons = {
    barren: '🏜️',
    sprouting: '🌱',
    growing: '🌿',
    thriving: '🌳',
    legendary: '🌟',
  }

  const tierLabel = tierLabels[tier] || tier || 'Barren'
  const tierIcon = tierIcons[tier] || tierIcons.barren

  // Determine what to render
  const showLoading = isLoading || (isRegeneratingWorld && !worldState)
  const showEmpty = !isLoading && !worldState && !error && !isRegeneratingWorld
  const showError = !isLoading && error && !worldImageUrl
  const showWorld = !isLoading && worldState && worldImageUrl
  const showGenerating = !isLoading && worldState && !worldImageUrl && !error

  return (
    <div
      data-testid="living-world-view"
      role="region"
      aria-label="Living World view"
      className="relative w-full"
    >
      {/* Loading State */}
      {showLoading && <LoadingSkeleton />}

      {/* Generating State (world exists but image not ready) */}
      {showGenerating && <LoadingSkeleton />}

      {/* Empty State - Show TreeSeed */}
      {showEmpty && (
        <div className="space-y-4">
          <TreeSeed
            onPlant={handleCreateWorld}
            isPlanting={isCreatingRef.current}
          />
        </div>
      )}

      {/* Error State */}
      {showError && (
        <ErrorState
          message={error}
          onRetry={handleRetry}
        />
      )}

      {/* World Display */}
      {showWorld && (
        <div ref={containerRef} className="relative space-y-4">
          {/* Stats Bar */}
          <StatsBar
            streak={typeof streak === 'number' ? streak : streak?.current || 0}
            totalXP={totalXP ?? topicCount * 100}
            topicsLearned={topicCount}
            treeLevel={treeLevel}
            tier={tier}
          />

          {/* Trophy Showcase */}
          {trophies.length > 0 && (
            <TrophyShowcase trophies={trophies} />
          )}

          {/* Panorama View */}
          <>
            {/* Evolution Transition */}
            {isEvolving ? (
              <WorldTransition
                oldImageUrl={previousImageRef.current}
                newImageUrl={worldImageUrl}
                isTransitioning={true}
                onTransitionComplete={handleTransitionComplete}
                showText={true}
              />
            ) : (
              /* Normal Panorama View */
              <PanoramaViewer
                worldImageUrl={worldImageUrl}
                isLoading={false}
                hotspots={displayHotspots}
                onRegionTap={handleRegionTap}
                onHotspotLongPress={handleHotspotLongPress}
                onZoomChange={handleZoomChange}
                onViewportChange={handleViewportChange}
                canvasRef={canvasRef}
              />
            )}

            {/* Connection Lines between related topics */}
            {containerSize.width > 0 && normalizedHotspots && normalizedHotspots.length > 1 && (
              <ConnectionLine
                connections={generateConnections(normalizedHotspots)}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                zoom={currentZoom}
                animated={true}
              />
            )}

            {/* Navigation Minimap - visible when zoomed in */}
            <Minimap
              worldImageUrl={worldImageUrl}
              hotspots={normalizedHotspots}
              viewportRect={viewportRect}
              onNavigate={handleMinimapNavigate}
              isVisible={currentZoom > 1.2}
              position="bottom-left"
            />

            {/* Tier Badge */}
            <div className="absolute top-3 left-3 z-10">
              <div
                className="
                  flex items-center gap-2
                  px-3 py-1.5
                  rounded-full
                  bg-emerald-50/90 dark:bg-emerald-900/40
                  text-emerald-800 dark:text-emerald-100
                  border border-emerald-200/70 dark:border-emerald-700/60
                  shadow-sm
                  text-sm font-semibold
                "
                aria-label={`${tierLabel} world tier`}
              >
                <span className="text-base" aria-hidden="true">{tierIcon}</span>
                <span className="capitalize">{tierLabel}</span>
              </div>
            </div>

            {/* Smart Prompt - context-aware action suggestion */}
            {pieces.length > 0 && (
              <div className="absolute bottom-16 left-3 right-3 z-10">
                <SmartPrompt
                  pieces={pieces}
                  streak={streak}
                  tier={tier}
                  totalPieces={totalTopics}
                  onAction={onPromptAction}
                />
              </div>
            )}

            {/* Quick Action Bar - shown on long-press of hotspot */}
            {actionBarData && (
              <QuickActionBar
                piece={actionBarData.piece}
                position={actionBarData.position}
                onAction={handleQuickAction}
                onClose={handleCloseActionBar}
              />
            )}

            {selectedPiece && (
              <div className="absolute bottom-3 left-3 right-3 z-20">
                <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        {selectedPiece.zone || 'Topic'}
                      </div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {selectedPiece.topicName || selectedPiece.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {getReviewStatus(selectedPiece) === 'due'
                          ? 'Review overdue'
                          : `Reviewed ${getDaysSinceReview(selectedPiece)} days ago`}
                      </p>
                    </div>
                    <button
                      onClick={handleCloseSelectedPiece}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      aria-label="Close topic details"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={handleReviewSelectedPiece}
                      className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold"
                    >
                      Review
                    </button>
                    <button
                      onClick={handleQuizSelectedPiece}
                      className="px-3 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold"
                    >
                      Quiz
                    </button>
                    <button
                      onClick={handleLearnSelectedPiece}
                      className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold"
                    >
                      Learn
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Discovery Popover - suggests related topics */}
            <DiscoveryPopover
              isOpen={discoveryPopover.isOpen}
              position={discoveryPopover.position}
              suggestions={discoveryPopover.suggestions}
              onSelectTopic={handleSelectDiscoveryTopic}
              onClose={() => setDiscoveryPopover((prev) => ({ ...prev, isOpen: false }))}
            />
          </>

          {/* Floating Action Button - shown in both views */}
          <div className="fixed bottom-20 right-4 z-20">
            <WorldFAB onAction={handleFABAction} />
          </div>

          {/* Suggestion Panel - shown in both views */}
          <SuggestionPanel
            isOpen={isSuggestionPanelOpen}
            onClose={handleCloseSuggestions}
            suggestions={suggestions}
            isLoading={suggestionsLoading}
            onSelectTopic={handleSelectTopic}
          />
        </div>
      )}

      {isRegeneratingWorld && (
        <RegeneratingOverlay progress={regenerationProgress} />
      )}
    </div>
  )
}

export default LivingWorldView
