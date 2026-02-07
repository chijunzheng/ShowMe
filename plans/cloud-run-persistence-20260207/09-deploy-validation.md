# Feature: Cloud Run Deploy Validation

**ID:** 09
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** 04,05,06,08

## Description
Validate deployment script/env/IAM requirements for new storage paths.

## Acceptance Criteria
- [ ] `scripts/deploy.sh` includes needed env vars and secrets.
- [ ] Required IAM roles documented/validated.
- [ ] No localhost assumptions in production runtime.
