/**
 * Gemini Graph Intelligence Service
 *
 * AI-powered functions for knowledge graph operations:
 * - Discover relationships between topics
 * - Identify knowledge gaps
 * - Cluster topics into constellations
 * - Suggest learning paths
 */

import { GoogleGenAI } from '@google/genai'
import { extractJSON, extractJSONSimple } from '../utils/json.js'
import logger from '../utils/logger.js'

// Model selection (matches gemini.js pattern)
const TEXT_MODEL = 'gemini-3-flash-preview'
const FAST_MODEL = 'gemini-2.5-flash-lite'

// Reuse AI client pattern from gemini.js
let aiClient = null

function normalizeTopicName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Get or initialize the Gemini AI client
 * Lazily initializes to allow startup without API key
 * @returns {GoogleGenAI|null} The AI client or null if no API key
 */
function getAIClient() {
  if (aiClient) {
    return aiClient
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    logger.warn('GEMINI_GRAPH', 'No valid API key found. Graph intelligence features will use fallbacks.')
    return null
  }

  try {
    aiClient = new GoogleGenAI({ apiKey })
    logger.info('GEMINI_GRAPH', 'AI client initialized successfully')
    return aiClient
  } catch (error) {
    logger.error('GEMINI_GRAPH', 'Failed to initialize AI client', { error: error.message })
    return null
  }
}

/**
 * Complete truncated JSON by adding missing closing brackets and braces
 * @param {string} jsonStr - Potentially truncated JSON string
 * @returns {string} JSON string with proper closing structure
 */
function completeJSONStructure(jsonStr) {
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escapeNext = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{') braceCount++
      else if (char === '}') braceCount--
      else if (char === '[') bracketCount++
      else if (char === ']') bracketCount--
    }
  }

  // Handle unclosed string
  if (inString) {
    jsonStr += '"'
  }

  // Add missing closing brackets and braces
  while (bracketCount > 0) {
    jsonStr += ']'
    bracketCount--
  }
  while (braceCount > 0) {
    jsonStr += '}'
    braceCount--
  }

  return jsonStr
}

/**
 * Normalize raw newlines inside JSON strings into escaped sequences.
 * This prevents JSON.parse from failing on literal line breaks.
 * @param {string} jsonStr
 * @returns {string}
 */
function normalizeNewlinesInStrings(jsonStr) {
  let result = ''
  let inString = false
  let escapeNext = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      result += char
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      result += char
      continue
    }

    if (inString && (char === '\n' || char === '\r')) {
      result += '\\n'
      // Skip paired \r\n
      if (char === '\r' && jsonStr[i + 1] === '\n') {
        i += 1
      }
      continue
    }

    result += char
  }

  return result
}

/**
 * Insert missing commas between JSON values when LLM output omits separators.
 * This is a heuristic to salvage near-valid JSON.
 * @param {string} jsonStr
 * @returns {string}
 */
function insertMissingCommas(jsonStr) {
  let result = ''
  let inString = false
  let escapeNext = false
  let lastSignificant = ''

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      result += char
      escapeNext = true
      continue
    }

    if (char === '"') {
      if (!inString) {
        if (lastSignificant && !['{', '[', ',', ':'].includes(lastSignificant)) {
          result += ','
        }
      }
      inString = !inString
      result += char
      if (!inString) {
        lastSignificant = '"'
      }
      continue
    }

    if (!inString && !/\s/.test(char)) {
      lastSignificant = char
    }

    result += char
  }

  return result
}

/**
 * Repair common JSON issues from LLM output
 * @param {string} jsonStr - JSON string that may have issues
 * @returns {string} Repaired JSON string
 */
function repairJSON(jsonStr) {
  let repaired = jsonStr

  // Remove BOM and invisible characters at start
  repaired = repaired.replace(/^\uFEFF/, '')

  // Replace smart/curly quotes with straight quotes
  repaired = repaired.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
  repaired = repaired.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")

  // Remove JavaScript-style comments
  repaired = repaired.replace(/\/\/[^\n]*/g, '')
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '')

  // Normalize literal newlines inside strings
  repaired = normalizeNewlinesInStrings(repaired)

  // Insert missing commas between values
  repaired = insertMissingCommas(repaired)

  // Remove trailing commas before ] or }
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1')

  // Complete truncated JSON by adding missing brackets/braces
  repaired = completeJSONStructure(repaired)

  return repaired
}

