# Feature: SolveFillBlank Component

**ID:** 07
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Fill-in-the-blank puzzle component for mystery solving. Displays a solution sentence with tappable blank gaps (underlined). Word bank appears below as tappable chips. User taps a blank to select it, then taps a word chip to fill the blank. When all blanks are filled, "Check Answer" button becomes enabled.

## Acceptance Criteria

- [ ] Renders sentence with visible blank gaps (underlined)
- [ ] Word bank chips appear below sentence
- [ ] Tap blank to select it (highlighted)
- [ ] Tap word chip to fill selected blank
- [ ] Filled blanks show the word (removable on tap)
- [ ] Submit enabled only when all blanks filled
- [ ] onSubmit called with array of user's words
- [ ] Word chip disabled after use (unless removed from blank)
- [ ] Touch targets minimum 44px on chips
- [ ] Keyboard navigation support (Tab + Enter)
- [ ] Visual feedback for selected blank

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/SolveFillBlank.jsx` (~150 lines, NEW)

### Key Changes

1. **Component Props Interface**:
   ```javascript
   SolveFillBlank.propTypes = {
     fillBlanks: PropTypes.shape({
       sentence: PropTypes.string.isRequired, // Sentence with "___" placeholders
       blanks: PropTypes.arrayOf(PropTypes.string).isRequired, // Correct answers (for validation)
       wordBank: PropTypes.arrayOf(PropTypes.string).isRequired // Words to choose from
     }).isRequired,
     onSubmit: PropTypes.func.isRequired // (userBlanks: string[]) => void
   }
   ```

2. **Component State**:
   ```javascript
   // Parse sentence into parts: ['text before', BLANK, 'text between', BLANK, 'text after']
   const [sentenceParts, setSentenceParts] = useState([])
   const [filledBlanks, setFilledBlanks] = useState([]) // Array of words (null if unfilled)
   const [selectedBlank, setSelectedBlank] = useState(null) // number | null
   const [submitted, setSubmitted] = useState(false)

   useEffect(() => {
     // Parse sentence on mount
     const parts = fillBlanks.sentence.split('___')
     setSentenceParts(parts)
     setFilledBlanks(new Array(parts.length - 1).fill(null))
   }, [fillBlanks.sentence])

   // Derive submission eligibility
   const allFilled = filledBlanks.every(word => word !== null)
   ```

3. **Sentence Rendering with Blanks**:
   ```jsx
   <div className="text-lg leading-relaxed mb-6">
     {sentenceParts.map((part, index) => (
       <React.Fragment key={index}>
         <span>{part}</span>
         {index < sentenceParts.length - 1 && (
           <button
             onClick={() => handleBlankClick(index)}
             className={`
               inline-flex items-center min-w-[120px] min-h-[44px]
               px-3 py-1 mx-1 rounded
               border-b-2 border-dashed
               ${selectedBlank === index ? 'border-purple-500 bg-purple-50' : 'border-gray-400'}
               ${filledBlanks[index] ? 'border-solid bg-blue-50' : ''}
             `}
           >
             {filledBlanks[index] || '___'}
           </button>
         )}
       </React.Fragment>
     ))}
   </div>
   ```

4. **Word Bank Rendering**:
   ```jsx
   <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
     {fillBlanks.wordBank.map((word, index) => {
       const isUsed = filledBlanks.includes(word)

       return (
         <button
           key={`${word}-${index}`}
           onClick={() => handleWordClick(word)}
           disabled={isUsed || submitted}
           className={`
             min-h-[44px] px-4 py-2 rounded-full
             border-2 transition-all
             ${isUsed ? 'border-gray-300 bg-gray-200 opacity-40' : 'border-blue-400 bg-blue-100 hover:bg-blue-200'}
             ${!selectedBlank && !isUsed ? 'opacity-60' : ''}
             disabled:cursor-not-allowed
           `}
         >
           {word}
         </button>
       )
     })}
   </div>
   ```

5. **Interaction Logic**:
   ```javascript
   const handleBlankClick = (blankIndex) => {
     if (submitted) return

     // If blank already filled, remove word (return to bank)
     if (filledBlanks[blankIndex] !== null) {
       setFilledBlanks(prev => {
         const newBlanks = [...prev]
         newBlanks[blankIndex] = null
         return newBlanks
       })
       setSelectedBlank(null)
     } else {
       // Otherwise, select blank for filling
       setSelectedBlank(blankIndex === selectedBlank ? null : blankIndex)
     }
   }

   const handleWordClick = (word) => {
     if (selectedBlank === null || submitted) return

     setFilledBlanks(prev => {
       const newBlanks = [...prev]
       newBlanks[selectedBlank] = word
       return newBlanks
     })

     // Clear selection after filling
     setSelectedBlank(null)
   }
   ```

6. **Submit Logic**:
   ```javascript
   const handleSubmit = () => {
     if (!allFilled || submitted) return

     setSubmitted(true)
     onSubmit(filledBlanks)
   }
   ```

### Technical Decisions

- **Decision:** Parse sentence by splitting on "___"
- **Rationale:** Simple, predictable parsing. Content creator uses "___" as blank marker.
- **Trade-off:** Assumes "___" never appears in actual sentence text (acceptable constraint)

- **Decision:** Use array index for blank identification
- **Rationale:** Blanks are ordered, index is stable, easy to map to filledBlanks array
- **Trade-off:** None - simpler than generating IDs

- **Decision:** Allow tap on filled blank to remove word
- **Rationale:** Provides correction affordance without separate remove button
- **Trade-off:** Tap is dual-purpose (select vs remove), but context makes it clear

- **Decision:** Disable used words in bank
- **Rationale:** Visual feedback that word is "used up", prevents double-use
- **Trade-off:** Can't reuse same word in multiple blanks (acceptable for puzzle design)

## Dependencies

### Depends On
None - Standalone component

### Blocks
None - Can be implemented in parallel with other solve methods

## Testing Requirements

- [ ] Test sentence parsing with 1 blank
- [ ] Test sentence parsing with multiple blanks
- [ ] Test sentence parsing with no blanks (edge case)
- [ ] Test blank selection highlights blank
- [ ] Test word selection fills selected blank
- [ ] Test filled blank shows word (not "___")
- [ ] Test tap filled blank removes word
- [ ] Test word returns to bank when removed
- [ ] Test word chip disabled after use
- [ ] Test submit enabled only when all blanks filled
- [ ] Test onSubmit receives correct array of words
- [ ] Test keyboard navigation (Tab + Enter)
- [ ] Test touch targets minimum 44px on chips
- [ ] Test submitted state prevents further interaction

## Security Considerations

- [ ] Sanitize sentence text to prevent XSS
- [ ] Sanitize word bank text to prevent XSS
- [ ] Validate blanks array length matches sentence blanks
- [ ] Validate wordBank contains enough words
- [ ] No security implications for user answer data

## Implementation Checklist

- [ ] Create `SolveFillBlank.jsx` component file
- [ ] Define PropTypes for props validation
- [ ] Implement sentence parsing logic (split on "___")
- [ ] Implement state management (sentenceParts, filledBlanks, selectedBlank, submitted)
- [ ] Render sentence with inline blank buttons
- [ ] Render word bank chips
- [ ] Add handleBlankClick for selection and removal
- [ ] Add handleWordClick for filling blanks
- [ ] Implement allFilled derived state
- [ ] Add "Check Answer" button (conditional enable)
- [ ] Implement handleSubmit
- [ ] Test with 1 blank sentence
- [ ] Test with 5 blank sentence
- [ ] Test word removal and re-selection
- [ ] Test on mobile devices (tap interactions)
- [ ] Test with screen reader (accessibility labels)

## Verification

**Visual Check:**
1. Render component with 3-blank sentence
2. Sentence should show with 3 underlined gaps ("___")
3. Word bank should show all words as enabled chips
4. Tap a blank
   - Purple border should appear
   - Word bank chips should become fully opaque
5. Tap a word chip
   - Word appears in blank (replaces "___")
   - Blank border becomes solid blue
   - Word chip becomes disabled (grayed out)
   - Selected blank deselects
6. Tap filled blank
   - Word removed from blank (back to "___")
   - Word chip re-enabled in bank
7. Fill all blanks
   - "Check Answer" button becomes enabled
8. Tap submit
   - onSubmit fires with array of words

**Functional Check:**
```javascript
// Test component in isolation
const testFillBlanks = {
  sentence: 'Photosynthesis occurs in ___ using ___ and releasing ___.',
  blanks: ['chloroplasts', 'sunlight', 'oxygen'], // Correct answers (for validation)
  wordBank: ['chloroplasts', 'mitochondria', 'sunlight', 'oxygen', 'water', 'carbon dioxide']
}

