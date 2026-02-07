# Feature: Discover Button API Contract Fix

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** -

## Description
Update the Discover button to call the existing `/api/generate/engagement` endpoint with the expected request body and normalize the suggested question into a topic name.

## Acceptance Criteria
- [ ] Discover no longer returns 400
- [ ] Suggestions trigger `onSelectSuggestedTopic`
- [ ] Works with empty/invalid responses (fails silently)

## Implementation Details

### Files to Modify
- `frontend/src/components/ProgressTab/ProgressTab.jsx` - request body + parsing

### Key Components
1. **handleDiscover**
   - Send `{ query }` body
   - Build query from topic names
   - Normalize suggestion to topic name

### Technical Decisions
- **Decision:** Keep existing endpoint and convert suggested question to topic title

## Testing Requirements
- [ ] Manual QA: Discover works, no 400

## Implementation Checklist
- [ ] Update request body
- [ ] Add suggestion normalization
- [ ] Verify behavior

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
