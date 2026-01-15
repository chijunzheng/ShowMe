import { useState, useEffect, useCallback, useRef } from 'react'

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
 * Configuration constants for WebSocket connection
 */
const WS_CONFIG = {
  // WebSocket server URL - uses environment variable with fallback for local dev
  URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws/generation',
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

        console.log('WebSocket connected')
        setIsConnected(true)
        setReadyState(WS_STATE.OPEN)
        reconnectAttemptsRef.current = 0

        // Register this client with the server to receive targeted messages
        const clientId = getClientId()
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
            console.log('WebSocket client registered:', message.data?.clientId)
          }

          // Call the progress callback for all messages
          // The consumer can filter by message.type if needed
          onProgressRef.current(message)
        } catch (parseError) {
          console.error('Failed to parse WebSocket message:', parseError)
        }
      }

      ws.onclose = (event) => {
        if (!mountedRef.current) return

        console.log('WebSocket closed:', event.code, event.reason)
        setIsConnected(false)
        setIsRegistered(false)
        setReadyState(WS_STATE.CLOSED)

        // Attempt reconnection if not a clean close and under max attempts
        const isCleanClose = event.code === 1000 || event.code === 1001
        const canReconnect = reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS

        if (!isCleanClose && canReconnect && mountedRef.current) {
          reconnectAttemptsRef.current += 1
          console.log(`Attempting reconnect ${reconnectAttemptsRef.current}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS}`)

          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect()
            }
          }, WS_CONFIG.RECONNECT_DELAY)
        }
      }

      ws.onerror = (error) => {
        if (!mountedRef.current) return

        console.error('WebSocket error:', error)
        onErrorRef.current(error)
      }

      setReadyState(WS_STATE.CONNECTING)
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
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
      console.warn('Cannot send message: WebSocket not connected')
      return false
    }

    try {
      wsRef.current.send(JSON.stringify(message))
      return true
    } catch (error) {
      console.error('Failed to send WebSocket message:', error)
      return false
    }
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    mountedRef.current = true

    if (autoConnect) {
      connect()
    }

    // Cleanup on unmount - ensures clean disconnect
    return () => {
      mountedRef.current = false
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
