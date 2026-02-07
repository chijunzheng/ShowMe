import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGenerateContent = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor() {
      this.models = { generateContent: mockGenerateContent }
    }
  }
}))

const buildGraph = () => ({
  nodes: [
    { id: 'n1', name: 'Ocean Mapping', category: 'marine biology' },
    { id: 'n2', name: 'Model Training', category: 'technology' },
    { id: 'n3', name: 'Deep Sea Survival', category: 'marine biology' },
    { id: 'n4', name: 'LLM Definition', category: 'technology' }
  ],
  clusters: [
    { id: 'c1', name: 'Marine Biology', nodeIds: ['n1', 'n3'] },
    { id: 'c2', name: 'Technology', nodeIds: ['n2', 'n4'] }
  ]
})

const response = (gaps) => ({
  text: JSON.stringify({ gaps })
})

describe('identifyKnowledgeGaps', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset()
    vi.resetModules()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('retries when gaps include existing topics', async () => {
    const { identifyKnowledgeGaps } = await import('../geminiGraph.js')

    mockGenerateContent
      .mockResolvedValueOnce(
        response([
          {
            suggestedTopic: 'Ocean Mapping',
            type: 'deepen',
            connectsTo: ['Ocean Mapping', 'Deep Sea Survival'],
            reasoning: 'Expand on ocean models.',
            curiosityHook: 'How do we map unseen oceans?'
          },
          {
            suggestedTopic: 'Model Training',
            type: 'deepen',
            connectsTo: ['Model Training', 'LLM Definition'],
            reasoning: 'Train better models.',
            curiosityHook: 'What makes models learn?'
          },
          {
            suggestedTopic: 'Hydrothermal Vents',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Explore deep ocean habitats.',
            curiosityHook: 'Why do vents host life?'
          },
          {
            suggestedTopic: 'Sonar Imaging',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Connect sensors to models.',
            curiosityHook: 'How does sonar paint a map?'
          },
          {
            suggestedTopic: 'Underwater Robotics',
            type: 'unlock',
            connectsTo: ['Ocean Mapping'],
            reasoning: 'Access hard-to-reach regions.',
            curiosityHook: 'How do robots survive pressure?'
          },
          {
            suggestedTopic: 'Thermal Gradients',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Understand ocean layers.',
            curiosityHook: 'Why do oceans layer by heat?'
          }
        ])
      )
      .mockResolvedValueOnce(
        response([
          {
            suggestedTopic: 'Hydrothermal Vents',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Explore deep ocean habitats.',
            curiosityHook: 'Why do vents host life?'
          },
          {
            suggestedTopic: 'Sonar Imaging',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Connect sensors to models.',
            curiosityHook: 'How does sonar paint a map?'
          },
          {
            suggestedTopic: 'Underwater Robotics',
            type: 'unlock',
            connectsTo: ['Ocean Mapping'],
            reasoning: 'Access hard-to-reach regions.',
            curiosityHook: 'How do robots survive pressure?'
          },
          {
            suggestedTopic: 'Thermal Gradients',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Understand ocean layers.',
            curiosityHook: 'Why do oceans layer by heat?'
          },
          {
            suggestedTopic: 'Data Assimilation',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Merge models with observations.',
            curiosityHook: 'How do models absorb data?'
          },
          {
            suggestedTopic: 'Marine Sensor Networks',
            type: 'unlock',
            connectsTo: ['Ocean Mapping'],
            reasoning: 'Scale ocean monitoring.',
            curiosityHook: 'How do sensors talk underwater?'
          }
        ])
      )

    const graph = buildGraph()
    const result = await identifyKnowledgeGaps(graph)

    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(result.gaps).toHaveLength(6)
    expect(result.gaps.some((gap) => gap.suggestedTopic === 'Ocean Mapping')).toBe(false)
  })

  it('retries when any gap has no valid connects', async () => {
    const { identifyKnowledgeGaps } = await import('../geminiGraph.js')

    mockGenerateContent
      .mockResolvedValueOnce(
        response([
          {
            suggestedTopic: 'Hydrothermal Vents',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Explore deep ocean habitats.',
            curiosityHook: 'Why do vents host life?'
          },
          {
            suggestedTopic: 'Sonar Imaging',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Connect sensors to models.',
            curiosityHook: 'How does sonar paint a map?'
          },
          {
            suggestedTopic: 'Underwater Robotics',
            type: 'unlock',
            connectsTo: ['Ocean Mapping'],
            reasoning: 'Access hard-to-reach regions.',
            curiosityHook: 'How do robots survive pressure?'
          },
          {
            suggestedTopic: 'Thermal Gradients',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Understand ocean layers.',
            curiosityHook: 'Why do oceans layer by heat?'
          },
          {
            suggestedTopic: 'Data Assimilation',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Merge models with observations.',
            curiosityHook: 'How do models absorb data?'
          },
          {
            suggestedTopic: 'Unknown Current Patterns',
            type: 'deepen',
            connectsTo: ['Nonexistent Topic'],
            reasoning: 'Explore hidden currents.',
            curiosityHook: 'What moves unseen currents?'
          }
        ])
      )
      .mockResolvedValueOnce(
        response([
          {
            suggestedTopic: 'Hydrothermal Vents',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Explore deep ocean habitats.',
            curiosityHook: 'Why do vents host life?'
          },
          {
            suggestedTopic: 'Sonar Imaging',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Connect sensors to models.',
            curiosityHook: 'How does sonar paint a map?'
          },
          {
            suggestedTopic: 'Underwater Robotics',
            type: 'unlock',
            connectsTo: ['Ocean Mapping'],
            reasoning: 'Access hard-to-reach regions.',
            curiosityHook: 'How do robots survive pressure?'
          },
          {
            suggestedTopic: 'Thermal Gradients',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Understand ocean layers.',
            curiosityHook: 'Why do oceans layer by heat?'
          },
          {
            suggestedTopic: 'Data Assimilation',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Merge models with observations.',
            curiosityHook: 'How do models absorb data?'
          },
          {
            suggestedTopic: 'Marine Sensor Networks',
            type: 'unlock',
            connectsTo: ['Ocean Mapping'],
            reasoning: 'Scale ocean monitoring.',
            curiosityHook: 'How do sensors talk underwater?'
          }
        ])
      )

    const graph = buildGraph()
    const result = await identifyKnowledgeGaps(graph)

    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(result.gaps.every((gap) => (gap.connectsTo || []).length > 0)).toBe(true)
  })

  it('uses the fast model and skips retry when gaps are sufficient', async () => {
    const { identifyKnowledgeGaps } = await import('../geminiGraph.js')

    mockGenerateContent.mockResolvedValueOnce(
      response([
        {
          suggestedTopic: 'Hydrothermal Vents',
          type: 'deepen',
          connectsTo: ['Deep Sea Survival'],
          reasoning: 'Explore deep ocean habitats.',
          curiosityHook: 'Why do vents host life?'
        },
        {
          suggestedTopic: 'Sonar Imaging',
          type: 'bridge',
          connectsTo: ['Ocean Mapping', 'Model Training'],
          reasoning: 'Connect sensors to models.',
          curiosityHook: 'How does sonar paint a map?'
        },
        {
          suggestedTopic: 'Underwater Robotics',
          type: 'unlock',
          connectsTo: ['Ocean Mapping'],
          reasoning: 'Access hard-to-reach regions.',
          curiosityHook: 'How do robots survive pressure?'
        },
        {
          suggestedTopic: 'Thermal Gradients',
          type: 'deepen',
          connectsTo: ['Deep Sea Survival'],
          reasoning: 'Understand ocean layers.',
          curiosityHook: 'Why do oceans layer by heat?'
        },
        {
          suggestedTopic: 'Data Assimilation',
          type: 'bridge',
          connectsTo: ['Ocean Mapping', 'Model Training'],
          reasoning: 'Merge models with observations.',
          curiosityHook: 'How do models absorb data?'
        },
        {
          suggestedTopic: 'Marine Sensor Networks',
          type: 'unlock',
          connectsTo: ['Ocean Mapping'],
          reasoning: 'Scale ocean monitoring.',
          curiosityHook: 'How do sensors talk underwater?'
        }
      ])
    )

    const graph = buildGraph()
    const result = await identifyKnowledgeGaps(graph)

    expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    expect(mockGenerateContent.mock.calls[0][0].model).toBe('gemini-2.5-flash-lite')
    expect(result.gaps).toHaveLength(6)
  })

  it('honors excludeTopics and targetCount options', async () => {
    const { identifyKnowledgeGaps } = await import('../geminiGraph.js')

    mockGenerateContent.mockResolvedValueOnce(
      response([
        {
          suggestedTopic: 'Hydrothermal Vents',
          type: 'deepen',
          connectsTo: ['Deep Sea Survival'],
          reasoning: 'Explore deep ocean habitats.',
          curiosityHook: 'Why do vents host life?'
        },
        {
          suggestedTopic: 'Sonar Imaging',
          type: 'bridge',
          connectsTo: ['Ocean Mapping', 'Model Training'],
          reasoning: 'Connect sensors to models.',
          curiosityHook: 'How does sonar paint a map?'
        },
        {
          suggestedTopic: 'Underwater Robotics',
          type: 'unlock',
          connectsTo: ['Ocean Mapping'],
          reasoning: 'Access hard-to-reach regions.',
          curiosityHook: 'How do robots survive pressure?'
        },
        {
          suggestedTopic: 'Thermal Gradients',
          type: 'deepen',
          connectsTo: ['Deep Sea Survival'],
          reasoning: 'Understand ocean layers.',
          curiosityHook: 'Why do oceans layer by heat?'
        }
      ])
    )

    const graph = buildGraph()
    const result = await identifyKnowledgeGaps(graph, {
      targetCount: 3,
      excludeTopics: ['Sonar Imaging'],
    })

    expect(result.gaps).toHaveLength(3)
    expect(result.gaps.some((gap) => gap.suggestedTopic === 'Sonar Imaging')).toBe(false)
  })

  it('aggregates unique suggestions across multiple attempts up to targetCount', async () => {
    const { identifyKnowledgeGaps } = await import('../geminiGraph.js')

    mockGenerateContent
      .mockResolvedValueOnce(
        response([
          {
            suggestedTopic: 'Hydrothermal Vents',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Explore deep ocean habitats.',
            curiosityHook: 'Why do vents host life?'
          },
          {
            suggestedTopic: 'Sonar Imaging',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Connect sensors to models.',
            curiosityHook: 'How does sonar paint a map?'
          },
          {
            suggestedTopic: 'Hydrothermal Vents',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Duplicate',
            curiosityHook: 'Duplicate'
          }
        ])
      )
      .mockResolvedValueOnce(
        response([
          {
            suggestedTopic: 'Underwater Robotics',
            type: 'unlock',
            connectsTo: ['Ocean Mapping'],
            reasoning: 'Access hard-to-reach regions.',
            curiosityHook: 'How do robots survive pressure?'
          },
          {
            suggestedTopic: 'Thermal Gradients',
            type: 'deepen',
            connectsTo: ['Deep Sea Survival'],
            reasoning: 'Understand ocean layers.',
            curiosityHook: 'Why do oceans layer by heat?'
          },
          {
            suggestedTopic: 'Data Assimilation',
            type: 'bridge',
            connectsTo: ['Ocean Mapping', 'Model Training'],
            reasoning: 'Merge models with observations.',
            curiosityHook: 'How do models absorb data?'
          }
        ])
      )

    const graph = buildGraph()
    const result = await identifyKnowledgeGaps(graph, { targetCount: 5 })

    expect(mockGenerateContent).toHaveBeenCalledTimes(2)
    expect(result.gaps).toHaveLength(5)
    const names = result.gaps.map((gap) => gap.suggestedTopic)
    expect(new Set(names).size).toBe(5)
  })
})
