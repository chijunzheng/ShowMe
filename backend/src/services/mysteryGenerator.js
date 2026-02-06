/**
 * Mystery Generator Service
 * Generates detective-style mysteries from lesson content using Gemini AI.
 *
 * Crime Scene Ops payload includes:
 * - crimeScene hotspots + evidence cards
 * - witness interrogation packs
 * - timeline reconstruction data
 * - warrant verdict options
 */

import { GoogleGenAI } from '@google/genai'
import { detectLanguage } from './gemini.js'
import { extractJSON } from '../utils/json.js'
import logger from '../utils/logger.js'

const TEXT_MODEL = 'gemini-3-flash-preview'

const LEVEL_RULES = {
  simple: {
    hotspots: 3,
    witnesses: 1,
    questionCards: 3,
    timelineEvents: 3,
    verdictOptions: 2,
    requireContradictions: false,
    requireCausalLinks: false,
  },
  standard: {
    hotspots: 5,
    witnesses: 2,
    questionCards: 5,
    timelineEvents: 5,
    verdictOptions: 3,
    requireContradictions: false,
    requireCausalLinks: false,
  },
  deep: {
    hotspots: 7,
    witnesses: 3,
    questionCards: 7,
    timelineEvents: 7,
    verdictOptions: 4,
    requireContradictions: true,
    requireCausalLinks: true,
  },
}

let aiClient = null
let aiClientKey = null
let hasLoggedUnavailableClient = false

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY
  const isMissingKey = !apiKey
  const isPlaceholderKey = apiKey === 'your_gemini_api_key_here'

  if (isMissingKey || isPlaceholderKey) {
    if (!hasLoggedUnavailableClient) {
      logger.warn('MYSTERY', 'Gemini API unavailable for mystery generation', {
        reason: isMissingKey ? 'missing_api_key' : 'placeholder_api_key',
        cwd: process.cwd(),
        hint: 'Start backend from the backend directory so backend/.env is loaded',
      })
      hasLoggedUnavailableClient = true
    }
    return null
  }

  hasLoggedUnavailableClient = false

  if (aiClient && aiClientKey === apiKey) {
    return aiClient
  }

  try {
    aiClient = new GoogleGenAI({ apiKey })
    aiClientKey = apiKey
    return aiClient
  } catch (error) {
    logger.error('MYSTERY', 'Failed to initialize Gemini client', { error: error.message })
    aiClient = null
    aiClientKey = null
    return null
  }
}

function toSafeString(value, fallback = '') {
  if (typeof value === 'string') {
    return value.trim()
  }
  return fallback
}

function buildFallbackClues(expectedConcepts, isZh) {
  const c1 = expectedConcepts[0] || (isZh ? '关键概念' : 'key concept')
  const c2 = expectedConcepts[1] || (isZh ? '机制' : 'mechanism')
  const c3 = expectedConcepts[2] || (isZh ? '因果关系' : 'cause and effect')

  return isZh
    ? [
        { text: `现场记录显示 ${c1} 在异常发生前就出现变化。`, slideRef: 1, narratorText: `注意第一个证据，${c1} 先发生了变化。` },
        { text: `第二份记录表明 ${c2} 与异常结果同时出现。`, slideRef: 2, narratorText: `第二条线索指出 ${c2} 和结果同时出现。` },
        { text: `最终证据把 ${c1} 与 ${c3} 串联起来。`, slideRef: 3, narratorText: `第三条线索把所有证据连成了因果链。` },
      ]
    : [
        { text: `Logs show ${c1} changed before the incident.`, slideRef: 1, narratorText: `Notice this first clue: ${c1} shifted before anything went wrong.` },
        { text: `A second record shows ${c2} appeared with the visible failure.`, slideRef: 2, narratorText: `The second clue ties ${c2} to the observed failure.` },
        { text: `The final clue links ${c1} to the full cause-and-effect chain.`, slideRef: 3, narratorText: 'The last clue connects everything into one causal story.' },
      ]
}

