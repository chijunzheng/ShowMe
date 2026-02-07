# Feature: ClueInvestigation Component

**ID:** 10
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 03 (TTS Hook), 04 (SlideReference)

## Description

Step-through clue viewer that displays clues one at a time with progress tracking, TTS narration, inline slide thumbnails, and collapsed previous clues. User advances with "Next Clue" button or finishes with "Ready to Solve!" on final clue. This component replaces the legacy CluePanel.jsx with a more engaging, linear investigation flow.

## Acceptance Criteria

- [ ] Progress indicator at top shows "Clue X of Y"
- [ ] Current clue displayed in large, prominent card
- [ ] TTS auto-narrates clue.narratorText on clue change
- [ ] Inline SlideReference thumbnail below clue (when clue.slideRef exists)
- [ ] Previously revealed clues collapsed/minimized above current clue
- [ ] "Next Clue" button for non-final clues
- [ ] "Ready to Solve!" button on final clue
- [ ] Smooth transition between clues (fade/slide animation)
- [ ] Handles clues without slideRef (no thumbnail shown)
- [ ] No console errors during clue navigation

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/ClueInvestigation.jsx` (~200 lines, NEW)

### Component Props

```typescript
interface Clue {
  text: string;           // Main clue text to display
  narratorText: string;   // Text for TTS narration (may differ from display text)
  slideRef?: number;      // Optional slide index to show thumbnail
}

