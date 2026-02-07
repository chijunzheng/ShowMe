# Feature: Regression Tests for Category Connectivity

**ID:** 03
**Status:** ✅ Completed
**Priority:** High
**Dependencies:** 01,02

## Goal
Lock in deterministic category cluster derivation and inferred connectivity rendering behavior.

## Acceptance Criteria
- [x] Utility tests cover grouping, determinism, connected/no-op, disconnected/minimal connectors, and `general` exclusions.
- [x] Constellation tests cover inferred link rendering, non-interactivity, and category-derived grouping behavior.
- [x] Existing real-edge rendering behavior remains covered.

## Files
- `frontend/src/components/Constellation/__tests__/constellationCategoryGraph.test.js`
- `frontend/src/components/Constellation/__tests__/Constellation.test.jsx`
