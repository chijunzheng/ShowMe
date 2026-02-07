/**
 * Wonder Lab loader content by explanation level.
 * Rotating stage copy and fallback fun facts for the loading screen.
 */

const LEVELS = ['simple', 'standard', 'deep']

const STAGE_COPY = {
  simple: [
    'Mixing the ingredients...',
    'Setting up the experiment...',
  ],
  standard: [
    'Mixing the ingredients...',
    'Calibrating the apparatus...',
    'Setting up the experiment...',
    'Running simulations...',
  ],
  deep: [
    'Formulating the hypothesis...',
    'Calibrating variables...',
    'Running controlled simulations...',
    'Analyzing boundary conditions...',
  ],
}

function normalizeLevel(level = 'standard') {
  return LEVELS.includes(level) ? level : 'standard'
}

export function getWonderLoaderStages(level = 'standard') {
  const normalizedLevel = normalizeLevel(level)
  return STAGE_COPY[normalizedLevel]
}
