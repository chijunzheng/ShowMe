/**
 * Fuzzy Match Utility
 * WB003: Provides fuzzy string matching for fill-in-the-blank questions
 *
 * Features:
 * - Case insensitive comparison
 * - Whitespace normalization
 * - Levenshtein distance for typo tolerance
 * - Configurable similarity threshold
 */

/**
 * Calculate Levenshtein distance between two strings.
 * This measures the minimum number of single-character edits
 * (insertions, deletions, substitutions) needed to transform one string to another.
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} The edit distance between the strings
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length
  const len2 = str2.length

  // Create matrix of distances
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0))

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill in the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Normalize a string for comparison.
 * - Converts to lowercase
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Removes punctuation (except hyphens in compound words)
 *
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
function normalizeString(str) {
  if (typeof str !== 'string') return ''

  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:'"()[\]{}]/g, '')
}

/**
 * Calculate similarity ratio between two strings.
 * Returns a value between 0 (completely different) and 1 (identical).
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity ratio (0-1)
 */
function calculateSimilarity(str1, str2) {
  const norm1 = normalizeString(str1)
  const norm2 = normalizeString(str2)

  // If either string is empty, return 0 (unless both are empty)
  if (!norm1 && !norm2) return 1
  if (!norm1 || !norm2) return 0

  // If strings are identical after normalization
  if (norm1 === norm2) return 1

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)

  // Convert distance to similarity ratio
  return 1 - (distance / maxLength)
}

/**
 * Check if user answer matches correct answer with fuzzy matching.
 * Supports exact match, normalized match, and similarity-based matching.
 *
 * @param {string} userAnswer - The user's answer
 * @param {string|string[]} correctAnswer - The correct answer(s). Can be a single string or array of acceptable answers.
 * @param {Object} options - Matching options
 * @param {number} [options.exactThreshold=1.0] - Similarity threshold for "correct" (default: 1.0 = exact match)
 * @param {number} [options.partialThreshold=0.8] - Similarity threshold for "partial credit" (default: 0.8)
 * @param {number} [options.minSimilarity=0.6] - Minimum similarity to consider at all (default: 0.6)
 * @returns {Object} Match result with isCorrect, isPartial, similarity, and matchedAnswer
 */
export function fuzzyMatch(userAnswer, correctAnswer, options = {}) {
  const {
    exactThreshold = 1.0,
    partialThreshold = 0.8,
    minSimilarity = 0.6
  } = options

  // Handle array of acceptable answers
  const acceptableAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]

  // Track best match across all acceptable answers
  let bestMatch = {
    isCorrect: false,
    isPartial: false,
    similarity: 0,
    matchedAnswer: null,
    userAnswer: userAnswer
  }

  for (const answer of acceptableAnswers) {
    const similarity = calculateSimilarity(userAnswer, answer)

    if (similarity > bestMatch.similarity) {
      bestMatch = {
        isCorrect: similarity >= exactThreshold,
        isPartial: similarity >= partialThreshold && similarity < exactThreshold,
        similarity,
        matchedAnswer: answer,
        userAnswer
      }
    }

    // Early exit if we found an exact match
    if (bestMatch.isCorrect) break
  }

  // If similarity is below minimum threshold, mark as definitely wrong
  if (bestMatch.similarity < minSimilarity) {
    bestMatch.isCorrect = false
    bestMatch.isPartial = false
  }

  return bestMatch
}

/**
 * Quick check for exact match only (case-insensitive, trimmed).
 * Useful for simple comparisons where fuzzy matching isn't needed.
 *
 * @param {string} userAnswer - The user's answer
 * @param {string|string[]} correctAnswer - The correct answer(s)
 * @returns {boolean} True if exact match found
 */
export function exactMatch(userAnswer, correctAnswer) {
  const normalizedUser = normalizeString(userAnswer)
  const acceptableAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]

  return acceptableAnswers.some(answer => normalizeString(answer) === normalizedUser)
}

/**
 * Get a human-readable description of match quality.
 *
 * @param {Object} matchResult - Result from fuzzyMatch()
 * @returns {string} Description of match quality
 */
export function getMatchDescription(matchResult) {
  if (matchResult.isCorrect) return 'Correct!'
  if (matchResult.isPartial) return 'Close! Almost there.'
  if (matchResult.similarity >= 0.5) return 'On the right track, but not quite.'
  return 'Not quite. Try again!'
}

export default {
  fuzzyMatch,
  exactMatch,
  calculateSimilarity,
  getMatchDescription
}
