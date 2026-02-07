# Dead Code Analysis Report
**Generated:** $(date)
**Tool:** knip + depcheck

## Summary
- **Unused Files:** 17 detected, 16 safe to delete
- **Unused DevDependencies:** 2
- **Unused Exports:** 65
- **Missing Dependencies:** 1

## Files to Delete (SAFE)

### Legacy Components (never imported)
| File | Reason | Status |
|------|--------|--------|
| AchievementBadge.jsx | Legacy badge system | DELETE |
| BadgeCollection.jsx | Legacy badge system | DELETE |
| HomeStats.jsx | Unused stats component | DELETE |
| IdeaOrb.jsx | Legacy animation | DELETE |
| LearnHistory.jsx | Never imported | DELETE |
| LearnModeToggle.jsx | Unused toggle | DELETE |
| OwlAvatar.jsx | Legacy mascot | DELETE |
| StreakCounter.jsx | Replaced by TrophyBadge | DELETE |
| SuggestionCard.jsx | Legacy suggestion | DELETE |

### Legacy Hooks (never imported)
| File | Reason | Status |
|------|--------|--------|
| game/index.js | Empty barrel export | DELETE |
| useQuizRecommendations.js | Legacy | DELETE |
| useQuizTab.js | Unused | DELETE |
| useSlideshowNavigation.js | Legacy | DELETE |
| useTopicManagement.js | Legacy | DELETE |
| useVoiceRecording.js | Legacy | DELETE |

### Legacy Directories
| Path | Reason | Status |
|------|--------|--------|
| components/Game/index.js | Empty barrel | DELETE |

## Files to KEEP

| File | Reason |
|------|--------|
| useVirtualizedHotspots.js | New feature - needs wiring |

## Unused DevDependencies
- eslint-plugin-react
- eslint-plugin-react-hooks

## Missing Dependencies
- prop-types (used but not listed)