/**
 * Safely parse JSON from AI response
 * @param {string} text - Raw text from AI
 * @returns {Object} Parsed JSON object or empty object on failure
 */
function safeParseJSON(text) {
  const attempts = [
    () => repairJSON(extractJSON(text)),
    () => repairJSON(extractJSONSimple(text)),
  ]

  for (const getJson of attempts) {
    try {
      const jsonStr = getJson()
      return JSON.parse(jsonStr)
    } catch (error) {
      logger.warn('GEMINI_GRAPH', 'JSON parse failed', { error: error.message })
    }
  }

  return {}
}

/**
 * Infer cluster from topic name (fallback when AI unavailable)
 * @param {string} topicName - The topic name to categorize
 * @returns {string} Inferred cluster/category name
 */
function inferCluster(topicName) {
  const name = (topicName || '').toLowerCase()

  if (/math|number|calcul|algebra|geometry|fraction|equation/.test(name)) return 'mathematics'
  if (/science|physics|chemistry|biology|atom|molecule/.test(name)) return 'science'
  if (/history|war|ancient|civilization|empire|dynasty/.test(name)) return 'history'
  if (/geography|country|continent|ocean|mountain|river/.test(name)) return 'geography'
  if (/space|planet|star|galaxy|universe|solar|moon|asteroid/.test(name)) return 'astronomy'
  if (/animal|plant|nature|environment|forest|jungle|ecosystem/.test(name)) return 'nature'
  if (/tech|computer|program|code|robot|internet|software/.test(name)) return 'technology'
  if (/art|music|paint|sculpt|dance|theater/.test(name)) return 'arts'
  if (/language|grammar|writing|literature|poetry/.test(name)) return 'language'

  return 'general'
}

/**
 * Categorize a topic using AI with existing categories as context
 * @param {string} topicName - Topic to categorize
 * @param {string[]} existingCategories - Categories already in the learner's graph
 * @returns {Promise<{category: string, icon: string|null}>}
 */
export async function categorizeTopic(topicName, existingCategories = []) {
  const ai = getAIClient()
  if (!ai) return { category: inferCluster(topicName), icon: null }

  const existingList = existingCategories.length > 0
    ? `\nThe learner's existing categories: ${existingCategories.join(', ')}`
    : ''

  const prompt = `Classify this educational topic into a category.

Topic: "${topicName}"
${existingList}

Rules:
- Prefer an existing category if the topic fits well
- If no existing category fits, suggest a new short category name (1-2 words, lowercase)
- Be specific but not too narrow (e.g., "music" -> "arts", but "quantum physics" could be "physics" if that exists, or "science" otherwise)
- Avoid "general" - almost every topic fits somewhere

Return JSON: { "category": "category name", "icon": "single emoji" }`

  try {
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: { temperature: 0, responseMimeType: 'application/json' },
    })
    const result = safeParseJSON(response?.text || '')
    if (result?.category) {
      return { category: result.category.toLowerCase().trim(), icon: result.icon || null }
    }
    return { category: inferCluster(topicName), icon: null }
  } catch {
    return { category: inferCluster(topicName), icon: null }
  }
}

/**
 * Create default clusters by category (fallback when AI unavailable)
 * @param {Object[]} nodes - Array of knowledge nodes
 * @returns {Object[]} Array of cluster objects
 */
function createDefaultClusters(nodes) {
  const categoryMap = new Map()

  nodes.forEach(node => {
    const category = String(node.category || inferCluster(node.name))
      .trim()
      .toLowerCase()
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category).push(node.id)
  })

  const config = {
    mathematics: { icon: '\u{1F522}', color: '#3B82F6' },
    science: { icon: '\u{1F52C}', color: '#10B981' },
    history: { icon: '\u{1F4DC}', color: '#F59E0B' },
    geography: { icon: '\u{1F30D}', color: '#06B6D4' },
    astronomy: { icon: '\u{1F30C}', color: '#2DD4BF' },
    nature: { icon: '\u{1F33F}', color: '#84CC16' },
    technology: { icon: '\u{1F4BB}', color: '#6366F1' },
    arts: { icon: '\u{1F3A8}', color: '#EC4899' },
    language: { icon: '\u{1F4DA}', color: '#A855F7' },
    'marine biology': { icon: '\u{1F433}', color: '#0EA5E9' },
    civilization: { icon: '\u{1F3DB}\u{FE0F}', color: '#F97316' },
    general: { icon: '\u{1F4A1}', color: '#64748B' }
  }

  const clusters = []
  categoryMap.forEach((nodeIds, category) => {
    const cfg = config[category] || {
      icon: '\u{1F4CC}',
      color: ['#F97316', '#D946EF', '#2DD4BF', '#84CC16', '#A855F7',
        '#FB923C', '#14B8A6', '#E879F9', '#FACC15', '#38BDF8'][
        Math.abs(category.split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0)) % 10
      ],
    }
    clusters.push({
      id: `cluster_${category}`,
      name: category
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
      icon: cfg.icon,
      nodeIds,
      color: cfg.color
    })
  })

  return clusters
}

