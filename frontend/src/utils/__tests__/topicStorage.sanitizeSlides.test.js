/**
 * Topic Storage Sanitization Tests
 */

import { describe, it, expect } from 'vitest'
import { sanitizeSlidesForStorage } from '../topicStorage'

describe('sanitizeSlidesForStorage', () => {
  it('preserves Gemini-generated title and follow-up parentId', () => {
    const slides = [
      {
        id: 's1',
        title: '  My Slide Title  ',
        subtitle: 'Sub',
        imageUrl: 'https://example.com/img.png',
        duration: 1234,
        topicId: 't1',
        parentId: 'p1',
      },
    ]

    const out = sanitizeSlidesForStorage(slides, 't1')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      id: 's1',
      title: 'My Slide Title',
      subtitle: 'Sub',
      imageUrl: 'https://example.com/img.png',
      duration: 1234,
      topicId: 't1',
      parentId: 'p1',
    })
  })

  it('preserves section divider question and suggestions questions', () => {
    const slides = [
      { id: 'sec', type: 'section', question: '  Why does this happen?  ', topicId: 't1' },
      { id: 'sug', type: 'suggestions', questions: ['A', 'B'], topicId: 't1' },
    ]

    const out = sanitizeSlidesForStorage(slides, 't1')
    expect(out).toHaveLength(2)
    expect(out[0]).toMatchObject({
      id: 'sec',
      type: 'section',
      question: 'Why does this happen?',
      topicId: 't1',
    })
    expect(out[1]).toMatchObject({
      id: 'sug',
      type: 'suggestions',
      questions: ['A', 'B'],
      topicId: 't1',
    })
  })
})

