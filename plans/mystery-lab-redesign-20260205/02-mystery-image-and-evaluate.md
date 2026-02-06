# Feature: Mystery Image Endpoint + Expand Evaluate

**ID:** 02
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description

Add a new endpoint for generating manga-style mystery scene images. Expand the existing evaluate endpoint with fast-path logic for MCQ, fill-blank, and evidence board solve methods (falling through to Gemini for voice/text).

## Acceptance Criteria

- [ ] New endpoint `POST /api/learn/mystery/image` generates manga-style scene images
- [ ] Image endpoint accepts `imagePrompt`, `topicName`, `explanationLevel`
- [ ] Image endpoint calls `generateEducationalImage` with manga style parameter
- [ ] Evaluate endpoint fast-paths MCQ (compares selectedIndex to correctIndex)
- [ ] Evaluate endpoint fast-paths fill-blank (case-insensitive array comparison)
- [ ] Evaluate endpoint fast-paths evidence board (checks connection completeness)
- [ ] Evaluate endpoint falls through to Gemini for voice/text (existing behavior)
- [ ] All endpoints return consistent response format
- [ ] Error handling for invalid inputs and API failures

## Implementation Details

### Files to Modify

- `backend/src/routes/learn.js` - Add image endpoint, expand evaluate endpoint

### Key Changes

1. **Add Image Generation Endpoint**:
   ```javascript
   // After existing /api/learn/mystery/generate endpoint
   router.post('/mystery/image', async (req, res) => {
     try {
       const { imagePrompt, topicName, explanationLevel } = req.body;

       // Validate inputs
       if (!imagePrompt) {
         return res.status(400).json({
           success: false,
           error: 'imagePrompt is required'
         });
       }

       // Generate manga-style educational image
       const imageUrl = await generateEducationalImage({
         prompt: imagePrompt,
         topicName: topicName || 'Mystery',
         explanationLevel: explanationLevel || 'grade-5',
         style: 'manga' // NEW: Manga style for detective aesthetic
       });

       res.json({
         success: true,
         imageUrl
       });
     } catch (error) {
       console.error('Mystery image generation failed:', error);
       res.status(500).json({
         success: false,
         error: 'Failed to generate mystery scene image'
       });
     }
   });
   ```

2. **Expand Evaluate Endpoint**:
   ```javascript
   // Update existing /api/learn/mystery/evaluate endpoint
   router.post('/mystery/evaluate', async (req, res) => {
     try {
       const {
         mysteryData,
         userTheory,
         solveMethod, // NEW: 'mcq', 'fill-blank', 'evidence-board', 'voice-text'
         userAnswer   // NEW: Object with method-specific answer data
       } = req.body;

       // Validate inputs
       if (!mysteryData || !solveMethod) {
         return res.status(400).json({
           success: false,
           error: 'mysteryData and solveMethod are required'
         });
       }

       let evaluationResult;

       // Fast-path for MCQ
       if (solveMethod === 'mcq') {
         const selectedIndex = userAnswer?.selectedIndex;
         const correctIndex = mysteryData.theoryOptions?.correctIndex;

         if (selectedIndex === undefined || correctIndex === undefined) {
           return res.status(400).json({
             success: false,
             error: 'Invalid MCQ answer format'
           });
         }

         const isCorrect = selectedIndex === correctIndex;
         evaluationResult = {
           isCorrect,
           feedback: isCorrect
             ? 'Excellent detective work! You solved the case!'
             : `Not quite. The correct answer was option ${String.fromCharCode(65 + correctIndex)}.`,
           identifiedConcepts: isCorrect ? mysteryData.expectedConcepts : [],
           xpEarned: isCorrect ? 50 : 10
         };
       }
       // Fast-path for fill-in-the-blank
       else if (solveMethod === 'fill-blank') {
         const userBlanks = userAnswer?.blanks || [];
         const correctBlanks = mysteryData.fillBlanks?.blanks || [];

         // Case-insensitive comparison
         const isCorrect = userBlanks.length === correctBlanks.length &&
           userBlanks.every((blank, idx) =>
             blank.toLowerCase().trim() === correctBlanks[idx].toLowerCase().trim()
           );

         evaluationResult = {
           isCorrect,
           feedback: isCorrect
             ? 'Perfect! You filled in all the blanks correctly!'
             : 'Some blanks are incorrect. Review the clues and try again.',
           identifiedConcepts: isCorrect ? mysteryData.expectedConcepts : [],
           xpEarned: isCorrect ? 50 : 10
         };
       }
       // Fast-path for evidence board
       else if (solveMethod === 'evidence-board') {
         const userConnections = userAnswer?.connections || [];
         const expectedConnections = mysteryData.evidenceConnections || [];

         // Check if all expected connections are present
         const isCorrect = expectedConnections.every(expected =>
           userConnections.some(user =>
             user.clueIndex === expected.clueIndex &&
             user.concept.toLowerCase() === expected.concept.toLowerCase()
           )
         );

         evaluationResult = {
           isCorrect,
           feedback: isCorrect
             ? 'Brilliant! You connected all the evidence correctly!'
             : 'Some connections are missing or incorrect. Review the clues.',
           identifiedConcepts: isCorrect ? mysteryData.expectedConcepts : [],
           xpEarned: isCorrect ? 50 : 10
         };
       }
       // Fall through to Gemini for voice/text (existing behavior)
       else if (solveMethod === 'voice-text') {
         if (!userTheory) {
           return res.status(400).json({
             success: false,
             error: 'userTheory is required for voice-text method'
           });
         }

         // Use existing Gemini evaluation (unchanged)
         evaluationResult = await evaluateMysteryTheory({
           mysteryData,
           userTheory,
           explanationLevel: req.body.explanationLevel || 'grade-5'
         });
       }
       else {
         return res.status(400).json({
           success: false,
           error: `Unknown solve method: ${solveMethod}`
         });
       }

       res.json({
         success: true,
         evaluation: evaluationResult
       });
     } catch (error) {
       console.error('Mystery evaluation failed:', error);
       res.status(500).json({
         success: false,
         error: 'Failed to evaluate mystery theory'
       });
     }
   });
   ```

