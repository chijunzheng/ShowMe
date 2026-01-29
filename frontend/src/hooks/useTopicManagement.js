/**
 * Custom hook for topic management operations
 * Handles navigation, deletion, regeneration, and version switching
 */
import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import logger from '../utils/logger.js'
import {
  UI_STATE,
  EXPLANATION_LEVEL,
  STORAGE_LIMITS,
  API_ENDPOINTS,
} from '../constants/appConfig.js'
import {
  getStoredClientId,
  persistTopicSlides,
  loadTopicSlidesFromStorage,
  loadSlidesForTopic,
  removeTopicSlides,
  createHeaderSlide,
} from '../utils/topicStorage.js'
import {
  getCurrentVersionLevel,
  buildTopicSlides,
  pruneSlideCache as pruneSlidesCacheHelper,
} from '../utils/slideHelpers.js'

const MAX_CACHED_TOPICS = STORAGE_LIMITS.MAX_CACHED_TOPICS
const MAX_VERSIONS_PER_TOPIC = STORAGE_LIMITS.MAX_VERSIONS_PER_TOPIC

/**
 * Hook for managing topics, versions, and navigation
 * @param {Object} options - Configuration options
 * @returns {Object} Topic state and handlers
 */
export default function useTopicManagement({
  initialTopics,
  uiState,
  setUiState,
  setCurrentIndex,
  setCurrentChildIndex,
  setIsColdStart,
  setToast,
  wsClientId,
  requestSlideAudio,
  slideAudioCacheRef,
  wasManualNavRef,
  setIsLoadingTopicAudio,
  setLoadingTopicProgress,
}) {
  // Topics state
  const [topics, setTopics] = useState(() => initialTopics)
  const [activeTopicId, setActiveTopicId] = useState(null)

  // Regeneration state
  const [isRegenerating, setIsRegenerating] = useState(false)
  const regeneratingTopicIdRef = useRef(null)

  // Track in-flight slide fetches from the server
  const slideServerFetchRef = useRef(new Map())

  /**
   * Get the currently active topic
   */
  const activeTopic = useMemo(() => {
    if (topics.length === 0 || !activeTopicId) return null
    return topics.find((topic) => topic.id === activeTopicId) || null
  }, [topics, activeTopicId])

  // Ref for activeTopic to avoid stale closures
  const activeTopicRef = useRef(activeTopic)
  useEffect(() => {
    activeTopicRef.current = activeTopic
  }, [activeTopic])

  /**
   * Wrapper for pruneSlideCache from slideHelpers
   */
  const pruneSlideCache = useCallback((topicList, keepTopicId) => {
    return pruneSlidesCacheHelper(topicList, keepTopicId, MAX_CACHED_TOPICS)
  }, [])

  /**
   * Fetch slides for a topic/version from the backend and hydrate local state.
   */
  const fetchSlidesFromServer = useCallback(async (topicId, versionId, versionIndex) => {
    if (!topicId) return null
    const clientId = getStoredClientId()
    if (!clientId) return null

    const key = `${topicId}_${versionId || 'current'}`
    const inFlight = slideServerFetchRef.current.get(key)
    if (inFlight) return inFlight

    const requestPromise = (async () => {
      try {
        const response = await fetch(`${API_ENDPOINTS.SLIDES_BASE}/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, topicId, versionId }),
        })

        if (!response.ok) {
          logger.warn('STORAGE', 'Slide load from server failed', {
            status: response.status,
            topicId,
            versionId,
          })
          return null
        }

        const data = await response.json()
        const slides = Array.isArray(data.slides) ? data.slides : null
        if (!slides || slides.length === 0) {
          return null
        }

        const now = Date.now()
        setTopics((prev) => {
          const updated = prev.map((topic) => {
            if (topic.id !== topicId) return topic
            const targetIndex = Number.isInteger(versionIndex)
              ? versionIndex
              : (topic.currentVersionIndex ?? 0)
            const updatedVersions = Array.isArray(topic.versions)
              ? topic.versions.map((v, idx) =>
                  idx === targetIndex ? { ...v, slides } : v
                )
              : topic.versions
            return {
              ...topic,
              slides,
              versions: updatedVersions,
              lastAccessedAt: now,
            }
          })
          return pruneSlideCache(updated, topicId)
        })

        // Cache locally to avoid repeated server fetches
        persistTopicSlides(topicId, slides, versionId, { skipRemote: true })
        return slides
      } catch (error) {
        logger.warn('STORAGE', 'Slide load from server failed', {
          error: error.message,
          topicId,
          versionId,
        })
        return null
      } finally {
        slideServerFetchRef.current.delete(key)
      }
    })()

    slideServerFetchRef.current.set(key, requestPromise)
    return requestPromise
  }, [pruneSlideCache])

  /**
   * Handle topic navigation from sidebar
   */
  const handleNavigateToTopic = useCallback(async (topicId) => {
    if (!topicId) return
    const targetTopic = topics.find((topic) => topic.id === topicId)
    const needsSlides = !targetTopic?.slides || targetTopic.slides.length === 0
    const cachedSlides = needsSlides ? loadSlidesForTopic(targetTopic) : null
    const now = Date.now()

    if (needsSlides && !cachedSlides) {
      const currentVersionId = targetTopic?.versions?.[targetTopic.currentVersionIndex ?? 0]?.id
      void fetchSlidesFromServer(topicId, currentVersionId)
    }

    const slidesToShow = cachedSlides || targetTopic?.slides || []

    const contentSlides = slidesToShow.filter((slide) =>
      slide.type !== 'header' &&
      slide.type !== 'section' &&
      slide.type !== 'suggestions' &&
      slide.subtitle
    )

    const slidesNeedingTts = contentSlides.filter((slide) =>
      !slideAudioCacheRef.current.has(slide.id) &&
      !(slide.audioUrl && slide.audioUrl.startsWith('data:'))
    )

    const firstSlideNeedingTts = slidesNeedingTts[0] || null
    const needsLoading = !!firstSlideNeedingTts
    if (needsLoading) {
      setIsLoadingTopicAudio(true)
      setLoadingTopicProgress(10)
    }

    setTopics((prev) => {
      const updated = prev.map((topic) => {
        if (topic.id !== topicId) return topic
        const versionIndex = topic.currentVersionIndex ?? 0
        const updatedVersions = cachedSlides && Array.isArray(topic.versions)
          ? topic.versions.map((v, idx) => (
              idx === versionIndex ? { ...v, slides: cachedSlides } : v
            ))
          : topic.versions
        return {
          ...topic,
          slides: needsSlides ? (cachedSlides || topic.slides) : topic.slides,
          versions: updatedVersions,
          lastAccessedAt: now,
          headerSlide: topic.headerSlide || createHeaderSlide(topic),
        }
      })
      return pruneSlideCache(updated, topicId)
    })

    setActiveTopicId(topicId)
    if (wasManualNavRef) {
      wasManualNavRef.current = true
    }
    setCurrentIndex(0)

    if (needsLoading && firstSlideNeedingTts) {
      logger.info('AUDIO', 'Loading initial TTS for historical topic', {
        topicId,
        slideId: firstSlideNeedingTts.id,
      })

      try {
        setLoadingTopicProgress(60)
        const audioPayload = await requestSlideAudio(firstSlideNeedingTts)
        setLoadingTopicProgress(100)
        if (!audioPayload?.audioUrl) {
          logger.warn('AUDIO', 'Initial TTS not ready for historical topic', {
            topicId,
            slideId: firstSlideNeedingTts.id,
          })
        } else {
          logger.info('AUDIO', 'Initial TTS ready for historical topic', {
            topicId,
            slideId: firstSlideNeedingTts.id,
          })
        }
      } catch (err) {
        logger.warn('AUDIO', 'TTS load failed for historical topic', {
          slideId: firstSlideNeedingTts.id,
          error: err?.message,
        })
      }

      setIsLoadingTopicAudio(false)
      setLoadingTopicProgress(0)
    }

    if (uiState !== UI_STATE.SLIDESHOW && topics.length > 0) {
      setUiState(UI_STATE.SLIDESHOW)
    }
  }, [
    uiState,
    topics,
    pruneSlideCache,
    fetchSlidesFromServer,
    requestSlideAudio,
    slideAudioCacheRef,
    setUiState,
    setCurrentIndex,
    setIsLoadingTopicAudio,
    setLoadingTopicProgress,
    wasManualNavRef,
  ])

  /**
   * Handle topic rename
   */
  const handleRenameTopic = useCallback((topicId, newName) => {
    if (!topicId || !newName) return

    setTopics((prev) =>
      prev.map((topic) =>
        topic.id === topicId
          ? {
              ...topic,
              name: newName,
              headerSlide: topic.headerSlide
                ? { ...topic.headerSlide, subtitle: newName }
                : null,
            }
          : topic
      )
    )
    logger.info('STATE', 'Topic renamed', { topicId, newName })
  }, [])

  /**
   * Handle topic deletion
   */
  const handleDeleteTopic = useCallback((topicId) => {
    if (!topicId) return

    setTopics((prev) => prev.filter((topic) => topic.id !== topicId))
    removeTopicSlides(topicId)

    if (activeTopicId === topicId) {
      const remainingTopics = topics.filter((topic) => topic.id !== topicId)
      if (remainingTopics.length > 0) {
        const sortedByAccess = [...remainingTopics].sort(
          (a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0)
        )
        setActiveTopicId(sortedByAccess[0].id)
        setCurrentIndex(0)
      } else {
        setActiveTopicId(null)
        setUiState(UI_STATE.HOME)
        setIsColdStart(true)
      }
    }

    logger.info('STATE', 'Topic deleted', { topicId })
  }, [activeTopicId, topics, setUiState, setCurrentIndex, setIsColdStart])

  /**
   * Handle regeneration of a topic at a different explanation level
   */
  const handleRegenerate = useCallback(async (level) => {
    if (!activeTopic || !activeTopic.query || isRegenerating) {
      logger.warn('REGENERATE', 'Cannot regenerate: missing topic, query, or already regenerating')
      return
    }

    const topicId = activeTopic.id
    const query = activeTopic.query

    logger.info('REGENERATE', 'Starting regeneration', {
      topicId,
      query,
      newLevel: level,
      currentLevel: getCurrentVersionLevel(activeTopic),
    })

    setIsRegenerating(true)
    regeneratingTopicIdRef.current = topicId

    const abortController = new AbortController()
    const signal = abortController.signal

    try {
      logger.time('API', 'regenerate-request')
      logger.info('API', 'POST /api/generate (regenerate)', {
        endpoint: '/api/generate',
        method: 'POST',
        topicId,
        level,
      })

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topicId: null,
          conversationHistory: [],
          clientId: wsClientId,
          explanationLevel: level,
        }),
        signal,
      })

      logger.timeEnd('API', 'regenerate-request')
      logger.info('API', 'Regenerate response received', {
        status: response.status,
      })

      if (!response.ok) {
        throw new Error(`Regenerate API failed: ${response.status}`)
      }

      const generateData = await response.json()

      if (regeneratingTopicIdRef.current !== topicId) {
        logger.warn('REGENERATE', 'Topic changed during regeneration, discarding results')
        return
      }

      if (!generateData.slides || generateData.slides.length === 0) {
        logger.warn('REGENERATE', 'No slides returned from regeneration')
        setIsRegenerating(false)
        regeneratingTopicIdRef.current = null
        return
      }

      const now = Date.now()
      const newVersion = {
        id: `v_${topicId}_${now}`,
        explanationLevel: level,
        slides: generateData.slides,
        createdAt: now,
      }

      setTopics((prev) => {
        return prev.map((topic) => {
          if (topic.id !== topicId) return topic

          let versions = topic.versions ? [...topic.versions] : []

          if (versions.length === 0 && topic.slides && topic.slides.length > 0) {
            versions.push({
              id: `v_${topicId}_initial`,
              explanationLevel: topic.explanationLevel || EXPLANATION_LEVEL.STANDARD,
              slides: topic.slides,
              createdAt: topic.createdAt || now,
            })
          }

          versions.push(newVersion)

          if (versions.length > MAX_VERSIONS_PER_TOPIC) {
            versions = versions.slice(-MAX_VERSIONS_PER_TOPIC)
          }

          const newVersionIndex = versions.length - 1

          logger.info('REGENERATE', 'Created new version', {
            topicId,
            versionId: newVersion.id,
            level,
            totalVersions: versions.length,
            newVersionIndex,
          })

          return {
            ...topic,
            versions,
            currentVersionIndex: newVersionIndex,
            slides: generateData.slides,
            explanationLevel: level,
            lastAccessedAt: now,
          }
        })
      })

      persistTopicSlides(topicId, generateData.slides, newVersion.id)
      setCurrentIndex(0)

      setToast({
        visible: true,
        message: `Regenerated at ${level} level`,
      })

      logger.info('REGENERATE', 'Regeneration complete', {
        topicId,
        newSlidesCount: generateData.slides.length,
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.debug('REGENERATE', 'Regeneration aborted')
      } else {
        logger.error('REGENERATE', 'Regeneration failed', {
          error: error.message,
        })
        setToast({
          visible: true,
          message: 'Failed to regenerate. Please try again.',
        })
      }
    } finally {
      setIsRegenerating(false)
      regeneratingTopicIdRef.current = null
    }
  }, [activeTopic, isRegenerating, wsClientId, setCurrentIndex, setToast])

  /**
   * Handle switching to a different version of the current topic
   */
  const handleVersionSwitch = useCallback(async (versionIndex) => {
    if (!activeTopic) return

    const versions = activeTopic.versions || []
    if (versionIndex < 0 || versionIndex >= versions.length) {
      logger.warn('VERSION', 'Invalid version index', { versionIndex, totalVersions: versions.length })
      return
    }

    const targetVersion = versions[versionIndex]
    logger.info('VERSION', 'Switching version', {
      topicId: activeTopic.id,
      fromIndex: activeTopic.currentVersionIndex,
      toIndex: versionIndex,
      level: targetVersion.explanationLevel,
    })

    let slides = targetVersion.slides
    if (!slides || slides.length === 0) {
      const cachedSlides = loadTopicSlidesFromStorage(activeTopic.id, targetVersion.id)
      if (cachedSlides) {
        slides = cachedSlides
        logger.debug('VERSION', 'Loaded slides from storage', {
          topicId: activeTopic.id,
          versionId: targetVersion.id,
          slidesCount: slides.length,
        })
      } else {
        const remoteSlides = await fetchSlidesFromServer(activeTopic.id, targetVersion.id, versionIndex)
        if (remoteSlides) {
          slides = remoteSlides
        } else {
          logger.warn('VERSION', 'No slides found for version', {
            topicId: activeTopic.id,
            versionId: targetVersion.id,
          })
          setToast({
            visible: true,
            message: 'Version slides not available. Try regenerating.',
          })
          return
        }
      }
    }

    setTopics((prev) => {
      return prev.map((topic) => {
        if (topic.id !== activeTopic.id) return topic

        const updatedVersions = topic.versions.map((v, idx) =>
          idx === versionIndex ? { ...v, slides } : v
        )

        return {
          ...topic,
          versions: updatedVersions,
          currentVersionIndex: versionIndex,
          slides,
          explanationLevel: targetVersion.explanationLevel,
          lastAccessedAt: Date.now(),
        }
      })
    })

    setCurrentIndex(0)
  }, [activeTopic, fetchSlidesFromServer, setCurrentIndex, setToast])

  return {
    // State
    topics,
    setTopics,
    activeTopicId,
    setActiveTopicId,
    activeTopic,
    activeTopicRef,
    isRegenerating,
    // Functions
    pruneSlideCache,
    fetchSlidesFromServer,
    handleNavigateToTopic,
    handleRenameTopic,
    handleDeleteTopic,
    handleRegenerate,
    handleVersionSwitch,
  }
}
