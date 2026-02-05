/**
 * Learn slides payload builder
 *
 * Produces a compact, sanitized representation of lesson slides for Learn modes
 * (Mystery Lab, Wonder Lab, Story Studio). This prevents oversized requests and
 * avoids accidentally sending large fields like base64 images.
 */

const DEFAULT_MAX_SLIDES = 12
const DEFAULT_MAX_CHARS_PER_FIELD = 2000

/**
 * @typedef {Object} LearnSlidePayload
 * @property {string} subtitle
 * @property {string} script
 */

/**
 * Build a trimmed slides payload safe for /api/learn/*.
 *
 * Rules:
 * - Drop non-content slides when `type` is `header` or `suggestions`
 * - Keep only `subtitle` and `script` (strings)
 * - Trim whitespace, drop empty slides
 * - Cap slide count and per-field length
 *
 * @param {Array<any>} slides
 * @param {Object} [options]
 * @param {number} [options.maxSlides]
 * @param {number} [options.maxCharsPerField]
 * @returns {LearnSlidePayload[]}
 */
export function buildLearnSlidesPayload(
  slides,
  { maxSlides = DEFAULT_MAX_SLIDES, maxCharsPerField = DEFAULT_MAX_CHARS_PER_FIELD } = {}
) {
  const inputSlides = Array.isArray(slides) ? slides : []
  const output = []

  for (const slide of inputSlides) {
    if (!slide || typeof slide !== 'object') continue

    if (slide.type === 'header' || slide.type === 'suggestions') continue

    const rawSubtitle = typeof slide.subtitle === 'string' ? slide.subtitle : ''
    const rawScript = typeof slide.script === 'string' ? slide.script : ''

    const subtitle = rawSubtitle.trim().slice(0, maxCharsPerField)
    const script = rawScript.trim().slice(0, maxCharsPerField)

    if (!subtitle && !script) continue

    output.push({ subtitle, script })

    if (output.length >= maxSlides) break
  }

  return output
}

export default buildLearnSlidesPayload

