# Feature: Update StoryPlayback for Chapter Dividers

**ID:** 10
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** None
**Track:** D (Playback Update)

## Description

Update `StoryPlayback.jsx` to support optional chapter title dividers above each scene. When scenes include a `chapterTitle` field, display it as a header above the scene image.

## Acceptance Criteria

- [ ] Accepts optional `chapterTitle` field on scene objects
- [ ] When `chapterTitle` present, shows it above the scene image
- [ ] Chapter title styled as a header (e.g., "Chapter 1: The Beginning")
- [ ] Backward compatible - works fine without chapterTitle field
- [ ] Progress dots still work correctly

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Story/StoryPlayback.jsx`

### Key Changes

1. Add chapter title display above scene image when present:
   ```jsx
   {currentScene?.chapterTitle && (
     <div className="text-center mb-3">
       <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
         {currentScene.chapterTitle}
       </h2>
     </div>
   )}
   ```

2. Add chapter title to scene text area or as a divider

### Technical Decisions

- Purely additive change - no breaking changes
- chapterTitle is optional, component works without it
- Simple conditional rendering

## Testing Requirements

- [ ] Renders without chapterTitle (backward compatible)
- [ ] Renders chapterTitle when present
- [ ] Navigation still works correctly

## Implementation Checklist

- [ ] Add chapterTitle rendering to StoryPlayback
- [ ] Verify backward compatibility
- [ ] Test dark mode

---
**Created:** 2026-02-06