/**
 * Discover relationships when a new topic is added to the graph
 *
 * @param {Object} newTopic - The newly learned topic
 * @param {string} newTopic.id - Topic ID
 * @param {string} newTopic.name - Topic name
 * @param {string[]} newTopic.concepts - Key concepts from slides
 * @param {Object[]} existingNodes - Existing nodes in the graph
 * @returns {Promise<{ relationships: Object[], suggestedCluster: string }>}
 */
export async function discoverRelationships(newTopic, existingNodes) {
  // Validate inputs
  if (!newTopic || !newTopic.name) {
    logger.warn('GEMINI_GRAPH', 'discoverRelationships called with invalid newTopic')
    return { relationships: [], suggestedCluster: 'general' }
  }

  const ai = getAIClient()
  if (!ai) {
    return { relationships: [], suggestedCluster: inferCluster(newTopic.name) }
  }

  if (!existingNodes || existingNodes.length === 0) {
    return { relationships: [], suggestedCluster: inferCluster(newTopic.name) }
  }

  const prompt = `You are a knowledge graph expert analyzing educational topic relationships.

NEW TOPIC:
Name: "${newTopic.name}"
Concepts: ${JSON.stringify(newTopic.concepts || [])}

EXISTING TOPICS:
${existingNodes.slice(0, 20).map(n => `- ${n.name} (concepts: ${(n.concepts || []).slice(0, 5).join(', ') || 'unknown'})`).join('\n')}

Analyze relationships between the new topic and existing topics. For each relationship found:
1. Identify which existing topic it connects to
2. Determine the relationship type:
   - "prerequisite": New topic requires understanding the existing one first
   - "extends": New topic builds upon or deepens the existing one
   - "contrasts": Topics present opposing viewpoints or alternatives
   - "applies": New topic is a practical application of the existing one
   - "bridges": Topics from different domains that share concepts

3. Rate confidence (0-1) based on how strong the connection is
4. Provide a brief explanation of WHY they're related

Also suggest which cluster/category this topic belongs to.
Here are the learner's existing categories: ${existingNodes.map(n => n.category).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'none yet'}.
Prefer an existing category if it fits well, but suggest a new short category (1-2 words, lowercase) if nothing fits. Avoid "general" unless truly uncategorizable.

Output JSON:
{
  "relationships": [
    {
      "existingTopicName": "name of existing topic",
      "type": "extends|prerequisite|contrasts|applies|bridges",
      "strength": 0.8,
      "explanation": "Brief explanation of the connection"
    }
  ],
  "suggestedCluster": "category name (e.g., science, history, mathematics)"
}

Return empty relationships array if no meaningful connections exist. Maximum 5 relationships.`

  try {
    logger.time('GEMINI_GRAPH', 'discover-relationships')

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })

    logger.timeEnd('GEMINI_GRAPH', 'discover-relationships')

    const text = response.text || ''
    const result = safeParseJSON(text)

    // Transform to edges with proper IDs
    const relationships = (result.relationships || []).map(rel => {
      const targetNode = existingNodes.find(n =>
        n.name.toLowerCase() === (rel.existingTopicName || '').toLowerCase()
      )
      if (!targetNode) return null

      return {
        id: `edge_${newTopic.id || Date.now()}_${targetNode.id}`,
        from: newTopic.id || `node_${Date.now()}`,
        to: targetNode.id,
        type: rel.type || 'extends',
        strength: Math.min(1, Math.max(0, rel.strength || 0.5)),
        discovered: false,
        explanation: rel.explanation || 'Related topic'
      }
    }).filter(Boolean)

    logger.info('GEMINI_GRAPH', 'Discovered relationships', {
      newTopic: newTopic.name,
      relationshipCount: relationships.length,
      cluster: result.suggestedCluster
    })

    return {
      relationships,
      suggestedCluster: result.suggestedCluster || inferCluster(newTopic.name)
    }
  } catch (error) {
    logger.error('GEMINI_GRAPH', 'discoverRelationships error', { error: error.message })
    return { relationships: [], suggestedCluster: inferCluster(newTopic.name) }
  }
}

