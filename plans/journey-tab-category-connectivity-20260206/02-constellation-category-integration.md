# Feature: Constellation Category-Driven Integration

**ID:** 02
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** 01

## Goal
Make layout grouping and edge grouping category-driven, and render inferred same-category links as non-interactive visual scaffolding.

## Acceptance Criteria
- [x] `Constellation` uses derived `visualClusters` for layout and edge grouping.
- [x] Inferred category edges render before real edges, dashed and subtle, non-interactive.
- [x] Real edges remain interactive and unchanged.
- [x] Legend remains category-derived and consistent.

## Files
- `frontend/src/components/Constellation/Constellation.jsx`