interface ClueInvestigationProps {
  clues: Clue[];                    // Array of clues to reveal
  slides: Array<{image: string}>;   // Slideshow slides for thumbnails
  currentClueIndex: number;         // Which clue is currently shown (0-based)
  isTtsPlaying: boolean;            // Whether TTS is currently playing
  onNextClue: () => void;           // Callback when "Next Clue" clicked
  onReadyToSolve: () => void;       // Callback when "Ready to Solve!" clicked
}
```

### Key Implementation Details

1. **Progress Indicator**:
   ```jsx
   <div className="text-center text-sm font-semibold text-purple-400 mb-4">
     Clue {currentClueIndex + 1} of {clues.length}
   </div>
   ```

2. **Collapsed Previous Clues**:
   ```jsx
   {clues.slice(0, currentClueIndex).map((clue, index) => (
     <div
       key={index}
       className="mb-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600 opacity-60"
     >
       <div className="text-xs text-slate-400">Clue {index + 1}</div>
       <div className="text-sm text-slate-300 line-clamp-2">{clue.text}</div>
     </div>
   ))}
   ```

3. **Current Clue Card**:
   ```jsx
   const currentClue = clues[currentClueIndex];

   <div className="mb-6 p-6 bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-xl border-2 border-purple-500 shadow-xl">
     <div className="text-lg font-semibold mb-3">
       🔍 Clue {currentClueIndex + 1}
     </div>
     <div className="text-base leading-relaxed mb-4">
       {currentClue.text}
     </div>

     {currentClue.slideRef !== undefined && (
       <SlideReference
         slides={slides}
         slideIndex={currentClue.slideRef}
       />
     )}
   </div>
   ```

4. **Auto-TTS on Clue Change**:
   ```jsx
   useEffect(() => {
     // Trigger TTS narration when currentClueIndex changes
     // Parent component handles actual TTS via useMysteryNarration hook
     if (currentClue.narratorText) {
       // Parent will handle narration via prop callback
     }
   }, [currentClueIndex]);
   ```

5. **Dynamic Button Text**:
   ```jsx
   const isLastClue = currentClueIndex === clues.length - 1;

   <button
     onClick={isLastClue ? onReadyToSolve : onNextClue}
     className="w-full py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:scale-105 transition-all duration-200"
   >
     {isLastClue ? '🎯 Ready to Solve!' : '➡️ Next Clue'}
   </button>
   ```

6. **Smooth Transitions**:
   ```jsx
   // Use CSS transitions and conditional rendering
   const [isTransitioning, setIsTransitioning] = useState(false);

   useEffect(() => {
     setIsTransitioning(true);
     const timeout = setTimeout(() => setIsTransitioning(false), 300);
     return () => clearTimeout(timeout);
   }, [currentClueIndex]);

   <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
     {/* Current clue content */}
   </div>
   ```

### Technical Decisions

- **Decision:** Collapse previous clues instead of hiding them
- **Rationale:** Users can scroll up to review, provides context, shows progress
- **Trade-off:** Slightly more visual clutter vs better user reference

- **Decision:** Auto-advance clues instead of manual reveal
- **Rationale:** Linear flow is easier to follow, less cognitive load
- **Trade-off:** Less user control vs simpler UX

- **Decision:** Conditional SlideReference rendering
- **Rationale:** Not all clues reference slides, keeps component flexible
- **Trade-off:** None - clean conditional rendering pattern

- **Decision:** Separate narratorText from display text
- **Rationale:** Narration may need different phrasing than visual text
- **Trade-off:** Slight data duplication, but better UX flexibility

## Dependencies

### Depends On
- **Feature 03:** TTS Narration Hook for auto-narration
- **Feature 04:** SlideReference component for inline thumbnails

### Blocks
- **Feature 13:** MysteryLab Rewrite requires this component

### Deprecates
- `CluePanel.jsx` - Replaced by this new implementation

## Testing Requirements

- [ ] Test renders current clue correctly
- [ ] Test progress indicator updates with clue changes
- [ ] Test previous clues collapsed and visible above
- [ ] Test slide reference shown when slideRef exists
- [ ] Test no thumbnail when slideRef is undefined
- [ ] Test "Next Clue" button calls onNextClue
- [ ] Test "Ready to Solve!" button on last clue calls onReadyToSolve
- [ ] Test smooth transition animation between clues
- [ ] Test handles single clue (shows "Ready to Solve!" immediately)
- [ ] Test handles empty clues array gracefully
- [ ] Test mobile responsive layout
- [ ] Test scrolling with many clues

## Security Considerations

- [ ] No user input - content comes from API
- [ ] Clue text sanitized by parent component
- [ ] No XSS risk - all text rendered as text nodes
- [ ] SlideReference handles image URLs securely

## Implementation Checklist

- [ ] Create ClueInvestigation.jsx component file
- [ ] Define TypeScript/PropTypes for props validation
- [ ] Implement progress indicator at top
- [ ] Map and render collapsed previous clues (0 to currentClueIndex-1)
- [ ] Render current clue in prominent card
- [ ] Add conditional SlideReference rendering
- [ ] Implement useEffect hook for TTS trigger on clue change
- [ ] Add dynamic button text based on isLastClue
- [ ] Wire up onNextClue and onReadyToSolve callbacks
- [ ] Implement transition animation (fade/slide)
- [ ] Add useEffect for transition state management
- [ ] Test all acceptance criteria
- [ ] Verify no console errors or warnings
- [ ] Test edge cases (single clue, no clues, missing slideRef)
- [ ] Test mobile layout and scrolling

## Verification

**Visual Check:**
1. Navigate to Mystery Lab clue investigation phase
2. Verify progress indicator shows "Clue 1 of 4"
3. Verify first clue displayed in large card
4. Verify slide thumbnail shown if clue has slideRef
5. Click "Next Clue" button
   - Should show next clue with smooth transition
   - Previous clue should collapse above
   - Progress indicator should update
6. Continue to last clue
   - Button should change to "Ready to Solve!"
7. Verify all clues visible in collapsed form
8. Test scrolling on mobile devices

**Functional Check:**
```bash
# Test component in isolation
# In browser console:
const props = {
  clues: [
    { text: "First clue", narratorText: "First clue narration", slideRef: 0 },
    { text: "Second clue", narratorText: "Second clue narration" },
    { text: "Third clue", narratorText: "Third clue narration", slideRef: 2 }
  ],
  slides: [{image: "test1.jpg"}, {image: "test2.jpg"}, {image: "test3.jpg"}],
  currentClueIndex: 0,
  isTtsPlaying: false,
  onNextClue: () => console.log('Next clue'),
  onReadyToSolve: () => console.log('Ready to solve')
};
# Verify first clue shows, second clue without thumbnail, third clue with thumbnail
```

## Notes

**Design Rationale:**
- Linear progression reduces cognitive load compared to all-at-once reveal
- Collapsed previous clues provide context without distraction
- Progress indicator gives users sense of completion
- Large current clue card draws focus to active investigation

**TTS Integration:**
- Parent component manages TTS state and playback
- This component triggers narration on clue change
- narratorText allows different phrasing than display text
- Example: Display "The frequency was 500 Hz" vs Narrate "The frequency was five hundred hertz"

**SlideReference Flexibility:**
- Optional slideRef allows clues with or without visual aids
- SlideReference component handles thumbnail click to full view
- Falls back gracefully when slideRef is undefined

**Transition Animation:**
- Subtle fade prevents jarring clue changes
- Short duration (300ms) keeps flow moving
- Can be enhanced with slide animation in future

**Collapsed Clue Design:**
- line-clamp-2 truncates long clues to 2 lines
- Opacity reduced to 60% to de-emphasize
- Users can still read previous clues by scrolling
- Maintains investigation narrative flow

**Button State Management:**
- Dynamic text provides clear next action
- Could add disabled state during TTS (like MysteryIntro)
- Currently allows skip for better UX

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** TBD
