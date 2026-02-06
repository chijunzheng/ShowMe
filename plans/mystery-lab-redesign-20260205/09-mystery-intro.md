# Feature: MysteryIntro Component

**ID:** 09
**Status:** ⬜ Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 03 (TTS Narration Hook)

## Description

Case setup screen for the mystery. Shows manga scene image, case title, mystery setup text with auto-TTS narration. "Investigate" button advances to clue phase. This component replaces the legacy MysteryScene.jsx with a cleaner, more focused implementation.

## Acceptance Criteria

- [ ] Full-width manga scene image with 16:9 aspect ratio
- [ ] Gradient overlay on scene image for text readability
- [ ] Detective emoji placeholder shown until image loads
- [ ] Case title displayed in large font (text-2xl+ bold)
- [ ] Mystery setup text displayed below title
- [ ] TTS auto-narrates mysterySetup on mount
- [ ] "Investigate" button at bottom (large 48px+, purple gradient)
- [ ] Button disabled while TTS is playing (optional UX enhancement)
- [ ] Handles missing sceneImage gracefully (show placeholder only)
- [ ] No console errors during render or narration

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/MysteryIntro.jsx` (~120 lines, NEW)

### Component Props

```typescript
interface MysteryIntroProps {
  mysteryTitle: string;        // Case title (e.g., "The Case of the Missing Photons")
  mysterySetup: string;         // Setup text to display and narrate
  sceneImage: string | null;    // URL to manga scene image or null
  isTtsPlaying: boolean;        // Whether TTS is currently playing
  onNext: () => void;           // Callback when "Investigate" clicked
}
```

### Key Implementation Details

1. **Image Loading with Placeholder**:
   ```jsx
   const [imageLoaded, setImageLoaded] = useState(false);

   <div className="relative w-full aspect-video bg-slate-800 rounded-lg overflow-hidden">
     {!imageLoaded && (
       <div className="absolute inset-0 flex items-center justify-center">
         <span className="text-8xl">🕵️</span>
       </div>
     )}
     {sceneImage && (
       <img
         src={sceneImage}
         alt="Mystery scene"
         className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
         onLoad={() => setImageLoaded(true)}
       />
     )}
     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
   </div>
   ```

2. **Auto-TTS on Mount**:
   ```jsx
   useEffect(() => {
     // Trigger narration via useMysteryNarration hook passed from parent
     // Parent handles the actual TTS logic
     onNext(); // This should trigger parent's narration setup
   }, []); // Run once on mount
   ```

3. **Button State**:
   ```jsx
   <button
     onClick={onNext}
     disabled={isTtsPlaying}
     className={`
       w-full py-4 rounded-xl text-lg font-semibold
       bg-gradient-to-r from-purple-600 to-indigo-600
       text-white shadow-lg
       ${isTtsPlaying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
       transition-all duration-200
     `}
   >
     {isTtsPlaying ? 'Narrating...' : '🔍 Investigate'}
   </button>
   ```

### Technical Decisions

- **Decision:** Use aspect-video (16:9) for image container
- **Rationale:** Consistent with slideshow image ratios, looks professional
- **Trade-off:** May crop some images, but ensures layout stability

- **Decision:** Optional button disable during TTS
- **Rationale:** Prevents users from skipping narration too quickly, but can be annoying
- **Trade-off:** Better UX to allow skip, so make this configurable

- **Decision:** Gradient overlay on image
- **Rationale:** Ensures text readability regardless of image content
- **Trade-off:** Slight visual obstruction, but necessary for accessibility

## Dependencies

### Depends On
- **Feature 03:** TTS Narration Hook must be implemented for auto-narration

### Blocks
- **Feature 13:** MysteryLab Rewrite requires this component

### Deprecates
- `MysteryScene.jsx` - Replaced by this new implementation

## Testing Requirements

- [ ] Test renders title and setup text correctly
- [ ] Test image placeholder shown before load
- [ ] Test investigate button calls onNext callback
- [ ] Test button disabled state when isTtsPlaying=true
- [ ] Test missing image fallback (sceneImage=null)
- [ ] Test gradient overlay applies correctly
- [ ] Test emoji placeholder displays centered
- [ ] Test image onLoad handler fires and swaps placeholder
- [ ] Test component unmounts without errors
- [ ] Test mobile responsive layout

## Security Considerations

- [ ] No user input - content comes from API
- [ ] Image URLs sanitized by parent component
- [ ] No XSS risk - all text rendered as text nodes, not HTML

## Implementation Checklist

- [ ] Create MysteryIntro.jsx component file
- [ ] Define TypeScript/PropTypes for props validation
- [ ] Implement image container with aspect-video ratio
- [ ] Add detective emoji placeholder with conditional rendering
- [ ] Implement onLoad handler for image loading state
- [ ] Add gradient overlay div (absolute positioned)
- [ ] Render mystery title with text-2xl+ bold styling
- [ ] Render mystery setup text below title
- [ ] Add investigate button with purple gradient
- [ ] Implement button disabled state tied to isTtsPlaying
- [ ] Add useEffect hook for auto-narration trigger
- [ ] Test all acceptance criteria
- [ ] Verify no console errors or warnings
- [ ] Test mobile layout and responsiveness

## Verification

**Visual Check:**
1. Navigate to Mystery Lab mode
2. Verify scene image loads with placeholder
   - Should show detective emoji while loading
   - Should fade in manga scene when loaded
3. Verify gradient overlay is visible
   - Text should be readable over any image
4. Verify title is large and bold
5. Verify setup text is clearly readable
6. Click "Investigate" button
   - Should advance to clue investigation phase
   - Should disable during TTS (if implemented)

**Functional Check:**
```bash
# Test component in isolation
# In browser console:
const props = {
  mysteryTitle: "Test Mystery",
  mysterySetup: "This is a test setup text.",
  sceneImage: null,
  isTtsPlaying: false,
  onNext: () => console.log('Next clicked')
};
# Verify placeholder shows when sceneImage=null
```

## Notes

**Design Rationale:**
- Clean, manga-style aesthetic matches the "Mystery Lab" theme
- Large text ensures readability on mobile devices
- Gradient overlay is subtle but effective for text contrast
- Detective emoji adds playful touch while image loads

**TTS Integration:**
- Parent component manages TTS state via useMysteryNarration hook
- This component just receives isTtsPlaying and triggers narration
- Keeps separation of concerns clean

**Missing Image Handling:**
- Gracefully falls back to emoji placeholder
- No broken image icon shown
- Maintains layout stability even without image

**Accessibility:**
- Large touch target for investigate button (48px+)
- High contrast text over gradient overlay
- Image alt text for screen readers
- Semantic button element for keyboard navigation

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Implemented By:** TBD
