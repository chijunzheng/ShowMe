# Feature: Multi-Category Gap Suggestions + Fast Model

**ID:** 09
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 06

## Description
Return multiple gap suggestions across multiple categories and switch to gemini-2.5-flash-lite for faster responses. Enforce minimum count and category diversity on retry, and tighten prompt/output formatting so JSON parsing succeeds reliably.

## Acceptance Criteria
- [x] Discover returns 6 suggestions when possible
- [x] Suggestions span at least 2 categories and reference existing topics for `connectsTo`
- [x] identifyKnowledgeGaps uses gemini-2.5-flash-lite for initial and retry
- [x] Retry triggers when count or category diversity is insufficient
- [x] Prompt enforces short reasoning/hooks to avoid truncation

## Implementation Details

### Files to Modify
- `backend/src/services/geminiGraph.js` - prompt, model selection, retry conditions, name normalization

## Testing Requirements
- [ ] Manual: Discover returns multiple suggestions across categories

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** Codex
