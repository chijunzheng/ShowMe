/**
 * Learn Slides Payload Utility Tests
 */

import { describe, it, expect } from 'vitest'
import { buildLearnSlidesPayload } from '../learnSlidesPayload'

describe('buildLearnSlidesPayload', () => {
  it('drops header and suggestions slides when present', () => {
    const slides = [
      { type: 'header', subtitle: 'Header' },
      { type: 'suggestions', subtitle: 'Try these' },
      { subtitle: 'Real content', script: 'Script content' },
    ]

    expect(buildLearnSlidesPayload(slides)).toEqual([
      { subtitle: 'Real content', script: 'Script content' },
    ])
  })

  it('trims fields and drops empty slides', () => {
    const slides = [
      { subtitle: '   ', script: '\n\t' },
      { subtitle: '  A  ', script: '  B  ' },
      { subtitle: '', script: '  C  ' },
    ]

    expect(buildLearnSlidesPayload(slides)).toEqual([
      { subtitle: 'A', script: 'B' },
      { subtitle: '', script: 'C' },
    ])
  })

  it('caps slide count', () => {
    const slides = Array.from({ length: 20 }, (_, i) => ({ subtitle: `Slide ${i + 1}`, script: 'x' }))
    const result = buildLearnSlidesPayload(slides, { maxSlides: 5 })
    expect(result).toHaveLength(5)
    expect(result[0]).toEqual({ subtitle: 'Slide 1', script: 'x' })
    expect(result[4]).toEqual({ subtitle: 'Slide 5', script: 'x' })
  })

  it('caps per-field length', () => {
    const slides = [{ subtitle: 's'.repeat(5000), script: 't'.repeat(5000) }]
    const result = buildLearnSlidesPayload(slides, { maxCharsPerField: 100 })
    expect(result[0].subtitle).toHaveLength(100)
    expect(result[0].script).toHaveLength(100)
  })
})

