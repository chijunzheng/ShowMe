// Load environment variables FIRST - must be before any other imports
// that might read process.env (like gemini.js via generate.js)
import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import logger utility (F076)
import logger from './utils/logger.js'

// Import request logging middleware (F077)
import requestLogger from './middleware/requestLogger.js'

// Import WebSocket progress utilities for client management
import {
  registerClient,
  unregisterClientByWs,
} from './utils/wsProgress.js'

const app = express()
const PORT = process.env.PORT || 3002

// Allowed origins for CORS - only allow frontend
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3002',
  process.env.CORS_ORIGIN,
].filter(Boolean)

// In production, allow same-origin requests (frontend served from same server)
const isProduction = process.env.NODE_ENV === 'production'

// Security headers with helmet
// F006: Content Security Policy headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Allow scripts from self only
      scriptSrc: ["'self'"],
      // Allow inline styles for Tailwind CSS and Google Fonts
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Allow images from self, data URIs (for base64), and placehold.co
      imgSrc: ["'self'", "data:", "https://placehold.co"],
      // Allow fonts from self and common CDNs
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      // Allow API connections to self and WebSocket
      connectSrc: isProduction
        ? ["'self'", "wss://*.run.app"]
        : ["'self'", "ws://localhost:3002", "wss://localhost:3002"],
      // Allow audio/video from self and data URIs (for base64 TTS audio)
      mediaSrc: ["'self'", "data:", "blob:"],
      // Disallow object/embed/applet
      objectSrc: ["'none'"],
      // Only allow HTTPS for upgrades in production
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  // Cross-Origin settings
  crossOriginEmbedderPolicy: false, // Required for external images
  crossOriginResourcePolicy: { policy: "cross-origin" },
}))

// F005: CORS configuration - only allow frontend origin
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests in dev)
    if (!origin) {
      return callback(null, true)
    }

    // In production, allow same-origin (no origin header for same-origin requests)
    // and allow explicit CORS_ORIGIN if set
    if (isProduction) {
      // Cloud Run URLs follow pattern: https://*.run.app
      if (origin.endsWith('.run.app') || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true)
      }
    }

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }

    callback(new Error('Not allowed by CORS'))
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  // Handle preflight requests
  preflightContinue: false,
  optionsSuccessStatus: 204,
}))

// Parse JSON bodies with size limit (security measure)
app.use(express.json({ limit: '10kb' }))

// F077: Request logging middleware - logs all requests with timing
app.use(requestLogger)

// F003: Rate limiting - 100 requests per 15 minutes for /api/* endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Return retry-after header when rate limited
  handler: (req, res, next, options) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(options.windowMs / 1000),
    })
  },
})
app.use('/api/', apiLimiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Import routes
import generateRoutes from './routes/generate.js'
import classifyRoutes from './routes/classify.js'
import transcribeRoutes from './routes/transcribe.js'
import greetingRoutes from './routes/greeting.js'
import topicRoutes from './routes/topic.js'
import voiceRoutes from './routes/voice.js'
import chitchatRoutes from './routes/chitchat.js'

app.use('/api/generate', generateRoutes)
app.use('/api/classify', classifyRoutes)
app.use('/api/transcribe', transcribeRoutes)
app.use('/api/greeting', greetingRoutes)
app.use('/api/topic', topicRoutes)
app.use('/api/voice', voiceRoutes)
app.use('/api/chitchat', chitchatRoutes)

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public')
  app.use(express.static(publicPath))

  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next()
    }
    res.sendFile(path.join(publicPath, 'index.html'))
  })
}

// Error handler for CORS and other errors (returns JSON instead of HTML)
app.use((err, req, res, next) => {
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS error: Origin not allowed',
    })
  }

  // Handle JSON parsing errors (body size exceeded, malformed JSON)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Request body too large',
    })
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Invalid JSON in request body',
    })
  }

  // Generic error handler
  logger.error('API', 'Server error', { error: err.message, stack: err.stack })
  res.status(500).json({
    error: 'Internal server error',
  })
})

// Create HTTP server
const server = createServer(app)

// F007: WebSocket server with origin validation
const wss = new WebSocketServer({
  server,
  path: '/ws/generation',
  // Verify origin before accepting WebSocket connections
  verifyClient: (info, callback) => {
    const origin = info.origin || info.req.headers.origin

    // Allow connections from allowed origins or no origin (local tools)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(true)
    } else if (isProduction && origin.endsWith('.run.app')) {
      // Allow Cloud Run origins in production
      callback(true)
    } else {
      logger.warn('WS', 'WebSocket connection rejected', { origin })
      callback(false, 403, 'Forbidden')
    }
  },
})

wss.on('connection', (ws, req) => {
  logger.info('WS', 'WebSocket client connected', { origin: req.headers.origin || 'unknown' })

  // Send a welcome message to confirm connection
  ws.send(JSON.stringify({
    type: 'connected',
    data: { message: 'WebSocket connection established' },
    timestamp: Date.now(),
  }))

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      logger.debug('WS', 'Received message', { type: data.type })

      // Handle client registration - clients send their ID to register
      // This allows the generate endpoint to send progress to specific clients
      if (data.type === 'register' && data.clientId) {
        registerClient(data.clientId, ws)

        // Acknowledge registration
        ws.send(JSON.stringify({
          type: 'registered',
          data: { clientId: data.clientId },
          timestamp: Date.now(),
        }))
      }
    } catch (err) {
      logger.warn('WS', 'Invalid message received', { error: err.message })
    }
  })

  ws.on('close', () => {
    // Unregister client when they disconnect
    unregisterClientByWs(ws)
    logger.info('WS', 'WebSocket client disconnected')
  })

  ws.on('error', (error) => {
    logger.error('WS', 'WebSocket error', { error: error.message })
    unregisterClientByWs(ws)
  })
})

// Export WebSocket server for use in routes
export { wss }

// Start server
server.listen(PORT, () => {
  logger.info('API', `ShowMe backend listening on port ${PORT}`)
  logger.info('API', `Health check: http://localhost:${PORT}/health`)
  logger.info('WS', `WebSocket: ws://localhost:${PORT}/ws/generation`)
})