const DEFAULT_GAP_TARGET_COUNT = 6
const MIN_GAP_TARGET_COUNT = 1
const MAX_GAP_TARGET_COUNT = 10
const GAP_ATTEMPT_LIMIT = 3

function normalizeGapTargetCount(value) {
  const parsed = Number.isFinite(Number(value))
    ? Math.trunc(Number(value))
    : DEFAULT_GAP_TARGET_COUNT
  return Math.min(MAX_GAP_TARGET_COUNT, Math.max(MIN_GAP_TARGET_COUNT, parsed))
}

function sanitizeExcludeTopics(excludeTopics = []) {
  if (!Array.isArray(excludeTopics)) return []
  return excludeTopics
    .filter((topic) => typeof topic === 'string')
    .map((topic) => topic.trim())
    .filter(Boolean)
}

function buildGapPrompt({ graph, targetCount, avoidTopicNames }) {
  const learnedTopics = (graph.nodes || [])
    .slice(0, 30)
    .map((n) => `- ${n.name} (mastery: ${Math.round((n.mastery || 0) * 100)}%)`)
    .join('\n')

  const clusterSummary = (graph.clusters || [])
    .map((c) => `- ${c.name}: ${c.nodeIds?.length || 0} topics`)
    .join('\n') || 'No clusters yet'

  const avoidLines = avoidTopicNames
    .slice(0, 120)
    .map((name) => `- ${name}`)
    .join('\n')

  return `You are an educational advisor analyzing a student's knowledge map.

LEARNED TOPICS (${graph.nodes.length} total):
${learnedTopics}

EXISTING CLUSTERS:
${clusterSummary}

Identify ${targetCount} knowledge gaps - topics the student should learn next. Ensure suggestions span at least 2 categories/clusters from the student's existing knowledge.
For each gap:
1. Suggest a specific topic name
2. Classify the gap type:
   - "bridge": Connects two existing knowledge areas
   - "deepen": Goes deeper into an existing area
   - "unlock": Opens a new valuable area of knowledge
3. Explain reasoning
4. Write an intriguing "curiosity hook" - a question that makes them want to learn it

Topic names to avoid re-suggesting:
${avoidLines}

Output JSON:
{
  "gaps": [
    {
      "suggestedTopic": "Topic Name",
      "type": "bridge|deepen|unlock",
      "connectsTo": ["existing topic 1", "existing topic 2"],
      "reasoning": "Why this topic would be valuable",
      "curiosityHook": "Did you know that...? or Have you ever wondered...?"
    }
  ]
}

Rules:
- Return exactly ${targetCount} gaps.
- Each gap must include at least 1 valid entry in connectsTo.
- connectsTo must only include learned topics listed above.
- Output ONLY valid JSON. No markdown or extra text.`
}

/**
 * Identify knowledge gaps in the user's graph
 * Suggests new topics that would strengthen their understanding
 *
 * @param {Object} graph - The full knowledge graph
 * @param {Object[]} graph.nodes - Array of knowledge nodes
 * @param {Object[]} graph.clusters - Array of clusters
 * @param {Object} [options]
 * @param {number} [options.targetCount] - Desired gap count (1-10)
 * @param {string[]} [options.excludeTopics] - Suggested topics to avoid
 * @returns {Promise<{ gaps: Object[] }>}
 */
