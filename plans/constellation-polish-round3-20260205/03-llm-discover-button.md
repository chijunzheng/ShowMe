# Feature: LLM "Discover" Button for Topic Suggestions

**ID:** 03
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Add a "Discover" button to the constellation that calls the LLM to suggest related topics the user might want to learn. When tapped, it fetches suggestions and offers to learn the first one.

## Acceptance Criteria

- [ ] "Discover" button visible in bottom-left corner of constellation
- [ ] Button styled in neobrutalism matching zoom controls
- [ ] Tapping triggers LLM API call with current topic names
- [ ] Loading state shown during API call (pulse animation, disabled)
- [ ] On success, triggers `onSelectSuggestedTopic` to start learning the suggestion
- [ ] Build passes

## Implementation Details

### Files to Create

- `frontend/src/components/Constellation/DiscoverButton.jsx` (new)

### Files to Modify

- `frontend/src/components/Constellation/Constellation.jsx`
- `frontend/src/components/ProgressTab/ProgressTab.jsx`

### New: DiscoverButton.jsx

Simple floating button component:
- Props: `onClick` (function), `isLoading` (boolean)
- Style: neobrutalism matching zoom controls (rounded-xl, border-2, shadow-[3px_3px...])
- Content: sparkles emoji + "Discover" text
- Loading: pulse animation, `pointer-events-none` when loading
- Size: auto-width (not square like zoom buttons)

### Constellation.jsx Changes

- Add props: `onDiscover` (function), `isDiscovering` (boolean)
- Import `DiscoverButton`
- Render in bottom-left corner (`absolute bottom-4 left-4 z-10`), opposite the zoom controls
- Only show when `onDiscover` is provided (so it's optional)

### ProgressTab.jsx Changes

- Add state: `const [isDiscovering, setIsDiscovering] = useState(false)`
- Add callback `handleDiscover`:
  ```js
  const handleDiscover = useCallback(async () => {
    if (isDiscovering || topicList.length === 0) return
    setIsDiscovering(true)
    try {
      const topicNames = topicList.map(t => t.topicName || t.name).filter(Boolean)
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const res = await fetch(`${apiUrl}/api/generate/engagement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicNames, mode: 'suggest_related' }),
      })
      const data = await res.json()
      const suggestion = data?.suggestedQuestions?.[0] || data?.suggestion
      if (suggestion) {
        onSelectSuggestedTopic?.(suggestion)
      }
    } catch (err) {
      // Silently fail — discover is non-critical
    } finally {
      setIsDiscovering(false)
    }
  }, [isDiscovering, topicList, onSelectSuggestedTopic])
  ```
- Pass to Constellation: `onDiscover={handleDiscover}` and `isDiscovering={isDiscovering}`

## Implementation Checklist

- [ ] Create DiscoverButton.jsx
- [ ] Edit Constellation.jsx — add props + render button
- [ ] Edit ProgressTab.jsx — add state + API handler
- [ ] Verify build

---

**Created:** 2026-02-05