### Technical Decisions

- **Decision:** Manga style for scene images
- **Rationale:** Kid-friendly, dramatic aesthetic fits detective story theme
- **Trade-off:** Consistent visual style, but less photorealistic

- **Decision:** Fast-path evaluation for structured methods (MCQ, fill-blank, evidence)
- **Rationale:** Instant feedback, no API latency, deterministic results
- **Trade-off:** Less flexible than Gemini, but much faster and cheaper

- **Decision:** Fall through to Gemini for voice/text
- **Rationale:** Open-ended answers require LLM judgment
- **Trade-off:** Slower than fast-path, but maintains quality evaluation

## Dependencies

### Depends On
None - Foundation feature

### Blocks
- **Feature 13:** MysteryLab Rewrite (needs image and evaluate endpoints)

## Testing Requirements

### Backend Testing

- [ ] Test image endpoint with valid imagePrompt
- [ ] Test image endpoint with missing imagePrompt (400 error)
- [ ] Verify generated image URL is valid
- [ ] Test evaluate with MCQ (correct answer)
- [ ] Test evaluate with MCQ (incorrect answer)
- [ ] Test evaluate with fill-blank (correct)
- [ ] Test evaluate with fill-blank (incorrect, case differences)
- [ ] Test evaluate with evidence board (correct connections)
- [ ] Test evaluate with evidence board (missing connections)
- [ ] Test evaluate with voice-text (falls through to Gemini)
- [ ] Test evaluate with invalid solveMethod (400 error)
- [ ] Verify XP calculation for all methods

### Manual Testing

```bash
# Test image generation
curl -X POST http://localhost:3000/api/learn/mystery/image \
  -H "Content-Type: application/json" \
  -d '{
    "imagePrompt": "A detective examining a plant under a magnifying glass, manga style",
    "topicName": "Photosynthesis",
    "explanationLevel": "grade-5"
  }'

# Test MCQ evaluation (correct)
curl -X POST http://localhost:3000/api/learn/mystery/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "mysteryData": {
      "theoryOptions": {
        "options": ["A", "B", "C", "D"],
        "correctIndex": 2
      },
      "expectedConcepts": ["photosynthesis"]
    },
    "solveMethod": "mcq",
    "userAnswer": {
      "selectedIndex": 2
    }
  }'

# Test fill-blank evaluation (correct, case-insensitive)
curl -X POST http://localhost:3000/api/learn/mystery/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "mysteryData": {
      "fillBlanks": {
        "blanks": ["chlorophyll", "sunlight", "glucose"]
      },
      "expectedConcepts": ["photosynthesis"]
    },
    "solveMethod": "fill-blank",
    "userAnswer": {
      "blanks": ["Chlorophyll", "Sunlight", "Glucose"]
    }
  }'

# Test evidence board evaluation
curl -X POST http://localhost:3000/api/learn/mystery/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "mysteryData": {
      "evidenceConnections": [
        { "clueIndex": 0, "concept": "chlorophyll" },
        { "clueIndex": 1, "concept": "sunlight" }
      ],
      "expectedConcepts": ["photosynthesis"]
    },
    "solveMethod": "evidence-board",
    "userAnswer": {
      "connections": [
        { "clueIndex": 0, "concept": "chlorophyll" },
        { "clueIndex": 1, "concept": "sunlight" }
      ]
    }
  }'
```

