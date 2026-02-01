const MAX_LIVING_WORLD_SUMMARY_LENGTH = 900

export function buildLivingWorldSummaryFromSlides(slides = []) {
  if (!Array.isArray(slides) || slides.length === 0) return ''

  const text = slides
    .filter(s => s?.type !== 'header' && s?.type !== 'suggestions')
    .map((slide) => {
      const subtitle = typeof slide.subtitle === 'string' ? slide.subtitle.trim() : ''
      const script = typeof slide.script === 'string' ? slide.script.trim() : ''
      if (subtitle && script) return `${subtitle}: ${script}`
      return subtitle || script
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return ''
  if (text.length <= MAX_LIVING_WORLD_SUMMARY_LENGTH) return text
  return `${text.slice(0, MAX_LIVING_WORLD_SUMMARY_LENGTH).trim()}...`
}
