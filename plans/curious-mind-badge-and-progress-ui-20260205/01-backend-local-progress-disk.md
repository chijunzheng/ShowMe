# Feature: Persist Local User Progress to Disk

**ID:** 01  
**Status:** ⬜ Not Started  
**Priority:** High  
**Estimated Complexity:** Medium  
**Dependencies:** -

## Description
Persist the backend's local progress fallback (used when Firestore is unavailable in dev) to a JSON file, so badge unlocks like `CURIOUS_MIND` do not repeat after backend restarts.

## Acceptance Criteria
- [ ] In local-progress mode, `recordActivity(clientId, 'question_asked')` unlocks `CURIOUS_MIND` only once per client.
- [ ] Restarting the backend does not reset progress for the same `clientId` (progress loaded from disk).
- [ ] Disk persistence is disabled/unused in production Firestore mode.

## Implementation Details

### Files to Modify
- `backend/src/services/userProgress.js`
  - Load persisted local progress store from disk when `shouldUseLocalProgress()` is true.
  - Persist updated local progress to disk when local progress changes.
- `.gitignore`
  - Ignore `backend/.data/` (or at least `backend/.data/userProgress.json`).

### Data Format
- Store a JSON object keyed by `clientId` -> progress record.
- Serialize `Date` values as ISO strings.
  - `lastActiveDate`, `createdAt`, `updatedAt`, `badgeUnlockDates[badgeId]`.

### Environment Variables
- `SHOWME_LOCAL_PROGRESS_FILE` (new): optional override path for the persistence file.
  - Default: `backend/.data/userProgress.json`.

### Key Implementation Notes
- Ensure directory exists at runtime (`backend/.data/`).
- Debounce writes (e.g., 250-500ms) to prevent frequent activity bursts from spamming fs writes.
- Keep logic isolated to the local fallback path; Firestore path remains unchanged.

## Testing Requirements
- [ ] Unit test: badge unlock occurs only on first question.
- [ ] Unit test: persistence survives module reload / new service instance.

## Security Considerations
- [ ] Ensure file path is treated as trusted configuration; do not accept arbitrary path input from user requests.
- [ ] Ensure file content is parsed safely (catch JSON parse errors and fall back to empty store).

## Implementation Checklist
- [ ] Add file-backed local store load/save helpers.
- [ ] Wire helpers into local progress getters/setters.
- [ ] Add env var + default path.
- [ ] Update `.gitignore` to ignore `backend/.data/`.
- [ ] Add tests.

---

**Created:** 2026-02-05  
**Last Updated:** 2026-02-05  
**Implemented By:** TBD

