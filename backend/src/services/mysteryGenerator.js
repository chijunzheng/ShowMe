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

function normalizeComparisonText(value) {
  return toSafeString(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function getConceptAtIndex(expectedConcepts, index, isZh) {
  const safeConcepts = Array.isArray(expectedConcepts)
    ? expectedConcepts.map((concept) => toSafeString(concept)).filter(Boolean)
    : []
  if (safeConcepts.length === 0) {
    return isZh ? '关键概念' : 'core concept'
  }
  return safeConcepts[index % safeConcepts.length]
}

function getEvidenceLead(evidenceCards, index, isZh) {
  const cards = Array.isArray(evidenceCards) ? evidenceCards : []
  if (cards.length === 0) {
    return isZh ? '一个异常读数' : 'an abnormal readout'
  }

  const text = toSafeString(cards[index % cards.length]?.text)
  if (!text) {
    return isZh ? '一个异常读数' : 'an abnormal readout'
  }

  const firstSentence = text.split(/[。！？.!?]/)[0].trim()
  if (!firstSentence) {
    return isZh ? '一个异常读数' : 'an abnormal readout'
  }

  return firstSentence.length > 90 ? `${firstSentence.slice(0, 87)}...` : firstSentence
}

function buildFallbackClueAt(index, expectedConcepts, isZh) {
  const conceptA = getConceptAtIndex(expectedConcepts, index, isZh)
  const conceptB = getConceptAtIndex(expectedConcepts, index + 1, isZh)
  const conceptC = getConceptAtIndex(expectedConcepts, index + 2, isZh)
  const phase = index % 5

  if (isZh) {
    const variants = [
      {
        text: `监测日志显示 ${conceptA} 在警报触发前约 3 分钟就偏离正常区间。`,
        narratorText: `先看时间线，${conceptA} 的异常先出现，这通常不是巧合。`,
      },
      {
        text: `控制台记录到 ${conceptB} 在故障可见化的同一分钟内出现突变峰值。`,
        narratorText: `第二条证据把 ${conceptB} 的突变和现场异常对齐到同一时刻。`,
      },
      {
        text: `备用传感器反复确认：${conceptA} 的早期变化随后触发了 ${conceptC} 的连锁反应。`,
        narratorText: `这条证据解释了为什么小变化会滚雪球成大问题。`,
      },
      {
        text: `维护记录显示关键装置并未机械失效，异常更像由 ${conceptB} 的环境条件变化导致。`,
        narratorText: `这说明问题不是“突然坏掉”，而是条件一步步被推向失控。`,
      },
      {
        text: `交叉比对现场痕迹后，唯一一致的路径是：${conceptA} 先变化，再出现 ${conceptC} 结果。`,
        narratorText: `把所有线索拼起来后，因果链条已经非常清晰。`,
      },
    ]
    return variants[phase]
  }

  const variants = [
    {
      text: `Telemetry logs show ${conceptA} drifted out of its safe range about three minutes before the alarm fired.`,
      narratorText: `Start with timing: ${conceptA} shifted before the visible failure.`,
    },
    {
      text: `Console records capture a sharp ${conceptB} spike in the same minute the malfunction became visible.`,
      narratorText: `This clue syncs the ${conceptB} spike with the moment students can observe the failure.`,
    },
    {
      text: `A backup sensor confirms the early ${conceptA} shift cascaded into a later ${conceptC} chain reaction.`,
      narratorText: 'This is the bridge clue that connects early warning signs to the final outcome.',
    },
    {
      text: `Maintenance notes rule out random hardware breakage, pointing instead to changing ${conceptB} conditions.`,
      narratorText: 'That narrows the case: this looks systemic, not accidental.',
    },
    {
      text: `Cross-checking all traces leaves one consistent sequence: ${conceptA} changed first, then ${conceptC} emerged.`,
      narratorText: 'Now the full cause-and-effect path is visible from first signal to final effect.',
    },
  ]
  return variants[phase]
}

function buildFallbackClues(expectedConcepts, clueCount, isZh) {
  const minimum = Number.isFinite(Number(clueCount)) ? Math.max(3, Math.floor(Number(clueCount))) : 3
  return Array.from({ length: minimum }).map((_, index) => {
    const clue = buildFallbackClueAt(index, expectedConcepts, isZh)
    return {
      text: clue.text,
      slideRef: index + 1,
      narratorText: clue.narratorText,
    }
  })
}

function normalizeClues(rawClues, expectedConcepts, isZh, minimumCount = 3) {
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

  const minCount = Math.max(3, Number.isFinite(Number(minimumCount)) ? Math.floor(Number(minimumCount)) : 3)
  const fallback = buildFallbackClues(expectedConcepts, minCount, isZh)

  const merged = []
  const seen = new Set()
  const candidates = [...normalized, ...fallback]
  for (const clue of candidates) {
    const key = normalizeComparisonText(clue?.text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    merged.push(clue)
    if (merged.length >= minCount) break
  }

  if (merged.length > 0) {
    return merged
  }

  return fallback
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

function getWitnessLens(index, isZh) {
  const zhLenses = [
    { anchor: '在主控台', instrument: '遥测面板' },
    { anchor: '在维护通道', instrument: '手持诊断器' },
    { anchor: '在观测窗旁', instrument: '外部监视器' },
  ]

  const enLenses = [
    { anchor: 'From the command console', instrument: 'the telemetry feed' },
    { anchor: 'Near the maintenance lane', instrument: 'my handheld diagnostics' },
    { anchor: 'At the observation port', instrument: 'the external monitor' },
  ]

  const pool = isZh ? zhLenses : enLenses
  return pool[index % pool.length]
}

function inferQuestionIntent(question, isZh) {
  const text = normalizeComparisonText(question)
  if (!text) return 'general'

  if (isZh) {
    if (text.includes('先') || text.includes('最先') || text.includes('看到')) return 'first'
    if (text.includes('何时') || text.includes('什么时候') || text.includes('开始') || text.includes('时间')) return 'timing'
    if (text.includes('异常') || text.includes('不寻常') || text.includes('奇怪')) return 'anomaly'
    if (text.includes('对应') || text.includes('关联') || text.includes('连接') || text.includes('证据')) return 'connection'
    if (text.includes('确定') || text.includes('最有把握') || text.includes('确信')) return 'certainty'
    if (text.includes('矛盾') || text.includes('冲突')) return 'contradiction'
    if (text.includes('遗漏') || text.includes('缺少') || text.includes('还可能')) return 'missing'
    return 'general'
  }

  if (text.includes('first') || text.includes('see')) return 'first'
  if (text.includes('when') || text.includes('start') || text.includes('time')) return 'timing'
  if (text.includes('unusual') || text.includes('odd') || text.includes('strange')) return 'anomaly'
  if (text.includes('connect') || text.includes('earlier evidence') || text.includes('link')) return 'connection'
  if (text.includes('certain') || text.includes('sure')) return 'certainty'
  if (text.includes('contradict') || text.includes('conflict')) return 'contradiction'
  if (text.includes('missing') || text.includes('still')) return 'missing'

  return 'general'
}

function buildWitnessStatement({ question, evidenceCards, concept, witnessIndex, responseIndex, isZh, variant = 0 }) {
  const intent = inferQuestionIntent(question, isZh)
  const lens = getWitnessLens(witnessIndex, isZh)
  const detail = getEvidenceLead(evidenceCards, witnessIndex + responseIndex, isZh)

  if (isZh) {
    switch (intent) {
      case 'first':
        return variant % 2 === 0
          ? `${lens.anchor}，我最先记录到的是 ${concept} 的异常信号，不是最终故障画面。`
          : `${lens.instrument} 最早捕捉到的线索与“${detail}”一致，但时间点更早。`
      case 'timing':
        return variant % 2 === 0
          ? `按时间戳看，${concept} 先变化，几分钟后才出现肉眼可见的异常。`
          : `我核对过 ${lens.instrument} 记录：先有早期信号，再有主警报。`
      case 'anomaly':
        return variant % 2 === 0
          ? `最不寻常的是“${detail}”和常规 ${concept} 轨迹不一致。`
          : `异常点不在结果本身，而在 ${concept} 的变化方式突然偏离基线。`
      case 'connection':
        return variant % 2 === 0
          ? `把前面证据串起来看，${concept} 像是触发链条的前因，而不是后果。`
          : `前后两条记录都指向同一件事：${concept} 的早期变化推动了后续事件。`
      case 'certainty':
        return variant % 2 === 0
          ? `我最确定的是顺序：先出现 ${concept} 漂移，再出现明显故障。`
          : `就可靠性而言，时间顺序这点最稳，因为我做了重复比对。`
      case 'contradiction':
        return variant % 2 === 0
          ? `有人说“问题是瞬间发生”，但我的日志显示中间存在可观测延迟。`
          : `我不同意“同时发生”的说法，${concept} 的信号明显先到。`
      case 'missing':
        return variant % 2 === 0
          ? `我们还缺一条线索：异常触发后第一分钟里，${concept} 如何继续扩散。`
          : `若要补全证据链，还要追踪 ${concept} 在后段阶段的变化。`
      default:
        return variant % 2 === 0
          ? `${lens.anchor}，我看到的模式支持 ${concept} 是关键驱动因素。`
          : `从 ${lens.instrument} 的记录看，${concept} 与故障结果并非巧合关联。`
    }
  }

  switch (intent) {
    case 'first':
      return variant % 2 === 0
        ? `${lens.anchor}, the first anomaly I logged was tied to ${concept}, before the full failure appeared.`
        : `${lens.instrument} caught the earliest signal around "${detail}" before anyone called the main alarm.`
    case 'timing':
      return variant % 2 === 0
        ? `My timestamps show ${concept} shifted first, and the visible malfunction followed minutes later.`
        : `I cross-checked ${lens.instrument}: early signal first, main failure second.`
    case 'anomaly':
      return variant % 2 === 0
        ? `What stood out was "${detail}" behaving unlike normal ${concept} patterns.`
        : `The unusual part was not the final failure itself, but how ${concept} drifted off baseline.`
    case 'connection':
      return variant % 2 === 0
        ? `When I line this up with earlier evidence, ${concept} looks like the trigger, not a side effect.`
        : `Both records point the same way: an early ${concept} shift drives the later outcome.`
    case 'certainty':
      return variant % 2 === 0
        ? `The detail I trust most is the sequence: ${concept} drift first, visible failure second.`
        : `I am most certain about order, because I verified those timestamps twice.`
    case 'contradiction':
      return variant % 2 === 0
        ? `Another account says it happened instantly, but my logs show a clear delay before the final failure.`
        : `I disagree with the "all at once" story; ${concept} changed first and the result came later.`
    case 'missing':
      return variant % 2 === 0
        ? `What we still need is the first-minute trace after the trigger to map how ${concept} spread.`
        : `There is a gap right after the trigger event, and that gap likely explains the ${concept} chain.`
    default:
      return variant % 2 === 0
        ? `${lens.anchor}, the pattern I observed supports ${concept} as a key driver.`
        : `From ${lens.instrument}, ${concept} tracks too closely with the incident to be coincidence.`
  }
}

function buildGuaranteedWitnessStatement({ concept, witnessIndex, responseIndex, isZh }) {
  if (isZh) {
    return `第 ${witnessIndex + 1} 位证人的第 ${responseIndex + 1} 次核查确认：${concept} 的变化先于最终异常。`
  }
  return `Witness ${witnessIndex + 1}, checkpoint ${responseIndex + 1}: ${concept} changed before the final failure signal.`
}

function buildFallbackWitnessResponses(
  questionCards,
  evidenceCards,
  expectedConcepts,
  isZh,
  witnessIndex = 0,
  globalStatementSet = new Set()
) {
  const concept = getConceptAtIndex(expectedConcepts, witnessIndex, isZh)
  const secondaryConcept = getConceptAtIndex(expectedConcepts, witnessIndex + 1, isZh)
  const evidenceSet = new Set(
    (Array.isArray(evidenceCards) ? evidenceCards : [])
      .map((card) => normalizeComparisonText(card?.text))
      .filter(Boolean)
  )
  const localStatementSet = new Set()

  return questionCards.map((question, index) => {
    let statement = ''
    let normalized = ''
    let variant = 0

    while (variant < 6) {
      statement = buildWitnessStatement({
        question,
        evidenceCards,
        concept,
        witnessIndex,
        responseIndex: index,
        isZh,
        variant,
      })
      normalized = normalizeComparisonText(statement)
      if (normalized && !evidenceSet.has(normalized) && !localStatementSet.has(normalized) && !globalStatementSet.has(normalized)) {
        break
      }
      variant += 1
    }

    if (!normalized || evidenceSet.has(normalized) || localStatementSet.has(normalized) || globalStatementSet.has(normalized)) {
      statement = buildGuaranteedWitnessStatement({
        concept,
        witnessIndex,
        responseIndex: index,
        isZh,
      })
      normalized = normalizeComparisonText(statement)
    }

    if (normalized) {
      localStatementSet.add(normalized)
      globalStatementSet.add(normalized)
    }

    const tags = [concept, secondaryConcept].filter((tag, idx, arr) => tag && arr.indexOf(tag) === idx).slice(0, 2)

    return {
      question,
      statement,
      reliability: Math.max(0.45, 0.88 - index * 0.08),
      tags,
      contradictionKey: index % 2 === 0 ? 'A' : 'B',
    }
  })
}

function enforceWitnessStatementVariety(witnesses, evidenceCards, expectedConcepts, isZh) {
  const inputWitnesses = Array.isArray(witnesses) ? witnesses : []
  const evidenceSet = new Set(
    (Array.isArray(evidenceCards) ? evidenceCards : [])
      .map((card) => normalizeComparisonText(card?.text))
      .filter(Boolean)
  )
  const seenStatements = new Set()

  return inputWitnesses.map((witness, witnessIndex) => {
    const questionCards = Array.isArray(witness?.questionCards)
      ? witness.questionCards.map((question) => toSafeString(question)).filter(Boolean)
      : []

    const responses = (Array.isArray(witness?.responses) ? witness.responses : []).map((response, responseIndex) => {
      const question = toSafeString(response?.question, questionCards[responseIndex] || (isZh ? '你观察到了什么？' : 'What did you observe?'))
      const reliabilityRaw = Number(response?.reliability)
      const reliability = Number.isFinite(reliabilityRaw)
        ? Math.max(0, Math.min(1, reliabilityRaw))
        : Math.max(0.45, 0.88 - responseIndex * 0.08)
      const tags = Array.isArray(response?.tags)
        ? response.tags.map((tag) => toSafeString(tag)).filter(Boolean)
        : []
      const concept = tags[0] || getConceptAtIndex(expectedConcepts, witnessIndex, isZh)

      let statement = toSafeString(response?.statement)
      let normalized = normalizeComparisonText(statement)
      let variant = 0
      while (variant < 6 && (!normalized || evidenceSet.has(normalized) || seenStatements.has(normalized))) {
        statement = buildWitnessStatement({
          question,
          evidenceCards,
          concept,
          witnessIndex,
          responseIndex,
          isZh,
          variant,
        })
        normalized = normalizeComparisonText(statement)
        variant += 1
      }

      if (!normalized || evidenceSet.has(normalized) || seenStatements.has(normalized)) {
        statement = buildGuaranteedWitnessStatement({ concept, witnessIndex, responseIndex, isZh })
        normalized = normalizeComparisonText(statement)
      }

      if (normalized) {
        seenStatements.add(normalized)
      }

      return {
        question,
        statement,
        reliability,
        tags: tags.length > 0 ? tags : [concept],
        contradictionKey: toSafeString(response?.contradictionKey, responseIndex % 2 === 0 ? 'A' : 'B'),
      }
    })

    return {
      ...witness,
      questionCards,
      responses,
    }
  })
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
  const fallbackStatementSet = new Set()

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

      const fallbackResponses = buildFallbackWitnessResponses(
        effectiveQuestions,
        crimeScene.evidenceCards,
        expectedConcepts,
        isZh,
        index,
        fallbackStatementSet
      )

      const responseByQuestion = new Map(
        responses.map((response) => [normalizeComparisonText(response?.question), response])
      )

      const effectiveResponses = effectiveQuestions
        .map((question, responseIndex) => {
          const byQuestion = responseByQuestion.get(normalizeComparisonText(question))
          return byQuestion || responses[responseIndex] || fallbackResponses[responseIndex]
        })
        .filter(Boolean)

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
    return enforceWitnessStatementVariety(
      normalized.slice(0, levelRule.witnesses),
      crimeScene.evidenceCards,
      expectedConcepts,
      isZh
    )
  }

  const fallbackWitnesses = Array.from({ length: levelRule.witnesses }).map((_, index) => {
    const questionCards = defaultQuestions.slice(0, Math.min(levelRule.questionCards, defaultQuestions.length))
    return {
      id: `w${index + 1}`,
      name: isZh ? `证人 ${index + 1}` : `Witness ${index + 1}`,
      role: isZh ? '现场目击者' : 'Scene witness',
      questionCards,
      responses: buildFallbackWitnessResponses(
        questionCards,
        crimeScene.evidenceCards,
        expectedConcepts,
        isZh,
        index,
        fallbackStatementSet
      ),
    }
  })

  return enforceWitnessStatementVariety(
    fallbackWitnesses,
    crimeScene.evidenceCards,
    expectedConcepts,
    isZh
  )
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

  const clues = normalizeClues(rawMystery?.clues, fallbackConcepts, isZh, levelRule.hotspots)
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
8. clues 必须是具体、可观察的现场证据（包含时间/位置/变化），不要使用“第一条/第二条/最后一条”的模板句
9. 证人回应不能逐字复制 evidenceCards 文本；不同证人必须有不同视角和措辞
10. 每位证人至少有一条回应补充 evidenceCards 之外的上下文（如时间、位置、顺序或冲突）
11. deep 难度至少提供一组可追踪的 contradictionKey 冲突对

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
8. clues must be concrete, observable evidence with timing/location/change details, not generic "first/second/final clue" templates
9. witness responses must not copy evidenceCards text verbatim, and each witness needs a distinct perspective/voice
10. each witness must provide at least one contextual detail not already present in evidenceCards (timing, location, sequence, or contradiction)
11. deep difficulty must include at least one contradictionKey pair that can be resolved by the player

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