## Security Considerations

- [ ] Validate all user inputs (imagePrompt, solveMethod, userAnswer)
- [ ] Sanitize imagePrompt to prevent injection attacks
- [ ] Rate limit image generation endpoint (expensive operation)
- [ ] Rate limit evaluate endpoint (prevent spam)
- [ ] Validate userAnswer structure for each solve method
- [ ] No sensitive data in error messages
- [ ] Log suspicious patterns (e.g., rapid-fire evaluations)

## Implementation Checklist

- [ ] Read existing learn.js routes to understand structure
- [ ] Add image generation endpoint after existing mystery endpoints
- [ ] Import generateEducationalImage utility
- [ ] Add input validation for image endpoint
- [ ] Add error handling for image endpoint
- [ ] Test image endpoint with curl
- [ ] Locate existing evaluate endpoint
- [ ] Add solveMethod and userAnswer to request body
- [ ] Implement MCQ fast-path logic
- [ ] Implement fill-blank fast-path logic
- [ ] Implement evidence board fast-path logic
- [ ] Preserve voice-text Gemini fallthrough
- [ ] Add input validation for all solve methods
- [ ] Add error handling for unknown solve methods
- [ ] Test all solve methods with curl
- [ ] Verify XP calculation consistency
- [ ] Update API documentation (if exists)

## Verification

**Image Endpoint Check:**
1. Call `/api/learn/mystery/image` with valid prompt
2. Verify response contains `imageUrl` field
3. Open image URL in browser
4. Verify image is manga-style and relevant to prompt

**MCQ Evaluation Check:**
1. Call evaluate with MCQ correct answer
2. Verify `isCorrect: true`, `xpEarned: 50`
3. Call evaluate with MCQ incorrect answer
4. Verify `isCorrect: false`, `xpEarned: 10`

**Fill-Blank Evaluation Check:**
1. Call evaluate with exact match (correct case)
2. Verify `isCorrect: true`
3. Call evaluate with different case (e.g., "WORD" vs "word")
4. Verify `isCorrect: true` (case-insensitive)
5. Call evaluate with wrong words
6. Verify `isCorrect: false`

**Evidence Board Evaluation Check:**
1. Call evaluate with all correct connections
2. Verify `isCorrect: true`
3. Call evaluate with missing connections
4. Verify `isCorrect: false`
5. Call evaluate with extra incorrect connections
6. Verify `isCorrect: false`

**Voice-Text Fallthrough Check:**
1. Call evaluate with `solveMethod: 'voice-text'` and `userTheory`
2. Verify Gemini evaluation runs (existing behavior)
3. Verify response format matches fast-path format

## Notes

**Manga Style Image Guidelines:**
- High contrast, bold outlines
- Expressive character faces
- Dynamic action poses (detective examining evidence)
- Kid-friendly, not too dark or scary
- Educational focus (show concepts visually)

**XP Award Consistency:**
- Correct answer: 50 XP (all methods)
- Incorrect answer: 10 XP (participation reward)
- Matches existing XP economy

**Fast-Path Benefits:**
- Instant feedback (no API latency)
- Deterministic (no LLM variance)
- Cheaper (no Gemini API call)
- More reliable (no API failures)

**When to Use Each Method:**
- MCQ: Fastest, lowest friction, default
- Fill-blank: Good for vocabulary retention
- Evidence board: Shows understanding of relationships
- Voice-text: Most flexible, requires explanation skills

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Track:** A (Backend)
