# Feature: Explorer Rank Progress Bar — Gold Instead of Indigo

**ID:** 05
**Status:** ⬚ Pending
**Priority:** Medium
**Dependencies:** 01

## Description

Change the explorer rank progress bar in the TopicSidebar from indigo to stardust gold to match the Journey tab theme.

## Files to Modify

- `frontend/src/components/TopicSidebar.jsx` (~line 384-390)

## Changes

### Progress bar track and fill:
- Track: `bg-night-600` (was `bg-indigo-100 dark:bg-indigo-900/30`)
- Fill gradient: `from-stardust-500 to-stardust` (was `from-indigo-400 to-indigo-500`)

### Rank title text (~line 373):
- `text-stardust-500 dark:text-stardust` (was `text-indigo-600 dark:text-indigo-400`)