function normalizeClues(rawClues, expectedConcepts, isZh) {
  const input = Array.isArray(rawClues) ? rawClues : []
  const normalized = input
    .map((clue, index) => {
      const text = toSafeString(clue?.text)
      if (!text) return null

      const slideRef = Number.isFinite(Number(clue?.slideRef)) ? Number(clue.slideRef) : index + 1
      const narratorText = toSafeString(clue?.narratorText, text)

      return {
        text,
        slideRef: Math.max(1, slideRef),
        narratorText,
      }
    })
    .filter(Boolean)

  if (normalized.length > 0) {
    return normalized
  }

  return buildFallbackClues(expectedConcepts, isZh)
}

function buildFallbackHotspots(evidenceCards, hotspotCount) {
  const count = Math.max(1, Math.min(hotspotCount, evidenceCards.length))
  const rows = Math.ceil(count / 3)
  const hotspots = []

  for (let index = 0; index < count; index += 1) {
    const col = index % 3
    const row = Math.floor(index / 3)
    const x = 20 + col * 30
    const y = 25 + (row * (45 / Math.max(rows, 1)))

    hotspots.push({
      id: `h${index + 1}`,
      x,
      y,
      radius: 8,
      evidenceId: evidenceCards[index]?.id || `e${index + 1}`,
      bonus: index >= hotspotCount,
    })
  }

  return hotspots
}

function normalizeCrimeScene(rawCrimeScene, clues, expectedConcepts, levelRule, isZh, imagePrompt) {
  const evidenceCards = clues.map((clue, index) => {
    const conceptTag = expectedConcepts[index % Math.max(expectedConcepts.length, 1)]
    return {
      id: `e${index + 1}`,
      title: isZh ? `证据 ${index + 1}` : `Evidence ${index + 1}`,
      text: clue.text,
      conceptTags: conceptTag ? [conceptTag] : [],
    }
  })

  const rawCards = Array.isArray(rawCrimeScene?.evidenceCards)
    ? rawCrimeScene.evidenceCards
    : []

  const normalizedCards = rawCards
    .map((card, index) => {
      const id = toSafeString(card?.id, `e${index + 1}`)
      const title = toSafeString(card?.title, isZh ? `证据 ${index + 1}` : `Evidence ${index + 1}`)
      const text = toSafeString(card?.text)
      if (!text) return null
      const conceptTags = Array.isArray(card?.conceptTags)
        ? card.conceptTags.map((tag) => toSafeString(tag)).filter(Boolean)
        : []

      return { id, title, text, conceptTags }
    })
    .filter(Boolean)

  const cardPool = normalizedCards.length > 0 ? normalizedCards : evidenceCards

  const rawHotspots = Array.isArray(rawCrimeScene?.hotspots)
    ? rawCrimeScene.hotspots
    : []

  const normalizedHotspots = rawHotspots
    .map((spot, index) => {
      const id = toSafeString(spot?.id, `h${index + 1}`)
      const x = Number(spot?.x)
      const y = Number(spot?.y)
      const radius = Number(spot?.radius)
      const evidenceId = toSafeString(spot?.evidenceId, cardPool[index % cardPool.length]?.id)

      if (!Number.isFinite(x) || !Number.isFinite(y)) return null

      return {
        id,
        x: Math.min(95, Math.max(5, x)),
        y: Math.min(95, Math.max(5, y)),
        radius: Number.isFinite(radius) ? Math.min(16, Math.max(5, radius)) : 8,
        evidenceId,
        bonus: Boolean(spot?.bonus),
      }
    })
    .filter(Boolean)

  const requiredHotspotCount = Math.min(levelRule.hotspots, cardPool.length)

  return {
    imagePrompt: toSafeString(rawCrimeScene?.imagePrompt, imagePrompt),
    hotspots:
      normalizedHotspots.length > 0
        ? normalizedHotspots
        : buildFallbackHotspots(cardPool, requiredHotspotCount),
    evidenceCards: cardPool,
    requiredHotspotCount,
  }
}

