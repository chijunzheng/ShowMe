# Feature: Story Cloud-First Storage Upgrade

**ID:** 06
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 02,03

## Description
Upgrade story storage implementation to scalable per-story Firestore documents with GCS-backed scene images while keeping `/api/stories` contract.

## Acceptance Criteria
- [ ] `storyStorage` moves away from single giant document arrays.
- [ ] Story scene images are stored as GCS object paths.
- [ ] Story load returns hydrated signed URLs for display.
