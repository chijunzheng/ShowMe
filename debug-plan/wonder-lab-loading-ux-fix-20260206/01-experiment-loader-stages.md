# Feature: ExperimentLoader Stages Checklist UI

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Add an optional `stages` prop to ExperimentLoader that renders a checklist of loading stages instead of the generic cycling messages. When stages are provided, auto-calculate progress % from them and show checkmarks/spinners per stage.

## Acceptance Criteria

- [ ] Accepts optional `stages` array: `[{ label: string, done: boolean }]`
- [ ] When `stages` provided: progress bar auto-calculates from done count
- [ ] Checklist renders: checkmark icon for done stages, mini-spinner for first not-done stage
- [ ] Current stage label shown as subtitle text
- [ ] When `stages` is null/undefined: existing behavior preserved (cycling messages, manual progress)
- [ ] Fun fact card still displays when provided

## Files to Modify

- `frontend/src/components/LearnModes/WhatIf/ExperimentLoader.jsx`

## Implementation Details

### Key Changes

1. Add `stages` prop (default null)
2. When stages provided:
   - Calculate progress: `Math.round((doneCount / stages.length) * 100)`
   - Replace cycling messages subtitle with checklist
   - Each stage: green checkmark if done, small spinner if first undone, gray circle if queued
   - Show "Creating scenario..." (current active stage) as the subtitle
3. When stages is null: keep existing `LOADING_MESSAGES` cycling + manual `progress` prop

## Notes

- Backward-compatible: Phase 2 loader and any other callers still work without stages
- Keep the same visual theme (blue/cyan gradient, beaker spinner)
