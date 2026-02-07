# Feature: Fix Engagement API + Fun Fact Fetching

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** 03

## Description

Fun facts aren't coming from Gemini because: (1) engagement API body uses wrong field name `topicName` instead of `query`, and (2) no fun fact fetch during chapter loading screens. Fix the API body and add fetching during ILLUSTRATING states.

## Acceptance Criteria

- [ ] Engagement API body uses `{ query: topicName }` instead of `{ topicName }`
- [ ] New `UPDATE_FUN_FACT` reducer action exists
- [ ] Fun fact fetched during ILLUSTRATING useEffect (fire-and-forget)
- [ ] Fun fact objects track `source: "api"`
- [ ] StoryLoader receives `factSource` prop based on fun fact source

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryStudio.jsx`

### 3A. Fix engagement API body (line ~278)
- Change `{ topicName, explanationLevel }` → `{ query: topicName, explanationLevel }`

### 3C. Add UPDATE_FUN_FACT reducer action
- New action type in reducer: `UPDATE_FUN_FACT`
- Sets `state.funFact` to action payload

### 3D. Add fun fact fetch in ILLUSTRATING useEffect (~lines 396-498)
- Fire-and-forget fetch to `/api/generate/engagement` with `{ query: topicName }`
- On success: `dispatch({ type: 'UPDATE_FUN_FACT', payload: { ...data, source: 'api' } })`

### 3G. Update StoryLoader factSource prop
- Pass `factSource={state.funFact?.source === "api" ? "api" : "local"}` in all StoryLoader renders

## Testing Requirements

- [ ] Engagement API called with `query` field
- [ ] Fun fact updated during ILLUSTRATING states
- [ ] StoryLoader shows correct factSource

---

**Created:** 2026-02-06
