# Feature: Suggested Topic Sheet + Constellation Readability

**ID:** 07
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 05

## Description
Improve constellation readability and suggested-topic UX by showing only the topic name in-map, opening a bottom sheet with details and difficulty selection on tap, and adding higher-contrast label styling.

## Acceptance Criteria
- [ ] Suggested star shows topic name only (no curiosity hook on-map)
- [ ] Clicking a suggested star opens a bottom sheet with:
  - topic title
  - curiosity hook
  - connected topics
  - difficulty dropdown (simple/standard/deep)
  - primary CTA to start learning
- [ ] Choosing difficulty applies to generation request
- [ ] Constellation labels are more readable on dark background

## Implementation Details

### Files to Create/Modify
- `frontend/src/components/ProgressTab/SuggestedTopicSheet.jsx` - new sheet component
- `frontend/src/components/ProgressTab/ProgressTab.jsx` - open sheet on gap click
- `frontend/src/App.jsx` - pass selectedLevel/setSelectedLevel + wire generation with level
- `frontend/src/components/Constellation/ConstellationStar.jsx` - label pill styling
- `frontend/src/components/Constellation/ConstellationGap.jsx` - show only topic name in-map
- `frontend/src/components/Constellation/Constellation.jsx` - higher-contrast gap edges
- `frontend/src/components/Constellation/__tests__/Constellation.test.jsx` - adjust tests (if needed)

## Testing Requirements
- [ ] Manual: suggested star opens sheet and starts generation at chosen difficulty
- [ ] Visual: labels readable and gap styling visible

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
