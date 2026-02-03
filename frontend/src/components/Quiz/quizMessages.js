/**
 * Quiz Messages Utility
 *
 * Provides randomized encouraging messages for quiz feedback,
 * transforming the quiz experience from "test" to "game/adventure" framing.
 *
 * Features:
 * - Randomized correct/incorrect/partial messages
 * - Game-like question type labels
 * - Boss Challenge indicator for final questions
 */

/**
 * Encouraging messages for correct answers
 */
export const CORRECT_MESSAGES = [
  'Nailed it!',
  'Perfect!',
  'Awesome!',
  'You got it!',
  'Brilliant!',
]

/**
 * Supportive messages for incorrect answers
 */
export const INCORRECT_MESSAGES = [
  'Nice try!',
  'Almost!',
  'Keep going!',
]

/**
 * Messages for partial credit answers
 */
export const PARTIAL_MESSAGES = [
  'So close!',
  'Almost there!',
  'Good thinking!',
]

/**
 * Get a random message from an array
 * @param {string[]} messages - Array of possible messages
 * @returns {string} Random message from the array
 */
function getRandomMessage(messages) {
  const index = Math.floor(Math.random() * messages.length)
  return messages[index]
}

/**
 * Get a random encouraging message for correct answers
 * @returns {string} Random correct answer message
 */
export function getRandomCorrectMessage() {
  return getRandomMessage(CORRECT_MESSAGES)
}

/**
 * Get a random supportive message for incorrect answers
 * @returns {string} Random incorrect answer message
 */
export function getRandomIncorrectMessage() {
  return getRandomMessage(INCORRECT_MESSAGES)
}

/**
 * Get a random message for partial credit answers
 * @returns {string} Random partial credit message
 */
export function getRandomPartialMessage() {
  return getRandomMessage(PARTIAL_MESSAGES)
}

/**
 * Get the challenge label for a question
 * @param {number} current - Current question number (1-indexed)
 * @param {number} total - Total number of questions
 * @returns {string} Challenge label (e.g., "Challenge 3" or "Boss Challenge!")
 */
export function getChallengeLabel(current, total) {
  if (current === total) {
    return 'Boss Challenge!'
  }
  return `Challenge ${current}`
}

/**
 * Game-like labels for question types
 */
const GAME_TYPE_LABELS = {
  mcq: 'Pick the Answer',
  fill_blank: 'Fill the Gap',
  true_false: 'True or False',
  voice: 'Speak Up',
}

/**
 * Get a game-like label for a question type
 * @param {string} type - Question type identifier
 * @returns {string} Game-like label for the type
 */
export function getGameTypeLabel(type) {
  return GAME_TYPE_LABELS[type] || 'Challenge'
}

/**
 * Level-specific encouraging messages for quiz feedback.
 * Messages are tailored to difficulty level and outcome type.
 * All messages are kid-friendly and encouraging.
 */
export const LEVEL_MESSAGES = {
  simple: {
    correct: [
      'Great job!',
      'You did it!',
      'Awesome!',
      'Super!',
      'Way to go!',
    ],
    partial: [
      'Almost!',
      'So close!',
      'Good try!',
      'Nice effort!',
      'Keep going!',
    ],
    incorrect: [
      'Try again!',
      'Keep trying!',
      "You'll get it!",
      'No worries!',
      'Keep learning!',
    ],
  },
  standard: {
    correct: [
      'Excellent work!',
      'Well done!',
      'Impressive!',
      'Fantastic!',
      'Great thinking!',
    ],
    partial: [
      'Getting there!',
      'Good progress!',
      'Nice thinking!',
      'Almost got it!',
      'On the right track!',
    ],
    incorrect: [
      'Good effort!',
      'Keep exploring!',
      'Learning moment!',
      'Try once more!',
      'Getting closer!',
    ],
  },
  deep: {
    correct: [
      'Brilliant thinking!',
      'Expert level!',
      'Deep understanding!',
      'Masterful!',
      'Outstanding insight!',
    ],
    partial: [
      'Thoughtful answer!',
      'Great reasoning!',
      'Complex thinking!',
      'Solid approach!',
      'Deep analysis!',
    ],
    incorrect: [
      'Tough challenge!',
      'Keep pondering!',
      'Deep questions!',
      'Great attempt!',
      'Think deeper!',
    ],
  },
}

/**
 * Get a random level-specific message for quiz feedback.
 * Falls back to standard level and correct type for invalid inputs.
 *
 * @param {string} level - Quiz difficulty level ('simple' | 'standard' | 'deep')
 * @param {string} type - Message type ('correct' | 'partial' | 'incorrect')
 * @returns {string} Random message from the appropriate pool
 */
export function getLevelMessage(level, type) {
  // Validate and fallback for level
  const validLevel = (level && LEVEL_MESSAGES[level])
    ? level
    : 'standard'

  // Validate and fallback for type
  const validType = (type && LEVEL_MESSAGES[validLevel][type])
    ? type
    : 'correct'

  const messages = LEVEL_MESSAGES[validLevel][validType]
  const index = Math.floor(Math.random() * messages.length)
  return messages[index]
}
