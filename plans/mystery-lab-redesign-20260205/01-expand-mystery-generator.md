# Feature: Expand Mystery Generator Prompt

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description

Expand the Gemini prompt in mysteryGenerator.js to return additional fields needed for the immersive detective experience: multiple-choice options, fill-in-the-blank questions, evidence board connections, reveal narration, and narrator text for each clue. Add validation fallbacks for all new fields.

## Acceptance Criteria

- [ ] Prompt generates `theoryOptions` object with `options` array and `correctIndex`
- [ ] Prompt generates `fillBlanks` object with `sentence`, `blanks` array, and `wordBank` array
- [ ] Prompt generates `evidenceConnections` array mapping clue indices to concepts
- [ ] Prompt generates `revealNarration` string for solution reveal
- [ ] Each clue object includes `narratorText` field for TTS
- [ ] Validation adds fallback defaults for all new fields if missing
- [ ] Existing fields (mysteryTitle, setup, clues, etc.) continue to work
- [ ] No breaking changes to existing API contract

## Implementation Details

### Files to Modify

- `backend/src/services/mysteryGenerator.js` - Expand prompt and validation

### Key Changes

1. **Expand Gemini Prompt (lines 78-130)**:
   Add instructions for new fields in the JSON response:
   ```javascript
   const prompt = `
   Generate an educational mystery based on:
   Topic: ${topicName}
   Key Concepts: ${keyConceptsList}
   Explanation Level: ${explanationLevel}
   Slides: ${slidesSummary}

   Return JSON with:
   {
     mysteryTitle: "...",
     mysterySetup: "...",
     sceneImagePrompt: "...",
     clues: [
       {
         clueText: "...",
         slideRef: number,
         narratorText: "..." // NEW: TTS narration for this clue
       }
     ],
     expectedConcepts: [...],
     solutionExplanation: "...",

     // NEW FIELDS:
     theoryOptions: {
       options: ["Option A", "Option B", "Option C", "Option D"],
       correctIndex: 0
     },
     fillBlanks: {
       sentence: "The [BLANK1] causes [BLANK2] because [BLANK3].",
       blanks: ["word1", "word2", "word3"],
       wordBank: ["word1", "word2", "word3", "distractor1", "distractor2"]
     },
     evidenceConnections: [
       { clueIndex: 0, concept: "concept1" },
       { clueIndex: 1, concept: "concept2" }
     ],
     revealNarration: "..." // TTS narration for solution reveal
   }

   Guidelines:
   - narratorText: Conversational tone, detective narrator voice
   - theoryOptions: 4 plausible options, one correct
   - fillBlanks: 2-4 blanks, 2-3 distractors in word bank
   - evidenceConnections: Link each clue to main concept it reveals
   - revealNarration: Dramatic reveal in detective story style
   `;
   ```

2. **Update Validation (around line 170)**:
   Add fallback defaults for new fields:
   ```javascript
   const validatedMystery = {
     mysteryTitle: mystery.mysteryTitle || 'Mystery Case',
     mysterySetup: mystery.mysterySetup || '',
     sceneImagePrompt: mystery.sceneImagePrompt || '',
     clues: (mystery.clues || []).map((clue, idx) => ({
       clueText: clue.clueText || '',
       slideRef: clue.slideRef || null,
       narratorText: clue.narratorText || clue.clueText // Fallback to clueText
     })),
     expectedConcepts: mystery.expectedConcepts || [],
     solutionExplanation: mystery.solutionExplanation || '',

     // NEW: Add fallbacks for new fields
     theoryOptions: mystery.theoryOptions || {
       options: [
         mystery.solutionExplanation?.substring(0, 50) || 'Option A',
         'Option B',
         'Option C',
         'Option D'
       ],
       correctIndex: 0
     },
     fillBlanks: mystery.fillBlanks || {
       sentence: 'The answer is [BLANK].',
       blanks: ['answer'],
       wordBank: ['answer', 'wrong1', 'wrong2']
     },
     evidenceConnections: mystery.evidenceConnections ||
       mystery.clues?.map((clue, idx) => ({
         clueIndex: idx,
         concept: mystery.expectedConcepts?.[0] || 'concept'
       })) || [],
     revealNarration: mystery.revealNarration ||
       mystery.solutionExplanation ||
       'Case solved!'
   };
   ```

### Technical Decisions

- **Decision:** Add new fields alongside existing ones (non-breaking)
- **Rationale:** Allows gradual rollout, backward compatibility during development
- **Trade-off:** Slightly larger response payload, but enables multiple solve methods

- **Decision:** Narrator text defaults to clue text if not generated
- **Rationale:** Ensures TTS always has something to read
- **Trade-off:** Less polished narration in fallback case, but no breakage

