# Learning Modes - Fix Plan

**Date:** 2026-02-04
**Status:** Ready for Implementation
**Priority:** CRITICAL and HIGH issues before production

---

## Issues Summary

From code review of learning modes implementation:
- **Total Issues:** 23
- **CRITICAL:** 2
- **HIGH:** 6
- **MEDIUM:** 9
- **LOW:** 6

---

## Priority 1: CRITICAL Issues (Fix Before Merge)

### CRITICAL-1: Replace console.error with logger

**Impact:** Production bundles contain console statements, exposing errors to users

**Files to Fix:**
```
frontend/src/components/LearnModes/Mystery/TheorySolver.jsx:155, 212
frontend/src/components/LearnModes/WhatIf/PredictionRecorder.jsx:130, 184
```

**Fix:**
```javascript
// WRONG:
console.error('Failed to start recording:', err)

// CORRECT:
import logger from '../../../utils/logger'
logger.error('LEARN_MODE', 'Failed to start recording', { error: err.message })
```

---

### CRITICAL-2: Add Input Sanitization on Story Endpoint

**Impact:** Prompt injection vulnerability - malicious slide content could manipulate AI

**File:** `backend/src/routes/learn.js:368-370`

**Fix:**
```javascript
// Add at top of file
import { escapeHtml } from '../utils/sanitize.js'

// Before building context (line 368)
const slideContext = slides
  .map((slide, index) => {
    const script = escapeHtml(slide.script || '')
    const subtitle = escapeHtml(slide.subtitle || '')
    return `Slide ${index + 1}: ${script || subtitle}`
  })
  .join('\n')
```

---

## Priority 2: HIGH Issues (Fix Before Production)

### HIGH-2: Add AbortController Cleanup in WonderLab

**Impact:** Memory leaks and state updates on unmounted components

**File:** `frontend/src/components/LearnModes/WhatIf/WonderLab.jsx:60-105`

**Fix:**
```javascript
const abortControllerRef = useRef(null)

useEffect(() => {
  generateScenario()
  return () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }
}, [])

const generateScenario = async () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort()
  }
  abortControllerRef.current = new AbortController()

  const response = await fetch(`${API_BASE}/api/learn/whatif`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slides, topicName, explanationLevel }),
    signal: abortControllerRef.current.signal, // Add this
  })
  // ...
}
```

---

### HIGH-3: Add isMounted Ref to StoryStudio

**Impact:** State updates after component unmounts

**File:** `frontend/src/components/LearnModes/Story/StoryStudio.jsx:68-109`

**Fix:**
```javascript
const isMountedRef = useRef(true)

useEffect(() => {
  loadStoryPrompt()
  return () => {
    isMountedRef.current = false
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }
}, [])

const loadStoryPrompt = async () => {
  // ... existing code ...

  const data = await response.json()

  // Only update state if still mounted
  if (isMountedRef.current) {
    setStoryPrompt(data.storyPrompt)
    setConceptChecklist(data.conceptChecklist || [])
    setImageStyle(data.imageStyle || imageStyle)
    setStoryState(STORY_STATE.READY)
  }
}
```

---

### HIGH-6: Add Rate Limiting to Learn Endpoints

**Impact:** API quota exhaustion from spam requests

**File:** `backend/src/routes/learn.js` (all endpoints)

**Fix:**
```javascript
import rateLimit from 'express-rate-limit'

const learnRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: { error: 'Too many requests. Please wait a moment.' }
})

router.post('/mystery', learnRateLimit, async (req, res) => {
  // ...
})

router.post('/mystery/evaluate', learnRateLimit, async (req, res) => {
  // ...
})

router.post('/whatif', learnRateLimit, async (req, res) => {
  // ...
})

router.post('/whatif/evaluate', learnRateLimit, async (req, res) => {
  // ...
})

router.post('/story', learnRateLimit, async (req, res) => {
  // ...
})

router.post('/story/scene', learnRateLimit, async (req, res) => {
  // ...
})
```

---

### HIGH-4: Improve Speech Recognition Error Handling

**Impact:** Silent failures leave users without feedback

**File:** `frontend/src/components/LearnModes/Story/VoiceStoryRecorder.jsx:261-315`

