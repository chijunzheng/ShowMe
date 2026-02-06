# Feature: Cleanup Old Components

**ID:** 06
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** 05

## Description

Delete the old components that are no longer used after the redesign: ThinkPrompts.jsx, PredictionRecorder.jsx, WhatIfScene.jsx. Verify no remaining imports reference them.

## Acceptance Criteria

- [ ] `ThinkPrompts.jsx` deleted
- [ ] `PredictionRecorder.jsx` deleted
- [ ] `WhatIfScene.jsx` deleted
- [ ] No remaining imports reference deleted files
- [ ] Old `ConsequenceReveal.jsx` overwritten by new version (Feature 05)
- [ ] Build passes with no import errors

## Implementation Details

### Files to Delete

- `frontend/src/components/LearnModes/WhatIf/ThinkPrompts.jsx`
- `frontend/src/components/LearnModes/WhatIf/PredictionRecorder.jsx`
- `frontend/src/components/LearnModes/WhatIf/WhatIfScene.jsx`

### Verification

- Grep codebase for imports of deleted files
- Run build to verify no broken imports

## Dependencies

### Depends On
- **Feature 05:** WonderLab must be rewritten before deleting old components

### Blocks
- None

## Testing Requirements

- [ ] Build passes
- [ ] No grep hits for deleted component names in imports

## Implementation Checklist

- [ ] Delete ThinkPrompts.jsx
- [ ] Delete PredictionRecorder.jsx
- [ ] Delete WhatIfScene.jsx
- [ ] Grep for stale imports
- [ ] Verify build
- [ ] Code review

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
