/**
 * useGameInventory Hook
 *
 * PHASE-5: Power-Ups System
 * Manages game inventory with power-ups stored in localStorage.
 *
 * Features:
 * - Store inventory in localStorage (key: 'showme_inventory')
 * - addItems(items) - Add items from rewards
 * - useItem(itemId) - Consume a power-up, return the effect
 * - getItemCount(itemId) - Get quantity of an item
 * - getActiveEffects() - Get currently active power-up effects
 * - Track active effects with expiration
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const STORAGE_KEY = 'showme_inventory'
const STORAGE_VERSION = 1

/**
 * Power-up effect definitions
 * Each power-up has a type, description, and optional duration/multiplier
 */
const POWER_UP_EFFECTS = {
  hint_boost: {
    type: 'hint_boost',
    description: 'Get a helpful hint on your next question',
    isTimed: false,
  },
  xp_multiplier: {
    type: 'xp_multiplier',
    description: 'Double XP for 60 seconds',
    isTimed: true,
    durationMs: 60000,
    multiplier: 2,
  },
  skip_token: {
    type: 'skip_token',
    description: 'Skip a question without penalty',
    isTimed: false,
  },
  shield: {
    type: 'shield',
    description: 'Protect your streak from one wrong answer',
    isTimed: true,
    durationMs: 120000,
  },
}

/**
 * Load inventory from localStorage
 * @returns {Object} { items, activeEffects }
 */
function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { items: {}, activeEffects: [] }
    }

    const parsed = JSON.parse(stored)

    // Handle legacy format (no version)
    if (!parsed.version && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Check if it's the old format (direct items object)
      if (!parsed.items && !parsed.activeEffects) {
        return { items: parsed, activeEffects: [] }
      }
    }

    return {
      items: parsed.items || {},
      activeEffects: parsed.activeEffects || [],
    }
  } catch {
    return { items: {}, activeEffects: [] }
  }
}

/**
 * Save inventory to localStorage
 * @param {Object} items - Item counts by id
 * @param {Array} activeEffects - Active timed effects
 */
function saveToStorage(items, activeEffects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: STORAGE_VERSION,
      items,
      activeEffects,
    }))
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Filter out expired effects
 * @param {Array} effects - Active effects array
 * @returns {Array} Valid (non-expired) effects
 */
function filterExpiredEffects(effects) {
  const now = Date.now()
  return effects.filter((effect) => effect.expiresAt > now)
}

export default function useGameInventory() {
  const [inventory, setInventory] = useState({})
  const [activeEffects, setActiveEffects] = useState([])
  const cleanupTimerRef = useRef(null)

  // Load from storage on mount
  useEffect(() => {
    const { items, activeEffects: storedEffects } = loadFromStorage()
    setInventory(items)
    // Filter expired effects on load
    setActiveEffects(filterExpiredEffects(storedEffects))
  }, [])

  // Set up cleanup timer for expired effects
  useEffect(() => {
    const checkExpiredEffects = () => {
      setActiveEffects((current) => {
        const filtered = filterExpiredEffects(current)
        if (filtered.length !== current.length) {
          // Effects changed, persist
          saveToStorage(inventory, filtered)
        }
        return filtered
      })
    }

    // Check every second
    cleanupTimerRef.current = setInterval(checkExpiredEffects, 1000)

    return () => {
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current)
      }
    }
  }, [inventory])

  /**
   * Add items to inventory
   * @param {Array} items - Array of { id, quantity } objects
   */
  const addItems = useCallback((items) => {
    if (!items || !Array.isArray(items)) {
      return
    }

    setInventory((current) => {
      const updated = { ...current }

      items.forEach((item) => {
        if (item && item.id && typeof item.quantity === 'number') {
          updated[item.id] = (updated[item.id] || 0) + item.quantity
        }
      })

      // Persist after state update
      setActiveEffects((effects) => {
        saveToStorage(updated, effects)
        return effects
      })

      return updated
    })
  }, [])

  /**
   * Use an item from inventory
   * @param {string} itemId - The item to use
   * @returns {Object|null} The effect, or null if unavailable
   */
  const useItem = useCallback((itemId) => {
    if (!itemId) {
      return null
    }

    const currentCount = inventory[itemId] || 0
    if (currentCount <= 0) {
      return null
    }

    const effectDef = POWER_UP_EFFECTS[itemId]
    if (!effectDef) {
      return null
    }

    // Check if timed effect is already active
    if (effectDef.isTimed) {
      const isAlreadyActive = activeEffects.some(
        (effect) => effect.id === itemId && effect.expiresAt > Date.now()
      )
      if (isAlreadyActive) {
        return null
      }
    }

    // Consume the item
    const updatedInventory = {
      ...inventory,
      [itemId]: currentCount - 1,
    }
    setInventory(updatedInventory)

    // Create the effect
    const effect = {
      type: effectDef.type,
      description: effectDef.description,
    }

    // Handle timed effects
    let updatedEffects = activeEffects
    if (effectDef.isTimed) {
      const timedEffect = {
        id: itemId,
        expiresAt: Date.now() + effectDef.durationMs,
        ...(effectDef.multiplier && { multiplier: effectDef.multiplier }),
      }
      updatedEffects = [...activeEffects, timedEffect]
      setActiveEffects(updatedEffects)
      effect.multiplier = effectDef.multiplier
    }

    // Persist changes
    saveToStorage(updatedInventory, updatedEffects)

    return effect
  }, [inventory, activeEffects])

  /**
   * Get the count of a specific item
   * @param {string} itemId - The item id
   * @returns {number} The count (0 if not found)
   */
  const getItemCount = useCallback((itemId) => {
    if (!itemId) {
      return 0
    }
    return inventory[itemId] || 0
  }, [inventory])

  /**
   * Get all currently active effects with remaining time
   * @returns {Array} Active effects with remainingMs
   */
  const getActiveEffects = useCallback(() => {
    const now = Date.now()
    return filterExpiredEffects(activeEffects).map((effect) => ({
      ...effect,
      remainingMs: effect.expiresAt - now,
    }))
  }, [activeEffects])

  /**
   * Check if a specific effect is currently active
   * @param {string} effectId - The effect id to check
   * @returns {boolean} True if active
   */
  const isEffectActive = useCallback((effectId) => {
    const now = Date.now()
    return activeEffects.some(
      (effect) => effect.id === effectId && effect.expiresAt > now
    )
  }, [activeEffects])

  return {
    inventory,
    activeEffects: filterExpiredEffects(activeEffects),
    addItems,
    useItem,
    getItemCount,
    getActiveEffects,
    isEffectActive,
  }
}