function buildFallbackWitnessResponses(questionCards, evidenceCards, expectedConcepts, isZh) {
  const concept = expectedConcepts[0] || (isZh ? '关键概念' : 'core concept')

  return questionCards.map((question, index) => ({
    question,
    statement: evidenceCards[index % evidenceCards.length]?.text || (isZh ? '我注意到了一个关键细节。' : 'I noticed a critical detail.'),
    reliability: Math.max(0.4, 0.9 - index * 0.1),
    tags: [concept],
    contradictionKey: index % 2 === 0 ? 'A' : 'B',
  }))
}

function normalizeWitnesses(rawWitnesses, crimeScene, expectedConcepts, levelRule, isZh) {
  const defaultQuestions = isZh
    ? ['你看到了什么？', '什么时候发生的？', '什么最不寻常？', '这和前面线索如何对应？', '你最确定哪一部分？', '你有矛盾证词吗？', '还有什么遗漏？']
    : [
        'What did you see first?',
        'When did it start?',
        'What looked unusual?',
        'How does this connect to earlier evidence?',
        'Which detail are you most certain about?',
        'Did any account contradict another?',
        'What might we still be missing?',
      ]

  const input = Array.isArray(rawWitnesses) ? rawWitnesses : []

  const normalized = input
    .map((witness, index) => {
      const id = toSafeString(witness?.id, `w${index + 1}`)
      const name = toSafeString(witness?.name, isZh ? `证人 ${index + 1}` : `Witness ${index + 1}`)
      const role = toSafeString(witness?.role, isZh ? '目击者' : 'Observer')

      const questionCards = Array.isArray(witness?.questionCards)
        ? witness.questionCards.map((q) => toSafeString(q)).filter(Boolean)
        : []

      const responseInput = Array.isArray(witness?.responses) ? witness.responses : []
      const responses = responseInput
        .map((response, responseIndex) => {
          const question = toSafeString(response?.question, questionCards[responseIndex] || defaultQuestions[responseIndex % defaultQuestions.length])
          const statement = toSafeString(response?.statement)
          if (!question || !statement) return null

          const reliabilityRaw = Number(response?.reliability)
          const reliability = Number.isFinite(reliabilityRaw) ? Math.max(0, Math.min(1, reliabilityRaw)) : 0.7
          const tags = Array.isArray(response?.tags)
            ? response.tags.map((tag) => toSafeString(tag)).filter(Boolean)
            : []

          return {
            question,
            statement,
            reliability,
            tags,
            contradictionKey: toSafeString(response?.contradictionKey, responseIndex % 2 === 0 ? 'A' : 'B'),
          }
        })
        .filter(Boolean)

      const effectiveQuestions = questionCards.length > 0
        ? questionCards
        : defaultQuestions.slice(0, Math.min(levelRule.questionCards, defaultQuestions.length))

      const effectiveResponses = responses.length > 0
        ? responses
        : buildFallbackWitnessResponses(effectiveQuestions, crimeScene.evidenceCards, expectedConcepts, isZh)

      return {
        id,
        name,
        role,
        questionCards: effectiveQuestions,
        responses: effectiveResponses,
      }
    })
    .filter(Boolean)

  if (normalized.length > 0) {
    return normalized.slice(0, levelRule.witnesses)
  }

  return Array.from({ length: levelRule.witnesses }).map((_, index) => {
    const questionCards = defaultQuestions.slice(0, Math.min(levelRule.questionCards, defaultQuestions.length))
    return {
      id: `w${index + 1}`,
      name: isZh ? `证人 ${index + 1}` : `Witness ${index + 1}`,
      role: isZh ? '现场目击者' : 'Scene witness',
      questionCards,
      responses: buildFallbackWitnessResponses(questionCards, crimeScene.evidenceCards, expectedConcepts, isZh),
    }
  })
}

