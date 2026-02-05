/**
 * StoryStudio - Main Story Studio learning mode container
 *
 * Flow:
 * 1. Show story prompt with concept checklist
 * 2. Record voice narration with real-time transcription
 * 3. Extract scenes and generate illustrations
 * 4. Track concept usage live
 * 5. Show final slideshow playback
 * 6. Award XP based on concepts used
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import StoryPrompt from './StoryPrompt'
import VoiceStoryRecorder from './VoiceStoryRecorder'
import StoryPlayback from './StoryPlayback'
import ShareStory from './ShareStory'
import logger from '../../../utils/logger'
import { buildLearnSlidesPayload } from '../../../utils/learnSlidesPayload'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002'

// Story state machine
const STORY_STATE = {
  LOADING_PROMPT: 'loading_prompt',
  READY: 'ready',
  RECORDING: 'recording',
  PROCESSING_FINAL: 'processing_final',
  PLAYBACK: 'playback',
  SHARE: 'share',
  ERROR: 'error',
}

/**
 * @param {Object} props
 * @param {Array} props.slides - Content slides from the lesson
 * @param {string} props.topicName - Name of the topic learned
 * @param {Function} props.onComplete - Callback when story complete (xpEarned, badge)
 * @param {Function} props.onBack - Callback to return to mode selector
 */
