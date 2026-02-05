# Implementation Plan: Fix Story Mode Toast + Stuck Loading

**Created:** 2026-02-05  
**Status:** Completed  
**Total Features:** 5  
**Completed:** 5/5

## Progress Summary

| ID | Feature | Status | Dependencies | Priority |
|----|---------|--------|--------------|----------|
| 01 | Frontend: Remove Story "coming soon" toast | ✅ Completed | - | High |
| 02 | Frontend: StoryStudio loading escape + timeout | ✅ Completed | 01 | High |
| 03 | Tests: StoryStudio loading/timeout regression | ✅ Completed | 02 | Medium |
| 04 | Frontend: Fix StrictMode mounted-guard bug | ✅ Completed | 02 | High |
| 05 | Tests: StoryStudio StrictMode regression | ✅ Completed | 03, 04 | Medium |

## Dependency Graph

```mermaid
graph TD
  F01[01 Remove "coming soon" toast] --> F02[02 Loading escape + timeout]
  F02 --> F03[03 StoryStudio tests]
  F02 --> F04[04 StrictMode mounted-guard fix]
  F04 --> F05[05 StrictMode regression tests]
  F03 --> F05
```

## Status Legend

- ⬜ **Not Started**
- 🔄 **In Progress**
- ✅ **Completed**
- ⏸️ **Blocked**
- ⚠️ **Issues**

## Notes / Decisions

- Story mode is implemented (backend route exists + StoryStudio renders) but the UI still shows a placeholder toast (“story mode coming soon”), which is confusing.
- StoryStudio’s initial loading state has no way to exit and no timeout, so if the backend request hangs the user is trapped on the spinner.
- Timeout will abort the request and transition to an error screen with **Try Again** and **Go Back**.
- React 18 StrictMode (dev) runs effects twice (effect → cleanup → effect). StoryStudio’s `isMountedRef` was set to `false` in cleanup and never reset to `true`, so **success/timeout state updates were skipped**, trapping the UI on the loading spinner even when the network request succeeded.
- Sandbox limitation: cannot reliably run local servers that bind ports; rely on unit tests + static review for verification here.
