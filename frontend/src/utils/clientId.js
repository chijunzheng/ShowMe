/**
 * Client ID Utility
 * Provides consistent client identification across the application
 *
 * The client ID is stored in localStorage and persists across sessions.
 * It is used for:
 * - World state tracking
 * - Evolution checks
 * - Review session management
 */

import { STORAGE_KEYS } from '../constants/appConfig'

const STORAGE_KEY = STORAGE_KEYS.CLIENT_ID
let memoryClientId = null

function generateClientId() {
  return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Get or create a unique client ID
 * Stored in localStorage for persistence across sessions
 *
 * @returns {string} Client ID in format: client_{timestamp}_{random}
 */
export function getClientId() {
  if (typeof window === 'undefined') {
    if (!memoryClientId) {
      memoryClientId = generateClientId()
    }
    return memoryClientId
  }

  try {
    let clientId = localStorage.getItem(STORAGE_KEY)
    if (!clientId) {
      clientId = generateClientId()
      localStorage.setItem(STORAGE_KEY, clientId)
    }
    return clientId
  } catch {
    if (!memoryClientId) {
      memoryClientId = generateClientId()
    }
    return memoryClientId
  }
}

/**
 * Clear the stored client ID
 * Useful for testing or resetting user state
 */
export function clearClientId() {
  memoryClientId = null
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore localStorage failures.
  }
}

export default getClientId
