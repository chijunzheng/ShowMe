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

const STORAGE_KEY = 'showme_client_id'

/**
 * Get or create a unique client ID
 * Stored in localStorage for persistence across sessions
 *
 * @returns {string} Client ID in format: client_{timestamp}_{random}
 */
export function getClientId() {
  let clientId = localStorage.getItem(STORAGE_KEY)

  if (!clientId) {
    clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    localStorage.setItem(STORAGE_KEY, clientId)
  }

  return clientId
}

/**
 * Clear the stored client ID
 * Useful for testing or resetting user state
 */
export function clearClientId() {
  localStorage.removeItem(STORAGE_KEY)
}

export default getClientId
