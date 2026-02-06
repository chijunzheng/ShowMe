# Feature: SolutionReveal Component

**ID:** 11
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 03 (TTS Narration Hook)

## Description

Narrated solution reveal screen that shows evaluation result (correct/incorrect), TTS narrates the reveal, displays solution explanation, XP earned, and matched concepts. "Continue" button advances to celebration phase. This component provides dramatic reveal and learning reinforcement after user submits their solution.

## Acceptance Criteria

- [ ] Reuses scene image as background/header
- [ ] TTS auto-narrates revealNarration on mount
- [ ] Correct/incorrect badge shown prominently
- [ ] Solution explanation text displayed clearly
- [ ] Matched concepts shown as colorful tags/chips
- [ ] XP earned displayed with animation
- [ ] "Continue" button at bottom to advance
- [ ] Handles missing evaluationResult gracefully (show explanation only)
- [ ] Green checkmark styling for correct, red X for incorrect
- [ ] No console errors during render or narration

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/SolutionReveal.jsx` (~100 lines, NEW)

### Component Props

```typescript
interface EvaluationResult {
  isCorrect: boolean;         // Whether user's solution was correct
  matchedConcepts: string[];  // Concepts user correctly identified
  xpEarned: number;           // XP awarded for this mystery
  feedback: string;           // Personalized feedback message
}

