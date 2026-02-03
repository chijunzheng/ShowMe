/**
 * useTabNavigation Hook
 * Manages bottom tab bar navigation state and transitions
 *
 * Tabs:
 * - learn: Main learning/slideshow experience
 * - world: World Builder view with collected pieces
 * - tree: Knowledge Tree view for topic connections
 */

import { useState, useCallback } from 'react'

export function useTabNavigation() {
  // Active tab: 'learn' | 'world' | 'tree'
  const [activeTab, setActiveTab] = useState('learn')

  // World tab badge count (new pieces notification)
  const [worldBadge, setWorldBadge] = useState(0)

  // Learn mode: 'quick' | 'full'
  const [learnMode, setLearnMode] = useState('full')

  /**
   * Increment world badge count (new piece unlocked)
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
