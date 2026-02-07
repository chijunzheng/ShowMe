# Feature: Fix Chapter 3 Choices in Gemini Service

**ID:** 01
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Backend returns `nextChapter: null` for chapter 3 because `isLastChapter` triggers too early. Chapter 3 should still have choices (for "The Ending"), only chapter 4 should be the final illustration-only chapter.

## Acceptance Criteria

- [ ] Chapter 3 returns 3 choices about how the story concludes
- [ ] Chapter 4 returns `nextChapter: null` (illustration only)
- [ ] Chinese prompt section updated similarly
- [ ] NextChapter parsing no longer gated by `!isLastChapter`

## Implementation Details

### Files to Modify

- `backend/src/services/gemini.js` (~lines 3481-3601)

### Changes

1. **Line 3481:** Change `isLastChapter = currentChapter >= 3` → `currentChapter >= 4`

2. **Line 3478:** Update `chapterNames` to include chapter 4:
   ```js
   const chapterNames = { 2: 'The Adventure', 3: 'The Ending', 4: 'Final Illustration' }
   ```

3. **Lines 3484-3494:** The `nextChapterSection` template now correctly shows null only for ch4+

4. **Line 3558:** Update English prompt ending instruction for ch3:
   - When `currentChapter === 3`: "Chapter 4 name: The Ending - create 3 choices about how the story concludes"

5. **Lines 3512-3518:** Update Chinese prompt similarly

6. **Line 3588:** Change `if (!isLastChapter && parsed.nextChapter ...)` → `if (parsed.nextChapter && typeof parsed.nextChapter === 'object')`
   - Parse nextChapter whenever the model returns it, don't gate on isLastChapter

## Testing Requirements

- [ ] Chapter 2 returns nextChapter with 3 choices
- [ ] Chapter 3 returns nextChapter with 3 ending choices
- [ ] Chapter 4 returns nextChapter: null

---

**Created:** 2026-02-06
