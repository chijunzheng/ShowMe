/**
 * useTabNavigation Hook
 * Manages bottom tab bar navigation state and transitions
 *
 * Tabs:
 * - learn: Main learning/slideshow experience
 * - progress: Journey view with constellation/progress insights
 */

import { useState, useCallback } from 'react'

export function useTabNavigation() {
  // Active tab: 'learn' | 'progress'
  const [activeTab, setActiveTab] = useState('learn')

  // Journey tab badge count (new activity notification)
  const [worldBadge, setWorldBadge] = useState(0)

  // Learn mode: 'quick' | 'full'
  const [learnMode, setLearnMode] = useState('full')

  /**
   * Increment Journey badge count
   */
  const incrementWorldBadge = useCallback(() => {
    setWorldBadge(prev => prev + 1)
  }, [])

  /**
   * Toggle learn mode between quick and full
   */
  const toggleLearnMode = useCallback(() => {
    setLearnMode(prev => prev === 'quick' ? 'full' : 'quick')
  }, [])

  return {
    activeTab,
    setActiveTab,

    worldBadge,
    setWorldBadge,
    incrementWorldBadge,

    learnMode,
    setLearnMode,
    toggleLearnMode,
  }
}

export default useTabNavigation
