# Feature: Rewrite generateWhatIfScenario + Remove evaluateWhatIfPrediction

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Rewrite the `generateWhatIfScenario()` function in `gemini.js` to return prediction cards with correct/incorrect flags instead of open-ended consequences. Remove the `evaluateWhatIfPrediction()` function since evaluation is now deterministic.

## Acceptance Criteria

- [ ] New prompt generates exactly 4 prediction cards (2 correct, 2 wrong)
- [ ] Correct cards include `revealNarration` and `revealImagePrompt`
- [ ] Wrong cards have only `id`, `text`, `isCorrect: false`
- [ ] Response includes `scenarioNarration` and `bonusFactNarration` for TTS
- [ ] Response includes `scenarioImagePrompt` for hero image
- [ ] `maxOutputTokens` increased to 1200
- [ ] Parsing validates 4 cards with exactly 2 correct
- [ ] `evaluateWhatIfPrediction()` removed from gemini.js
- [ ] Export removed from gemini.js exports
- [ ] Chinese language support maintained

## Implementation Details

### Files to Modify

- `backend/src/services/gemini.js` - Rewrite `generateWhatIfScenario()` (lines 3060-3185), remove `evaluateWhatIfPrediction()` (lines 3441-3554)

### New Response Schema

```json
{
  "scenario": "What if the moon disappeared tonight?",
  "scenarioImagePrompt": "Earth's night sky without a moon...",
  "scenarioNarration": "Imagine you look up tonight... the moon is gone!",
  "predictionCards": [
    { "id": "card-1", "text": "Ocean tides would shrink", "isCorrect": true, "revealNarration": "Without the moon's gravity...", "revealImagePrompt": "Calm flat ocean..." },
    { "id": "card-2", "text": "Days would get shorter", "isCorrect": false },
    { "id": "card-3", "text": "Earth's axis would wobble", "isCorrect": true, "revealNarration": "The moon stabilizes...", "revealImagePrompt": "Earth wobbling..." },
    { "id": "card-4", "text": "All plants would die", "isCorrect": false }
  ],
  "bonusFact": "The moon drifts away at 3.8cm/year!",
  "bonusFactNarration": "Here's something mind-blowing..."
}
```

### Validation Rules

- Exactly 4 cards
- Exactly 2 with `isCorrect: true`
- Correct cards must have non-empty `revealNarration` and `revealImagePrompt`
- If validation fails, attempt to fix (e.g., if 3 correct, flip one to false)
- Fallback: return `INVALID_RESPONSE` error

### Key Changes to Prompt

- Replace `thinkAboutHints` + `expectedConsequences` with `predictionCards`
- Add `scenarioNarration` (dramatic TTS text) and `bonusFactNarration`
- Rename `imagePrompt` to `scenarioImagePrompt`
- Instruct model: "Generate exactly 4 prediction cards. Exactly 2 should be correct."

## Dependencies

### Depends On
- None

### Blocks
- **Feature 02:** Route handler needs new response shape

## Testing Requirements

- [ ] Unit test: response has exactly 4 cards with 2 correct
- [ ] Unit test: correct cards have revealNarration + revealImagePrompt
- [ ] Unit test: scenarioNarration and bonusFactNarration are non-empty strings
- [ ] Unit test: Chinese language variant
- [ ] Unit test: evaluateWhatIfPrediction is no longer exported

## Implementation Checklist

- [ ] Rewrite prompt in `generateWhatIfScenario()`
- [ ] Update parsing/validation logic
- [ ] Increase maxOutputTokens to 1200
- [ ] Remove `evaluateWhatIfPrediction()` function
- [ ] Remove from exports
- [ ] Write/update tests
- [ ] Code review

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