- **Decision:** Comprehensive fallbacks in validation
- **Rationale:** Gemini may occasionally omit fields, fallbacks ensure robustness
- **Trade-off:** More validation code, but prevents runtime errors

## Dependencies

### Depends On
None - Foundation feature

### Blocks
- **Feature 13:** MysteryLab Rewrite (needs new data fields)

## Testing Requirements

### Backend Testing

- [ ] Test mystery generation with new prompt
- [ ] Verify `theoryOptions` has 4 options and correctIndex
- [ ] Verify `fillBlanks` has sentence, blanks, wordBank
- [ ] Verify `evidenceConnections` maps clues to concepts
- [ ] Verify `revealNarration` is present
- [ ] Verify each clue has `narratorText`
- [ ] Test validation fallbacks by mocking incomplete Gemini response
- [ ] Verify existing API consumers still work (backward compatibility)

### Manual Testing

```bash
# Test mystery generation
curl -X POST http://localhost:3000/api/learn/mystery/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "Photosynthesis",
    "keyConceptsList": "chlorophyll, sunlight, glucose",
    "explanationLevel": "grade-5",
    "slides": [
      {"imageUrl": "...", "audioUrl": "...", "subtitle": "Plants use sunlight"}
    ]
  }'

# Expected response includes new fields:
# - theoryOptions.options (4 items)
# - theoryOptions.correctIndex (0-3)
# - fillBlanks.sentence
# - fillBlanks.blanks
# - fillBlanks.wordBank
# - evidenceConnections (array)
# - revealNarration
# - clues[].narratorText
```

## Security Considerations

- [ ] Validate all user inputs (topicName, keyConceptsList, explanationLevel)
- [ ] Sanitize generated content before returning (no XSS in narratorText)
- [ ] Rate limit mystery generation endpoint (prevent API abuse)
- [ ] No sensitive data in logs (don't log full Gemini responses)

## Implementation Checklist

- [ ] Read existing mysteryGenerator.js to understand current structure
- [ ] Locate prompt template (lines 78-130)
- [ ] Add new field instructions to prompt
- [ ] Add narrator voice guidelines to prompt
- [ ] Locate validation section (around line 170)
- [ ] Add fallback for `theoryOptions`
- [ ] Add fallback for `fillBlanks`
- [ ] Add fallback for `evidenceConnections`
- [ ] Add fallback for `revealNarration`
- [ ] Add fallback for `narratorText` in each clue
- [ ] Test with real Gemini API
- [ ] Test with mocked incomplete responses
- [ ] Verify backward compatibility
- [ ] Update any JSDoc comments

## Verification

**API Check:**
1. Call mystery generation endpoint
2. Inspect response JSON
3. Verify all new fields present:
   - `theoryOptions` object with `options` (4 items) and `correctIndex`
   - `fillBlanks` object with `sentence`, `blanks`, `wordBank`
   - `evidenceConnections` array with clue mappings
   - `revealNarration` string
   - Each `clue` has `narratorText`
4. Verify existing fields unchanged:
   - `mysteryTitle`, `mysterySetup`, `sceneImagePrompt`
   - `clues` array with `clueText` and `slideRef`
   - `expectedConcepts`, `solutionExplanation`

**Fallback Check:**
```javascript
// Mock incomplete Gemini response
const incompleteMystery = {
  mysteryTitle: "Test Case",
  mysterySetup: "Setup text",
  clues: [{ clueText: "Clue 1" }]
  // Missing all new fields
};

// After validation, should have:
// - theoryOptions with default 4 options
// - fillBlanks with default sentence
// - evidenceConnections with default mapping
// - revealNarration with default text
// - clues[0].narratorText === clues[0].clueText
```

## Notes

**Narrator Voice Guidelines:**
- Conversational, detective-like tone
- "Let's examine this evidence..."
- "Notice how..."
- "This reveals something important..."
- Kid-friendly language (grade 3-5 reading level)

**MCQ Option Guidelines:**
- 4 options (A, B, C, D)
- One correct, three plausible distractors
- Mix of surface-level and deeper understanding options
- No "all of the above" or "none of the above"

**Fill-in-Blank Guidelines:**
- 2-4 blanks per sentence
- Word bank includes blanks + 2-3 distractors
- Blanks are key concepts from topic
- Sentence summarizes main insight

**Evidence Board Guidelines:**
- Each clue maps to one main concept
- Concept names match `expectedConcepts` array
- Helps kids see how evidence builds case

**Reveal Narration:**
- Dramatic but not over-the-top
- Restates the mystery solution
- Celebrates the detective work
- 2-3 sentences max

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Track:** A (Backend)
