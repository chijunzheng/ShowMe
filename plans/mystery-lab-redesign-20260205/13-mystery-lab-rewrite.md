# Feature: MysteryLab State Machine Rewrite

**ID:** 13
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** High
**Dependencies:** 01, 02, 09, 10, 11, 12

## Description

Complete rewrite of MysteryLab with a 7-state machine replacing the current single-page layout. States: LOADING, INTRO, INVESTIGATE, SOLVE, EVALUATING, REVEAL, CELEBRATION. Each state renders its dedicated component with TTS narration and smooth transitions. This is the integration feature that brings together all Mystery Lab components into a cohesive learning experience.

## Acceptance Criteria

- [ ] LOADING state fetches mystery data and scene image in parallel
- [ ] LOADING state shows loading spinner with progress indication
- [ ] INTRO state renders MysteryIntro with title, setup, scene image, auto-TTS
- [ ] INVESTIGATE state renders ClueInvestigation with step-through clues
- [ ] INVESTIGATE state manages currentClueIndex state correctly
- [ ] SOLVE state renders refactored TheorySolver with all method options
- [ ] EVALUATING state shows spinner while evaluation API call runs
- [ ] REVEAL state renders SolutionReveal with evaluation result, auto-TTS
- [ ] CELEBRATION state renders existing DetectiveReward component
- [ ] All state transitions work correctly (LOADING→INTRO→INVESTIGATE→SOLVE→EVALUATING→REVEAL→CELEBRATION)
- [ ] Back button works from any state (with confirmation if mid-investigation)
- [ ] API failures show retry option without crashing
- [ ] TTS narration managed by single useMysteryNarration hook instance
- [ ] Scene image loads asynchronously with placeholder fallback
- [ ] No console errors during state transitions
- [ ] Smooth animations between states

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Mystery/MysteryLab.jsx` - Complete rewrite (~350 lines)

### Files Deprecated

- `frontend/src/components/LearnModes/Mystery/MysteryScene.jsx` - Replaced by MysteryIntro
- `frontend/src/components/LearnModes/Mystery/CluePanel.jsx` - Replaced by ClueInvestigation

### Props Interface (Unchanged)

```javascript
{
  slides: Array,              // Context from current topic
  topicName: string,          // Current topic name
  explanationLevel: string,   // User's preference
  onComplete: () => void,     // Return to Learn Mode selection
  onBack: () => void          // Return to Learn Mode selection
}
```

### Key Changes

1. **State Machine with useReducer**:
   ```javascript
   const STATES = {
     LOADING: 'LOADING',
     INTRO: 'INTRO',
     INVESTIGATE: 'INVESTIGATE',
     SOLVE: 'SOLVE',
     EVALUATING: 'EVALUATING',
     REVEAL: 'REVEAL',
     CELEBRATION: 'CELEBRATION'
   }

   const initialState = {
     currentState: STATES.LOADING,
     mystery: null,
     sceneImage: null,
     currentClueIndex: 0,
     userAnswer: null,
     evaluationResult: null,
     error: null
   }

   function reducer(state, action) {
     switch (action.type) {
       case 'MYSTERY_LOADED':
         return { ...state, mystery: action.payload, currentState: STATES.INTRO }
       case 'IMAGE_LOADED':
         return { ...state, sceneImage: action.payload }
       case 'START_INVESTIGATION':
         return { ...state, currentState: STATES.INVESTIGATE, currentClueIndex: 0 }
       case 'NEXT_CLUE':
         return { ...state, currentClueIndex: state.currentClueIndex + 1 }
       case 'READY_TO_SOLVE':
         return { ...state, currentState: STATES.SOLVE }
       case 'SUBMIT_ANSWER':
         return { ...state, userAnswer: action.payload, currentState: STATES.EVALUATING }
       case 'EVALUATION_COMPLETE':
         return { ...state, evaluationResult: action.payload, currentState: STATES.REVEAL }
       case 'CONTINUE_TO_CELEBRATION':
         return { ...state, currentState: STATES.CELEBRATION }
       case 'ERROR':
         return { ...state, error: action.payload }
       case 'RETRY':
         return { ...initialState }
       default:
         return state
     }
   }

   const [state, dispatch] = useReducer(reducer, initialState)
   ```

2. **Parallel Data Fetching in LOADING State**:
   ```javascript
   useEffect(() => {
     const controller = new AbortController()

     async function loadMystery() {
       try {
         const [mysteryResult, imageResult] = await Promise.allSettled([
           fetch('/api/learn/mystery', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ topicName, explanationLevel }),
             signal: controller.signal
           }).then(res => res.json()),

           fetch('/api/learn/mystery/image', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ topicName }),
             signal: controller.signal
           }).then(res => res.json())
         ])

         if (mysteryResult.status === 'fulfilled') {
           dispatch({ type: 'MYSTERY_LOADED', payload: mysteryResult.value })
         } else {
           throw new Error('Failed to load mystery')
         }

         if (imageResult.status === 'fulfilled') {
           dispatch({ type: 'IMAGE_LOADED', payload: imageResult.value.imageUrl })
         }
         // Image failure is non-blocking - use placeholder

       } catch (error) {
         if (error.name !== 'AbortError') {
           dispatch({ type: 'ERROR', payload: error.message })
         }
       }
     }

     if (state.currentState === STATES.LOADING) {
       loadMystery()
     }

     return () => controller.abort()
   }, [state.currentState, topicName, explanationLevel])
   ```

3. **TTS Hook Instantiation**:
   ```javascript
   const { speak, stop, isSpeaking } = useMysteryNarration()

   // Pass methods to children that need narration
   <MysteryIntro
     mystery={state.mystery}
     sceneImage={state.sceneImage}
     onStart={() => dispatch({ type: 'START_INVESTIGATION' })}
     speak={speak}
     stop={stop}
   />
   ```

4. **State-Based Rendering**:
   ```jsx
   function renderState() {
     switch (state.currentState) {
       case STATES.LOADING:
         return <LoadingSpinner message="Generating mystery..." />

       case STATES.INTRO:
         return (
           <MysteryIntro
             mystery={state.mystery}
             sceneImage={state.sceneImage}
             onStart={() => dispatch({ type: 'START_INVESTIGATION' })}
             speak={speak}
             stop={stop}
           />
         )

       case STATES.INVESTIGATE:
         return (
           <ClueInvestigation
             clues={state.mystery.clues}
             currentClueIndex={state.currentClueIndex}
             onNextClue={() => dispatch({ type: 'NEXT_CLUE' })}
             onReadyToSolve={() => dispatch({ type: 'READY_TO_SOLVE' })}
             speak={speak}
             stop={stop}
           />
         )

       case STATES.SOLVE:
         return (
           <TheorySolver
             topicName={topicName}
             expectedConcepts={state.mystery.expectedConcepts}
             theoryOptions={state.mystery.theoryOptions}
             fillBlanks={state.mystery.fillBlanks}
             clues={state.mystery.clues}
             evidenceConnections={state.mystery.evidenceConnections}
             onSubmit={(answer) => dispatch({ type: 'SUBMIT_ANSWER', payload: answer })}
             disabled={false}
           />
         )

       case STATES.EVALUATING:
         return <LoadingSpinner message="Evaluating your theory..." />

       case STATES.REVEAL:
         return (
           <SolutionReveal
             evaluationResult={state.evaluationResult}
             mystery={state.mystery}
             userAnswer={state.userAnswer}
             onContinue={() => dispatch({ type: 'CONTINUE_TO_CELEBRATION' })}
             speak={speak}
             stop={stop}
           />
         )

       case STATES.CELEBRATION:
         return (
           <DetectiveReward
             evaluationResult={state.evaluationResult}
             onComplete={onComplete}
           />
         )

       default:
         return <div>Unknown state</div>
     }
   }

   return (
     <div className="mystery-lab-container">
       {state.error && (
         <ErrorBanner
           message={state.error}
           onRetry={() => dispatch({ type: 'RETRY' })}
         />
       )}
       {renderState()}
       <BackButton onClick={handleBack} />
     </div>
   )
   ```

5. **Evaluation API Call in EVALUATING State**:
   ```javascript
   useEffect(() => {
     const controller = new AbortController()

     async function evaluateAnswer() {
       try {
         const response = await fetch('/api/learn/mystery/evaluate', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             mysteryId: state.mystery.id,
             userAnswer: state.userAnswer,
             expectedConcepts: state.mystery.expectedConcepts
           }),
           signal: controller.signal
         })

         const result = await response.json()
         dispatch({ type: 'EVALUATION_COMPLETE', payload: result })

       } catch (error) {
         if (error.name !== 'AbortError') {
           dispatch({ type: 'ERROR', payload: error.message })
         }
       }
     }

     if (state.currentState === STATES.EVALUATING) {
       evaluateAnswer()
     }

     return () => controller.abort()
   }, [state.currentState, state.mystery, state.userAnswer])
   ```

6. **Back Button with Confirmation**:
   ```javascript
   function handleBack() {
     const inProgress = [STATES.INVESTIGATE, STATES.SOLVE].includes(state.currentState)

     if (inProgress) {
       const confirmed = window.confirm('Leave mystery in progress? Progress will be lost.')
       if (!confirmed) return
     }

     stop() // Stop any active TTS
     onBack()
   }
   ```

### Technical Decisions

- **Decision:** Use useReducer over useState for state machine
- **Rationale:** Clearer state transitions, centralized logic, easier to debug, better scalability
- **Trade-off:** Slightly more boilerplate, but worth it for complex state management

- **Decision:** Scene image fetch is fire-and-forget (non-blocking)
- **Rationale:** Mystery can start even if image fails to load, better UX
- **Trade-off:** Need placeholder image handling

- **Decision:** TTS hook lives in MysteryLab (single instance)
- **Rationale:** Avoids race conditions, centralized narration control, prevents overlapping speech
- **Trade-off:** Must pass methods to children (more props)

- **Decision:** Parallel fetch pattern with Promise.allSettled
- **Rationale:** Faster loading, image failure doesn't block mystery, better error handling
- **Trade-off:** Slightly more complex error handling

### State Transition Diagram

```
LOADING
  ↓ (mystery data ready)