export async function identifyKnowledgeGaps(graph, options = {}) {
  if (!graph || !graph.nodes || graph.nodes.length < 3) {
    logger.debug('GEMINI_GRAPH', 'Not enough nodes for gap analysis', {
      nodeCount: graph?.nodes?.length || 0
    })
    return { gaps: [] }
  }

  const ai = getAIClient()
  if (!ai) {
    return { gaps: [] }
  }

  const targetCount = normalizeGapTargetCount(options?.targetCount)
  const excludedTopicNames = sanitizeExcludeTopics(options?.excludeTopics)
  const existingNames = new Set(graph.nodes.map((node) => normalizeTopicName(node.name)))
  const excludedNames = new Set(excludedTopicNames.map((name) => normalizeTopicName(name)))

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const mapConnectIds = (gap) => {
    const names = Array.isArray(gap?.connectsTo) ? gap.connectsTo : []
    return names
      .map((name) => {
        const normalized = normalizeTopicName(name)
        const exact = graph.nodes.find(
          (node) => normalizeTopicName(node.name) === normalized
        )
        if (exact) return exact.id
        const fuzzy = graph.nodes.find((node) => {
          const nodeNorm = normalizeTopicName(node.name)
          return nodeNorm.includes(normalized) || normalized.includes(nodeNorm)
        })
        return fuzzy?.id || null
      })
      .filter(Boolean)
  }

  const collectedByName = new Map()

  try {
    logger.time('GEMINI_GRAPH', 'identify-knowledge-gaps')

    for (let attempt = 0; attempt < GAP_ATTEMPT_LIMIT; attempt += 1) {
      if (collectedByName.size >= targetCount) break

      const remaining = targetCount - collectedByName.size
      const avoidTopicNames = [
        ...graph.nodes.map((node) => node.name),
        ...excludedTopicNames,
        ...Array.from(collectedByName.values()).map((item) => item.gap.suggestedTopic),
      ]
      const prompt = buildGapPrompt({
        graph,
        targetCount: Math.max(1, remaining),
        avoidTopicNames,
      })

      const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: prompt,
        config: {
          temperature: attempt === 0 ? 0.7 : 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      })

      const text = response.text || ''
      const result = safeParseJSON(text)
      const gapsArray = Array.isArray(result.gaps) ? result.gaps : []

      gapsArray.forEach((gap) => {
        const normalized = normalizeTopicName(gap?.suggestedTopic)
        if (!normalized) return
        if (existingNames.has(normalized)) return
        if (excludedNames.has(normalized)) return
        if (collectedByName.has(normalized)) return

        const connectsTo = mapConnectIds(gap)
        if (connectsTo.length === 0) return

        collectedByName.set(normalized, {
          gap,
          connectsTo,
        })
      })

      logger.info('GEMINI_GRAPH', 'Gap attempt processed', {
        attempt: attempt + 1,
        requested: remaining,
        received: gapsArray.length,
        collected: collectedByName.size,
      })
    }

    logger.timeEnd('GEMINI_GRAPH', 'identify-knowledge-gaps')

    const gaps = Array.from(collectedByName.values())
      .slice(0, targetCount)
      .map((item, index) => {
        const connectsTo = item.connectsTo.length > 0
          ? item.connectsTo
          : graph.nodes.slice(0, 2).map((node) => node.id)
        return {
          id: `gap_${Date.now()}_${index}`,
          suggestedTopic: item.gap.suggestedTopic,
          type: item.gap.type || 'deepen',
          connectsTo,
          reasoning: item.gap.reasoning || '',
          curiosityHook: item.gap.curiosityHook || `Learn about ${item.gap.suggestedTopic}!`
        }
      })

    const categories = new Set(
      gaps
        .flatMap((gap) => gap.connectsTo || [])
        .map((id) => nodeById.get(id)?.category || null)
        .filter(Boolean)
    )

    if (gaps.length < targetCount) {
      logger.warn('GEMINI_GRAPH', 'Insufficient unique gaps after attempts', {
        requested: targetCount,
        returned: gaps.length,
      })
    }
    if (categories.size < 2 && gaps.length > 1) {
      logger.warn('GEMINI_GRAPH', 'Gap categories are less diverse than requested', {
        categoryCount: categories.size,
      })
    }

    logger.info('GEMINI_GRAPH', 'Identified knowledge gaps', {
      gapCount: gaps.length,
      targetCount,
      excludedCount: excludedTopicNames.length,
    })

    return { gaps }
  } catch (error) {
    logger.error('GEMINI_GRAPH', 'identifyKnowledgeGaps error', { error: error.message })
    return { gaps: [] }
  }
}

