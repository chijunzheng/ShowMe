# Feature: SolveVoiceText Extract

**ID:** 08
**Status:** ⬜ Not Started
**Priority:** Medium
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Extract existing voice recording and text typing logic from `TheorySolver.jsx` (lines 91-442) into a standalone solve method component. This is a pure extraction task, not a rewrite. The component should maintain identical functionality: voice recording with MediaRecorder API, text input textarea, toggle between modes, and speech-to-text processing.

## Acceptance Criteria

- [ ] Voice recording with MediaRecorder API works identically to original
- [ ] Text input textarea works identically to original
- [ ] Toggle between voice and text mode preserved
- [ ] Submit sends theory text + isVoice flag
- [ ] Character limit on text input enforced (e.g., 500 chars)
- [ ] Voice recording timeout enforced (max 60s)
- [ ] Microphone permission denial handled gracefully
- [ ] Loading state during speech-to-text processing shown
- [ ] Error messages match original component
- [ ] All PropTypes defined for validation

## Implementation Details

### Files to Create

- `frontend/src/components/LearnModes/Mystery/SolveVoiceText.jsx` (~250 lines, NEW)

### Files to Reference (DO NOT MODIFY)

- `frontend/src/components/LearnModes/Mystery/TheorySolver.jsx` (lines 91-442) - Source code to extract

### Key Changes

1. **Component Props Interface**:
   ```javascript
   SolveVoiceText.propTypes = {
     topicName: PropTypes.string.isRequired, // For context in voice prompt
     expectedConcepts: PropTypes.arrayOf(PropTypes.string).isRequired, // For validation hints
     onSubmit: PropTypes.func.isRequired, // ({ theory: string, isVoice: boolean }) => void
     disabled: PropTypes.bool
   }
   ```

2. **Component State (Extracted from TheorySolver)**:
   ```javascript
   // Mode toggle
   const [isVoiceMode, setIsVoiceMode] = useState(true)

   // Voice recording state
   const [isRecording, setIsRecording] = useState(false)
   const [recordingTime, setRecordingTime] = useState(0)
   const [audioBlob, setAudioBlob] = useState(null)
   const [mediaRecorder, setMediaRecorder] = useState(null)

   // Text input state
   const [theoryText, setTheoryText] = useState('')

   // Processing state
   const [isProcessing, setIsProcessing] = useState(false)
   const [error, setError] = useState(null)

   // Refs
   const recordingTimerRef = useRef(null)
   const MAX_RECORDING_TIME = 60 // seconds
   const MAX_TEXT_LENGTH = 500 // characters
   ```

3. **Voice Recording Logic (Extract from lines ~150-280)**:
   ```javascript
   const startRecording = async () => {
     try {
       const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
       const recorder = new MediaRecorder(stream)
       const chunks = []

       recorder.ondataavailable = (e) => {
         if (e.data.size > 0) {
           chunks.push(e.data)
         }
       }

       recorder.onstop = () => {
         const blob = new Blob(chunks, { type: 'audio/webm' })
         setAudioBlob(blob)
         stream.getTracks().forEach(track => track.stop())
       }

       recorder.start()
       setMediaRecorder(recorder)
       setIsRecording(true)
       setRecordingTime(0)

       // Start timer
       recordingTimerRef.current = setInterval(() => {
         setRecordingTime(prev => {
           if (prev >= MAX_RECORDING_TIME) {
             stopRecording()
             return prev
           }
           return prev + 1
         })
       }, 1000)

     } catch (err) {
       console.error('Microphone access error:', err)
       setError('Microphone access denied. Please enable microphone permissions.')
     }
   }

   const stopRecording = () => {
     if (mediaRecorder && mediaRecorder.state !== 'inactive') {
       mediaRecorder.stop()
     }

     if (recordingTimerRef.current) {
       clearInterval(recordingTimerRef.current)
       recordingTimerRef.current = null
     }

     setIsRecording(false)
   }
   ```

4. **Speech-to-Text API Call (Extract from lines ~300-350)**:
   ```javascript
   const processVoiceTheory = async () => {
     if (!audioBlob) return

     setIsProcessing(true)
     setError(null)

     try {
       const formData = new FormData()
       formData.append('audio', audioBlob, 'theory.webm')
       formData.append('topicName', topicName)

       const response = await fetch('/api/speech-to-text', {
         method: 'POST',
         body: formData
       })

       if (!response.ok) {
         throw new Error('Speech-to-text processing failed')
       }

       const data = await response.json()
       const transcribedText = data.text

       // Submit immediately after transcription
       onSubmit({
         theory: transcribedText,
         isVoice: true
       })

     } catch (err) {
       console.error('Speech-to-text error:', err)
       setError('Failed to process voice recording. Please try again.')
     } finally {
       setIsProcessing(false)
     }
   }
   ```

