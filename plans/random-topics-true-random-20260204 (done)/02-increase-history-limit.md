# Feature: Increase Topic History Limit

**ID:** 02
**Status:** ✅ Completed
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Increase the localStorage topic history from 8 to 20 entries. This prevents repeats for longer sessions where users explore many topics.

## Acceptance Criteria

- [x] MAX_RECENT_TOPICS increased from 8 to 20
- [x] Backend slice limit updated from 8 to 20 (both gemini.js and randomTopic.js route)
- [x] localStorage correctly stores up to 20 topics
- [x] FIFO behavior maintained (oldest topics evicted first)

## Implementation Details

### Files to Modify

- `frontend/src/components/Home/RandomTopicModal.jsx` - Update MAX_RECENT_TOPICS constant
- `backend/src/services/gemini.js` - Update slice limit in generateRandomTopic

### Key Changes

1. **Frontend** (`RandomTopicModal.jsx` line 18):
```javascript
// Before
const MAX_RECENT_TOPICS = 8

// After
const MAX_RECENT_TOPICS = 20
```

2. **Backend** (`gemini.js` ~line 1603):
```javascript
// Before
.slice(0, 8)

// After
.slice(0, 20)
```

### Technical Decisions

- **20 vs higher**: 20 topics covers typical session length without excessive localStorage usage
- **FIFO maintained**: Oldest topics naturally evicted, no code change needed for eviction logic

## Dependencies

### Depends On
- None

### Blocks
- None (can be implemented independently)

## Testing Requirements

- [ ] Manual test: Generate 25+ topics, verify last 20 are stored
- [ ] Verify localStorage key `showme_random_topic_history` contains array of 20
- [ ] Verify oldest topics are correctly evicted

## Security Considerations

- [ ] No new security concerns - localStorage size increase is minimal

## Implementation Checklist

- [x] Update MAX_RECENT_TOPICS in RandomTopicModal.jsx
- [x] Update slice limit in gemini.js
- [x] Update slice limit in randomTopic.js route
- [x] Test localStorage storage
- [x] Verify exclude list passed correctly to backend

## Notes

- Simple change, low risk
- Consider future enhancement: configurable limit per user preference

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
