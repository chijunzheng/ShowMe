# ShowMe Debug Logging System - Feature Specification

## Overview

Add a comprehensive logging system to ShowMe for debugging in Chrome DevTools console. The system should provide structured, filterable, and visually distinct logs across both frontend and backend components.

## Project Context

ShowMe is an existing voice-first educational app with:
- **Frontend**: React 18 + Vite (port 5173)
- **Backend**: Node.js + Express with WebSocket
- **Tech**: Web Audio API, MediaRecorder, WebSocket for real-time updates

## Logging System Requirements

### Core Features

#### L001: Log Levels
- Support 4 log levels: `debug`, `info`, `warn`, `error`
- Each level has distinct console styling (colors, icons)
- Levels can be filtered via `window.LOG_LEVEL` setting

#### L002: Structured Log Format
```
[TIMESTAMP] [LEVEL] [CATEGORY] Message
└─ Context: { additional data }
```

#### L003: Category-Based Logging
Categories for ShowMe:
- `AUDIO` - Voice recording, audio analysis, playback
- `API` - Network requests, responses, errors
- `WS` - WebSocket connection, messages
- `STATE` - UI state changes, topic management
- `GENERATION` - Slideshow generation pipeline
- `UI` - User interactions, navigation
- `PERF` - Performance measurements

#### L004: Chrome Console Styling
- Use CSS styling in console.log for visual distinction
- Collapsible groups for related logs
- Tables for structured data (API responses, state)
- Color-coded by level and category

### Frontend Logger (`frontend/src/utils/logger.js`)

#### L010: Logger Utility
```javascript
import logger from './utils/logger'

logger.debug('AUDIO', 'Starting recording', { sampleRate: 44100 })
logger.info('API', 'Request sent', { endpoint: '/api/generate' })
logger.warn('WS', 'Connection unstable', { attempts: 3 })
logger.error('STATE', 'Invalid state transition', { from, to })
```

#### L011: Global Configuration
```javascript
// Enable all logs
window.LOG_LEVEL = 'debug'

// Only warnings and errors
window.LOG_LEVEL = 'warn'

// Disable logging
window.LOG_LEVEL = 'none'

// Filter by category
window.LOG_CATEGORIES = ['API', 'WS']
```

#### L012: Performance Timing
```javascript
logger.time('API', 'generate-request')
// ... async operation ...
logger.timeEnd('API', 'generate-request') // Logs duration
```

#### L013: State Change Logging
- Automatically log UI state transitions
- Log topic additions/evictions
- Log question queue changes

#### L014: API Request/Response Logging
- Log all fetch calls with endpoint, method
- Log response status, timing, truncated body
- Log errors with full context

#### L015: WebSocket Event Logging
- Log connection state changes
- Log incoming progress messages
- Log registration and client ID

#### L016: Audio Pipeline Logging
- Log recording start/stop
- Log audio analysis metrics
- Log silence detection events
- Log STT results

### Backend Logger (`backend/src/utils/logger.js`)

#### L020: Server-Side Logging
```javascript
const logger = require('./utils/logger')

logger.info('API', 'Generate request received', { query, clientId })
logger.debug('GEMINI', 'Calling STT API', { audioSize })
logger.error('WS', 'Client disconnected unexpectedly', { clientId })
```

#### L021: Request Logging Middleware
- Log incoming requests with method, path, query
- Log response status and timing
- Correlate with client IDs

#### L022: Generation Pipeline Logging
- Log each pipeline stage timing
- Log Gemini API calls and responses
- Log image/audio generation progress

### Developer Experience

#### L030: DevTools Integration
- Logs visible in Chrome DevTools Console
- Use `console.group()` for collapsible sections
- Use `console.table()` for structured data
- Use `console.time()` for performance

#### L031: Log Filtering in DevTools
- Filter by log level using DevTools levels
- Filter by category using text filter
- Preserve logs across page refresh option

#### L032: Production Safety
- Logging disabled by default in production
- No sensitive data (API keys, user data) in logs
- Minimal performance impact when disabled

### Configuration

#### L040: Environment Variables
```
# Frontend (.env)
VITE_LOG_LEVEL=debug
VITE_LOG_CATEGORIES=API,WS,STATE

# Backend (.env)
LOG_LEVEL=info
LOG_CATEGORIES=*
```

#### L041: Runtime Toggle
- Enable/disable via browser console
- Change level without page reload
- Toggle categories dynamically

## Visual Design

### Console Styling

```
Level Colors:
- debug: gray (#9CA3AF)
- info:  blue (#3B82F6)
- warn:  orange (#F59E0B)
- error: red (#EF4444)

Category Colors:
- AUDIO:      purple (#8B5CF6)
- API:        cyan (#06B6D4)
- WS:         green (#10B981)
- STATE:      indigo (#6366F1)
- GENERATION: pink (#EC4899)
- UI:         amber (#F59E0B)
- PERF:       emerald (#059669)
```

### Log Format Examples

```
=== Debug Level ===
[10:23:45.123] 🔍 DEBUG [AUDIO] Starting audio capture
└─ { sampleRate: 44100, channels: 1 }

=== Info Level ===
[10:23:46.456] ℹ️ INFO [API] POST /api/generate
└─ { query: "How do black holes work?", clientId: "client_123" }

=== Warn Level ===
[10:23:47.789] ⚠️ WARN [WS] Reconnection attempt
└─ { attempt: 2, maxAttempts: 5 }

=== Error Level ===
[10:23:48.012] ❌ ERROR [STATE] Generation failed
└─ { error: "Network timeout", query: "..." }
```

## Implementation Priorities

1. **P1**: Core logger utility with levels and categories
2. **P1**: Chrome console styling
3. **P2**: Frontend integration (API, WS, State)
4. **P2**: Backend integration (routes, services)
5. **P3**: Performance timing helpers
6. **P3**: DevTools enhancements

## Testing Requirements

- Unit tests for logger utility
- Integration tests for log output
- E2E tests verifying no production logging
- Performance tests for logging overhead

## Success Criteria

1. Developers can enable detailed logging with one command
2. Logs are visually scannable in Chrome DevTools
3. Categories allow focused debugging of specific areas
4. Zero runtime impact when logging is disabled
5. No sensitive data exposure in any log level