const handleSubmit = (userBlanks) => {
  console.log('User answers:', userBlanks)
  // Example: ['chloroplasts', 'sunlight', 'oxygen']

  // Compare to correct answers
  const isCorrect = userBlanks.every((word, index) => word === testFillBlanks.blanks[index])
  console.log('All correct:', isCorrect)
}

<SolveFillBlank fillBlanks={testFillBlanks} onSubmit={handleSubmit} />
```

## Notes

**Sentence Parsing Strategy:**
- Split on "___" delimiter creates array of text parts
- Number of blanks = parts.length - 1
- Blanks rendered between consecutive parts
- Example: "A ___ B ___ C" → ["A ", " B ", " C"] → 2 blanks

**Blank Interaction Model:**
- Empty blank: Tap to select (purple highlight)
- Selected blank + tap word: Fill blank, deselect
- Filled blank: Tap to remove word (returns to bank)
- Clear visual states prevent confusion

**Word Bank Design:**
- Contains both correct and distractor words
- Words disabled after use (visual: grayed out, 40% opacity)
- Words re-enabled when removed from blanks
- No drag-and-drop (tap-tap is mobile-first)

**Accessibility:**
- Blanks are button elements (keyboard focusable)
- Word chips are button elements (keyboard focusable)
- ARIA labels describe blank position ("Blank 1 of 3")
- Screen reader announces word selection and blank filling

**Edge Cases:**
- 0 blanks: Component renders sentence only, submit immediately enabled
- 1 blank: Works normally with single blank selection
- 10+ blanks: May need scrolling, but interaction model unchanged
- Duplicate words in bank: Use index in key to differentiate

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