export default function StoryStudio({ slides, topicName, onComplete, onBack }) {
  const [storyState, setStoryState] = useState(STORY_STATE.LOADING_PROMPT)
  const [storyPrompt, setStoryPrompt] = useState(null)
  const [conceptChecklist, setConceptChecklist] = useState([])
  const [checkedConcepts, setCheckedConcepts] = useState(new Set())
  const [scenes, setScenes] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [imageStyle, setImageStyle] = useState("children's book illustration, colorful, friendly")

  // Refs
  const abortControllerRef = useRef(null)
  const isMountedRef = useRef(true)

  /**
   * Load story prompt on mount
   */
  useEffect(() => {
    loadStoryPrompt()

    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  /**
   * Fetch story prompt from backend
   */
  const loadStoryPrompt = async () => {
    setStoryState(STORY_STATE.LOADING_PROMPT)
    setErrorMessage('')

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch(`${API_BASE}/api/learn/story`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: buildLearnSlidesPayload(slides),
          topicName
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('Lesson content is too large to process. Try a shorter lesson or fewer details.')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load story prompt')
      }

      const data = await response.json()

      // Only update state if still mounted
      if (isMountedRef.current) {
        setStoryPrompt(data.storyPrompt)
        setConceptChecklist(data.conceptChecklist || [])
        setImageStyle(data.imageStyle || imageStyle)
        setStoryState(STORY_STATE.READY)

        logger.info('STORY', 'Story prompt loaded', {
          topicName,
          conceptCount: data.conceptChecklist?.length || 0
        })
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return
      }

      // Only update state if still mounted
      if (isMountedRef.current) {
        logger.error('STORY', 'Failed to load story prompt', { error: error.message })
        setErrorMessage(error.message || 'Failed to load story prompt. Please try again.')
        setStoryState(STORY_STATE.ERROR)
      }
    }
  }

  /**
   * Handle new scene extracted from transcript
   */
  const handleSceneAdded = useCallback((scene) => {
    setScenes(prev => {
      // Limit to 6 scenes max
      const newScenes = [...prev, scene]
      if (newScenes.length > 6) {
        logger.warn('STORY', 'Maximum scenes reached, ignoring new scene')
        return prev
      }
      return newScenes
    })

    // Update checked concepts
    if (scene.conceptsFound && scene.conceptsFound.length > 0) {
      setCheckedConcepts(prev => {
        const updated = new Set(prev)
        scene.conceptsFound.forEach(concept => updated.add(concept))
        return updated
      })

      logger.info('STORY', 'Concepts detected in scene', {
        sceneIndex: scenes.length,
        conceptsFound: scene.conceptsFound
      })
    }
  }, [scenes.length])

  /**
   * Handle recording complete
   */
  const handleRecordingComplete = useCallback(() => {
    setStoryState(STORY_STATE.PROCESSING_FINAL)

    // Brief delay to show processing state
    setTimeout(() => {
      setStoryState(STORY_STATE.PLAYBACK)

      logger.info('STORY', 'Story recording complete', {
        sceneCount: scenes.length,
        conceptsUsed: checkedConcepts.size,
        totalConcepts: conceptChecklist.length
      })
    }, 1000)
  }, [scenes.length, checkedConcepts.size, conceptChecklist.length])

  /**
   * Calculate XP earned based on concepts used
   */
  const calculateXP = useCallback(() => {
    const baseXP = 20
    const perConceptXP = 10
    const allConceptsBonus = 15

    let totalXP = baseXP + (checkedConcepts.size * perConceptXP)

    // Bonus for using all concepts
    if (checkedConcepts.size === conceptChecklist.length && conceptChecklist.length > 0) {
      totalXP += allConceptsBonus
    }

    return totalXP
  }, [checkedConcepts.size, conceptChecklist.length])

  /**
   * Handle story completion and award XP
   */
  const handleStoryComplete = useCallback(() => {
    const xpEarned = calculateXP()
    const allConceptsUsed = checkedConcepts.size === conceptChecklist.length && conceptChecklist.length > 0

    const badge = allConceptsUsed ? {
      id: 'master_storyteller',
      name: 'Master Storyteller',
      description: 'Used all concepts in your story',
      icon: '📖'
    } : null

    logger.info('STORY', 'Story complete', {
      xpEarned,
      badge: badge?.name || 'none',
      sceneCount: scenes.length
    })

    onComplete?.({ xpEarned, badge })
  }, [calculateXP, checkedConcepts.size, conceptChecklist.length, scenes.length, onComplete])

  /**
   * Handle retry (start new story)
   */
  const handleRetry = useCallback(() => {
    setScenes([])
    setCheckedConcepts(new Set())
    setStoryState(STORY_STATE.READY)
  }, [])

  /**
   * Handle share complete
   */
  const handleShareComplete = useCallback(() => {
    handleStoryComplete()
  }, [handleStoryComplete])

  /**
   * Render based on current state
   */
  if (storyState === STORY_STATE.LOADING_PROMPT) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Preparing your story prompt...
          </p>
        </div>
      </div>
    )
  }

  if (storyState === STORY_STATE.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            Oops!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {errorMessage}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadStoryPrompt}
              className="px-6 py-3 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onBack}
              className="px-6 py-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (storyState === STORY_STATE.READY) {
    return (
      <StoryPrompt
        storyPrompt={storyPrompt}
        conceptChecklist={conceptChecklist}
        onStartRecording={() => setStoryState(STORY_STATE.RECORDING)}
        onBack={onBack}
      />
    )
  }

  if (storyState === STORY_STATE.RECORDING) {
    return (
      <VoiceStoryRecorder
        topicName={topicName}
        conceptChecklist={conceptChecklist}
        checkedConcepts={checkedConcepts}
        imageStyle={imageStyle}
        scenes={scenes}
        onSceneAdded={handleSceneAdded}
        onComplete={handleRecordingComplete}
        onBack={() => setStoryState(STORY_STATE.READY)}
      />
    )
  }

  if (storyState === STORY_STATE.PROCESSING_FINAL) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-gray-900 dark:via-gray-800 dark:to-pink-950">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">✨</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            Finishing touches...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your story is almost ready!
          </p>
        </div>
      </div>
    )
  }

  if (storyState === STORY_STATE.PLAYBACK) {
    return (
      <StoryPlayback
        topicName={topicName}
        scenes={scenes}
        conceptsUsed={checkedConcepts.size}
        totalConcepts={conceptChecklist.length}
        onShare={() => setStoryState(STORY_STATE.SHARE)}
        onRetry={handleRetry}
        onFinish={handleStoryComplete}
      />
    )
  }

  if (storyState === STORY_STATE.SHARE) {
    return (
      <ShareStory
        topicName={topicName}
        scenes={scenes}
        onBack={() => setStoryState(STORY_STATE.PLAYBACK)}
        onComplete={handleShareComplete}
      />
    )
  }

  return null
}
