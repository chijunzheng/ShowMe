/**
 * LivingWorldView Component
 *
 * Main container that integrates all Living World components into a cohesive
 * world viewing experience. Manages the display of panoramic world views,
 * evolution transitions, and world information.
 *
 * Features:
 * - Empty state with TreeSeed CTA for new users
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
 */

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import PanoramaViewer from './PanoramaViewer'
import WorldTransition from './WorldTransition'
import ConnectionLine from './ConnectionLine'
import DiscoveryPopover from './DiscoveryPopover'
import Minimap from './Minimap'
import LoadingSkeleton from './LoadingSkeleton'
import RegeneratingOverlay from './RegeneratingOverlay'
import DiscoveryToast from './DiscoveryToast'
import ErrorState from './ErrorState'
import PieceDetailPanel from './PieceDetailPanel'
import { TreeSeed } from '../MagicalTree'
import { StatsBar, TrophyShowcase } from '../Dashboard'
import SmartPrompt from '../WorldView/SmartPrompt'
import WorldFAB from '../WorldView/WorldFAB'
import SuggestionPanel from '../WorldView/SuggestionPanel'
import QuickActionBar from '../WorldView/QuickActionBar'
import useSuggestions from '../../hooks/useSuggestions'
import { getDaysSinceReview, getReviewStatus } from '../../utils/reviewUtils'
import {
  VIEW_MODES,
  TOAST_DURATION_MS,
  DEFAULT_HIGHLIGHT,
  GOLDEN_RATIO,
  getTierIcon,
  getTierLabel,
} from '../../constants/world'

/**
 * Estimate highlight region from placement hint
 */
function estimateHighlightRegion(placementHint) {
  if (!placementHint || typeof placementHint !== 'string') {
    return DEFAULT_HIGHLIGHT
  }

  const hint = placementHint.toLowerCase()
  let x = 0.5
  let y = 0.55

  if (hint.includes('left')) x = 0.28
  if (hint.includes('right')) x = 0.72
  if (hint.includes('center')) x = 0.5

  if (hint.includes('foreground')) y = 0.78
  if (hint.includes('midground')) y = 0.55
  if (hint.includes('background')) y = 0.35
  if (hint.includes('sky')) y = 0.2

  if (hint.includes('upper')) y = 0.22
  if (hint.includes('lower')) y = 0.82
  if (hint.includes('horizon')) y = 0.42

  return { x, y, radius: 150 }
}

