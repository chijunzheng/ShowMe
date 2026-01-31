/**
 * JSON Utility Functions
 * Shared utilities for parsing and extracting JSON from AI responses
 */

/**
 * Extract JSON from text that may be wrapped in markdown code blocks
 * Handles various formats returned by different Gemini models
 *
 * @param {string} text - Raw text response from Gemini
 * @returns {string} Extracted JSON string ready for parsing
 */
export function extractJSON(text) {
  if (!text) return '{}'

  // Debug: log first 50 chars and their char codes
  const preview = text.substring(0, 50)
  const charCodes = [...preview].map(c => c.charCodeAt(0))
  console.log('[extractJSON] First 50 chars:', JSON.stringify(preview))
  console.log('[extractJSON] Char codes:', charCodes.slice(0, 20))

  // Method 1: Match ```json ... ``` anywhere (no $ anchor - allows trailing content)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    const extracted = codeBlockMatch[1].trim()
    console.log('[extractJSON] Matched code block, extracted length:', extracted.length)
    return extracted
  }

  // Method 1b: Handle truncated response - starts with ```json but no closing ```
  if (text.startsWith('```')) {
    // Skip opening fence and optional 'json' label
    let startIdx = 3
    if (text.slice(startIdx, startIdx + 4).toLowerCase() === 'json') {
      startIdx += 4
    }
    // Skip whitespace
    while (startIdx < text.length && /\s/.test(text[startIdx])) {
      startIdx++
    }
    const remaining = text.slice(startIdx).trim()
    console.log('[extractJSON] Truncated code block, extracting from position:', startIdx)

    // Try to find JSON content
    const firstBraceInRemaining = remaining.indexOf('{')
    if (firstBraceInRemaining !== -1) {
      const lastBraceInRemaining = remaining.lastIndexOf('}')
      if (lastBraceInRemaining > firstBraceInRemaining) {
        console.log('[extractJSON] Truncated: brace extraction from remaining')
        return remaining.slice(firstBraceInRemaining, lastBraceInRemaining + 1)
      } else {
        // No closing brace found - extract partial JSON for repairJSON to complete
        console.log('[extractJSON] Truncated: no closing brace, extracting partial JSON')
        return remaining.slice(firstBraceInRemaining)
      }
    }
  }

  // Method 2: Find balanced braces for JSON object
  const firstBrace = text.indexOf('{')
  if (firstBrace !== -1) {
    let depth = 0
    let inString = false
    let escapeNext = false

    for (let i = firstBrace; i < text.length; i++) {
      const char = text[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\' && inString) {
        escapeNext = true
        continue
      }

      if (char === '"' && !escapeNext) {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{') depth++
        else if (char === '}') {
          depth--
          if (depth === 0) {
            console.log('[extractJSON] Balanced brace extraction from', firstBrace, 'to', i)
            return text.slice(firstBrace, i + 1)
          }
        }
      }
    }

    // No balanced closing brace - extract partial JSON for repairJSON to complete
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace > firstBrace) {
      console.log('[extractJSON] Fallback brace extraction from', firstBrace, 'to', lastBrace)
      return text.slice(firstBrace, lastBrace + 1)
    } else {
      console.log('[extractJSON] No closing brace, extracting partial JSON from', firstBrace)
      return text.slice(firstBrace)
    }
  }

  console.log('[extractJSON] No extraction matched, returning raw text')
  return text.trim()
}

/**
 * Simple JSON extraction for services that don't need full robustness
 * Extracts JSON from markdown code blocks or finds JSON object directly
 *
 * @param {string} text - Raw text response
 * @returns {string} Extracted JSON string
 */
export function extractJSONSimple(text) {
  if (!text) return '{}'

  // Try to extract from markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim()
  }

  // Find JSON object directly
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  return text.trim()
}

export default {
  extractJSON,
  extractJSONSimple
}