5. **Text Input Logic (Extract from lines ~360-400)**:
   ```javascript
   const handleTextChange = (e) => {
     const text = e.target.value
     if (text.length <= MAX_TEXT_LENGTH) {
       setTheoryText(text)
     }
   }

   const submitTextTheory = () => {
     if (theoryText.trim().length === 0) {
       setError('Please enter your theory.')
       return
     }

     onSubmit({
       theory: theoryText.trim(),
       isVoice: false
     })
   }
   ```

6. **UI Rendering (Extract from lines ~91-149, ~420-442)**:
   ```jsx
   return (
     <div className="solve-voice-text">
       {/* Mode Toggle */}
       <div className="flex gap-2 mb-4">
         <button
           onClick={() => setIsVoiceMode(true)}
           className={`flex-1 py-2 rounded ${isVoiceMode ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
         >
           Voice
         </button>
         <button
           onClick={() => setIsVoiceMode(false)}
           className={`flex-1 py-2 rounded ${!isVoiceMode ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
         >
           Text
         </button>
       </div>

       {/* Error Display */}
       {error && (
         <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
           {error}
         </div>
       )}

       {/* Voice Mode */}
       {isVoiceMode && (
         <div className="voice-section">
           {!audioBlob ? (
             <>
               <button
                 onClick={isRecording ? stopRecording : startRecording}
                 disabled={disabled || isProcessing}
                 className={`
                   w-20 h-20 rounded-full mx-auto mb-4
                   ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}
                 `}
               >
                 {isRecording ? 'Stop' : 'Record'}
               </button>
               {isRecording && (
                 <p className="text-center text-gray-600">
                   {recordingTime}s / {MAX_RECORDING_TIME}s
                 </p>
               )}
             </>
           ) : (
             <>
               <p className="text-center mb-4">Recording complete ({recordingTime}s)</p>
               <div className="flex gap-2">
                 <button
                   onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                   className="flex-1 py-2 border rounded"
                 >
                   Re-record
                 </button>
                 <button
                   onClick={processVoiceTheory}
                   disabled={isProcessing}
                   className="flex-1 py-2 bg-purple-500 text-white rounded"
                 >
                   {isProcessing ? 'Processing...' : 'Submit'}
                 </button>
               </div>
             </>
           )}
         </div>
       )}

       {/* Text Mode */}
       {!isVoiceMode && (
         <div className="text-section">
           <textarea
             value={theoryText}
             onChange={handleTextChange}
             disabled={disabled || isProcessing}
             placeholder="Type your theory here..."
             className="w-full min-h-[120px] p-3 border rounded resize-none"
             maxLength={MAX_TEXT_LENGTH}
           />
           <div className="flex justify-between items-center mt-2">
             <span className="text-sm text-gray-500">
               {theoryText.length} / {MAX_TEXT_LENGTH}
             </span>
             <button
               onClick={submitTextTheory}
               disabled={disabled || isProcessing || theoryText.trim().length === 0}
               className="px-6 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
             >
               Submit Theory
             </button>
           </div>
         </div>
       )}
     </div>
   )
   ```

### Technical Decisions

- **Decision:** Pure extraction, no refactoring
- **Rationale:** Minimize risk of breaking existing functionality
- **Trade-off:** May carry over tech debt, but ensures identical behavior

- **Decision:** Keep MediaRecorder API implementation
- **Rationale:** Already proven to work in production
- **Trade-off:** Browser compatibility (but already accepted in original)

- **Decision:** Maintain same error messages and UX flow
- **Rationale:** Users are familiar with current behavior
- **Trade-off:** None - consistency is a benefit

- **Decision:** Use same API endpoint (`/api/speech-to-text`)
- **Rationale:** Backend already supports this endpoint
- **Trade-off:** None - reuses existing infrastructure

## Dependencies

### Depends On
None - Standalone component (but references existing backend API)

### Blocks
None - Can be implemented in parallel with other solve methods

## Testing Requirements

- [ ] Test voice mode toggle switches UI
- [ ] Test text mode toggle switches UI
- [ ] Test start recording captures audio
- [ ] Test stop recording saves audio blob
- [ ] Test recording timer increments every second
- [ ] Test recording auto-stops at 60s
- [ ] Test microphone permission denial shows error
- [ ] Test submit voice calls speech-to-text API
- [ ] Test speech-to-text success triggers onSubmit with isVoice:true
- [ ] Test text input respects 500 character limit
- [ ] Test text submit triggers onSubmit with isVoice:false
- [ ] Test empty text shows error on submit
- [ ] Test disabled prop prevents all interactions
- [ ] Test isProcessing state shows loading indicators
- [ ] Test re-record clears audioBlob and resets timer

## Security Considerations

- [ ] Sanitize text input before submission (prevent XSS)
- [ ] Validate audio blob size before upload (prevent DoS)
- [ ] Use HTTPS for microphone access (browser requirement)
- [ ] Validate recording duration on backend (don't trust client timer)
- [ ] Rate limit speech-to-text API calls (prevent abuse)
- [ ] Sanitize transcribed text from API (don't trust external service)

## Implementation Checklist

- [ ] Create `SolveVoiceText.jsx` component file
- [ ] Copy lines 91-442 from `TheorySolver.jsx` as baseline
- [ ] Extract state variables into component state
- [ ] Extract voice recording logic into handlers
- [ ] Extract text input logic into handlers
- [ ] Extract speech-to-text API call into function
- [ ] Define PropTypes for component props
- [ ] Replace hardcoded values with props (topicName, expectedConcepts)
- [ ] Update onSubmit to use prop callback
- [ ] Test voice recording flow end-to-end
- [ ] Test text input flow end-to-end
- [ ] Test mode toggle preserves state
- [ ] Test error handling for all failure cases
- [ ] Test on multiple browsers (Chrome, Safari, Firefox)
- [ ] Test on mobile devices (iOS Safari, Chrome Android)

## Verification

**Visual Check:**
1. Render component in isolation
2. Verify two tabs: "Voice" and "Text"
3. Voice tab selected by default
4. Tap "Record" button
   - Button turns red, starts pulsing
   - Timer shows 0s / 60s
   - Timer increments every second
5. Tap "Stop" button
   - Recording stops
   - Shows "Re-record" and "Submit" buttons
6. Tap "Submit"
   - Shows "Processing..." loading state
   - onSubmit callback fires with { theory: string, isVoice: true }
7. Switch to "Text" tab
   - Shows textarea with placeholder
   - Shows character counter (0 / 500)
8. Type text
   - Counter updates
   - Stops at 500 characters
9. Tap "Submit Theory"
   - onSubmit callback fires with { theory: string, isVoice: false }

**Functional Check:**
```javascript
// Test component in isolation
const handleSubmit = ({ theory, isVoice }) => {
  console.log('Theory submitted:', theory)
  console.log('Is voice:', isVoice)
}

<SolveVoiceText
  topicName="Photosynthesis"
  expectedConcepts={['chloroplasts', 'sunlight', 'oxygen']}
  onSubmit={handleSubmit}
/>
```

**Browser Compatibility:**
```javascript
// Check MediaRecorder support
if (!navigator.mediaDevices || !window.MediaRecorder) {
  console.warn('Voice recording not supported in this browser')
}

// Check getUserMedia support
if (!navigator.mediaDevices.getUserMedia) {
  console.warn('Microphone access not supported in this browser')
}
```

## Notes

**Extraction Scope:**
- Lines 91-442 of `TheorySolver.jsx` contain complete voice/text logic
- This includes: state, handlers, API calls, and UI rendering
- External dependencies: `/api/speech-to-text` backend endpoint
- No new features added, pure extraction only

**Why Pure Extraction:**
- Original code is production-tested and working
- Refactoring introduces risk of breaking changes
- Can optimize later after confirming extraction works
- Faster implementation (copy-paste-adapt vs rewrite)

**Backend API Dependency:**
- `/api/speech-to-text` must exist and accept FormData with audio file
- Backend should return `{ text: string }` with transcribed text
- No changes needed to backend for this extraction

**MediaRecorder Browser Support:**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Supported since iOS 14.3+ (2020)
- Fallback: Show error message if not supported

**Mobile Considerations:**
- Microphone permission prompt on first use
- Recording works in background (iOS Safari, Chrome Android)
- Text input uses native keyboard on mobile
- Voice mode preferred on mobile (easier than typing)

**State Cleanup:**
- Clear interval timer on unmount (prevent memory leak)
- Stop media tracks on unmount (release microphone)
- Clear error messages on mode switch
- Reset audioBlob on re-record

---

**Created:** 2026-02-05
**Last Updated:** 2026-02-05
