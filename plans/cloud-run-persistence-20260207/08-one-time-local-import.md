# Feature: One-Time Local Import

**ID:** 08
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 04,05,06,07

## Description
Add a one-time import path that uploads existing local topics/slides/graph/stories into cloud storage with idempotency.

## Acceptance Criteria
- [ ] Backend route `POST /api/migration/import-local` implemented.
- [ ] Import guard by checksum + migration version.
- [ ] Frontend bootstrap triggers import once per client.
- [ ] Re-running import does not duplicate persisted data.
