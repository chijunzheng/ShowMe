# Feature: SolveEvidenceBoard Component

**ID:** 06
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** High
**Dependencies:** None

## Description

Connect-the-clues puzzle component for mystery solving. Displays clue cards in the top section and concept tags in the bottom section. User taps a clue to select it, then taps a concept to create a connection. Connections are shown as color-coded badges on clue cards. When all clues are connected, "Submit Evidence" button becomes enabled.

## Acceptance Criteria

- [ ] Renders clue cards in top section
- [ ] Renders concept tags in bottom section
- [ ] Tap clue highlights it as selected (purple border)
- [ ] Tap concept creates connection to selected clue
- [ ] Visual feedback for active selection state
- [ ] Connections shown as color-coded badges on clue cards
- [ ] Submit button enabled only when all clues connected
- [ ] onSubmit called with user's connection array
- [ ] User can tap to change/remove a connection
- [ ] Touch targets minimum 44px
- [ ] Color-coded connections with 5-color palette
- [ ] No drag-and-drop (tap-tap interaction only)

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/SolveEvidenceBoard.jsx` (~200 lines, NEW)

### Key Changes

1. **Component Props Interface**:
   ```javascript
   SolveEvidenceBoard.propTypes = {
     clues: PropTypes.arrayOf(PropTypes.string).isRequired, // Array of clue text
     expectedConcepts: PropTypes.arrayOf(PropTypes.string).isRequired, // Array of concept names
     evidenceConnections: PropTypes.arrayOf(PropTypes.shape({
       clueIndex: PropTypes.number.isRequired,
       concept: PropTypes.string.isRequired
     })), // Optional: pre-filled connections for review mode
     onSubmit: PropTypes.func.isRequired // (connections: Array<{clueIndex, concept}>) => void
   }
   ```

2. **Component State**:
   ```javascript
   const [connections, setConnections] = useState(new Map()) // Map<clueIndex, concept>
   const [selectedClue, setSelectedClue] = useState(null) // number | null
   const [submitted, setSubmitted] = useState(false)

   // Derive submission eligibility
   const allConnected = connections.size === clues.length
   ```

3. **Color Palette System**:
   ```javascript
   const PALETTE_COLORS = [
     { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
     { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
     { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
     { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
     { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700' }
   ]

   // Assign colors based on concept index
   const getColorForConcept = (concept) => {
     const index = expectedConcepts.indexOf(concept)
     return PALETTE_COLORS[index % PALETTE_COLORS.length]
   }
   ```

4. **Clue Card Rendering**:
   ```jsx
   {clues.map((clue, index) => {
     const connection = connections.get(index)
     const isSelected = selectedClue === index
     const color = connection ? getColorForConcept(connection) : null

     return (
       <button
         key={index}
         onClick={() => handleClueClick(index)}
         className={`
           min-h-[80px] w-full p-4 rounded-lg text-left
           border-2 transition-all relative
           ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}
           ${color ? `${color.border} ${color.bg}` : ''}
         `}
       >
         <p className="text-sm mb-2">{clue}</p>
         {connection && (
           <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${color.bg} ${color.text}`}>
             <span>{connection}</span>
             <button
               onClick={(e) => handleRemoveConnection(e, index)}
               className="ml-2 hover:opacity-70"
             >
               ✕
             </button>
           </div>
         )}
       </button>
     )
   })}
   ```

5. **Concept Tag Rendering**:
   ```jsx
   {expectedConcepts.map((concept, index) => {
     const color = getColorForConcept(concept)
     const isUsed = Array.from(connections.values()).includes(concept)

     return (
       <button
         key={concept}
         onClick={() => handleConceptClick(concept)}
         disabled={!selectedClue && !isUsed}
         className={`
           min-h-[44px] px-4 py-2 rounded-full
           border-2 ${color.border} ${color.bg} ${color.text}
           ${!selectedClue ? 'opacity-50' : 'opacity-100'}
           disabled:opacity-30
         `}
       >
         {concept}
       </button>
     )
   })}
   ```

6. **Connection Logic**:
   ```javascript
   const handleClueClick = (clueIndex) => {
     if (submitted) return
     setSelectedClue(clueIndex === selectedClue ? null : clueIndex)
   }

   const handleConceptClick = (concept) => {
     if (selectedClue === null || submitted) return

     setConnections(prev => {
       const newMap = new Map(prev)

       // If concept already connected to this clue, remove it (toggle)
       if (newMap.get(selectedClue) === concept) {
         newMap.delete(selectedClue)
       } else {
         // Otherwise, set the connection
         newMap.set(selectedClue, concept)
       }

       return newMap
     })

     // Clear selection after connection
     setSelectedClue(null)
   }

   const handleRemoveConnection = (e, clueIndex) => {
     e.stopPropagation() // Prevent triggering clue selection
     setConnections(prev => {
       const newMap = new Map(prev)
       newMap.delete(clueIndex)
       return newMap
     })
   }
   ```

7. **Submit Logic**:
   ```javascript
   const handleSubmit = () => {
     if (!allConnected || submitted) return

     setSubmitted(true)

     // Convert Map to array format
     const connectionArray = Array.from(connections.entries()).map(([clueIndex, concept]) => ({
       clueIndex,
       concept
     }))

     onSubmit(connectionArray)
   }
   ```

### Technical Decisions

- **Decision:** Use tap-tap instead of drag-and-drop
- **Rationale:** More reliable on mobile, simpler state management, better accessibility
- **Trade-off:** Less visually fluid, but more functional on touch devices

- **Decision:** Use Map for connection state
- **Rationale:** Efficient lookup by clueIndex, easy to check if all connected
- **Trade-off:** Slightly more verbose than object, but better performance

- **Decision:** 5-color palette with modulo assignment
- **Rationale:** Visual distinction between concepts, works with any number of concepts
- **Trade-off:** Colors may repeat if >5 concepts, but acceptable for typical use

- **Decision:** Allow removal of connections via badge X button
- **Rationale:** Provides clear affordance for correction, reduces frustration
- **Trade-off:** Extra click target complexity, but improves UX

## Dependencies

### Depends On
None - Standalone component

### Blocks
None - Can be implemented in parallel with other solve methods

## Testing Requirements

- [ ] Test clue selection highlights clue card
- [ ] Test concept connection creates badge on clue
- [ ] Test visual color-coding matches concept
- [ ] Test submit enabled only when all clues connected
- [ ] Test change connection (tap different concept)
- [ ] Test remove connection via badge X button
- [ ] Test toggle clue selection (tap same clue twice)
- [ ] Test toggle concept connection (tap same concept twice)
- [ ] Test disabled state when no clue selected
- [ ] Test touch targets minimum 44px
- [ ] Test multiple concepts can use same color (>5 concepts)
- [ ] Test connection array format in onSubmit callback
- [ ] Test stopPropagation on remove button (doesn't select clue)

## Security Considerations

- [ ] Sanitize clue text to prevent XSS
- [ ] Sanitize concept text to prevent XSS
- [ ] Validate clueIndex within bounds
- [ ] Validate concept exists in expectedConcepts
- [ ] No security implications for user connection data

## Implementation Checklist

- [ ] Create `SolveEvidenceBoard.jsx` component file
- [ ] Define PropTypes for props validation
- [ ] Implement state management (connections Map, selectedClue, submitted)
- [ ] Define 5-color palette constants
- [ ] Implement getColorForConcept utility function
- [ ] Render clue cards with connection badges
- [ ] Render concept tags with color coding
- [ ] Add handleClueClick for selection
- [ ] Add handleConceptClick for connection
- [ ] Add handleRemoveConnection for badge X button
- [ ] Implement allConnected derived state
- [ ] Add "Submit Evidence" button (conditional enable)
- [ ] Implement handleSubmit with array conversion
- [ ] Test connection toggle behavior
- [ ] Test color palette with 3-10 concepts
- [ ] Test on mobile devices (tap interactions)
- [ ] Test with screen reader (accessibility labels)

## Verification

**Visual Check:**
1. Render component with 4 clues and 4 concepts
2. Tap a clue
   - Purple border should appear
   - Concepts should become fully opaque (enabled)
3. Tap a concept
   - Color-coded badge appears on clue card
   - Clue card border changes to concept color
   - Selected clue deselects
4. Tap badge X button
   - Connection removed
   - Badge disappears
   - Clue card returns to gray border
5. Connect all clues
   - "Submit Evidence" button becomes enabled
6. Tap submit
   - onSubmit fires with connection array

**Functional Check:**
```javascript
// Test component in isolation
const testClues = [
  'Plants need sunlight to grow',
  'Chlorophyll gives plants their green color',
  'Oxygen is released during the process',
  'Carbon dioxide is absorbed from air'
]

const testConcepts = ['Photosynthesis', 'Respiration', 'Germination', 'Pollination']

const handleSubmit = (connections) => {
  console.log('User connections:', connections)
  // Example output: [
  //   { clueIndex: 0, concept: 'Photosynthesis' },
  //   { clueIndex: 1, concept: 'Photosynthesis' },
  //   { clueIndex: 2, concept: 'Photosynthesis' },
  //   { clueIndex: 3, concept: 'Photosynthesis' }
  // ]
}

<SolveEvidenceBoard
  clues={testClues}
  expectedConcepts={testConcepts}
  onSubmit={handleSubmit}
/>
```

## Notes

**Why Tap-Tap Over Drag-Drop:**
- Mobile touch events are inconsistent with drag interactions
- Tap-tap is more accessible (screen readers, keyboard users)
- Simpler state management (no drag ghost elements, drop zones)
- Industry pattern: Duolingo, Khan Academy use tap-tap for mobile puzzles

**Color Palette Design:**
- Blue, Green, Purple, Orange, Pink chosen for visual distinction
- Pastel backgrounds (100 shade) for readability
- Darker borders (400 shade) for definition
- Text color (700 shade) for contrast on light backgrounds
- Modulo assignment handles any number of concepts gracefully

**Connection State Model:**
- Map<clueIndex, concept> is O(1) lookup and insertion
- Easy to check completion: connections.size === clues.length
- Easy to convert to array for API submission
- Allows 1:1 clue-to-concept mapping (one concept per clue)

**UX Considerations:**
- Selected clue state prevents accidental connections
- Badge X button provides clear removal affordance
- Toggle behavior (tap same concept twice) for quick corrections
- Submit only enabled when all connected (prevents incomplete submissions)

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