INTRO
  ↓ (user clicks "Investigate")
INVESTIGATE
  ↓ (user clicks "Ready to Solve")
SOLVE
  ↓ (user submits answer)
EVALUATING
  ↓ (API returns result)
REVEAL
  ↓ (user clicks "Continue")
CELEBRATION
  ↓ (user clicks "Complete")
onComplete() callback
```

### TTS Call Budget

Total TTS calls per mystery session: **5-7 calls**
- INTRO: 1 call (mystery setup)
- INVESTIGATE: 3-5 calls (one per clue)
- REVEAL: 1 call (solution explanation)

Well within 10 RPM limit for TTS API.

## Dependencies

### Depends On
- **Feature 01:** MysteryIntro component
- **Feature 02:** ClueInvestigation component
- **Feature 09:** SolutionReveal component
- **Feature 10:** DetectiveReward (minimal changes needed)
- **Feature 11:** useMysteryNarration hook
- **Feature 12:** TheorySolver refactor

### Blocks
None - This is the final integration feature

## Testing Requirements

- [ ] Test LOADING state renders spinner
- [ ] Test LOADING→INTRO transition on data ready
- [ ] Test parallel fetch completes successfully
- [ ] Test INTRO→INVESTIGATE transition on button click
- [ ] Test INVESTIGATE state steps through clues correctly
- [ ] Test INVESTIGATE→SOLVE transition
- [ ] Test SOLVE state renders TheorySolver
- [ ] Test SOLVE→EVALUATING transition on submit
- [ ] Test EVALUATING state shows spinner
- [ ] Test EVALUATING→REVEAL transition on API response
- [ ] Test REVEAL state renders SolutionReveal
- [ ] Test REVEAL→CELEBRATION transition
- [ ] Test CELEBRATION state renders DetectiveReward
- [ ] Test back button from each state
- [ ] Test back button confirmation on in-progress states
- [ ] Test API error handling (retry option)
- [ ] Test image load failure (placeholder fallback)
- [ ] Test TTS hook instantiation
- [ ] Test TTS stops on back/unmount
- [ ] Test AbortController cleanup on unmount
- [ ] Verify no memory leaks during state transitions

## Security Considerations

- [ ] Validate all API responses before rendering
- [ ] Sanitize all text content from backend (mystery title, clues, etc.)
- [ ] AbortController cleanup prevents race conditions
- [ ] No direct HTML injection (use safe text rendering)
- [ ] Image URLs validated/sanitized before rendering

## Implementation Checklist

- [ ] Define state machine constants and reducer
- [ ] Implement LOADING state with parallel fetch
- [ ] Implement state transition handlers
- [ ] Instantiate useMysteryNarration hook
- [ ] Implement state-based rendering logic
- [ ] Add INTRO state rendering
- [ ] Add INVESTIGATE state rendering with clue stepping
- [ ] Add SOLVE state rendering
- [ ] Add EVALUATING state with API call
- [ ] Add REVEAL state rendering
- [ ] Add CELEBRATION state rendering
- [ ] Implement back button with confirmation
- [ ] Add error handling and retry logic
- [ ] Add loading spinners for async states
- [ ] Test all state transitions
- [ ] Test error scenarios
- [ ] Test TTS lifecycle
- [ ] Add cleanup on unmount
- [ ] Verify no console errors
- [ ] Test full mystery flow end-to-end

## Verification

**Visual Check:**
1. Navigate to Learn Mode → Mystery Lab
2. LOADING state should show spinner
3. INTRO state should show mystery title, setup, scene image
   - Auto-TTS should play setup narration
4. Click "Investigate"
   - Should transition to INVESTIGATE state
   - First clue should render
5. Step through clues
   - Should advance one at a time
   - Each clue should have TTS option
6. Click "Ready to Solve"
   - Should transition to SOLVE state
   - TheorySolver should render with methods
7. Submit answer
   - Should show EVALUATING spinner
   - Should transition to REVEAL
8. REVEAL should show evaluation result
   - Auto-TTS should play explanation
9. Click "Continue"
   - Should show CELEBRATION with DetectiveReward
10. Test back button from various states
    - Should confirm on in-progress states
    - Should clean up TTS

**Functional Check:**
```bash
# Test state machine transitions
# In browser console:
window.__mysteryState // Should expose current state for debugging
# Check for memory leaks
window.performance.memory // Before and after mystery session

