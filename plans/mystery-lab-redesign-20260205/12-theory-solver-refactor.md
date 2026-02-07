# Feature: TheorySolver Refactor to Method Orchestrator

**ID:** 12
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 05, 06, 07, 08

## Description

Refactor TheorySolver from a monolithic voice/text solver into a method orchestrator with selector tabs. The component renders method selector pills at the top (MCQ default, Evidence Board, Fill-Blank, Voice) and delegates to the appropriate sub-component. Each method provides a different way to solve the mystery theory, with the submit button passing the result to the parent component.

## Acceptance Criteria

- [ ] Method selector pills render at top with 4 methods
- [ ] MCQ is the default selected method
- [ ] Switching methods preserves no state (fresh start)
- [ ] Each method renders its dedicated component
- [ ] Submit button delegates to active method's onSubmit
- [ ] Disabled prop passes through to all methods
- [ ] Handles missing theoryOptions gracefully (hides MCQ pill)
- [ ] Handles missing fillBlanks gracefully (hides fill-blank pill)
- [ ] Handles missing evidenceConnections gracefully (hides evidence board pill)
- [ ] Voice method always shows as fallback
- [ ] No console errors during method switching
- [ ] Smooth transitions between method views

## Implementation Details

### Files to Modify

- `frontend/src/components/LearnModes/Mystery/TheorySolver.jsx` - Complete rewrite (~150 lines)

### Props Interface

```javascript
{
  topicName: string,
  expectedConcepts: string[],
  theoryOptions: object,        // MCQ data
  fillBlanks: object,           // Fill-blank data
  clues: Array,                 // For evidence board context
  evidenceConnections: Array,   // Evidence board data
  onSubmit: (answer) => void,
  disabled: boolean
}
```

### Key Changes

1. **State Management**:
   ```javascript
   const [activeMethod, setActiveMethod] = useState('mcq') // 'mcq'|'evidence'|'fillblank'|'voice'

   // Determine available methods based on data
   const availableMethods = useMemo(() => {
     const methods = []
     if (theoryOptions) methods.push('mcq')
     if (evidenceConnections && evidenceConnections.length > 0) methods.push('evidence')
     if (fillBlanks) methods.push('fillblank')
     methods.push('voice') // Always available
     return methods
   }, [theoryOptions, evidenceConnections, fillBlanks])

   // Default to first available method
   useEffect(() => {
     if (!availableMethods.includes(activeMethod)) {
       setActiveMethod(availableMethods[0] || 'voice')
     }
   }, [availableMethods, activeMethod])
   ```

2. **Method Selector UI**:
   ```jsx
   <div className="flex gap-2 mb-4 overflow-x-auto">
     {availableMethods.includes('mcq') && (
       <button
         onClick={() => setActiveMethod('mcq')}
         className={`px-4 py-2 rounded-full ${
           activeMethod === 'mcq' ? 'bg-primary text-white' : 'bg-surface'
         }`}
       >
         Multiple Choice
       </button>
     )}
     {availableMethods.includes('evidence') && (
       <button
         onClick={() => setActiveMethod('evidence')}
         className={`px-4 py-2 rounded-full ${
           activeMethod === 'evidence' ? 'bg-primary text-white' : 'bg-surface'
         }`}
       >
         Evidence Board
       </button>
     )}
     {/* Similar for fillblank and voice */}
   </div>
   ```

3. **Conditional Component Rendering**:
   ```jsx
   {activeMethod === 'mcq' && (
     <SolveMCQ
       topicName={topicName}
       theoryOptions={theoryOptions}
       onSubmit={onSubmit}
       disabled={disabled}
     />
   )}
   {activeMethod === 'evidence' && (
     <SolveEvidenceBoard
       clues={clues}
       evidenceConnections={evidenceConnections}
       expectedConcepts={expectedConcepts}
       onSubmit={onSubmit}
       disabled={disabled}
     />
   )}
   {activeMethod === 'fillblank' && (
     <SolveFillBlank
       fillBlanks={fillBlanks}
       topicName={topicName}
       onSubmit={onSubmit}
       disabled={disabled}
     />
   )}
   {activeMethod === 'voice' && (
     <SolveVoiceText
       topicName={topicName}
       expectedConcepts={expectedConcepts}
       onSubmit={onSubmit}
       disabled={disabled}
     />
   )}
   ```