function normalizeTimeline(rawTimeline, clues, levelRule, isZh) {
  const inputEvents = Array.isArray(rawTimeline?.events) ? rawTimeline.events : []

  const normalizedEvents = inputEvents
    .map((event, index) => {
      const id = toSafeString(event?.id, `t${index + 1}`)
      const text = toSafeString(event?.text)
      if (!text) return null

      const orderRaw = Number(event?.order)
      const order = Number.isFinite(orderRaw) ? Math.max(1, Math.floor(orderRaw)) : index + 1

      return {
        id,
        text,
        order,
        isRedHerring: Boolean(event?.isRedHerring),
      }
    })
    .filter(Boolean)

  const fallbackEvents = clues.slice(0, levelRule.timelineEvents).map((clue, index) => ({
    id: `t${index + 1}`,
    text: clue.text,
    order: index + 1,
    isRedHerring: false,
  }))

  const baseEvents = normalizedEvents.length > 0 ? normalizedEvents : fallbackEvents

  if (baseEvents.length === 0) {
    baseEvents.push(
      isZh
        ? { id: 't1', text: '关键过程开始发生。', order: 1, isRedHerring: false }
        : { id: 't1', text: 'The key process begins.', order: 1, isRedHerring: false }
    )
  }

  if (levelRule.timelineEvents > baseEvents.length) {
    const start = baseEvents.length
    for (let index = start; index < levelRule.timelineEvents; index += 1) {
      baseEvents.push(
        isZh
          ? { id: `t${index + 1}`, text: `事件 ${index + 1} 补充线索。`, order: index + 1, isRedHerring: false }
          : { id: `t${index + 1}`, text: `Event ${index + 1} adds context.`, order: index + 1, isRedHerring: false }
      )
    }
  }

  if (levelRule.timelineEvents === 5 && !baseEvents.some((event) => event.isRedHerring)) {
    baseEvents[baseEvents.length - 1] = {
      ...baseEvents[baseEvents.length - 1],
      isRedHerring: true,
    }
  }

  const normalizedLinks = Array.isArray(rawTimeline?.causalLinks)
    ? rawTimeline.causalLinks
        .map((link) => {
          const from = toSafeString(link?.from)
          const to = toSafeString(link?.to)
          if (!from || !to || from === to) return null
          return { from, to }
        })
        .filter(Boolean)
    : []

  const sortedEvents = [...baseEvents].sort((a, b) => a.order - b.order)
  const nonRedEvents = sortedEvents.filter((event) => !event.isRedHerring)

  const fallbackLinks = []
  for (let index = 0; index < nonRedEvents.length - 1; index += 1) {
    fallbackLinks.push({ from: nonRedEvents[index].id, to: nonRedEvents[index + 1].id })
  }

  return {
    events: sortedEvents,
    causalLinks: normalizedLinks.length > 0 ? normalizedLinks : fallbackLinks,
    requireCausalLinks: levelRule.requireCausalLinks,
  }
}

function normalizeVerdict(rawVerdict, expectedConcepts, solutionExplanation, levelRule, isZh) {
  const optionsInput = Array.isArray(rawVerdict?.options)
    ? rawVerdict.options.map((item) => toSafeString(item)).filter(Boolean)
    : []

  const baseCorrect = isZh
    ? `真正原因与 ${expectedConcepts.join('、')} 的因果链有关。`
    : `The true cause follows the ${expectedConcepts.join(', ')} causal chain.`

  const fallbackOptions = isZh
    ? [
        baseCorrect,
        '只是巧合，与线索无关。',
        '唯一原因是设备突然失效。',
        '现场证据不足以推理。',
      ]
    : [
        baseCorrect,
        'It was just a coincidence unrelated to the clues.',
        'A random equipment failure alone caused everything.',
        'There is not enough evidence to infer causality.',
      ]

  const options = optionsInput.length > 0 ? optionsInput : fallbackOptions
  const trimmedOptions = options.slice(0, Math.max(levelRule.verdictOptions, 2))

  while (trimmedOptions.length < levelRule.verdictOptions) {
    trimmedOptions.push(fallbackOptions[trimmedOptions.length % fallbackOptions.length])
  }

  const correctIndexRaw = Number(rawVerdict?.correctIndex)
  const correctIndex = Number.isFinite(correctIndexRaw)
    ? Math.min(trimmedOptions.length - 1, Math.max(0, Math.floor(correctIndexRaw)))
    : 0

  const verdictExpectedConcepts = Array.isArray(rawVerdict?.expectedConcepts)
    ? rawVerdict.expectedConcepts.map((concept) => toSafeString(concept)).filter(Boolean)
    : []

  return {
    options: trimmedOptions,
    correctIndex,
    expectedConcepts: verdictExpectedConcepts.length > 0 ? verdictExpectedConcepts : expectedConcepts,
    rationaleHint: toSafeString(rawVerdict?.rationaleHint, solutionExplanation),
  }
}

