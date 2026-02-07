# Feature: Integration & Polish

## Dependencies

```
Depends on: 02-mystery-lab, 03-wonder-lab, 04-story-studio (ALL required)
Blocks: Nothing (FINAL PHASE)
Can parallel with: Nothing
```

---

## Goal

Connect all 3 learning modes to existing gamification, XP, world systems, and polish the experience.

---

## Integration Tasks

### 1. XP System Connection

Connect mode XP to existing `useQuizGamification.js`:

```javascript
// Each mode calls this on completion
const { addXP, triggerCelebration } = useQuizGamification()

// Mystery Lab
addXP(result.xpEarned, 'mystery_lab')

// Wonder Lab
addXP(result.xpEarned, 'wonder_lab')

// Story Studio
addXP(result.xpEarned, 'story_studio')
```

### 2. Living World Integration

Unlock world regions through mode completion:

```javascript
// On mode completion
if (result.passed) {
  unlockWorldPiece(topicId, mode)
}
```

### 3. Stats Tracking

Add mode completion to user stats:

```javascript
// Track in stats
{
  mysteriesSOlved: 5,
  whatIfExplored: 8,
  storiesCreated: 3,
  totalModeXP: 450
}
```

### 4. Celebration Reuse

Use existing celebration components:

| Celebration | When |
|-------------|------|
| `MicroCelebration.jsx` | Concept matched |
| `StreakFlames.jsx` | Multiple modes in session |
| New: `ModeComplete.jsx` | Mode finished |

---

## Polish Tasks

### Mode-Specific Badges

| Mode | Badges |
|------|--------|
| Mystery Lab | Junior Detective, Master Detective, Sherlock |
| Wonder Lab | Curious Mind, Deep Thinker, Visionary |
| Story Studio | Storyteller, Creative Genius, Master Author |

### Transition Animations

- Mode card → Mode screen (expand animation)
- Mode complete → Back to selector (shrink + celebrate)
- XP earned → Profile update (fly animation)

### Sound Effects

| Event | Sound |
|-------|-------|
| Mode select | Soft "whoosh" |
| Recording start | Gentle "bloop" |
| Concept matched | Positive chime |
| Mode complete | Celebration fanfare |

---

## Files to Modify

| File | Changes |
|------|---------|
| `useQuizGamification.js` | Add mode XP tracking |
| `LivingWorldView.jsx` | Unlock regions from modes |
| `StatsBar.jsx` | Display mode stats |
| `TrophyShowcase.jsx` | Mode-specific badges |

---

## Cleanup Tasks

### Remove Traditional Quiz

- [ ] Remove/disable 12 question type components
- [ ] Remove quiz generation endpoint usage
- [ ] Clean up unused quiz state
- [ ] Update any quiz references in UI

### Code Cleanup

- [ ] Remove dead quiz code
- [ ] Consolidate shared mode utilities
- [ ] Add TypeScript types for mode content
- [ ] Update CLAUDE.md with new architecture

---

## Verification

### Integration Tests

- [ ] XP from Mystery Lab adds to profile
- [ ] XP from Wonder Lab adds to profile
- [ ] XP from Story Studio adds to profile
- [ ] Living World updates on mode completion
- [ ] Stats reflect mode activity
- [ ] Badges awarded correctly

### Polish Tests

- [ ] Transitions feel smooth
- [ ] Sound effects play correctly
- [ ] Celebrations trigger appropriately
- [ ] No console errors
- [ ] Performance acceptable (< 100ms transitions)

### Cleanup Tests

- [ ] Traditional quiz code removed
- [ ] No broken imports
- [ ] All tests pass
- [ ] Build succeeds
