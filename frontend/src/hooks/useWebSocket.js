import { useState, useEffect, useCallback, useRef } from 'react'
import logger from '../utils/logger'

/**
 * Progress message types that match the backend PROGRESS_TYPES
 * Used for type-safe message handling
 */
export const PROGRESS_TYPES = {
  START: 'start',
  SCRIPT_READY: 'script_ready',
  IMAGES_GENERATING: 'images_generating',
  AUDIO_GENERATING: 'audio_generating',
  COMPLETE: 'complete',
  ERROR: 'error',
  // Connection-specific types from server
  CONNECTED: 'connected',
  REGISTERED: 'registered',
}

/**
 * WebSocket connection states
 */
export const WS_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}

/**
 * Get WebSocket URL based on current environment
 * In production, uses same host with wss:// protocol
 * In development, falls back to localhost
 */
function getWebSocketUrl() {
  // Use environment variable if set
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }

  // In production (served from backend), use same origin
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/ws/generation`
  }

  // Development fallback
  return 'ws://localhost:3002/ws/generation'
}

/**
 * Configuration constants for WebSocket connection
 */
const WS_CONFIG = {
  // WebSocket server URL - dynamically determined based on environment
  URL: getWebSocketUrl(),
  // Delay before attempting reconnection (ms)
  RECONNECT_DELAY: 2000,
  // Maximum reconnection attempts before giving up
  MAX_RECONNECT_ATTEMPTS: 5,
}

/**
 * Generate a unique client ID for WebSocket registration
 * Uses timestamp + random string for uniqueness across sessions
 * @returns {string} Unique client ID
 */
function generateClientId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  return `client_${timestamp}_${random}`
}

/**
 * useWebSocket - Custom hook for managing WebSocket connections
 *
 * F015: Manages connection to /ws/generation for real-time progress updates
 * during slideshow generation.
 *
 * Features:
 * - Automatic connection on mount
 * - Automatic reconnection on disconnect (with configurable attempts)
 * - Clean disconnect on unmount
 * - Typed progress message handling
 * - Client ID management for targeted progress updates
 *
 * @param {Object} options - Hook configuration options
 * @param {Function} options.onProgress - Callback when progress message received
 * @param {Function} options.onError - Callback when WebSocket error occurs
 * @param {boolean} options.autoConnect - Whether to connect automatically (default: true)
 * @returns {Object} WebSocket state and control functions
 */
export function useWebSocket({
  onProgress = () => {},
  onError = () => {},
  autoConnect = true,
} = {}) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [readyState, setReadyState] = useState(WS_STATE.CLOSED)
  const [lastMessage, setLastMessage] = useState(null)

  // Refs to persist across renders without triggering re-renders
  const wsRef = useRef(null)
  const clientIdRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef(null)
  const mountedRef = useRef(true)

  // Store callbacks in refs to avoid stale closures
  const onProgressRef = useRef(onProgress)
  const onErrorRef = useRef(onError)

  // Update callback refs when they change
  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  /**
   * Generate and store a unique client ID if not already set
   * Client ID is stable for the lifetime of the hook instance
   */
  const getClientId = useCallback(() => {
    if (!clientIdRef.current) {
      clientIdRef.current = generateClientId()
    }
    return clientIdRef.current
  }, [])

  /**
   * Connect to the WebSocket server
   * Initializes the connection and sets up event handlers
   */
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current && wsRef.current.readyState === WS_STATE.OPEN) {
      return
    }

    // Don't connect if component unmounted
    if (!mountedRef.current) {
      return
    }

    try {
      const ws = new WebSocket(WS_CONFIG.URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (!mountedRef.current) return

        // F069: Log WebSocket connection established
        logger.info('WS', 'Connection established', { url: WS_CONFIG.URL })
        setIsConnected(true)
        setReadyState(WS_STATE.OPEN)
        reconnectAttemptsRef.current = 0

        // Register this client with the server to receive targeted messages
        const clientId = getClientId()
        // F069: Log client registration
        logger.debug('WS', 'Registering client', { clientId })
        ws.send(JSON.stringify({
          type: 'register',
          clientId,
        }))
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return

        try {
          const message = JSON.parse(event.data)
          setLastMessage(message)

          // Handle registration acknowledgment
          if (message.type === PROGRESS_TYPES.REGISTERED) {
            setIsRegistered(true)
            // F069: Log client registration confirmed
            logger.info('WS', 'Client registered successfully', {
              clientId: message.data?.clientId,
            })
          } else {
            // F069: Log incoming progress message
            logger.debug('WS', `Message received: ${message.type}`, {
              type: message.type,
              hasData: !!message.data,
            })
          }

          // Call the progress callback for all messages
          // The consumer can filter by message.type if needed
          onProgressRef.current(message)
        } catch (parseError) {
          // F069: Log parse errors
          logger.error('WS', 'Failed to parse message', {
            error: parseError.message,
          })
        }
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return

        // F069: Log WebSocket disconnect
        logger.info('WS', 'Connection closed', {
          code: event.code,
          reason: event.reason || 'No reason provided',
        })
        setIsConnected(false)
        setIsRegistered(false)
        setReadyState(WS_STATE.CLOSED)

        // Attempt reconnection if not a clean close and under max attempts
        const isCleanClose = event.code === 1000 || event.code === 1001
        const canReconnect = reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS

        if (!isCleanClose && canReconnect && mountedRef.current) {
          reconnectAttemptsRef.current += 1
          // F069: Log reconnection attempt
          logger.warn('WS', 'Attempting reconnect', {
            attempt: reconnectAttemptsRef.current,
            maxAttempts: WS_CONFIG.MAX_RECONNECT_ATTEMPTS,
            delayMs: WS_CONFIG.RECONNECT_DELAY,
          })

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect()
            }
          }, WS_CONFIG.RECONNECT_DELAY)
        }
      }

      ws.onerror = (error) => {
        if (!mountedRef.current) return

        // F069: Log WebSocket errors
        logger.error('WS', 'Connection error', {
          message: error?.message || 'Unknown error',
        })
        onErrorRef.current(error)
      }

      setReadyState(WS_STATE.CONNECTING)
    } catch (error) {
      // F069: Log WebSocket creation failure
      logger.error('WS', 'Failed to create connection', {
        error: error.message,
        url: WS_CONFIG.URL,
      })
      onErrorRef.current(error)
    }
  }, [getClientId])

  /**
   * Disconnect from the WebSocket server
   * Performs a clean close of the connection
   */
  const disconnect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close the WebSocket connection cleanly
    if (wsRef.current) {
      // Only close if connection is open or connecting
      if (wsRef.current.readyState === WS_STATE.OPEN ||
          wsRef.current.readyState === WS_STATE.CONNECTING) {
        wsRef.current.close(1000, 'Client disconnect')
      }
      wsRef.current = null
    }

    setIsConnected(false)
    setIsRegistered(false)
    setReadyState(WS_STATE.CLOSED)
  }, [])

  /**
   * Send a message through the WebSocket connection
   * @param {Object} message - Message object to send
   * @returns {boolean} Whether the message was sent successfully
   */
  const sendMessage = useCallback((message) => {
    if (!wsRef.current || wsRef.current.readyState !== WS_STATE.OPEN) {
      // F069: Log send failure due to disconnection
      logger.warn('WS', 'Cannot send message: not connected')
      return false
    }

    try {
      wsRef.current.send(JSON.stringify(message))
      // F069: Log outgoing message
      logger.debug('WS', 'Message sent', { type: message.type })
      return true
    } catch (error) {
      // F069: Log send failure
      logger.error('WS', 'Failed to send message', { error: error.message })
      return false
    }
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    mountedRef.current = true
    let connectTimeoutId = null

    if (autoConnect) {
      // Defer connection to next tick to handle React StrictMode's double-mount behavior
      // In StrictMode, React mounts → unmounts → re-mounts components in development
      // Without this delay, the first connection gets created and immediately torn down
      connectTimeoutId = setTimeout(() => {
        if (mountedRef.current) {
          connect()
        }
      }, 0)
    }

    // Cleanup on unmount - ensures clean disconnect
    return () => {
      mountedRef.current = false
      if (connectTimeoutId) {
        clearTimeout(connectTimeoutId)
      }
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    // Connection state
    isConnected,
    isRegistered,
    readyState,
    lastMessage,

    // Client ID for use in API requests
    clientId: getClientId(),

    // Control functions
    connect,
    disconnect,
    sendMessage,
  }
}

export default useWebSocket
