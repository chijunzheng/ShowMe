# Feature: Gap JSON Parse Retry + Discover Empty Toast

**ID:** 06
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** -

## Description
Improve gap JSON parsing by adding newline normalization + missing-comma repair and a single retry with stricter prompt when parsing fails. Ensure Discover can surface a brief inline toast when no gap suggestions are returned.

## Acceptance Criteria
- [x] Gap discovery retries once on JSON parse failure
- [x] Repair logic handles unescaped newlines + missing commas in JSON
- [x] Discover shows a brief inline toast when no suggestions are returned

## Implementation Details

### Files to Modify
- `backend/src/services/geminiGraph.js` - hardened JSON parsing + retry
- `backend/src/utils/json.js` - add helper for truncation (if needed)
- `frontend/src/components/ProgressTab/ProgressTab.jsx` - discover toast
- `frontend/src/components/Constellation/DiscoverButton.jsx` - toast positioning (if needed)

### Key Components
1. **safeParseJSON**
   - Multi-pass extraction + repair
   - Newline normalization + missing comma heuristic
2. **identifyKnowledgeGaps**
   - Retry with stricter JSON-only prompt on parse failure
3. **Discover toast**
   - Small inline message near Discover button

## Testing Requirements
- [x] Manual: malformed JSON triggers retry
- [x] Manual: discover with empty gaps shows toast

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
