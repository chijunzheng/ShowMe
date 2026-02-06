# Feature: SlideReference Component

**ID:** 04
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Low
**Dependencies:** -

## Description

Create an inline slide reference component that displays a small thumbnail of a referenced slide. Tapping the thumbnail opens a fullscreen modal overlay to view the slide in detail. Maps 1-indexed slideRef to slides array.

## Acceptance Criteria

- [ ] Component accepts `slideRef` (1-indexed), `slides` array, `caption` props
- [ ] Displays small 16:9 thumbnail of referenced slide image
- [ ] Shows caption below thumbnail
- [ ] Tapping thumbnail opens fullscreen modal
- [ ] Modal shows full-size slide image
- [ ] Modal includes subtitle text if available
- [ ] Modal has close button (X in corner)
- [ ] Tapping outside modal closes it
- [ ] Component handles invalid slideRef gracefully (shows "Slide not found")
- [ ] Responsive: works on mobile and desktop

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/SlideReference.jsx` (~90 lines)

### Key Components

1. **Component Structure**:
   ```jsx
   import { useState } from 'react';

   export function SlideReference({ slideRef, slides, caption }) {
     const [isModalOpen, setIsModalOpen] = useState(false);

     // Convert 1-indexed slideRef to 0-indexed array access
     const slide = slideRef && slides ? slides[slideRef - 1] : null;

     if (!slide) {
       return (
         <div className="text-sm text-gray-500 italic">
           Slide reference not found
         </div>
       );
     }

     return (
       <>
         {/* Inline thumbnail */}
         <div
           className="inline-block cursor-pointer"
           onClick={() => setIsModalOpen(true)}
         >
           <div className="w-48 rounded-lg overflow-hidden border-2 border-gray-300 hover:border-indigo-500 transition-colors">
             <img
               src={slide.imageUrl}
               alt={caption || `Slide ${slideRef}`}
               className="w-full aspect-video object-cover"
             />
           </div>
           {caption && (
             <p className="text-xs text-gray-600 mt-1 text-center">
               {caption}
             </p>
           )}
         </div>

         {/* Fullscreen modal */}
         {isModalOpen && (
           <SlideModal
             slide={slide}
             slideRef={slideRef}
             onClose={() => setIsModalOpen(false)}
           />
         )}
       </>
     );
   }
   ```

2. **Fullscreen Modal**:
   ```jsx
   function SlideModal({ slide, slideRef, onClose }) {
     return (
       <div
         className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
         onClick={onClose}
       >
         <div
           className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden"
           onClick={(e) => e.stopPropagation()}
         >
           {/* Close button */}
           <button
             className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-700 hover:text-gray-900 z-10"
             onClick={onClose}
           >
             ✕
           </button>

           {/* Slide image */}
           <img
             src={slide.imageUrl}
             alt={`Slide ${slideRef}`}
             className="w-full aspect-video object-contain bg-gray-100"
           />

           {/* Subtitle (if available) */}
           {slide.subtitle && (
             <div className="p-4 bg-gray-50 border-t border-gray-200">
               <p className="text-gray-800 text-center">
                 {slide.subtitle}
               </p>
             </div>
           )}
         </div>
       </div>
     );
   }
   ```

### Technical Decisions

- **Decision:** 1-indexed slideRef in props, 0-indexed array access
- **Rationale:** Clues use 1-indexed references (user-facing), arrays are 0-indexed (code)
- **Trade-off:** Simple conversion, but must be careful with off-by-one errors

- **Decision:** Inline component (not separate page)
- **Rationale:** Keeps user in context, quick reference
- **Trade-off:** Modal overlay instead of navigation, but better UX

- **Decision:** Fixed 16:9 aspect ratio
- **Rationale:** Matches slide generation aspect ratio
- **Trade-off:** Consistent layout, assumes all slides are 16:9

## Dependencies

### Depends On
None - Standalone component

### Blocks
- **Feature 10:** ClueInvestigation (renders SlideReference inline)

## Testing Requirements

### Visual Testing

- [ ] Test with valid slideRef (shows thumbnail)
- [ ] Test with invalid slideRef (shows "not found" message)
- [ ] Test with caption (shows below thumbnail)
- [ ] Test without caption (no caption text)
- [ ] Test thumbnail hover state (border color changes)
- [ ] Test modal opens on click
- [ ] Test modal close button works
- [ ] Test modal closes on outside click
- [ ] Test modal doesn't close on inside click
- [ ] Test with subtitle (shows in modal footer)
- [ ] Test without subtitle (no footer in modal)

### Responsive Testing

- [ ] Test thumbnail on mobile (375px)
- [ ] Test modal on mobile (full width, padded)
- [ ] Test thumbnail on desktop (maintains 192px width)
- [ ] Test modal on desktop (max-width 1024px)

### Integration Testing

```jsx
// Test component in mystery context
function TestSlideReference() {
  const slides = [
    { imageUrl: '/slide1.jpg', subtitle: 'First slide' },
    { imageUrl: '/slide2.jpg', subtitle: 'Second slide' },
    { imageUrl: '/slide3.jpg' } // No subtitle
  ];

  return (
    <div className="p-8">
      <p>Check out this evidence:</p>
      <SlideReference
        slideRef={2}
        slides={slides}
        caption="The key clue"
      />
    </div>
  );
}
```

## Security Considerations

- [ ] Validate slideRef is a number
- [ ] Validate slides is an array
- [ ] Sanitize caption (no XSS)
- [ ] No user-provided imageUrl (comes from backend)
- [ ] Modal z-index doesn't conflict with other modals

## Implementation Checklist

- [ ] Create `SlideReference.jsx` in Mystery component directory
- [ ] Import useState for modal state
- [ ] Add props: slideRef, slides, caption
- [ ] Implement 1-indexed to 0-indexed conversion
- [ ] Add null check for invalid slideRef
- [ ] Render thumbnail with 16:9 aspect ratio
- [ ] Add caption below thumbnail (conditional)
- [ ] Add click handler to open modal
- [ ] Create SlideModal sub-component
- [ ] Implement modal backdrop (fixed overlay)
- [ ] Implement modal content container
- [ ] Add close button in corner
- [ ] Add click outside to close
- [ ] Prevent modal close on inside click
- [ ] Show slide image in modal
- [ ] Show subtitle in modal footer (conditional)
- [ ] Add hover styles for thumbnail
- [ ] Add transition for border color
- [ ] Test with valid and invalid slideRefs
- [ ] Test modal open/close interactions
- [ ] Verify responsive behavior

## Verification

**Visual Check:**
1. Render component with slideRef=2, slides array (3 items), caption
2. Verify thumbnail shows slides[1] image
3. Verify caption appears below thumbnail
4. Hover thumbnail
5. Verify border changes to indigo
6. Click thumbnail
7. Verify modal opens with full image
8. Verify subtitle appears in footer
9. Click outside modal
10. Verify modal closes
11. Render with slideRef=999 (invalid)
12. Verify "Slide reference not found" message

**Code Check:**
```javascript
// slideRef=1 should access slides[0]
const slide = slides[slideRef - 1]; // slideRef=1 → slides[0] ✓