function normalizeCrimeSceneOpsPayload(rawMystery, explanationLevel, isZh) {
  const levelRule = LEVEL_RULES[explanationLevel] || LEVEL_RULES.standard

  const mysteryTitle = toSafeString(rawMystery?.mysteryTitle, isZh ? '神秘案件' : 'Mystery Case')
  const mysterySetup = toSafeString(
    rawMystery?.mysterySetup,
    isZh ? '现场出现了异常现象，等待侦探调查。' : 'Something unusual happened at the scene, and the detective team must investigate.'
  )
  const imagePrompt = toSafeString(rawMystery?.imagePrompt, 'Detective style educational scene with clear clues')

  const expectedConcepts = Array.isArray(rawMystery?.expectedConcepts)
    ? rawMystery.expectedConcepts.map((concept) => toSafeString(concept)).filter(Boolean)
    : []

  const fallbackConcepts = expectedConcepts.length > 0
    ? expectedConcepts
    : (isZh ? ['关键线索', '因果关系'] : ['key clue', 'cause and effect'])

  const clues = normalizeClues(rawMystery?.clues, fallbackConcepts, isZh)
  const crimeScene = normalizeCrimeScene(rawMystery?.crimeScene, clues, fallbackConcepts, levelRule, isZh, imagePrompt)
  const witnesses = normalizeWitnesses(rawMystery?.witnesses, crimeScene, fallbackConcepts, levelRule, isZh)
  const timeline = normalizeTimeline(rawMystery?.timeline, clues, levelRule, isZh)
  const solutionExplanation = toSafeString(
    rawMystery?.solutionExplanation,
    isZh
      ? `案件结论：通过线索可确认 ${fallbackConcepts.join('、')} 共同导致了异常。`
      : `Case resolved: the clue chain shows that ${fallbackConcepts.join(', ')} caused the incident.`
  )

  const verdict = normalizeVerdict(
    rawMystery?.verdict,
    fallbackConcepts,
    solutionExplanation,
    levelRule,
    isZh
  )

  const revealNarration = toSafeString(rawMystery?.revealNarration, solutionExplanation)

  return {
    mysteryTitle,
    mysterySetup,
    imagePrompt: imagePrompt.slice(0, 500),
    clues,
    expectedConcepts: fallbackConcepts,
    solutionExplanation,
    revealNarration,
    crimeScene,
    witnesses,
    timeline,
    verdict,
  }
}

/**
 * Generate a detective mystery from slide content.
 * @param {Object} params
 * @param {Array} params.slides
 * @param {string} params.topicName
 * @param {string} params.explanationLevel
 * @returns {Object}
 */
