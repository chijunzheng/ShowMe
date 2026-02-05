# Mystery Lab Integration Test

## Test Checklist

### Backend Tests
- [ ] POST /api/learn/mystery returns valid mystery data
- [ ] POST /api/learn/mystery/evaluate correctly evaluates theories
- [ ] Mystery generation includes all required fields
- [ ] Concept matching works with fuzzy logic
- [ ] XP awards are correct (50/15/5)

### Frontend Component Tests
- [ ] MysteryLab loads and displays mystery scene
- [ ] CluePanel shows clues with slide references
- [ ] TheorySolver records voice and transcribes
- [ ] TheorySolver supports typing mode
- [ ] DetectiveReward shows celebration animation
- [ ] All state transitions work correctly

### Integration Tests
- [ ] Mode selector shows Mystery Lab option
- [ ] Clicking Mystery Lab loads the mystery
- [ ] Voice recording and transcription work
- [ ] Theory evaluation returns correct result
- [ ] Retry flow works for partial answers
- [ ] View solution flow works
- [ ] XP is awarded correctly
- [ ] Exit returns to home screen

## Manual Testing Steps

1. **Start the app**
   ```bash
   cd /Users/jasonchi/ShowMe/backend && npm run dev &
   cd /Users/jasonchi/ShowMe/frontend && npm run dev
   ```

2. **Generate a slideshow**
   - Ask a question via voice or text
   - Wait for slideshow to complete

3. **Select Mystery Lab**
   - Click "Mystery Lab" card in mode selector
   - Verify mystery loads

4. **Test voice recording**
   - Click microphone button
   - Speak a theory
   - Verify transcription appears
   - Click "Submit Theory"

5. **Test evaluation**
   - Check that result appears (solved/partial/retry)
   - Verify XP is shown
   - Test retry button if applicable

6. **Test completion**
   - Verify celebration appears on success
   - Click "Continue" button
   - Verify return to home screen

## API Test with curl

### Generate Mystery
```bash
curl -X POST http://localhost:3002/api/learn/mystery \
  -H "Content-Type: application/json" \
  -d '{
    "slides": [
      {"subtitle": "Plants need sunlight to make food", "script": "Photosynthesis uses sunlight"},
      {"subtitle": "Plants need carbon dioxide", "script": "CO2 enters through leaves"}
    ],
    "topicName": "Photosynthesis",
    "explanationLevel": "standard"
  }'
```

### Evaluate Theory
```bash
curl -X POST http://localhost:3002/api/learn/mystery/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "userTheory": "The plants are dying because they need carbon dioxide and the greenhouse is sealed",
    "expectedConcepts": ["carbon dioxide", "sealed environment", "photosynthesis"]
  }'
```

## Expected Responses

### Mystery Generation Response
```json
{
  "mysteryTitle": "The Case of the Dying Plants",
  "mysterySetup": "A greenhouse full of plants is dying even though they get plenty of sunlight...",
  "imagePrompt": "greenhouse with wilting plants, sunny day",
  "clues": [
    {"text": "The greenhouse windows are sealed shut", "slideRef": 1},
    {"text": "The plants look green but weak", "slideRef": 2}
  ],
  "expectedConcepts": ["carbon dioxide", "photosynthesis", "sealed environment"],
  "solutionExplanation": "Plants need CO2 for photosynthesis..."
}
```

### Theory Evaluation Response
```json
{
  "result": "solved",
  "matchedConcepts": ["carbon dioxide", "sealed environment"],
  "xpEarned": 50,
  "hint": null
}
```

## Known Issues

None currently. The `classifyHandoffIfNeeded` error mentioned was not found in the current codebase.
If it occurs at runtime, it may be from:
1. Browser cache - clear cache and hard reload
2. Stale build - run `npm run build` again
3. Missing import - check console for actual error

## Success Criteria

✅ Build completes without errors
✅ Backend mystery routes are registered
✅ Frontend components render without errors
✅ Mystery generation works via API
✅ Theory evaluation works via API
✅ Voice recording and transcription work
✅ All state transitions function correctly
✅ XP rewards are displayed
✅ Celebrations animate properly