### Technical Decisions

- **Decision:** No state preservation between method switches
- **Rationale:** Simpler implementation, prevents stale/invalid answers from being submitted, forces deliberate choice
- **Trade-off:** User loses progress if they switch methods accidentally, but reduces complexity significantly

- **Decision:** MCQ as default method
- **Rationale:** Fastest and easiest method for users, highest completion rate
- **Trade-off:** None - can still switch to other methods

- **Decision:** Voice method always available as fallback
- **Rationale:** Universal method that works regardless of backend data availability
- **Trade-off:** Voice recognition less reliable than structured methods

## Dependencies

### Depends On
- **Feature 05:** SolveMCQ component must be implemented
- **Feature 06:** SolveEvidenceBoard component must be implemented
- **Feature 07:** SolveFillBlank component must be implemented
- **Feature 08:** SolveVoiceText component must be implemented

### Blocks
- **Feature 13:** MysteryLab state machine rewrite requires this orchestrator

## Testing Requirements

- [ ] Test renders method selector pills correctly
- [ ] Test default method is MCQ (when available)
- [ ] Test switching between methods
- [ ] Test submit delegation to active method
- [ ] Test disabled prop passes through to all methods
- [ ] Test MCQ pill hidden when theoryOptions missing
- [ ] Test evidence board pill hidden when evidenceConnections missing/empty
- [ ] Test fill-blank pill hidden when fillBlanks missing
- [ ] Test voice method always available
- [ ] Test method switches discard previous state
- [ ] Test fallback to voice when all data missing
- [ ] Verify no console errors during operation

## Security Considerations

- [ ] No direct user input handling (delegated to sub-components)
- [ ] All validation happens in child components
- [ ] Props sanitization handled by parent MysteryLab component

## Implementation Checklist

- [ ] Remove old monolithic solver implementation
- [ ] Add state management for activeMethod
- [ ] Implement availableMethods calculation
- [ ] Create method selector pill UI
- [ ] Add conditional rendering for each method component
- [ ] Implement submit delegation pattern
- [ ] Add disabled prop pass-through
- [ ] Test method switching behavior
- [ ] Test with missing data props
- [ ] Verify voice always available
- [ ] Test submit from each method
- [ ] Add error boundaries around method components

## Verification

**Visual Check:**
1. Navigate to Mystery Lab solve phase
2. Check method selector pills appear at top
3. Verify active method is highlighted
4. Click each method pill
   - Component should switch immediately
   - No error messages
5. Submit from each method
   - Should trigger parent onSubmit
   - Should pass correct answer format

**Functional Check:**
```bash
# Test with missing data
# In browser console:
<TheorySolver
  topicName="Test"
  expectedConcepts={["concept1"]}
  onSubmit={console.log}
  disabled={false}
/>
# Should render with only Voice method available
```

## Notes

**Method Priority (when all available):**
1. MCQ - Fastest, highest completion rate
2. Evidence Board - Most engaging, educational
3. Fill-Blank - Moderate difficulty
4. Voice - Fallback, least reliable

**Why No State Preservation:**
- Each method produces different answer formats
- Switching implies user is changing approach
- Stale state could lead to invalid submissions
- Simpler code = fewer bugs

**Method Visibility Rules:**
- MCQ: Requires `theoryOptions` object
- Evidence Board: Requires non-empty `evidenceConnections` array
- Fill-Blank: Requires `fillBlanks` object
- Voice: Always visible (no requirements)

**Future Enhancements:**
- State preservation across methods (requires answer normalization)
- Method-specific hints
- Recommended method badge based on learning style
- Progress indicators for partially completed methods

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
