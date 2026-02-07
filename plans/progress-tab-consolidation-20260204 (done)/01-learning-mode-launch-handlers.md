# Feature: Learning Mode Launch Handlers

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Add handler functions to App.jsx that allow launching learning modes (Mystery Lab, Wonder Lab, Story Studio) for any previously-learned topic, without requiring slideshow completion first. This is the foundation that all other features depend on.

## Acceptance Criteria

- [ ] Can launch Mystery Lab for any topic with stored slides
- [ ] Can launch Wonder Lab for any topic with stored slides
- [ ] Can launch Story Studio for any topic with stored slides
- [ ] Handler receives topic data (name, slides, level) and mode type
- [ ] UI state transitions correctly to LEARN_MODE
- [ ] Handles edge case: topic without stored slides (show error)

## Implementation Details

### Files to Modify

- `frontend/src/App.jsx` - Add new handler function

### Key Functions to Add

```javascript
/**
 * Launch a learning mode for a specific topic
 * @param {string} topicName - Name of the topic
 * @param {string} mode - 'mystery' | 'whatif' | 'story'
 * @param {object} topicData - { slides, level } from stored topic
 */
const handleLaunchLearningMode = (topicName, mode, topicData) => {
  // 1. Validate topicData has required fields
  // 2. Set selectedTopic state
  // 3. Set selectedLearningMode state
  // 4. Transition to UI_STATE.LEARN_MODE
}
```

### Integration Points

- Reuse existing `handleModeSelect` logic for mode selection
- Reuse existing `handleLearningModeComplete` for completion flow
- Access stored topics from `worldState.pieces` or similar

### Technical Decisions

- **Reuse existing mode components**: MysteryLab, WonderLab, StoryStudio already exist
- **Data source**: Topics stored in world state have slides array
- **Error handling**: If topic lacks slides, show toast error and abort

## Dependencies

### Depends On
- None (foundation feature)

### Blocks
- **Feature 02:** Topic Action Sheet needs this handler
- **Feature 03:** Quick Practice needs this handler

## Testing Requirements

- [ ] Unit test: Handler sets correct state
- [ ] Unit test: Handler validates input
- [ ] Integration test: Mode launches with correct topic context
- [ ] Edge case: Topic without slides shows error

## Security Considerations

- [ ] Validate topicName is sanitized (prevent XSS in mode components)
- [ ] Ensure slides data is from trusted source (session state)

## Implementation Checklist

- [ ] Read existing mode launch logic in App.jsx
- [ ] Add `handleLaunchLearningMode` function
- [ ] Add `handleQuickPractice` convenience wrapper
- [ ] Test with existing topic data
- [ ] Verify mode completion still works correctly

## Code Reference

Existing mode launch logic in App.jsx around line 1726:
```javascript
const handleModeSelect = (mode) => {
  setSelectedLearningMode(mode)
  setUiState(UI_STATE.LEARN_MODE)
}
```

Current topic data structure (from worldState):
```javascript
pieces: [
  {
    topicName: "Caterpillar Butterfly",
    slides: [...],
    level: "standard",
    unlockedAt: Date,
    lastReviewedAt: Date
  }
]
```

## Notes

This feature is intentionally minimal - it only adds the handler. UI integration comes in Features 02-03.

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** TBD