interface SolutionRevealProps {
  solutionExplanation: string;      // Full explanation of the mystery solution
  revealNarration: string;          // Text for TTS narration
  sceneImage: string | null;        // Same manga scene from intro
  evaluationResult?: EvaluationResult; // Optional evaluation data
  onCelebrate: () => void;          // Callback when "Continue" clicked
}
```

### Key Implementation Details

1. **Scene Image Background**:
   ```jsx
   <div className="relative w-full min-h-screen bg-slate-900">
     {sceneImage && (
       <div className="absolute inset-0 opacity-30">
         <img
           src={sceneImage}
           alt="Mystery scene"
           className="w-full h-full object-cover"
         />
         <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/90" />
       </div>
     )}

     <div className="relative z-10 container mx-auto px-4 py-8">
       {/* Content */}
     </div>
   </div>
   ```

2. **Auto-TTS on Mount**:
   ```jsx
   useEffect(() => {
     // Trigger TTS narration on mount via parent's useMysteryNarration hook
     // Parent handles the actual TTS logic
   }, []);
   ```

3. **Correct/Incorrect Badge**:
   ```jsx
   {evaluationResult && (
     <div className={`
       inline-flex items-center gap-2 px-6 py-3 rounded-full text-xl font-bold mb-6
       ${evaluationResult.isCorrect
         ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
         : 'bg-red-500/20 border-2 border-red-500 text-red-400'
       }
     `}>
       {evaluationResult.isCorrect ? (
         <>
           <span className="text-3xl">✓</span>
           <span>Case Solved!</span>
         </>
       ) : (
         <>
           <span className="text-3xl">✗</span>
           <span>Case Remains Open</span>
         </>
       )}
     </div>
   )}
   ```

4. **Solution Explanation**:
   ```jsx
   <div className="bg-slate-800/90 rounded-xl p-6 mb-6 border border-slate-700">
     <h3 className="text-xl font-semibold text-purple-400 mb-4">
       🔍 The Truth Revealed
     </h3>
     <p className="text-base leading-relaxed text-slate-200">
       {solutionExplanation}
     </p>
   </div>
   ```

5. **Matched Concepts Chips**:
   ```jsx
   {evaluationResult?.matchedConcepts && evaluationResult.matchedConcepts.length > 0 && (
     <div className="bg-slate-800/90 rounded-xl p-6 mb-6 border border-slate-700">
       <h3 className="text-lg font-semibold text-indigo-400 mb-3">
         📚 Concepts You Mastered
       </h3>
       <div className="flex flex-wrap gap-2">
         {evaluationResult.matchedConcepts.map((concept, index) => (
           <span
             key={index}
             className="px-4 py-2 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/50 rounded-full text-sm font-medium text-purple-200"
           >
             {concept}
           </span>
         ))}
       </div>
     </div>
   )}
   ```

6. **XP Earned with Animation**:
   ```jsx
   const [showXp, setShowXp] = useState(false);

   useEffect(() => {
     // Delay XP animation for dramatic effect
     const timeout = setTimeout(() => setShowXp(true), 500);
     return () => clearTimeout(timeout);
   }, []);

   {evaluationResult?.xpEarned && (
     <div className={`
       text-center mb-6 transition-all duration-500
       ${showXp ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
     `}>
       <div className="text-5xl font-bold text-yellow-400 mb-2">
         +{evaluationResult.xpEarned} XP
       </div>
       <div className="text-sm text-slate-400">
         Experience Earned
       </div>
     </div>
   )}
   ```

7. **Continue Button**:
   ```jsx
   <button
     onClick={onCelebrate}
     className="w-full py-4 rounded-xl text-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:scale-105 transition-all duration-200"
   >
     Continue ✨
   </button>
   ```

### Technical Decisions

- **Decision:** Reuse scene image as background
- **Rationale:** Visual continuity from intro, reinforces narrative
- **Trade-off:** None - simple image reuse

- **Decision:** Optional evaluationResult prop
- **Rationale:** Allows fallback to explanation-only mode if evaluation fails
- **Trade-off:** Slightly more complex rendering logic, but more robust

- **Decision:** Delayed XP animation
- **Rationale:** Dramatic reveal adds excitement, rewards feel earned
- **Trade-off:** 500ms delay, but enhances gamification

- **Decision:** Separate revealNarration from solutionExplanation
- **Rationale:** Narration may need different phrasing than visual text
- **Trade-off:** Slight data duplication, but better UX flexibility

## Dependencies

### Depends On
- **Feature 03:** TTS Narration Hook for auto-narration

### Blocks
- **Feature 13:** MysteryLab Rewrite requires this component

### Deprecates
None - New component

## Testing Requirements

- [ ] Test renders solution explanation correctly
- [ ] Test correct result styling (green badge, checkmark)
- [ ] Test incorrect result styling (red badge, X)
- [ ] Test XP display with animation
- [ ] Test concept tags render from matchedConcepts array
- [ ] Test continue button calls onCelebrate callback
- [ ] Test TTS triggered on mount
- [ ] Test missing evaluationResult fallback (shows explanation only)
- [ ] Test missing sceneImage (no background shown)
- [ ] Test XP animation delay (500ms)
- [ ] Test mobile responsive layout
- [ ] Test empty matchedConcepts array (section hidden)

## Security Considerations

- [ ] No user input - content comes from API
- [ ] Solution explanation sanitized by parent component
- [ ] No XSS risk - all text rendered as text nodes
- [ ] Image URLs handled securely

## Implementation Checklist

- [ ] Create SolutionReveal.jsx component file
- [ ] Define TypeScript/PropTypes for props validation
- [ ] Implement scene image background with gradient overlay
- [ ] Add correct/incorrect badge with conditional styling
- [ ] Render solution explanation in card
- [ ] Map matched concepts to chip components
- [ ] Implement XP display with delayed animation
- [ ] Add useEffect hooks for TTS and XP animation
- [ ] Add continue button with onCelebrate callback
- [ ] Handle missing evaluationResult gracefully
- [ ] Handle missing sceneImage gracefully
- [ ] Test all acceptance criteria
- [ ] Verify no console errors or warnings
- [ ] Test mobile layout and responsiveness

## Verification

**Visual Check:**
1. Navigate to Mystery Lab solution reveal phase
2. Verify scene image shows as background (faded)
3. Verify correct/incorrect badge displays prominently
   - Green with checkmark for correct
   - Red with X for incorrect
4. Verify solution explanation is clearly readable
5. Verify concept chips display as colorful tags
6. Verify XP animation plays after 500ms delay
   - Should scale up and fade in
   - Large yellow text (+50 XP)
7. Click "Continue" button
   - Should advance to celebration phase
   - Button should have hover effect

**Functional Check:**
```bash
# Test component in isolation
# In browser console:
const props = {
  solutionExplanation: "The mystery was solved by...",
  revealNarration: "The answer was correct because...",
  sceneImage: "test-scene.jpg",
  evaluationResult: {
    isCorrect: true,
    matchedConcepts: ["Quantum Physics", "Wave-Particle Duality"],
    xpEarned: 50,
    feedback: "Excellent detective work!"
  },
  onCelebrate: () => console.log('Celebrate clicked')
};
# Verify correct badge, concepts, and XP display
# Test with isCorrect: false to verify red badge
# Test with evaluationResult: undefined to verify fallback
```

## Notes

**Design Rationale:**
- Scene image background provides visual continuity from intro
- Large badge provides immediate feedback on performance
- Solution explanation reinforces learning
- Concept chips celebrate specific knowledge mastered
- XP animation adds gamification excitement

**TTS Integration:**
- Auto-narrates on mount for dramatic reveal
- revealNarration can emphasize key points differently than text
- Example: Display "The photons were absorbed" vs Narrate "The mystery is solved! The photons were absorbed by the material."

**Evaluation Result Fallback:**
- If evaluationResult is missing, still shows explanation
- Graceful degradation ensures users always learn
- Prevents errors if backend evaluation fails

**XP Animation Timing:**
- 500ms delay creates anticipation
- Scale + fade animation feels rewarding
- Large yellow text draws attention
- Could add particle effects in future enhancement

**Matched Concepts Design:**
- Chips show specific knowledge points
- Gradient background matches app theme
- Flexible - handles 1 to many concepts
- Hidden when array is empty

**Accessibility:**
- Large badge with emoji for visual clarity
- High contrast text for readability
- Semantic button for keyboard navigation
- XP animation doesn't block interaction

**Mobile Considerations:**
- Full-width layout works well on small screens
- Chips wrap naturally with flex-wrap
- Scene image background scales properly
- Touch-friendly button size (48px+)

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** TBD