# Test error handling
# Kill backend mid-mystery, should show retry option
```

## Notes

**Why useReducer:**
- State machine pattern is perfect fit for reducer
- Centralized transition logic prevents bugs
- Easy to add new states/transitions
- Better debugging (action history)

**Image Loading Strategy:**
- Non-blocking fetch via Promise.allSettled
- Placeholder image on failure
- Async loading improves perceived performance

**TTS Lifecycle:**
- Single hook instance prevents overlapping speech
- Stop on state transitions
- Cleanup on unmount prevents memory leaks

**Error Recovery:**
- Non-fatal errors (image load) → graceful degradation
- Fatal errors (mystery load) → retry option
- Network errors → AbortController cleanup

**DetectiveReward Changes:**
- Receives evaluationResult in slightly different shape
- No logic changes needed
- May need prop mapping for compatibility

**State Persistence:**
- No localStorage persistence (by design)
- Each mystery is a fresh session
- Future: Save progress for multi-session mysteries

**Performance Optimizations:**
- Parallel fetch reduces loading time
- Lazy component loading possible
- Image preloading during INVESTIGATE state

**Future Enhancements:**
- Save/resume mystery progress
- Skip intro option for returning users
- Difficulty selection affects clue count
- Timed challenges for bonus XP
- Multi-part mysteries spanning sessions

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