// slideRef=0 should be invalid (show "not found")
const slide = slides[0 - 1]; // slides[-1] → undefined → "not found" ✓

// slideRef=4 with 3 slides should be invalid
const slide = slides[4 - 1]; // slides[3] → undefined → "not found" ✓
```

## Notes

**Usage in ClueInvestigation:**
```jsx
// Clue text with inline slide reference
<p>
  The plant's leaves contain chlorophyll, as shown in{' '}
  <SlideReference
    slideRef={clue.slideRef}
    slides={slides}
    caption="Chlorophyll structure"
  />
</p>
```

**Styling Guidelines:**
- Thumbnail: 192px width (w-48), 16:9 aspect ratio
- Border: 2px gray-300, hover → indigo-500
- Modal backdrop: black with 80% opacity
- Modal content: white, rounded-lg, max-width 1024px
- Close button: 32px circle, white/90 background, hover → white
- Subtitle: gray-50 background, gray-800 text

**Accessibility:**
- Thumbnail has alt text
- Close button has accessible label
- Modal has role="dialog"
- Focus trap in modal (optional enhancement)
- Escape key closes modal (optional enhancement)

**Edge Cases:**
- slideRef=null → show "not found"
- slideRef=0 → show "not found" (1-indexed)
- slideRef > slides.length → show "not found"
- slides=undefined → show "not found"
- slides=[] → show "not found"
- slide.imageUrl missing → broken image (browser handles)

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
**Track:** B (Frontend Utilities)
