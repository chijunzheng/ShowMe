# Feature: Streak Calendar + Topics Categorized

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 04 (needs exported CLUSTER_CONFIG)

## Description

Two rewrites in StatDetailSheet.jsx:
1. Replace StreakContent 7-day dots with a full monthly calendar view
2. Replace TopicsContent flat list with categorized list using progress bars

Also add `activeDates` backend support in userProgress.js.

## Acceptance Criteria

- [ ] StreakContent shows a monthly calendar with prev/next navigation
- [ ] Active days highlighted in orange
- [ ] "Next" button disabled when viewing current month
- [ ] Current/longest streak stats still shown above calendar
- [ ] TopicsContent groups topics by category with emoji headers
- [ ] Each topic shows a thin progress bar with mastery % (using category color)
- [ ] Uncategorized topics go under "General"
- [ ] Backend: `activeDates` array persisted in userProgress
- [ ] normalizeProgress defaults `activeDates` to `[]`

## Implementation Details

### Files to Modify

- `frontend/src/components/Dashboard/StatDetailSheet.jsx`
- `backend/src/services/userProgress.js`

### StatDetailSheet.jsx — StreakContent Rewrite

Replace StreakContent (lines 38-91) with monthly calendar:

```jsx
function StreakContent({ streak }) {
  const current = typeof streak === 'number' ? streak : streak?.current || 0
  const longest = typeof streak === 'number' ? streak : streak?.longest || current
  const activeDates = typeof streak === 'object' ? streak?.activeDates : null
  const activeDateSet = useMemo(() => new Set(activeDates || []), [activeDates])

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const isCurrentMonth = useMemo(() => {
    const now = new Date()
    return viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth()
  }, [viewMonth])

  const calendarDays = useMemo(() => {
    // Build grid: first day offset + all days of month
    const firstDay = new Date(viewMonth.year, viewMonth.month, 1)
    const daysInMonth = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate()
    const startDow = firstDay.getDay() // 0=Sun
    const grid = []
    // Empty cells for offset
    for (let i = 0; i < startDow; i++) grid.push(null)
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${viewMonth.year}-${String(viewMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      grid.push({ day: d, active: activeDateSet.has(key) })
    }
    return grid
  }, [viewMonth, activeDateSet])

  const monthLabel = new Date(viewMonth.year, viewMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })

  // Navigation handlers...
}
```

Render: stats row → month header with arrows → 7-col grid (Sun–Sat headers) → day cells.

### StatDetailSheet.jsx — TopicsContent Rewrite

Import `CLUSTER_CONFIG` from `useKnowledgeGraph.js` and `computeDisplayedMastery` (or inline).

Group `topicList` by `graphNode.category`. Each section: category emoji + name + count, then topic rows with progress bar using category color.

```jsx
function TopicsContent({ topicList, graphNodes }) {
  const grouped = useMemo(() => {
    // Group topics by category from graph node
    // Use CLUSTER_CONFIG for icon/color
    // Uncategorized → 'general'
  }, [topicList, graphNodes])

  return (
    // Category sections with progress bars
  )
}
```

### userProgress.js — activeDates Backend

1. Add `activeDates: []` to `createDefaultProgress`
2. In `applyActivityUpdate`, append today's date key:
```js
const todayKey = getDateKey(now)
if (!Array.isArray(updated.activeDates)) {
  updated.activeDates = []
}
if (!updated.activeDates.includes(todayKey)) {
  updated.activeDates = [...updated.activeDates, todayKey]
}
```
3. In `normalizeProgress`, default: `activeDates: Array.isArray(merged.activeDates) ? merged.activeDates : []`

---

**Created:** 2026-02-06