**Fix:**
```javascript
recognition.onerror = (event) => {
  logger.error('STORY', 'Speech recognition error', { error: event.error })

  // Provide user feedback based on error type
  if (event.error === 'no-speech') {
    showToast('No speech detected. Please speak louder.', 'warning')
  } else if (event.error === 'not-allowed') {
    setError('Microphone permission denied. Please enable microphone access.')
  } else {
    setError('Speech recognition failed. Please try again.')
  }
}
```

---

### HIGH-5: Validate Image Prompts

**Impact:** Unsanitized AI-generated content passed to image generation

**File:** `backend/src/services/mysteryGenerator.js:92-93`

**Fix:**
```javascript
// After parsing mystery (line 121)
const mystery = JSON.parse(jsonData)

// Sanitize and validate imagePrompt
mystery.imagePrompt = mystery.imagePrompt?.substring(0, 500) || ''

// Validate required fields
const requiredFields = ['mysteryTitle', 'mysterySetup', 'imagePrompt', 'clues', 'expectedConcepts']
for (const field of requiredFields) {
  if (!mystery[field]) {
    throw new Error(`Missing required field: ${field}`)
  }
}
```

---

## Priority 3: MEDIUM Issues (Next Sprint)

### MEDIUM-4: Extract Shared Voice Recording Logic

**Impact:** Code duplication across 3 components

**Solution:** Create `useVoiceRecording` hook

**Affected Files:**
- `TheorySolver.jsx`
- `VoiceStoryRecorder.jsx`
- `PredictionRecorder.jsx`

---

### MEDIUM-3: Standardize Error Response Format

**Impact:** Inconsistent error handling on frontend

**File:** `backend/src/routes/learn.js`

**Fix:**
```javascript
const errorResponse = {
  success: false,
  error: {
    code: 'INVALID_TOPIC_NAME',
    message: 'Missing or invalid topicName',
    field: 'topicName'
  }
}
```

---

### MEDIUM-6: Add ARIA Labels

**Impact:** Poor accessibility for screen readers

**Files:** All interactive components

---

## Priority 4: LOW Issues (Technical Debt)

- Add PropTypes or TypeScript
- Extract theme constants
- Add JSDoc to useLearnMode hook
- Improve backend logging with request IDs

---

## Implementation Checklist

### Before Merge
- [ ] Fix CRITICAL-1: Replace console.error with logger
- [ ] Fix CRITICAL-2: Add input sanitization to story endpoint
- [ ] Fix HIGH-2: Add AbortController to WonderLab
- [ ] Fix HIGH-3: Add isMounted ref to StoryStudio
- [ ] Fix HIGH-6: Add rate limiting to learn endpoints
- [ ] Fix HIGH-4: Speech recognition error handling
- [ ] Fix HIGH-5: Validate image prompts
- [ ] Run build verification
- [ ] Test all three modes manually

### Short-Term (Next Sprint)
- [ ] Extract shared voice recording hook (MEDIUM-4)
- [ ] Standardize error response format (MEDIUM-3)
- [ ] Add PropTypes (LOW-1)
- [ ] Improve accessibility with ARIA labels (MEDIUM-6)

### Long-Term (Technical Debt)
- [ ] Consider TypeScript migration
- [ ] Set up ESLint with React/accessibility rules
- [ ] Add E2E tests with Playwright
- [ ] Create shared theme constants file

---

## Estimated Time

- **CRITICAL fixes:** 1-2 hours
- **HIGH fixes:** 2-3 hours
- **MEDIUM fixes:** 4-6 hours
- **LOW fixes:** 2-3 hours

**Total for CRITICAL + HIGH:** ~4-5 hours

---

## Testing After Fixes

1. **Manual Testing:**
   - Complete a slideshow → Select each mode
   - Test voice recording in all 3 modes
   - Verify error handling (deny mic permission)
   - Test rate limiting (spam requests)

2. **Automated Testing:**
   - Run build: `npm run build`
   - Check console for warnings
   - Verify no console.error statements remain

3. **Security Testing:**
   - Test with malicious input in story mode
   - Verify sanitization works
   - Check rate limiting with rapid requests

---

## Notes

- All fixes preserve immutability patterns
- Error handling follows existing logger utility
- Rate limiting uses express-rate-limit (may need: `npm install express-rate-limit`)
- Browser cache issue (`classifyHandoffIfNeeded`) is client-side only - fixed with hard refresh
