/**
 * Classify Route - Follow-up Heuristics Tests
 *
 * Regression tests for pronoun-heavy follow-ups (e.g. "How does it work?")
 * that should be classified as follow-ups when a topic is active.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/gemini.js', () => ({
  determineQueryComplexity: vi.fn(async () => ({
    complexity: 'simple',
    reasoning: 'stubbed',
    error: null,
  })),
  determineSemanticRelation: vi.fn(async () => ({
    isRelated: false,
    confidence: 0,
    error: null,
  })),
}))

import classifyRouter from '../classify.js'
import { determineQueryComplexity, determineSemanticRelation } from '../../services/gemini.js'

function createMockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      this.__done?.resolve()
      return this
    },
  }

  res.__done = {}
  res.__done.promise = new Promise((resolve) => {
    res.__done.resolve = resolve
  })

  return res
}

async function postClassify(body) {
  const req = {
    method: 'POST',
    url: '/',
    body,
    ip: '127.0.0.1',
  }
  const res = createMockRes()

  classifyRouter.handle(req, res, () => {})
  await res.__done.promise
  return res
}

describe('Classify Routes - Follow-up heuristics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('classifies "how does it ..." as follow_up when an active topic exists', async () => {
    const res = await postClassify({
      query: 'How does it have such a big context window?',
      activeTopicId: 'topic_1',
      activeTopic: { name: 'Google Gemini 3.0', icon: '🧠' },
      topicCount: 1,
      oldestTopicId: 'topic_1',
      currentSlide: null,
    })

    expect(res.statusCode).toBe(200)
    expect(res.body?.classification).toBe('follow_up')
    expect(res.body?.complexity).toBe('simple')
    expect(determineQueryComplexity).toHaveBeenCalledTimes(1)
  })

  it('classifies keyword-overlap with the current slide as follow_up without semantic fallback', async () => {
    const res = await postClassify({
      query: 'How does it have such a big context window?',
      activeTopicId: 'topic_1',
      activeTopic: { name: 'Google Gemini 3.0', icon: '🧠' },
      topicCount: 1,
      oldestTopicId: 'topic_1',
      currentSlide: {
        subtitle: "Think of the context window as the AI's short term memory.",
        topicName: 'Google Gemini 3.0',
      },
    })

    expect(res.statusCode).toBe(200)
    expect(res.body?.classification).toBe('follow_up')
    expect(determineSemanticRelation).toHaveBeenCalledTimes(0)
    expect(determineQueryComplexity).toHaveBeenCalledTimes(1)
  })
})