/**
 * Cluster topics into constellations
 * Re-analyzes all nodes to create meaningful groupings
 *
 * @param {Object[]} nodes - All nodes to cluster
 * @returns {Promise<{ clusters: Object[] }>}
 */
export async function clusterKnowledge(nodes) {
  // Validate inputs
  if (!nodes || nodes.length < 2) {
    return { clusters: createDefaultClusters(nodes || []) }
  }

  const ai = getAIClient()
  if (!ai) {
    return { clusters: createDefaultClusters(nodes) }
  }

  const prompt = `You are organizing educational topics into thematic constellations.

TOPICS TO CLUSTER:
${nodes.map(n => `- ${n.name} (concepts: ${(n.concepts || []).slice(0, 3).join(', ') || 'general'})`).join('\n')}

Group these topics into 3-7 meaningful clusters. Each cluster should:
1. Have a clear thematic identity
2. Contain related topics
3. Have a creative, engaging name
4. Have an appropriate emoji icon

Output JSON:
{
  "clusters": [
    {
      "name": "Creative cluster name",
      "icon": "emoji",
      "topicNames": ["topic 1", "topic 2"],
      "color": "#hex color"
    }
  ]
}

Use these color suggestions:
- Science/STEM: #3B82F6 (blue), #10B981 (green)
- History/Culture: #F59E0B (amber), #EF4444 (red)
- Nature/Earth: #22C55E (green), #06B6D4 (cyan)
- Arts/Creative: #EC4899 (pink), #8B5CF6 (purple)
- Space/Cosmos: #7C3AED (purple), #6366F1 (indigo)`

  try {
    logger.time('GEMINI_GRAPH', 'cluster-knowledge')

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })

    logger.timeEnd('GEMINI_GRAPH', 'cluster-knowledge')

    const text = response.text || ''
    const result = safeParseJSON(text)

    const clusters = (result.clusters || []).map((cluster, index) => ({
      id: `cluster_${index}_${Date.now()}`,
      name: cluster.name,
      icon: cluster.icon || '\u{2728}',
      nodeIds: (cluster.topicNames || []).map(name => {
        const node = nodes.find(n => n.name.toLowerCase() === name.toLowerCase())
        return node?.id
      }).filter(Boolean),
      color: cluster.color || '#6366F1'
    }))

    // Ensure all nodes are assigned to a cluster
    const assignedNodeIds = new Set(clusters.flatMap(c => c.nodeIds))
    const unassignedNodes = nodes.filter(n => !assignedNodeIds.has(n.id))

    if (unassignedNodes.length > 0) {
      // Add unassigned nodes to a "Miscellaneous" cluster
      clusters.push({
        id: `cluster_misc_${Date.now()}`,
        name: 'Discoveries',
        icon: '\u{1F4A1}',
        nodeIds: unassignedNodes.map(n => n.id),
        color: '#64748B'
      })
    }

    logger.info('GEMINI_GRAPH', 'Clustered knowledge', {
      nodeCount: nodes.length,
      clusterCount: clusters.length
    })

    return { clusters }
  } catch (error) {
    logger.error('GEMINI_GRAPH', 'clusterKnowledge error', { error: error.message })
    return { clusters: createDefaultClusters(nodes) }
  }
}

/**
 * Determine where a follow-up question should be placed in the graph
 *
 * @param {string} query - The follow-up question
 * @param {Object} context - Context including current topic and graph
 * @param {Object} context.currentTopic - The current topic being explored
 * @param {Object} context.graph - The full knowledge graph
 * @returns {Promise<{ placement: 'child' | 'sibling' | 'new_branch', reasoning: string }>}
 */
