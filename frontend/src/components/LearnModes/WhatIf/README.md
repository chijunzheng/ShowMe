# Wonder Lab - What If? Scenarios

## Overview

Wonder Lab presents counterfactual scenarios that require understanding the lesson content to reason through consequences. The evaluation is non-judgmental and encourages creative scientific thinking.

## Component Structure

```
WhatIf/
├── WonderLab.jsx           # Main orchestrator component
├── SceneIntro.jsx          # Displays scenario with dramatic visual
├── PredictionCards.jsx     # Interactive card selection interface
├── ConsequenceReveal.jsx   # Displays evaluation results
└── BonusFactCard.jsx       # Shows bonus educational fact
```

## State Machine

```
loading → scene → recording → evaluating → results
            ↓                                 ↓
          error ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

## Usage

```jsx
import { WonderLab } from './components/LearnModes'

<WonderLab
  slides={slides}
  topicName="The Moon"
  explanationLevel="standard"
  onComplete={(result) => {
    console.log('XP earned:', result.xpEarned)
  }}
  onExit={() => {
    console.log('User exited')
  }}
/>
```

## Props

### WonderLab

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `slides` | Array | Yes | Content slides from the lesson |
| `topicName` | String | Yes | Name of the topic learned |
| `explanationLevel` | String | No | 'simple' \| 'standard' \| 'deep' (default: 'standard') |
| `onComplete` | Function | No | Called with `{ xpEarned }` when done |
| `onExit` | Function | No | Called when user exits |

## Backend API

### Generate Scenario

**Endpoint**: `POST /api/learn/whatif`

**Request**:
```json
{
  "slides": [...],
  "topicName": "The Moon",
  "explanationLevel": "standard"
}
```

**Response**:
```json
{
  "scenario": "What if the Earth had two moons?",
  "imagePrompt": "Earth from space with two moons orbiting",
  "thinkAboutHints": [
    "How does our moon affect Earth now?",
    "What would change with two moons?"
  ],
  "expectedConsequences": [
    { "concept": "tides", "consequence": "Much stronger" },
    { "concept": "moonlight", "consequence": "Brighter nights" }
  ],
  "bonusFact": "Scientists think coastal cities couldn't exist!"
}
```

### Evaluate Prediction

**Endpoint**: `POST /api/learn/whatif/evaluate`

**Request**:
```json
{
  "userPrediction": "bigger tides and brighter nights",
  "expectedConsequences": [...]
}
```

**Response**:
```json
{
  "matchedPredictions": [
    {
      "concept": "tides",
      "userPhrase": "bigger tides",
      "feedback": "Yes! Two moons = stronger pull"
    }
  ],
  "missedConsequences": [
    { "concept": "orbits", "reveal": "Complex gravitational dance" }
  ],
  "xpEarned": 35
}
```

## Scoring System

| Predictions Matched | XP | Message |
|---------------------|-----|---------|
| 3+ | 50 | "Amazing scientific thinking!" |
| 2 | 35 | "Great predictions!" |
| 1 | 20 | "Good start! Here's more..." |
| 0 | 10 | "Interesting ideas! Let's see..." |

**Philosophy**: No wrong answers, only learning moments. Every attempt earns XP.

## Error Handling

### Backend Errors
- API unavailable → Shows error state with retry
- Invalid input → 400 error with field information
- Generation fails → Error state with "Try Again" button

### Frontend Errors
- Mic access denied → Error message + retry option
- Empty transcription → "Could not understand audio" message
- API errors → Error state with retry and exit options
- Component unmount → Proper cleanup of audio resources

## Customization

### Styling
All components use Tailwind CSS and follow the app's design system:
- Primary color gradient (blue to cyan)
- Dark mode support
- Responsive design (mobile-first)
- Neobrutalism style elements

### Sound Effects
- `playAchievementSound()` on evaluation complete
- Can be customized via `soundEffects.js`

### Haptics
- `vibrateSuccess()` on evaluation complete
- Can be disabled via `haptics.js`

## Accessibility

- Voice-first interface (matches app philosophy)
- Keyboard navigation support
- Clear visual feedback for all states
- Descriptive error messages
- ARIA labels where appropriate
- Responsive design for all screen sizes

## Performance

### Backend
- Scenario generation: ~2-4 seconds
- Evaluation: ~1-2 seconds
- Image generation: Optional, non-blocking (~5-10 seconds)

### Frontend
- Voice recording: Real-time with waveform visualization
- Transcription: ~1-2 seconds
- Smooth state transitions
- No blocking operations

## Language Support

- English (default)
- Simplified Chinese (auto-detected from topicName)
- Uses `detectLanguage()` utility
- Consistent language across all prompts and feedback

## Development

### Local Testing

1. Start backend:
   ```bash
   cd backend && npm run dev
   ```

2. Start frontend:
   ```bash
   cd frontend && npm run dev
   ```

3. Navigate to Wonder Lab:
   - Complete a slideshow
   - Select "Wonder Lab" from mode selector

### Debugging

Enable logging:
```javascript
// In browser console
window.enableLogging()
window.setLogCategories(['LEARN'])
```

Check logs:
- Backend: "Generating What If scenario"
- Backend: "Evaluating What If prediction"
- Frontend: WonderLab state transitions

## Common Issues

### Scenario Generation Fails
**Cause**: Gemini API unavailable or rate limited
**Solution**: Check backend logs, verify API key, retry after delay

### Transcription Empty
**Cause**: Low audio volume or mic quality
**Solution**: Speak more clearly, check mic settings, re-record

### Image Not Loading
**Cause**: Image generation is optional and may fail
**Solution**: Non-blocking, scenario continues without image

### Component Memory Leak
**Cause**: Not cleaning up audio resources
**Solution**: useEffect cleanup is implemented, should not occur

## Testing

### Unit Tests (TODO)
```bash
npm test -- WonderLab
```

### Manual Testing
1. Select Wonder Lab from mode selector
2. Verify scenario generates
3. Check thinking prompts display
4. Test voice recording
5. Verify transcription
6. Submit prediction
7. Check evaluation results
8. Verify XP display
9. Test retry flow
10. Test exit flow

## Contributing

When modifying Wonder Lab:

1. **Follow immutability patterns**
   ```javascript
   // CORRECT
   setResults({ ...results, xp: newXp })

   // WRONG
   results.xp = newXp
   ```

2. **Use logger for debugging**
   ```javascript
   logger.info('LEARN', 'Action description', { context })
   ```

3. **Handle all error cases**
   ```javascript
   try {
     await apiCall()
   } catch (error) {
     logger.error('LEARN', 'Error description', { error: error.message })
     setError('User-friendly message')
   }
   ```

4. **Clean up resources**
   ```javascript
   useEffect(() => {
     // Setup
     return () => {
       // Cleanup
     }
   }, [])
   ```

5. **Test in both languages**
   - English topic: "The Moon"
   - Chinese topic: "月球"

## License

Part of the ShowMe educational app.
