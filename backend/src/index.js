import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}))
app.use(express.json())

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many requests, please try again later.' },
})
app.use('/api/', limiter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Import routes
import generateRoutes from './routes/generate.js'
import classifyRoutes from './routes/classify.js'

app.use('/api/generate', generateRoutes)
app.use('/api/classify', classifyRoutes)

// Create HTTP server
const server = createServer(app)

// WebSocket server for generation progress
const wss = new WebSocketServer({ server, path: '/ws/generation' })

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message)
      console.log('Received:', data)
    } catch (err) {
      console.error('Invalid message:', err)
    }
  })

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

// Export WebSocket server for use in routes
export { wss }

// Start server
server.listen(PORT, () => {
  console.log(`ShowMe backend listening on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`WebSocket: ws://localhost:${PORT}/ws/generation`)
})
