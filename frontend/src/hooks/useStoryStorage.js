import { useState, useCallback, useEffect, useRef } from 'react'
import {
  loadStoriesFromStorage,
  saveStoryToStorage,
  loadStoryContent as loadContent,
  deleteStoryFromStorage,
} from '../utils/storyStorage'
import { getClientId } from '../utils/clientId'
import { toApiUrl } from '../utils/api'
import logger from '../utils/logger'

export default function useStoryStorage() {
  const [stories, setStories] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const mountedRef = useRef(true)
  const remoteStoriesByIdRef = useRef(new Map())

  const refreshLocalStories = useCallback(() => {
    if (!mountedRef.current) return
    setStories(loadStoriesFromStorage())
  }, [])

  useEffect(() => {
    mountedRef.current = true

    refreshLocalStories()

    if (import.meta.env.MODE === 'test') {
      setIsLoading(false)
      return () => {
        mountedRef.current = false
      }
    }

    const clientId = getClientId()
    if (!clientId) {
      setIsLoading(false)
      return () => {
        mountedRef.current = false
      }
    }

    const controller = new AbortController()

    const loadRemoteStories = async () => {
      try {
        const response = await fetch(
          toApiUrl(`/api/stories?clientId=${encodeURIComponent(clientId)}`),
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error(`Story fetch failed: ${response.status}`)
        }

        const data = await response.json()
        const remoteStories = Array.isArray(data?.stories) ? data.stories : []

        const nextMap = new Map()
        for (const story of remoteStories) {
          if (!story || !story.id) continue
          nextMap.set(story.id, story)
          saveStoryToStorage(story)
        }
        remoteStoriesByIdRef.current = nextMap

        refreshLocalStories()
      } catch (error) {
        if (error.name === 'AbortError') return
        logger.warn('STORY_STORAGE', 'Remote story load failed', { error: error.message })
      } finally {
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    void loadRemoteStories()

    return () => {
      mountedRef.current = false
      controller.abort()
    }
  }, [refreshLocalStories])

  const saveStory = useCallback((storyDoc) => {
    if (!storyDoc?.id) return

    saveStoryToStorage(storyDoc)
    refreshLocalStories()

    const clientId = getClientId()
    if (!clientId) return

    fetch(toApiUrl('/api/stories/save'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, story: storyDoc }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Story save failed: ${response.status}`)
        }
        return response.json()
      })
      .then((payload) => {
        const savedStory = payload?.story
        if (!savedStory?.id) return
        remoteStoriesByIdRef.current.set(savedStory.id, savedStory)
        saveStoryToStorage(savedStory)
        refreshLocalStories()
      })
      .catch((error) => {
        logger.warn('STORY_STORAGE', 'Server sync failed', { error: error.message })
      })
  }, [refreshLocalStories])

  const deleteStory = useCallback((id) => {
    if (!id) return

    deleteStoryFromStorage(id)
    remoteStoriesByIdRef.current.delete(id)
    refreshLocalStories()

    const clientId = getClientId()
    if (!clientId) return

    fetch(toApiUrl('/api/stories/delete'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, storyId: id }),
    }).catch((error) => {
      logger.warn('STORY_STORAGE', 'Server delete failed', { error: error.message })
    })
  }, [refreshLocalStories])

  const loadStoryContent = useCallback((id) => {
    const localStory = loadContent(id)
    if (localStory) return localStory

    return remoteStoriesByIdRef.current.get(id) || null
  }, [])

  return { stories, saveStory, deleteStory, loadStoryContent, isLoading }
}
