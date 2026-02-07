# Feature: Mode Session Persistence Service + Routes

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 02,03

## Description
Persist completed Mystery/Wonder/Story mode sessions keyed by client/topic/version/mode.

## Acceptance Criteria
- [ ] New service stores completed session snapshots.
- [ ] Data URL images are stored in GCS and returned as signed URLs.
- [ ] Routes exist:
  - [ ] `POST /api/modes/save`
  - [ ] `POST /api/modes/latest`
  - [ ] `POST /api/modes/list`