export async function determineFollowUpPlacement(query, context) {
  // Validate inputs
  if (!query || typeof query !== 'string') {
    return { placement: 'child', reasoning: 'Default placement for invalid query' }
  }

  const ai = getAIClient()
  if (!ai) {
    return { placement: 'child', reasoning: 'Default placement (AI unavailable)' }
  }

  const { currentTopic, graph } = context || {}

  const prompt = `Analyze where a follow-up question fits in a knowledge graph.

CURRENT TOPIC: "${currentTopic?.name || 'Unknown'}"
Current concepts: ${(currentTopic?.concepts || []).join(', ') || 'unknown'}

FOLLOW-UP QUESTION: "${query}"

RELATED TOPICS IN GRAPH:
${((graph?.nodes || []).slice(0, 10).map(n => `- ${n.name}`).join('\n')) || 'No existing topics'}

Determine the best placement:
- "child": Direct continuation/deeper dive into current topic
- "sibling": Related but parallel topic (same level)
- "new_branch": Starts a new area of exploration

Output JSON:
{
  "placement": "child|sibling|new_branch",
  "reasoning": "Brief explanation"
}`

  try {
    logger.time('GEMINI_GRAPH', 'determine-placement')

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 256,
        responseMimeType: 'application/json'
      }
    })

    logger.timeEnd('GEMINI_GRAPH', 'determine-placement')

    const text = response.text || ''
    const result = safeParseJSON(text)

    const validPlacements = ['child', 'sibling', 'new_branch']
    const placement = validPlacements.includes(result.placement) ? result.placement : 'child'

    logger.debug('GEMINI_GRAPH', 'Determined follow-up placement', {
      query: query.slice(0, 50),
      placement
    })

    return {
      placement,
      reasoning: result.reasoning || ''
    }
  } catch (error) {
    logger.error('GEMINI_GRAPH', 'determineFollowUpPlacement error', { error: error.message })
    return { placement: 'child', reasoning: 'Default placement (error occurred)' }
  }
}

/**
 * Suggest a learning path to reach a goal topic
 *
 * @param {Object} graph - Current knowledge graph
 * @param {Object[]} graph.nodes - Array of knowledge nodes
 * @param {string} userGoal - The topic/skill user wants to learn
 * @returns {Promise<{ path: Object[], newTopicsNeeded: string[] }>}
 */
export async function suggestLearningPath(graph, userGoal) {
  // Validate inputs
  if (!userGoal || typeof userGoal !== 'string') {
    return { path: [], newTopicsNeeded: [] }
  }

  const ai = getAIClient()
  if (!ai) {
    return { path: [], newTopicsNeeded: [userGoal] }
  }

  const nodes = graph?.nodes || []

  const prompt = `Plan a learning path to help a student reach their goal.

GOAL: "${userGoal}"

CURRENT KNOWLEDGE (${nodes.length} topics):
${nodes.slice(0, 20).map(n => `- ${n.name} (mastery: ${Math.round((n.mastery || 0) * 100)}%)`).join('\n') || 'No topics learned yet'}

Create a step-by-step path from their current knowledge to the goal:
1. Identify which existing topics are relevant stepping stones
2. Identify any new topics they need to learn first
3. Order the path logically (prerequisites first)

Output JSON:
{
  "path": [
    {
      "topic": "Topic name",
      "reason": "Why this step is needed",
      "isExisting": true
    }
  ],
  "newTopicsNeeded": ["new topic 1", "new topic 2"]
}

Maximum 7 steps in the path.`

  try {
    logger.time('GEMINI_GRAPH', 'suggest-learning-path')

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json'
      }
    })

    logger.timeEnd('GEMINI_GRAPH', 'suggest-learning-path')

    const text = response.text || ''
    const result = safeParseJSON(text)

    const path = (result.path || []).slice(0, 7).map(step => ({
      topic: step.topic || '',
      reason: step.reason || '',
      isExisting: Boolean(step.isExisting)
    }))

    const newTopicsNeeded = Array.isArray(result.newTopicsNeeded)
      ? result.newTopicsNeeded.filter(t => typeof t === 'string')
      : []

    logger.info('GEMINI_GRAPH', 'Suggested learning path', {
      goal: userGoal,
      pathLength: path.length,
      newTopicsCount: newTopicsNeeded.length
    })

    return {
      path,
      newTopicsNeeded
    }
  } catch (error) {
    logger.error('GEMINI_GRAPH', 'suggestLearningPath error', { error: error.message })
    return { path: [], newTopicsNeeded: [userGoal] }
  }
}

/**
 * Check if Gemini Graph AI is available
 * @returns {boolean} True if API key is configured and client is ready
 */
export function isGeminiGraphAvailable() {
  return getAIClient() !== null
}

export default {
  discoverRelationships,
  identifyKnowledgeGaps,
  clusterKnowledge,
  determineFollowUpPlacement,
  suggestLearningPath,
  isGeminiGraphAvailable,
  categorizeTopic
}
