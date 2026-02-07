# Plan: Make "Surprise Me" Topics Truly Random

## Problem Analysis

The "Surprise Me" feature generates topics using Gemini AI, but topics repeat frequently because:

1. **Limited Category Pool**: The prompt only specifies 7 categories: science, nature, technology, history, animals, space, human body

2. **LLM Bias**: Without stronger constraints, Gemini gravitates toward "popular" educational questions from training data (e.g., "How do plants make food?" is a textbook classic)

3. **Weak Seeding**: The `seed` variable (`Date.now()_random`) is just appended to the prompt text - it doesn't actually control Gemini's sampling behavior

4. **Exclude List Limited to 8**: Users who explore many topics will see repeats after the 9th topic

## Root Cause

The current prompt gives Gemini too much freedom:
```
"Mix of categories: science, nature, technology, history, animals, space, human body"
```

With only soft guidance, the model defaults to common/popular questions.

## Solution: Constrained Random Selection

Force variety by **randomly selecting constraints** before calling Gemini:

1. **Expand categories** to 30+ options
2. **Pick random category** each request (not "mix of")
3. **Add random sub-constraint** for specificity
4. **Increase exclude list** from 8 to 20 topics

## Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/gemini.js` | Add category pool, random selection logic |
| `frontend/src/components/Home/RandomTopicModal.jsx` | Increase MAX_RECENT_TOPICS to 20 |

## Verification

1. Open app, click "Surprise Me" 10+ times in a row
2. Verify topics span different categories
3. Verify no exact repeats within session
4. Clear localStorage, repeat test
