# Feature: Expanded Category Pool with Random Selection

**ID:** 01
**Status:** ✅ Completed
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** None

## Description

Replace the current open-ended prompt ("mix of categories") with a constrained random selection system. Before calling Gemini, randomly pick a specific category AND subtopic, then ask Gemini to generate a question within those bounds.

## Acceptance Criteria

- [x] Category pool has 20+ categories with 4-5 subtopics each
- [x] Each API call randomly selects one category and one subtopic
- [x] Prompt explicitly constrains Gemini to the selected category/subtopic
- [x] Generated topics show variety across categories over 10+ requests
- [x] No degradation in topic quality or response time

## Implementation Details

### Files to Modify

- `backend/src/services/gemini.js` - Add category pool, modify `generateRandomTopic` function

### Key Changes

1. **Add Category Pool Constant** (before `generateRandomTopic` function)
```javascript
const TOPIC_CATEGORIES = [
  { name: 'Biology', subtopics: ['cells', 'ecosystems', 'evolution', 'anatomy', 'genetics'] },
  { name: 'Physics', subtopics: ['gravity', 'light', 'electricity', 'magnetism', 'sound', 'motion'] },
  { name: 'Chemistry', subtopics: ['elements', 'reactions', 'molecules', 'states of matter', 'acids'] },
  { name: 'Space', subtopics: ['planets', 'stars', 'galaxies', 'black holes', 'astronauts', 'moons'] },
  { name: 'Earth Science', subtopics: ['volcanoes', 'earthquakes', 'weather', 'oceans', 'rocks', 'fossils'] },
  { name: 'Animals', subtopics: ['mammals', 'birds', 'insects', 'ocean life', 'dinosaurs', 'reptiles'] },
  { name: 'Plants', subtopics: ['trees', 'flowers', 'photosynthesis', 'seeds', 'rainforests', 'fungi'] },
  { name: 'Human Body', subtopics: ['brain', 'heart', 'bones', 'senses', 'digestion', 'muscles'] },
  { name: 'Technology', subtopics: ['computers', 'internet', 'robots', 'inventions', 'AI', 'smartphones'] },
  { name: 'History', subtopics: ['ancient civilizations', 'inventions', 'explorers', 'medieval times', 'ancient egypt'] },
  { name: 'Math', subtopics: ['numbers', 'patterns', 'shapes', 'puzzles', 'infinity', 'probability'] },
  { name: 'Engineering', subtopics: ['bridges', 'buildings', 'machines', 'vehicles', 'dams', 'tunnels'] },
  { name: 'Food Science', subtopics: ['cooking', 'nutrition', 'preservation', 'fermentation', 'baking'] },
  { name: 'Psychology', subtopics: ['memory', 'dreams', 'emotions', 'learning', 'perception', 'sleep'] },
  { name: 'Music', subtopics: ['instruments', 'sound waves', 'composers', 'rhythm', 'singing'] },
  { name: 'Art', subtopics: ['colors', 'famous artists', 'techniques', 'optical illusions', 'sculpture'] },
  { name: 'Sports Science', subtopics: ['muscles', 'training', 'equipment', 'records', 'olympics'] },
  { name: 'Weather', subtopics: ['storms', 'clouds', 'seasons', 'climate', 'rainbows', 'snow'] },
  { name: 'Ocean', subtopics: ['deep sea', 'coral reefs', 'waves', 'marine animals', 'tides'] },
  { name: 'Aviation', subtopics: ['planes', 'helicopters', 'airports', 'flight physics', 'drones'] },
]
```

2. **Modify `generateRandomTopic` function** (~line 1607)

Inside the function, before building the prompt:
```javascript
// Pick random category and subtopic for constrained generation
const randomCategory = TOPIC_CATEGORIES[Math.floor(Math.random() * TOPIC_CATEGORIES.length)]
const randomSubtopic = randomCategory.subtopics[Math.floor(Math.random() * randomCategory.subtopics.length)]
```

3. **Update the prompt** to use constrained category:
```javascript
const promptBase = `Generate ONE educational question about ${randomCategory.name}, specifically related to ${randomSubtopic}.

Requirements:
- Topic should spark curiosity and be visually explainable
- Phrase it as a question (e.g., "Why do cats purr?" or "How do volcanoes form?")
- Keep it concise (under 10 words)
- Avoid controversial, political, or sensitive topics
- Focus on: ${randomCategory.name} - ${randomSubtopic}
${cleanedExclude.length > 0 ? `- Avoid repeating these recent topics: ${cleanedExclude.map((topic) => \`"\${topic}"\`).join(', ')}` : ''}

Return ONLY valid JSON (no markdown):
{
  "topic": "the question",
  "category": "${randomCategory.name}",
  "emoji": "one relevant emoji"
}

Example for ${randomCategory.name}/${randomSubtopic}:
{"topic": "How do ${randomSubtopic} work?", "category": "${randomCategory.name}", "emoji": "🔬"}`
```

### Technical Decisions

- **Pre-selection vs Post-filtering**: Pre-selecting category before API call is more efficient than filtering responses
- **Category in response**: Keep category in response but pre-fill it to ensure consistency
- **Subtopic granularity**: 4-5 subtopics per category provides enough variety without being overwhelming

## Dependencies

### Depends On
- None

### Blocks
- None (can be implemented independently)

## Testing Requirements

- [ ] Manual test: Click "Surprise Me" 10+ times, verify category variety
- [ ] Verify response format unchanged (topic, category, emoji)
- [ ] Verify exclude list still prevents exact duplicates

## Security Considerations

- [ ] No user input involved - category pool is static
- [ ] No new attack vectors introduced

## Implementation Checklist

- [x] Add TOPIC_CATEGORIES constant
- [x] Add random selection logic in generateRandomTopic
- [x] Update prompt template to use selected category/subtopic
- [x] Test locally with multiple requests
- [x] Verify no regressions in response format

## Notes

- The category pool can be expanded over time
- Consider adding user preferences for category weighting (future enhancement)

---

**Created:** 2026-02-04
**Last Updated:** 2026-02-04
**Implemented By:** Claude Code
