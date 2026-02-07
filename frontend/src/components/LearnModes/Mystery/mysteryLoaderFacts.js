/**
 * Mystery loader fallback content by explanation level.
 * These facts are local defaults used when engagement API is slow or unavailable.
 */

const LEVELS = ['simple', 'standard', 'deep']

const FALLBACK_FACTS = {
  simple: [
    {
      emoji: '🧠',
      text: 'Stories help your brain remember facts longer than isolated memorization.',
    },
    {
      emoji: '🔎',
      text: 'Many real investigations are solved by one tiny detail that others miss.',
    },
    {
      emoji: '🧩',
      text: 'When clues connect into a pattern, learning becomes easier to recall later.',
    },
  ],
  standard: [
    {
      emoji: '🕵️',
      text: 'Detective training emphasizes timeline reconstruction because causality beats guesswork.',
    },
    {
      emoji: '📚',
      text: 'Interleaving different clue types improves retention more than repeating one format.',
    },
    {
      emoji: '🧪',
      text: 'Scientists and detectives both test competing explanations before choosing a conclusion.',
    },
  ],
  deep: [
    {
      emoji: '🧠',
      text: 'Retrieval practice strengthens memory traces, especially when facts are recalled in context.',
    },
    {
      emoji: '📈',
      text: 'Experts reduce error by combining evidence reliability, chronology, and causal consistency.',
    },
    {
      emoji: '🔬',
      text: 'Contradiction checks improve model quality by exposing hidden assumptions in reasoning chains.',
    },
  ],
}

const STAGE_COPY = {
  simple: [
    'Reading case notes...',
    'Marking key clues...',
  ],
  standard: [
    'Reading case notes...',
    'Assembling witness list...',
    'Tagging possible evidence...',
    'Preparing timeline board...',
  ],
  deep: [
    'Parsing case narrative...',
    'Cross-checking witness reliability...',
    'Indexing causal candidates...',
    'Preparing contradiction probes...',
  ],
}

function normalizeLevel(level = 'standard') {
  return LEVELS.includes(level) ? level : 'standard'
}

export function getMysteryLoaderFacts(level = 'standard') {
  const normalizedLevel = normalizeLevel(level)
  return FALLBACK_FACTS[normalizedLevel]
}

export function getMysteryLoaderStages(level = 'standard') {
  const normalizedLevel = normalizeLevel(level)
  return STAGE_COPY[normalizedLevel]
}

