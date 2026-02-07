# Feature: Mystery error mapping UX alignment

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** 01

## Description

Map backend mystery errors/statuses to user-friendly messages consistent with Story Studio and Wonder Lab.

## Acceptance Criteria

- [x] `503` / `API_NOT_AVAILABLE` shows AI unavailable message.
- [x] `429` / `RATE_LIMITED` shows throttling message.
- [x] `413` shows payload-too-large message.
- [x] Parse/invalid response paths show retryable generation message.

## Implementation Details

### Files to Create/Modify

- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` - error normalization

### Technical Decisions

- **Decision:** Normalize errors at fetch boundary in MysteryLab.
- **Trade-off:** Keeps UI simple and behavior consistent across modes.

## Dependencies

### Depends On
- **Feature 01:** Error handling wraps the refactored load path.

### Blocks
- **Feature 05:** Tests assert message mapping.

## Testing Requirements

- [x] Component test for 503 message.
- [x] Component test for 429/413 fallback branches (minimum one representative assertion).

## Implementation Checklist

- [x] Add status+errorCode mapping helper
- [x] Use mapped message in error dispatch

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
**Implemented By:** Codex
