/**
 * WebSocket Progress Utility
 * F015: WebSocket connection for real-time progress updates
 *
 * Provides functions to manage WebSocket client connections and broadcast
 * generation progress updates during slideshow creation.
 */

/**
 * Progress message types used during generation pipeline
 * These correspond to stages in the generation process
 */
export const PROGRESS_TYPES = {
  // Generation has started - sent immediately when request begins
  START: 'start',
  // Script generation completed - text content is ready
  SCRIPT_READY: 'script_ready',
  // Image generation in progress - diagrams being created
  IMAGES_GENERATING: 'images_generating',
  // Audio generation in progress - TTS narration being created
  AUDIO_GENERATING: 'audio_generating',
  // Generation completed successfully - all assets ready
  COMPLETE: 'complete',
  // An error occurred during generation
  ERROR: 'error',
}

/**
 * Map to store client connections by client ID
 * Key: clientId (string) - unique identifier sent by frontend
 * Value: WebSocket connection object
 */
const clients = new Map()

/**
 * Register a WebSocket client with a unique ID
 * Called when a client sends a registration message with their clientId
 *
 * @param {string} clientId - Unique identifier for the client
 * @param {WebSocket} ws - WebSocket connection object
 */
export function registerClient(clientId, ws) {
  if (!clientId || typeof clientId !== 'string') {
    console.warn('Invalid clientId provided for WebSocket registration')
    return
  }

  // Remove any existing connection for this client (handles reconnection)
  if (clients.has(clientId)) {
    const existingWs = clients.get(clientId)
    // Close the old connection if it's still open
    if (existingWs.readyState === 1) { // WebSocket.OPEN = 1
      existingWs.close(1000, 'Replaced by new connection')
    }
  }

  clients.set(clientId, ws)
  console.log(`WebSocket client registered: ${clientId}`)
}

/**
 * Unregister a WebSocket client
 * Called when a client disconnects
 *
 * @param {string} clientId - Unique identifier for the client
 */
export function unregisterClient(clientId) {
  if (clients.has(clientId)) {
    clients.delete(clientId)
    console.log(`WebSocket client unregistered: ${clientId}`)
  }
}

/**
 * Find and unregister a client by their WebSocket connection
 * Used when we receive a close event but don't have the clientId directly
 *
 * @param {WebSocket} ws - WebSocket connection object
 */
export function unregisterClientByWs(ws) {
  for (const [clientId, clientWs] of clients.entries()) {
    if (clientWs === ws) {
      unregisterClient(clientId)
      return
    }
  }
}

/**
 * Get a WebSocket client by ID
 *
 * @param {string} clientId - Unique identifier for the client
 * @returns {WebSocket|null} WebSocket connection or null if not found
 */
export function getClient(clientId) {
  return clients.get(clientId) || null
}

/**
 * Check if a client is connected
 *
 * @param {string} clientId - Unique identifier for the client
 * @returns {boolean} Whether the client is connected
 */
export function isClientConnected(clientId) {
  const ws = clients.get(clientId)
  return ws !== undefined && ws.readyState === 1 // WebSocket.OPEN = 1
}

/**
 * Send a progress message to a specific client
 *
 * @param {string} clientId - Unique identifier for the client
 * @param {string} type - Progress message type (from PROGRESS_TYPES)
 * @param {Object} data - Additional data to include in the message
 * @returns {boolean} Whether the message was sent successfully
 */
export function sendProgress(clientId, type, data = {}) {
  const ws = clients.get(clientId)

  if (!ws) {
    console.warn(`Cannot send progress: client ${clientId} not found`)
    return false
  }

  if (ws.readyState !== 1) { // WebSocket.OPEN = 1
    console.warn(`Cannot send progress: client ${clientId} connection not open (state: ${ws.readyState})`)
    return false
  }

  try {
    const message = JSON.stringify({
      type,
      data,
      timestamp: Date.now(),
    })

    ws.send(message)
    console.log(`Progress sent to ${clientId}: ${type}`)
    return true
  } catch (error) {
    console.error(`Failed to send progress to ${clientId}:`, error)
    return false
  }
}

/**
 * Broadcast a progress message to all connected clients
 * Useful for system-wide announcements, but typically sendProgress is preferred
 *
 * @param {string} type - Progress message type (from PROGRESS_TYPES)
 * @param {Object} data - Additional data to include in the message
 */
export function broadcastProgress(type, data = {}) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: Date.now(),
  })

  let successCount = 0
  let failCount = 0

  for (const [clientId, ws] of clients.entries()) {
    if (ws.readyState === 1) { // WebSocket.OPEN = 1
      try {
        ws.send(message)
        successCount++
      } catch (error) {
        console.error(`Failed to broadcast to ${clientId}:`, error)
        failCount++
      }
    } else {
      failCount++
    }
  }

  console.log(`Broadcast ${type}: ${successCount} success, ${failCount} failed`)
}

/**
 * Get count of currently connected clients
 *
 * @returns {number} Number of connected clients
 */
export function getClientCount() {
  let count = 0
  for (const ws of clients.values()) {
    if (ws.readyState === 1) { // WebSocket.OPEN = 1
      count++
    }
  }
  return count
}

export default {
  PROGRESS_TYPES,
  registerClient,
  unregisterClient,
  unregisterClientByWs,
  getClient,
  isClientConnected,
  sendProgress,
  broadcastProgress,
  getClientCount,
}