/**
 * LivingWorldView - Main container for the Living World feature
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
  treeLevel = 'seed',
  topicCount = 0,
  totalXP = null,
  trophies = [],
}) {
  // State for SuggestionPanel
  const [isSuggestionPanelOpen, setIsSuggestionPanelOpen] = useState(false)

  // Cinematic vs explore view mode
  const [viewMode, setViewMode] = useState(VIEW_MODES.cinematic)

  // Selected piece for detail actions
  const [selectedPiece, setSelectedPiece] = useState(null)

  // Latest discovery toast
  const [discovery, setDiscovery] = useState(null)

  const evolutionCountRef = useRef(null)
  const discoveryTimerRef = useRef(null)

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

  // Track evolution count changes for discovery toast
  useEffect(() => {
    if (!worldState) {
      evolutionCountRef.current = null
      return
    }

    const evolutions = Array.isArray(worldState?.evolutions) ? worldState.evolutions : []

    if (evolutionCountRef.current === null) {
      evolutionCountRef.current = evolutions.length
      return
    }

    if (evolutions.length > evolutionCountRef.current) {
      const latest = evolutions[evolutions.length - 1] || {}
      setDiscovery({
        topicName: latest.topicName || null,
        elementAdded: latest.elementAdded || null,
        placementHint: latest.placementHint || null,
      })
    }

    evolutionCountRef.current = evolutions.length
  }, [worldState])

  // Auto-dismiss discovery toast
  useEffect(() => {
    if (!discovery) return

    if (discoveryTimerRef.current) {
      clearTimeout(discoveryTimerRef.current)
    }

    discoveryTimerRef.current = setTimeout(() => {
      setDiscovery(null)
    }, TOAST_DURATION_MS)

    return () => {
      if (discoveryTimerRef.current) {
        clearTimeout(discoveryTimerRef.current)
      }
    }
  }, [discovery])

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

  // Generate collectible hotspots from pieces
  const collectibleHotspots = useMemo(() => {
    if (!Array.isArray(pieces) || pieces.length === 0) return []

    return pieces.map((piece, index) => {
      const fallbackX = ((index * GOLDEN_RATIO) % 1) * 70 + 15
      const fallbackY = ((index * GOLDEN_RATIO * 1.5) % 1) * 50 + 25
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
  }, [pieces])

  const displayHotspots = collectibleHotspots.length > 0 ? collectibleHotspots : hotspots

  const normalizedHotspots = useMemo(() => {
    if (!Array.isArray(displayHotspots)) return []
    return displayHotspots.map((hotspot) => ({
      ...hotspot,
      x: normalizeCoordinate(hotspot.x),
      y: normalizeCoordinate(hotspot.y),
    }))
  }, [displayHotspots, normalizeCoordinate])

  const highlightRegion = useMemo(() => {
    if (!discovery) return null
    return estimateHighlightRegion(discovery.placementHint)
  }, [discovery])

  // Track container size for ConnectionLine component
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

  // Handlers
  const handleCreateWorld = useCallback(async () => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true
    const result = await onInitializeWorld()
    isCreatingRef.current = false
    if (result.success) onWorldInitialized?.()
  }, [onInitializeWorld, onWorldInitialized])

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  const handleRegionTap = useCallback((payload, y) => {
    if (payload && typeof payload === 'object') {
      setSelectedPiece(payload)
      onHotspotClick?.(payload)
      return
    }
    onHotspotClick?.(payload, y)
  }, [onHotspotClick])

  const handleTransitionComplete = useCallback(() => {
    previousImageRef.current = worldImageUrl
  }, [worldImageUrl])

  const handleFABAction = useCallback((actionId) => {
    if (actionId === 'suggestions') {
      setIsSuggestionPanelOpen(true)
    } else {
      onFABAction?.(actionId)
    }
  }, [onFABAction])

  const handleSelectTopic = useCallback((topicName) => {
    setIsSuggestionPanelOpen(false)
    onSelectSuggestedTopic?.(topicName)
  }, [onSelectSuggestedTopic])

  const handleCloseSuggestions = useCallback(() => {
    setIsSuggestionPanelOpen(false)
  }, [])

  const handleViewModeChange = useCallback((mode) => {
    if (mode === VIEW_MODES.cinematic || mode === VIEW_MODES.explore) {
      setViewMode(mode)
    }
  }, [])

  const handleDismissDiscovery = useCallback(() => setDiscovery(null), [])

  const handleExploreDiscovery = useCallback(() => {
    setViewMode(VIEW_MODES.explore)
    setDiscovery(null)
  }, [])

  const handleHotspotLongPress = useCallback(({ piece, position }) => {
    setActionBarData({ piece, position })
  }, [])

  const handleQuickAction = useCallback((actionId) => {
    if (actionBarData?.piece) {
      if (actionId === 'review') onReviewPiece?.(actionBarData.piece)
      else if (actionId === 'quiz') onQuizPiece?.(actionBarData.piece)
      else if (actionId === 'related') setSelectedPiece(actionBarData.piece)
      else if (actionId === 'suggestions') setIsSuggestionPanelOpen(true)
    }
    setActionBarData(null)
  }, [actionBarData, onReviewPiece, onQuizPiece])

  const handleCloseSelectedPiece = useCallback(() => setSelectedPiece(null), [])

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

  const handleCloseActionBar = useCallback(() => setActionBarData(null), [])

  const handleZoomChange = useCallback((zoom) => setCurrentZoom(zoom), [])

  const handleViewportChange = useCallback((rect) => setViewportRect(rect), [])

  const handleMinimapNavigate = useCallback((x, y) => {
    if (!canvasRef.current) return
    const containerWidth = containerSize.width || 1
    const containerHeight = containerSize.height || 1
    const targetX = -x * containerWidth * currentZoom + containerWidth / 2
    const targetY = -y * containerHeight * currentZoom + containerHeight / 2
    canvasRef.current.setTransform(targetX, targetY, currentZoom, 200)
  }, [containerSize, currentZoom])

  const handleSelectDiscoveryTopic = useCallback((topicName) => {
    setDiscoveryPopover((prev) => ({ ...prev, isOpen: false }))
    onSelectSuggestedTopic?.(topicName)
  }, [onSelectSuggestedTopic])

  // Generate connections between adjacent learned topics
  const generateConnections = useCallback((hotspotList) => {
    if (!hotspotList || hotspotList.length < 2) return []
    return hotspotList.slice(0, -1).map((from, i) => ({
      from: { x: from.x, y: from.y, topicName: from.topicName },
      to: { x: hotspotList[i + 1].x, y: hotspotList[i + 1].y, topicName: hotspotList[i + 1].topicName },
      strength: 0.7,
      discovered: true,
    }))
  }, [])

  // Extract topics learned from pieces
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

  const tierLabel = getTierLabel(tier)
  const tierIcon = getTierIcon(tier)

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
      {showLoading && <LoadingSkeleton />}
      {showGenerating && <LoadingSkeleton />}
      {showEmpty && (
        <div className="space-y-4">
          <TreeSeed onPlant={handleCreateWorld} isPlanting={isCreatingRef.current} />
        </div>
      )}
      {showError && <ErrorState message={error} onRetry={handleRetry} />}

      {showWorld && (
        <div ref={containerRef} className="relative space-y-4">
          <StatsBar
            streak={typeof streak === 'number' ? streak : streak?.current || 0}
            totalXP={totalXP ?? topicCount * 100}
            topicsLearned={topicCount}
            treeLevel={treeLevel}
            tier={tier}
          />

          {trophies.length > 0 && <TrophyShowcase trophies={trophies} />}

          <>
            {isEvolving ? (
              <WorldTransition
                oldImageUrl={previousImageRef.current}
                newImageUrl={worldImageUrl}
                isTransitioning={true}
                onTransitionComplete={handleTransitionComplete}
                highlightRegion={highlightRegion || undefined}
                transitionType={highlightRegion ? 'reveal' : 'morph'}
                showText={true}
              />
            ) : (
              <PanoramaViewer
                worldImageUrl={worldImageUrl}
                isLoading={false}
                hotspots={displayHotspots}
                onRegionTap={handleRegionTap}
                onHotspotLongPress={handleHotspotLongPress}
                onZoomChange={handleZoomChange}
                onViewportChange={handleViewportChange}
                canvasRef={canvasRef}
                hotspotMode={viewMode}
              />
            )}

            {viewMode === VIEW_MODES.explore && containerSize.width > 0 && normalizedHotspots?.length > 1 && (
              <ConnectionLine
                connections={generateConnections(normalizedHotspots)}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                zoom={currentZoom}
                animated={true}
              />
            )}

            <Minimap
              worldImageUrl={worldImageUrl}
              hotspots={normalizedHotspots}
              viewportRect={viewportRect}
              onNavigate={handleMinimapNavigate}
              isVisible={viewMode === VIEW_MODES.explore && currentZoom > 1.2}
              position="bottom-left"
            />

            {/* Tier Badge */}
            <div className="absolute top-3 left-3 z-10">
              <div
                className="
                  flex items-center gap-2 px-3 py-1.5 rounded-full
                  bg-emerald-50/90 dark:bg-emerald-900/40
                  text-emerald-800 dark:text-emerald-100
                  border border-emerald-200/70 dark:border-emerald-700/60
                  shadow-sm text-sm font-semibold
                "
                aria-label={`${tierLabel} world tier`}
              >
                <span className="text-base" aria-hidden="true">{tierIcon}</span>
                <span className="capitalize">{tierLabel}</span>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="absolute top-3 right-3 z-10">
              <div className="flex items-center gap-1 rounded-full bg-white/80 dark:bg-slate-900/70 border border-white/60 dark:border-slate-700 shadow-sm p-1 backdrop-blur">
                <button
                  onClick={() => handleViewModeChange(VIEW_MODES.cinematic)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    viewMode === VIEW_MODES.cinematic
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800/70'
                  }`}
                  aria-pressed={viewMode === VIEW_MODES.cinematic}
                >
                  Cinematic
                </button>
                <button
                  onClick={() => handleViewModeChange(VIEW_MODES.explore)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    viewMode === VIEW_MODES.explore
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800/70'
                  }`}
                  aria-pressed={viewMode === VIEW_MODES.explore}
                >
                  Explore
                </button>
              </div>
            </div>

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

            <DiscoveryToast
              discovery={discovery}
              onClose={handleDismissDiscovery}
              onExplore={handleExploreDiscovery}
            />

            {actionBarData && (
              <QuickActionBar
                piece={actionBarData.piece}
                position={actionBarData.position}
                onAction={handleQuickAction}
                onClose={handleCloseActionBar}
              />
            )}

            <PieceDetailPanel
              piece={selectedPiece}
              onClose={handleCloseSelectedPiece}
              onReview={handleReviewSelectedPiece}
              onQuiz={handleQuizSelectedPiece}
              onLearn={handleLearnSelectedPiece}
            />

            <DiscoveryPopover
              isOpen={discoveryPopover.isOpen}
              position={discoveryPopover.position}
              suggestions={discoveryPopover.suggestions}
              onSelectTopic={handleSelectDiscoveryTopic}
              onClose={() => setDiscoveryPopover((prev) => ({ ...prev, isOpen: false }))}
            />
          </>

          <div className="fixed bottom-20 right-4 z-20">
            <WorldFAB onAction={handleFABAction} />
          </div>

          <SuggestionPanel
            isOpen={isSuggestionPanelOpen}
            onClose={handleCloseSuggestions}
            suggestions={suggestions}
            isLoading={suggestionsLoading}
            onSelectTopic={handleSelectTopic}
          />
        </div>
      )}

      {isRegeneratingWorld && <RegeneratingOverlay progress={regenerationProgress} />}
    </div>
  )
}

export default LivingWorldView
