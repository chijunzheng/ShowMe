# Feature: Backend Categorization (AI + Endpoint)

**ID:** 03
**Status:** :white_large_square: Not Started
**Priority:** High
**Estimated Complexity:** Medium
**Dependencies:** 02
**Track:** B

## Description

Add AI-powered topic categorization: fix the `discoverRelationships()` prompt to include existing categories as hints, add a new `categorizeTopic()` function, and create a `/api/graph/categorize` batch endpoint.

## Acceptance Criteria

- [ ] `discoverRelationships()` prompt includes existing categories from learner's graph
- [ ] `categorizeTopic()` function exported from geminiGraph.js
- [ ] `categorizeTopic()` uses FAST_MODEL, prefers existing categories, falls back to inferCluster()
- [ ] `/api/graph/categorize` endpoint accepts batch of topics (max 20)
- [ ] Endpoint returns `{ success: true, results: [{ id, category, icon }] }`
- [ ] Import of `categorizeTopic` added to graph.js routes

## Implementation Details

### Files to Modify

1. `backend/src/services/geminiGraph.js` — Fix discover prompt + add categorizeTopic()
2. `backend/src/routes/graph.js` — Add /api/graph/categorize endpoint

### 3a. Fix discoverRelationships() prompt

In the prompt string (~line 376), replace:
```
Also suggest which cluster/category this topic belongs to.
```
With:
```
Also suggest which cluster/category this topic belongs to.
Here are the learner's existing categories: ${existingNodes.map(n => n.category).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'none yet'}.
Prefer an existing category if it fits well, but suggest a new short category (1-2 words, lowercase) if nothing fits. Avoid "general" unless truly uncategorizable.
```

### 3b. Add categorizeTopic() function

```js
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
- Be specific but not too narrow
- Avoid "general" — almost every topic fits somewhere

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
```

### 3c. Add /api/graph/categorize endpoint

```js
router.post('/categorize', async (req, res) => {
  const { topics, existingCategories } = req.body
  if (!Array.isArray(topics) || topics.length === 0) {
    return res.status(400).json({ error: 'topics array required' })
  }
  const batch = topics.slice(0, 20)
  const results = await Promise.all(
    batch.map(async (t) => {
      const { category, icon } = await categorizeTopic(t.name, existingCategories || [])
      return { id: t.id, category, icon }
    })
  )
  res.json({ success: true, results })
})
```

Also add `categorizeTopic` to the import from geminiGraph.js and export it from the default export.

## Depends On

- **Feature 02:** Updated colors in createDefaultClusters()
