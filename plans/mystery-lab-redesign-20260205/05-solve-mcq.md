# Feature: SolveMCQ Component

**ID:** 05
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** None

## Description

Multiple choice theory selection component for mystery solving. Displays 4 option cards (A/B/C/D) stacked vertically with minimum 56px height for touch targets. User taps to select an option (highlighted with purple border), then taps "Submit Theory" button. After submission, shows correct/incorrect animation feedback.

## Acceptance Criteria

- [ ] Renders 4 option cards with A/B/C/D labels
- [ ] Tap selects option with visual highlight (purple border)
- [ ] Submit button appears after selection is made
- [ ] Disabled prop prevents all interaction
- [ ] onSubmit callback called with selectedIndex (0-3)
- [ ] Correct/incorrect animation plays after submit
- [ ] Touch targets minimum 56px height
- [ ] Accessible labels on all options
- [ ] Keyboard navigation support (arrow keys + Enter)

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/SolveMCQ.jsx` (~120 lines, NEW)

### Key Changes

1. **Component Props Interface**:
   ```javascript
   SolveMCQ.propTypes = {
     theoryOptions: PropTypes.shape({
       options: PropTypes.arrayOf(PropTypes.string).isRequired, // Array of 4 strings
       correctIndex: PropTypes.number.isRequired // 0-3
     }).isRequired,
     onSubmit: PropTypes.func.isRequired, // (selectedIndex: number) => void
     disabled: PropTypes.bool
   }
   ```

2. **Component State**:
   ```javascript
   const [selectedIndex, setSelectedIndex] = useState(null)
   const [submitted, setSubmitted] = useState(false)
   const [showResult, setShowResult] = useState(false)
   ```

3. **Option Card Rendering**:
   ```jsx
   {theoryOptions.options.map((option, index) => (
     <button
       key={index}
       onClick={() => handleSelect(index)}
       disabled={disabled || submitted}
       className={`
         min-h-[56px] w-full p-4 rounded-lg text-left
         border-2 transition-all
         ${selectedIndex === index ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}
         ${submitted && index === theoryOptions.correctIndex ? 'border-green-500 bg-green-50' : ''}
         ${submitted && selectedIndex === index && index !== theoryOptions.correctIndex ? 'border-red-500 bg-red-50' : ''}
       `}
     >
       <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}.</span>
       {option}
     </button>
   ))}
   ```

4. **Submit Logic**:
   ```javascript
   const handleSubmit = () => {
     if (selectedIndex === null || disabled) return
     setSubmitted(true)
     setShowResult(true)

     const isCorrect = selectedIndex === theoryOptions.correctIndex

     // Show animation for 2s, then callback
     setTimeout(() => {
       onSubmit(selectedIndex)
     }, 2000)
   }
   ```

### Technical Decisions

- **Decision:** Use button elements for option cards
- **Rationale:** Native accessibility, keyboard support, focus management
- **Trade-off:** None - better than div + onClick

- **Decision:** Minimum 56px height on cards
- **Rationale:** Touch target size for mobile UX (Apple HIG: 44px minimum, we go higher for comfort)
- **Trade-off:** Slightly taller cards, but better usability

- **Decision:** 2-second animation delay before onSubmit callback
- **Rationale:** Give user time to see feedback before transitioning to next state
- **Trade-off:** Adds 2s latency, but improves comprehension

## Dependencies

### Depends On
None - Standalone component

### Blocks
None - Can be implemented in parallel with other solve methods

## Testing Requirements

- [ ] Test 4 options render with correct labels (A/B/C/D)
- [ ] Test selection highlights option with purple border
- [ ] Test submit button only appears after selection
- [ ] Test submit callback receives correct selectedIndex
- [ ] Test disabled state prevents interaction
- [ ] Test correct answer shows green highlight
- [ ] Test incorrect answer shows red highlight
- [ ] Test keyboard navigation (Tab, Arrow keys, Enter)
- [ ] Test touch targets are minimum 56px height
- [ ] Test animation timing (2s delay before callback)

## Security Considerations

- [ ] Sanitize option text to prevent XSS (use text content, not innerHTML)
- [ ] Validate correctIndex is within bounds (0-3)
- [ ] Validate options array has exactly 4 elements
- [ ] No security implications for user selection data

## Implementation Checklist

- [ ] Create `SolveMCQ.jsx` component file
- [ ] Define PropTypes for props validation
- [ ] Implement state management (selectedIndex, submitted, showResult)
- [ ] Render 4 option cards with A/B/C/D labels
- [ ] Add click handler for option selection
- [ ] Implement visual highlight for selected option
- [ ] Add "Submit Theory" button (conditional render)
- [ ] Implement submit handler with animation delay
- [ ] Add correct/incorrect visual feedback
- [ ] Add disabled state logic
- [ ] Implement keyboard navigation support
- [ ] Test on mobile devices (touch targets)
- [ ] Test with screen reader (accessibility)
- [ ] Add PropTypes validation errors in console (dev mode)

## Verification

**Visual Check:**
1. Render component with 4 test options
2. Verify each card has A/B/C/D label
3. Tap an option
   - Purple border should appear
   - "Submit Theory" button should appear
4. Tap "Submit Theory"
   - Green border on correct answer
   - Red border on incorrect answer (if wrong selection)
   - 2 second delay before callback fires
5. Test disabled prop
   - Cards should be unclickable
   - Submit button should be disabled

**Functional Check:**
```javascript
// Test component in isolation
const testOptions = {
  options: [
    'Photosynthesis occurs in mitochondria',
    'Photosynthesis occurs in chloroplasts',
    'Photosynthesis occurs in ribosomes',
    'Photosynthesis occurs in the nucleus'
  ],
  correctIndex: 1
}

const handleSubmit = (selectedIndex) => {
  console.log('User selected:', selectedIndex)
  console.log('Correct answer:', testOptions.correctIndex)
  console.log('Is correct:', selectedIndex === testOptions.correctIndex)
}

<SolveMCQ theoryOptions={testOptions} onSubmit={handleSubmit} />
```

## Notes

**Design Patterns:**
- Follow existing ShowMe component patterns for consistency
- Use Tailwind classes matching project design tokens
- Match purple accent color from existing quiz components

**Touch Target Sizing:**
- 56px minimum height exceeds iOS (44px) and Android (48dp) guidelines
- Allows comfortable tapping even with large fingers
- Improves accuracy and reduces mis-taps

**Animation Timing:**
- 2-second feedback window is industry standard for quiz apps
- Gives user time to read correct answer and process result
- Prevents jarring immediate transitions

**Accessibility:**
- ARIA labels on buttons for screen readers
- Keyboard navigation with arrow keys
- Focus indicators on selected option
- High contrast borders for visual clarity

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
