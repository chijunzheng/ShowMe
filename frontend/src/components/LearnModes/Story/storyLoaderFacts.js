/**
 * Story loader fallback content by explanation level.
 * These facts are local defaults used when engagement API is slow or unavailable.
 */

const LEVELS = ['simple', 'standard', 'deep']

const FALLBACK_FACTS = {
  simple: [
    {
      emoji: '📖',
      text: 'Stories help your brain make connections between ideas you already know.',
    },
    {
      emoji: '🎭',
      text: 'When you create characters, your brain practices understanding other people.',
    },
    {
      emoji: '✨',
      text: 'Making up stories uses the same brain power as solving puzzles.',
    },
  ],
  standard: [
    {
      emoji: '🧠',
      text: 'Creative storytelling strengthens neural pathways for both imagination and memory.',
    },
    {
      emoji: '🎬',
      text: 'The best stories combine things you know with things you imagine.',
    },
    {
      emoji: '📝',
      text: 'Putting knowledge into a story makes it 22x more memorable than facts alone.',
    },
  ],
  deep: [
    {
      emoji: '🔬',
      text: 'Narrative cognition activates multiple brain regions simultaneously, deepening understanding.',
    },
    {
      emoji: '🌐',
      text: 'Story structures mirror how the brain naturally organizes cause-and-effect knowledge.',
    },
    {
      emoji: '💡',
      text: 'Creating explanatory narratives is how scientists communicate complex discoveries.',
    },
  ],
}

const STAGE_COPY = {
  simple: [
    'Crafting story ideas...',
    'Creating your story world...',
  ],
  standard: [
    'Crafting story ideas...',
    'Creating your story world...',
    'Preparing story ingredients...',
    'Setting the scene...',
  ],
  deep: [
    'Weaving narrative threads...',
    'Building story architecture...',
    'Preparing creative elements...',
    'Designing story choices...',
  ],
}

function normalizeLevel(level = 'standard') {
  return LEVELS.includes(level) ? level : 'standard'
}

export function getStoryLoaderFacts(level = 'standard') {
  const normalizedLevel = normalizeLevel(level)
  return FALLBACK_FACTS[normalizedLevel]
}

export function getStoryLoaderStages(level = 'standard') {
  const normalizedLevel = normalizeLevel(level)
  return STAGE_COPY[normalizedLevel]
}
