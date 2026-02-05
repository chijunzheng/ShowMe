# Feature 04: Knowledge Constellation UI

**ID:** 04
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01, 03

## Description

Build the interactive Knowledge Constellation visualization component. Topics appear as stars with brightness based on mastery, relationships are visible lines, and suggested topics appear as dim pulsing stars. Supports pan, zoom, and tap interactions.

## Acceptance Criteria

- [ ] Stars render with correct brightness based on mastery
- [ ] Edges render between connected topics with appropriate styles
- [ ] Clusters visually group related stars
- [ ] Gap suggestions appear as dim pulsing "?" stars
- [ ] Tap star → show topic details with review/quiz options
- [ ] Tap gap → option to start learning that topic
- [ ] Tap edge → show relationship explanation
- [ ] Pinch to zoom works on mobile
- [ ] Drag to pan works on desktop and mobile
- [ ] Long press → quick quiz option
- [ ] Responsive design (works on all screen sizes)
- [ ] Empty state for new users (single star or welcome message)

## Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `frontend/src/components/Constellation/Constellation.jsx` | Main container with canvas/SVG |
| `frontend/src/components/Constellation/ConstellationStar.jsx` | Individual topic node |
| `frontend/src/components/Constellation/ConstellationEdge.jsx` | Relationship line |
| `frontend/src/components/Constellation/ConstellationCluster.jsx` | Cluster boundary/label |
| `frontend/src/components/Constellation/ConstellationGap.jsx` | Suggested topic (dim star) |
| `frontend/src/components/Constellation/constellationUtils.js` | Layout and helper functions |
| `frontend/src/hooks/useKnowledgeGraph.js` | Data fetching hook |
| `frontend/src/hooks/useConstellationLayout.js` | Force-directed layout hook |

### Component Structure

```
<Constellation>
  ├── <ConstellationCluster /> (for each cluster)
  │   └── Boundary/label rendering
  ├── <ConstellationEdge /> (for each edge)
  │   └── Line with style based on type
  ├── <ConstellationStar /> (for each node)
  │   └── Star with brightness, animations
  └── <ConstellationGap /> (for each gap)
      └── Pulsing dim star with "?"
```

### Visual Specifications

#### Star Brightness
| Mastery | Brightness | Visual |
|---------|------------|--------|
| 0-0.25 | dim | ○ faint, barely visible |
| 0.25-0.5 | glow | ✧ soft glow |
| 0.5-0.75 | bright | ✦ clear star |
| 0.75+ | brilliant | ★ bright with rays |

#### Edge Styles
| Type | Style |
|------|-------|
| prerequisite | Solid line with arrow |
| extends | Dashed line |
| contrasts | Dotted line |
| applies | Thin solid line |
| bridges | Thick highlighted line |

#### Gap Stars
- Dim pulsing animation
- "?" icon overlay
- Tooltip shows curiosityHook on hover/tap

### Layout Algorithm

Use force-directed layout (d3-force or custom):
- Nodes repel each other
- Edges act as springs (connected nodes attract)
- Cluster centers pull their nodes
- Saved positions used as initial state

```javascript
// useConstellationLayout.js
function useConstellationLayout(nodes, edges, clusters) {
  // Initialize positions (from saved or random)
  // Run force simulation
  // Return updated positions
  // Support manual dragging (save new positions)
}
```

### Interactions

| Action | Behavior |
|--------|----------|
| Tap star | Open topic detail sheet |
| Tap gap | Prompt to learn suggested topic |
| Tap edge | Show relationship tooltip |
| Pinch | Zoom in/out |
| Drag (background) | Pan view |
| Drag (star) | Reposition star (save position) |
| Long press star | Quick quiz popup |

### Data Fetching Hook

```javascript
// useKnowledgeGraph.js
function useKnowledgeGraph() {
  const [graph, setGraph] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch graph from API
  // Provide refresh function
  // Handle optimistic updates

  return { graph, loading, error, refresh, updateNode }
}
```

## Dependencies

### Depends On
- **Feature 01:** Knowledge Graph Data Model (types)
- **Feature 03:** Graph API Endpoints (data source)

### Blocks
- **Feature 08:** Legacy removal needs this complete first

## Testing Requirements

- [ ] Unit tests for layout utilities
- [ ] Unit tests for brightness calculation
- [ ] Component tests for star rendering at each brightness
- [ ] Component tests for edge rendering with each style
- [ ] Interaction tests (tap, zoom, pan)
- [ ] Snapshot tests for visual regression
- [ ] E2E test for full constellation flow

## Security Considerations

- [ ] Sanitize topic names before rendering
- [ ] Don't expose internal IDs in DOM attributes

## Implementation Checklist

- [x] Create `useKnowledgeGraph.js` hook
- [x] Create `useConstellationLayout.js` hook
- [x] Create `constellationUtils.js` with helpers
- [x] Create `Constellation.jsx` main component
- [x] Create `ConstellationStar.jsx` with brightness levels
- [x] Create `ConstellationEdge.jsx` with style variants
- [x] Create `ConstellationCluster.jsx` with labels
- [x] Create `ConstellationGap.jsx` with pulse animation
- [x] Implement pan/zoom controls
- [x] Implement tap interactions
- [x] Implement long-press for quick quiz
- [x] Add empty state for new users
- [x] Add loading state
- [x] Test on mobile devices
- [x] Write component tests

## Notes

- Consider using SVG for simpler interactions, Canvas for performance
- May need virtualization if 100+ nodes
- Save positions to localStorage for persistence
- Consider WebGL (Three.js) for future particle effects

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
