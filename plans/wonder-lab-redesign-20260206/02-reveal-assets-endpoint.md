# Feature: Add reveal-assets Endpoint + Update whatif Route

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 01

## Description

Add `POST /api/learn/whatif/reveal-assets` endpoint that generates images + TTS for each correct consequence in parallel. Update the existing `/api/learn/whatif` route to pass through the new response shape. Remove the `/api/learn/whatif/evaluate` endpoint.

## Acceptance Criteria

- [ ] New `/api/learn/whatif/reveal-assets` endpoint works
- [ ] Generates images + TTS in parallel via `Promise.all`
- [ ] Returns `{ scenarioAudioUrl, revealAssets: [{id, imageUrl, audioUrl}], bonusFactAudioUrl }`
- [ ] Graceful degradation: missing image/audio returns null, not error
- [ ] `/api/learn/whatif` route passes through new response shape (predictionCards, scenarioNarration, etc.)
- [ ] `/api/learn/whatif/evaluate` endpoint removed
- [ ] `evaluateWhatIfPrediction` import removed from learn.js
- [ ] Rate limiting applied to new endpoint

## Implementation Details

### Files to Modify

- `backend/src/routes/learn.js` - Add reveal-assets route, update whatif route, remove evaluate route + import

### New Endpoint: `POST /api/learn/whatif/reveal-assets`

**Request:**
```json
{
  "consequences": [
    { "id": "card-1", "revealNarration": "Without the moon's gravity...", "revealImagePrompt": "Calm flat ocean..." }
  ],
  "scenarioNarration": "Imagine you look up tonight...",
  "bonusFactNarration": "Here's something mind-blowing...",
  "topicName": "Space",
  "explanationLevel": "standard"
}
```

**Response:**
```json
{
  "scenarioAudioUrl": "data:audio/mp3;base64,...",
  "revealAssets": [
    { "id": "card-1", "imageUrl": "data:image/png;base64,...", "audioUrl": "data:audio/mp3;base64,..." }
  ],
  "bonusFactAudioUrl": "data:audio/mp3;base64,..."
}
```

### Implementation Pattern

Use `Promise.all` for parallel generation:
```javascript
const [scenarioAudio, ...consequenceResults, bonusAudio] = await Promise.all([
  generateTTS(scenarioNarration),
  ...consequences.map(c => Promise.all([
    generateEducationalImage({ imagePrompt: c.revealImagePrompt, topic: topicName, explanationLevel }),
    generateTTS(c.revealNarration)
  ])),
  generateTTS(bonusFactNarration)
])
```

### Graceful Degradation

Each asset generation is wrapped in try/catch - failure returns null for that asset, not a full error.

## Dependencies

### Depends On
- **Feature 01:** Needs new response schema from generateWhatIfScenario

### Blocks
- **Feature 05:** WonderLab needs this endpoint for reveal phase

## Testing Requirements

- [ ] Integration test: reveal-assets returns correct shape
- [ ] Integration test: partial failure returns nulls, not error
- [ ] Unit test: whatif route returns new shape (predictionCards, etc.)
- [ ] Unit test: evaluate endpoint no longer exists (404)
- [ ] Unit test: input validation on reveal-assets

## Implementation Checklist

- [ ] Add reveal-assets route handler
- [ ] Update whatif route response shape
- [ ] Remove evaluate route
- [ ] Remove evaluateWhatIfPrediction import
- [ ] Add input validation for reveal-assets
- [ ] Write tests
- [ ] Code review

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