export async function generateMystery({ slides, topicName, explanationLevel }) {
  try {
    const ai = getAIClient()
    if (!ai) {
      return { error: 'API_NOT_AVAILABLE' }
    }

    const language = detectLanguage(topicName)
    const isZh = language === 'zh'
    const levelRule = LEVEL_RULES[explanationLevel] || LEVEL_RULES.standard

    const slideContent = slides
      .map((slide, index) => {
        const text = slide.subtitle || slide.script || ''
        return `Slide ${index + 1}: ${text.trim()}`
      })
      .join('\n\n')

    const complexityMap = {
      simple: 'very clear and beginner-friendly',
      standard: 'moderately challenging and concept-driven',
      deep: 'highly analytical with nuanced causality',
    }

    const complexity = complexityMap[explanationLevel] || complexityMap.standard

    const prompt = isZh
      ? `你是儿童科普侦探游戏设计师。请根据课程内容生成“犯罪现场调查”格式的谜题。

主题：${topicName}
难度：${complexity}
课程内容：
${slideContent}

请输出 JSON，必须包含：
- mysteryTitle
- mysterySetup
- imagePrompt
- clues (至少 ${levelRule.hotspots} 条)
- expectedConcepts (2-4 个)
- solutionExplanation
- revealNarration
- crimeScene: { imagePrompt, hotspots, evidenceCards }
- witnesses: 数组
- timeline: { events, causalLinks }
- verdict: { options, correctIndex, expectedConcepts }

字段规则：
1. hotspots 使用百分比坐标 x/y（0-100）
2. evidenceCards 与 hotspots 通过 evidenceId 关联
3. witnesses 每个包含 questionCards 与 responses
4. responses 包含 reliability(0-1)、tags、可选 contradictionKey
5. timeline.events 包含 id/text/order，可选 isRedHerring
6. timeline.causalLinks 使用 from/to 事件 id
7. verdict.options 数量至少 ${levelRule.verdictOptions}

仅返回 JSON。`
      : `You are designing a kid-friendly detective game in a Crime Scene Ops format.

Topic: ${topicName}
Difficulty: ${complexity}
Lesson content:
${slideContent}

Return JSON with all required fields:
- mysteryTitle
- mysterySetup
- imagePrompt
- clues (at least ${levelRule.hotspots} clues)
- expectedConcepts (2-4 concepts)
- solutionExplanation
- revealNarration
- crimeScene: { imagePrompt, hotspots, evidenceCards }
- witnesses: array
- timeline: { events, causalLinks }
- verdict: { options, correctIndex, expectedConcepts }

Rules:
1. hotspots use percentage coordinates x/y in 0-100
2. evidenceCards must map from hotspots via evidenceId
3. each witness must include questionCards and responses
4. each response includes reliability(0-1), tags, optional contradictionKey
5. timeline.events include id/text/order and optional isRedHerring
6. timeline.causalLinks reference event ids via from/to
7. verdict.options count must be at least ${levelRule.verdictOptions}

Return JSON only.`

    logger.info('MYSTERY', 'Generating mystery with Gemini', {
      model: TEXT_MODEL,
      slideCount: slides.length,
      language,
      explanationLevel,
    })

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    })

    const text = response.text || ''
    const jsonData = extractJSON(text)

    if (!jsonData) {
      logger.error('MYSTERY', 'Failed to extract JSON from response', {
        responseText: text.substring(0, 500),
      })
      return { error: 'PARSE_ERROR' }
    }

    let mystery
    try {
      mystery = JSON.parse(jsonData)
    } catch (parseError) {
      logger.error('MYSTERY', 'Failed to parse JSON from response', {
        error: parseError.message,
        responseText: text.substring(0, 500),
      })
      return { error: 'PARSE_ERROR' }
    }

    const normalized = normalizeCrimeSceneOpsPayload(mystery, explanationLevel, isZh)

    logger.info('MYSTERY', 'Mystery generated successfully', {
      title: normalized.mysteryTitle,
      clueCount: normalized.clues.length,
      conceptCount: normalized.expectedConcepts.length,
      hotspotCount: normalized.crimeScene?.hotspots?.length || 0,
      witnessCount: normalized.witnesses?.length || 0,
    })

    return normalized
  } catch (error) {
    logger.error('MYSTERY', 'Error generating mystery', {
      error: error.message,
      stack: error.stack,
    })

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return { error: 'RATE_LIMITED' }
    }

    if (
      error.message?.includes('401') ||
      error.message?.includes('403') ||
      error.message?.toLowerCase()?.includes('api key') ||
      error.message?.toLowerCase()?.includes('permission') ||
      error.message?.includes('503') ||
      error.message?.toLowerCase()?.includes('unavailable')
    ) {
      return { error: 'API_NOT_AVAILABLE' }
    }

    return { error: 'MYSTERY_GENERATION_FAILED' }
  }
}

/**
 * Evaluate user's theory against expected concepts using fuzzy matching.
 * @param {Object} params
 * @param {string} params.userTheory
 * @param {Array} params.expectedConcepts
 * @returns {Object}
 */
export async function evaluateMysteryTheory({ userTheory, expectedConcepts }) {
  try {
    const ai = getAIClient()
    if (!ai) {
      return { error: 'API_NOT_AVAILABLE' }
    }

    const prompt = `You are evaluating a child's answer to a detective mystery puzzle.

Expected concepts the child should mention:
${expectedConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Child's theory:
"${userTheory}"

Task: Determine which expected concepts are present in the child's theory using semantic matching (not exact word matching). A concept is "matched" if the child expresses the idea, even if they use different words.

Return JSON format:
{
  "matchedConcepts": ["concept1", "concept2"],
  "hint": "A helpful hint if not all concepts were matched (optional)"
}

Be generous with semantic matching. For example:
- "plants need air" matches "carbon dioxide"
- "can't breathe" matches "sealed environment"
- "no water" matches "dehydration"

Return ONLY the JSON, no other text.`

    logger.info('MYSTERY', 'Evaluating theory with Gemini', {
      model: TEXT_MODEL,
      theoryLength: userTheory.length,
      expectedCount: expectedConcepts.length,
    })

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    })
    const text = response.text || ''

    const jsonData = extractJSON(text)
    if (!jsonData) {
      logger.error('MYSTERY', 'Failed to extract JSON from evaluation response', {
        responseText: text.substring(0, 500),
      })
      return { error: 'PARSE_ERROR' }
    }

    let evaluation
    try {
      evaluation = JSON.parse(jsonData)
    } catch (parseError) {
      logger.error('MYSTERY', 'Failed to parse JSON from evaluation response', {
        error: parseError.message,
        responseText: text.substring(0, 500),
      })
      return { error: 'PARSE_ERROR' }
    }

    const matchedCount = evaluation.matchedConcepts?.length || 0
    const matchRate = expectedConcepts.length > 0 ? matchedCount / expectedConcepts.length : 0

    let resultType
    let xpEarned

    if (matchRate >= 0.8) {
      resultType = 'solved'
      xpEarned = 50
    } else if (matchRate >= 0.4) {
      resultType = 'partial'
      xpEarned = 15
    } else {
      resultType = 'retry'
      xpEarned = 5
    }

    logger.info('MYSTERY', 'Theory evaluated', {
      result: resultType,
      matchRate: `${(matchRate * 100).toFixed(0)}%`,
      matchedCount,
      xpEarned,
    })

    return {
      result: resultType,
      matchedConcepts: evaluation.matchedConcepts || [],
      xpEarned,
      hint: evaluation.hint || null,
    }
  } catch (error) {
    logger.error('MYSTERY', 'Error evaluating theory', {
      error: error.message,
      stack: error.stack,
    })

    if (error.message?.includes('429') || error.message?.includes('quota')) {
      return { error: 'RATE_LIMITED' }
    }

    if (
      error.message?.includes('401') ||
      error.message?.includes('403') ||
      error.message?.toLowerCase()?.includes('api key') ||
      error.message?.toLowerCase()?.includes('permission') ||
      error.message?.includes('503') ||
      error.message?.toLowerCase()?.includes('unavailable')
    ) {
      return { error: 'API_NOT_AVAILABLE' }
    }

    return { error: 'MYSTERY_EVALUATION_FAILED' }
  }
}
