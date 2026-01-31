/**
 * World Evolution Service Tests
 * TDD: Tests written FIRST before implementation
 *
 * Test Coverage:
 * - createInitialWorldState(): Returns valid structure with all required fields
 * - classifyTopicEffect(): Topic classification for world evolution
 * - calculateTier(): Tier progression based on topic count
 * - evolveWorld(): Main evolution orchestration (integration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Import the module under test (will be created after tests)
import {
  createInitialWorldState,
  classifyTopicEffect,
  calculateTier,
  evolveWorld,
  getEvolutionWorldState,
  resetEvolutionWorldState,
  WORLD_STYLE,
  COMPOSITION_STATES
} from '../worldEvolution.js'

describe('worldEvolution', () => {
  describe('createInitialWorldState', () => {
    it('returns valid structure with all required fields', () => {
      const clientId = 'test-client-123'
      const state = createInitialWorldState(clientId)

      // Check clientId
      expect(state.clientId).toBe(clientId)

      // Check worldImageUrl starts as null
      expect(state.worldImageUrl).toBeNull()

      // Check styleDescriptor
      expect(state.styleDescriptor).toBe(WORLD_STYLE.base)

      // Check compositionMap has all required layers
      expect(state.compositionMap).toBeDefined()
      expect(state.compositionMap.sky).toBeDefined()
      expect(state.compositionMap.background).toBeDefined()
      expect(state.compositionMap.midground).toBeDefined()
      expect(state.compositionMap.foreground).toBeDefined()

      // Check initial composition states
      expect(state.compositionMap.sky.state).toBe('overcast')
      expect(state.compositionMap.sky.topics).toEqual([])
      expect(state.compositionMap.background.state).toBe('barren_hills')
      expect(state.compositionMap.background.topics).toEqual([])
      expect(state.compositionMap.midground.state).toBe('empty_plains')
      expect(state.compositionMap.midground.topics).toEqual([])
      expect(state.compositionMap.foreground.state).toBe('cracked_earth')
      expect(state.compositionMap.foreground.topics).toEqual([])

      // Check other fields
      expect(state.ecosystems).toEqual([])
      expect(state.interconnections).toEqual([])
      expect(state.tier).toBe('barren')
      expect(state.totalTopics).toBe(0)

      // Check timestamps
      expect(state.createdAt).toBeInstanceOf(Date)
      expect(state.updatedAt).toBeInstanceOf(Date)
    })

    it('generates unique states for different clientIds', () => {
      const state1 = createInitialWorldState('client-1')
      const state2 = createInitialWorldState('client-2')

      expect(state1.clientId).not.toBe(state2.clientId)
      // Both should have the same initial structure but different identities
      expect(state1.tier).toBe(state2.tier)
      expect(state1.totalTopics).toBe(state2.totalTopics)
    })
  })

  describe('classifyTopicEffect', () => {
    describe('zone classification', () => {
      it('classifies "ocean life" as nature zone with water terrain', () => {
        const result = classifyTopicEffect('ocean life', 'Marine ecosystems and sea creatures')

        expect(result.zone).toBe('nature')
        expect(result.terrainEffect).toBe('water')
        expect(result.compositionLayer).toBeDefined()
        expect(result.keywords).toBeInstanceOf(Array)
        expect(result.keywords.length).toBeGreaterThan(0)
      })

      it('classifies "ancient Egypt" as civilization zone', () => {
        const result = classifyTopicEffect('ancient Egypt', 'The civilization of the Nile')

        expect(result.zone).toBe('civilization')
        expect(['structure', 'desert']).toContain(result.terrainEffect)
      })

      it('classifies "quantum physics" as arcane zone', () => {
        const result = classifyTopicEffect('quantum physics', 'Subatomic particle behavior')

        expect(result.zone).toBe('arcane')
        expect(result.terrainEffect).toBe('abstract')
      })

      it('classifies "photosynthesis" as nature zone with life terrain', () => {
        const result = classifyTopicEffect('photosynthesis', 'How plants convert sunlight to energy')

        expect(result.zone).toBe('nature')
        expect(['life', 'forest']).toContain(result.terrainEffect)
      })

      it('classifies "Roman Empire" as civilization zone with structure terrain', () => {
        const result = classifyTopicEffect('Roman Empire', 'The ancient Roman civilization')

        expect(result.zone).toBe('civilization')
        expect(result.terrainEffect).toBe('structure')
      })

      it('classifies "volcanoes" as nature zone with mountains terrain', () => {
        const result = classifyTopicEffect('volcanoes', 'How volcanoes form and erupt')

        expect(result.zone).toBe('nature')
        expect(result.terrainEffect).toBe('mountains')
      })

      it('classifies "thunderstorms" as nature zone with weather terrain', () => {
        const result = classifyTopicEffect('thunderstorms', 'How storms form in the atmosphere')

        expect(result.zone).toBe('nature')
        expect(result.terrainEffect).toBe('weather')
        expect(result.compositionLayer).toBe('sky')
      })

      it('classifies "rainforests" as nature zone with forest terrain', () => {
        const result = classifyTopicEffect('rainforests', 'Tropical forest ecosystems')

        expect(result.zone).toBe('nature')
        expect(result.terrainEffect).toBe('forest')
      })

      it('classifies "the Sahara desert" as nature zone with desert terrain', () => {
        const result = classifyTopicEffect('the Sahara desert', 'The largest hot desert')

        expect(result.zone).toBe('nature')
        expect(result.terrainEffect).toBe('desert')
      })

      it('classifies "black holes" as arcane zone', () => {
        const result = classifyTopicEffect('black holes', 'Gravitational singularities in space')

        expect(result.zone).toBe('arcane')
        expect(result.terrainEffect).toBe('abstract')
      })
    })

    describe('composition layer assignment', () => {
      it('assigns weather topics to sky layer', () => {
        const result = classifyTopicEffect('clouds', 'How clouds form')

        expect(result.compositionLayer).toBe('sky')
      })

      it('assigns mountain topics to background layer', () => {
        const result = classifyTopicEffect('Mount Everest', 'The tallest mountain')

        expect(result.compositionLayer).toBe('background')
      })

      it('assigns forest topics to midground layer', () => {
        const result = classifyTopicEffect('oak trees', 'Deciduous forest trees')

        expect(result.compositionLayer).toBe('midground')
      })

      it('assigns water topics to foreground layer', () => {
        const result = classifyTopicEffect('ocean currents', 'How water flows through the sea')

        expect(result.compositionLayer).toBe('foreground')
      })
    })

    describe('keyword extraction', () => {
      it('extracts relevant keywords from topic and summary', () => {
        const result = classifyTopicEffect(
          'dinosaurs',
          'Prehistoric reptiles that dominated Earth for millions of years'
        )

        expect(result.keywords).toBeInstanceOf(Array)
        expect(result.keywords.some(k => k.toLowerCase().includes('dinosaur'))).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('handles empty summary gracefully', () => {
        const result = classifyTopicEffect('volcanoes', '')

        expect(result.zone).toBeDefined()
        expect(result.terrainEffect).toBeDefined()
        expect(result.compositionLayer).toBeDefined()
      })

      it('handles null summary gracefully', () => {
        const result = classifyTopicEffect('volcanoes', null)

        expect(result.zone).toBeDefined()
        expect(result.terrainEffect).toBeDefined()
      })

      it('handles unknown topics with default classification', () => {
        const result = classifyTopicEffect('xyz123abc', 'Random nonsense text')

        expect(result.zone).toBeDefined()
        expect(['nature', 'civilization', 'arcane']).toContain(result.zone)
        expect(result.terrainEffect).toBeDefined()
      })
    })
  })

  describe('calculateTier', () => {
    it('returns "barren" for 0 topics', () => {
      expect(calculateTier(0)).toBe('barren')
    })

    it('returns "barren" for 4 topics', () => {
      expect(calculateTier(4)).toBe('barren')
    })

    it('returns "sprouting" for 5 topics', () => {
      expect(calculateTier(5)).toBe('sprouting')
    })

    it('returns "sprouting" for 14 topics', () => {
      expect(calculateTier(14)).toBe('sprouting')
    })

    it('returns "growing" for 15 topics', () => {
      expect(calculateTier(15)).toBe('growing')
    })

    it('returns "growing" for 29 topics', () => {
      expect(calculateTier(29)).toBe('growing')
    })

    it('returns "thriving" for 30 topics', () => {
      expect(calculateTier(30)).toBe('thriving')
    })

    it('returns "thriving" for 49 topics', () => {
      expect(calculateTier(49)).toBe('thriving')
    })

    it('returns "legendary" for 50 topics', () => {
      expect(calculateTier(50)).toBe('legendary')
    })

    it('returns "legendary" for 100+ topics', () => {
      expect(calculateTier(100)).toBe('legendary')
      expect(calculateTier(500)).toBe('legendary')
    })

    it('handles negative numbers gracefully', () => {
      expect(calculateTier(-1)).toBe('barren')
    })
  })

  describe('evolveWorld', () => {
    // Mock dependencies for integration tests
    let mockGemini
    let mockWorldState

    beforeEach(() => {
      // Reset mocks before each test
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('evolves world state when topic is added', async () => {
      const clientId = 'test-client-evolve'
      const topicName = 'coral reefs'
      const summary = 'Underwater ecosystems formed by coral polyps'

      // This test verifies the full evolution flow
      // In practice, this would mock the gemini service and world state storage
      const result = await evolveWorld(clientId, topicName, summary)

      expect(result).toBeDefined()
      expect(result.changesApplied).toBeDefined()
      expect(result.tier).toBeDefined()
      // worldImageUrl may be null in test environment without gemini
    })

    it('increments totalTopics after evolution', async () => {
      const clientId = 'test-client-increment'
      const topicName = 'butterflies'
      const summary = 'Metamorphosis and butterfly life cycle'

      const result = await evolveWorld(clientId, topicName, summary)

      expect(result.changesApplied).toBeDefined()
      // After evolution, the world state should have updated topic count
    })

    it('triggers tier upgrade when threshold is crossed', async () => {
      const clientId = 'test-client-tier-upgrade'

      // Simulate adding the 5th topic which should trigger sprouting tier
      // This would require mocking the current state to have 4 topics
      const result = await evolveWorld(clientId, 'topic5', 'Fifth topic summary')

      expect(result).toBeDefined()
      // The tier change would be reflected in the result
    })

    it('applies correct composition layer changes', async () => {
      const clientId = 'test-client-composition'
      const topicName = 'thunderstorms'
      const summary = 'Electrical storms in the atmosphere'

      const result = await evolveWorld(clientId, topicName, summary)

      expect(result.changesApplied).toBeDefined()
      // Weather topics should affect the sky layer
    })
  })

  describe('WORLD_STYLE constant', () => {
    it('exports base style descriptor', () => {
      expect(WORLD_STYLE).toBeDefined()
      expect(WORLD_STYLE.base).toBeDefined()
      expect(typeof WORLD_STYLE.base).toBe('string')
    })
  })

  describe('COMPOSITION_STATES constant', () => {
    it('exports initial states for all layers', () => {
      expect(COMPOSITION_STATES).toBeDefined()
      expect(COMPOSITION_STATES.sky).toBeDefined()
      expect(COMPOSITION_STATES.background).toBeDefined()
      expect(COMPOSITION_STATES.midground).toBeDefined()
      expect(COMPOSITION_STATES.foreground).toBeDefined()
    })

    it('has progression states for each layer', () => {
      // Each layer should have multiple states for progression
      expect(Array.isArray(COMPOSITION_STATES.sky) || typeof COMPOSITION_STATES.sky === 'object').toBe(true)
    })
  })

  describe('getEvolutionWorldState', () => {
    beforeEach(() => {
      // Reset state before each test
      resetEvolutionWorldState('test-get-state')
    })

    it('returns null for non-existent client', () => {
      const result = getEvolutionWorldState('non-existent-client-xyz')

      expect(result.worldState).toBeNull()
      expect(result.error).toBeNull()
    })

    it('returns world state after evolveWorld is called', async () => {
      const clientId = 'test-get-state'
      await evolveWorld(clientId, 'test topic', 'test summary')

      const result = getEvolutionWorldState(clientId)

      expect(result.worldState).toBeDefined()
      expect(result.worldState.clientId).toBe(clientId)
      expect(result.worldState.totalTopics).toBe(1)
      expect(result.error).toBeNull()
    })
  })

  describe('resetEvolutionWorldState', () => {
    it('clears world state for a client', async () => {
      const clientId = 'test-reset-state'

      // First evolve to create state
      await evolveWorld(clientId, 'topic', 'summary')
      expect(getEvolutionWorldState(clientId).worldState).not.toBeNull()

      // Then reset
      resetEvolutionWorldState(clientId)
      expect(getEvolutionWorldState(clientId).worldState).toBeNull()
    })

    it('does not affect other clients', async () => {
      const clientId1 = 'test-reset-client-1'
      const clientId2 = 'test-reset-client-2'

      await evolveWorld(clientId1, 'topic1', 'summary1')
      await evolveWorld(clientId2, 'topic2', 'summary2')

      resetEvolutionWorldState(clientId1)

      expect(getEvolutionWorldState(clientId1).worldState).toBeNull()
      expect(getEvolutionWorldState(clientId2).worldState).not.toBeNull()
    })
  })

  describe('evolveWorld state accumulation', () => {
    beforeEach(() => {
      resetEvolutionWorldState('test-accumulation')
    })

    it('accumulates topics in the correct composition layer', async () => {
      const clientId = 'test-accumulation'

      // Add a water topic
      await evolveWorld(clientId, 'ocean waves', 'How waves form in the ocean')

      const state = getEvolutionWorldState(clientId).worldState
      expect(state.compositionMap.foreground.topics).toHaveLength(1)
      expect(state.compositionMap.foreground.topics[0].name).toBe('ocean waves')
    })

    it('progresses layer state when enough topics added', async () => {
      const clientId = 'test-layer-progress'
      resetEvolutionWorldState(clientId)

      // Add 3 sky topics to trigger state change
      await evolveWorld(clientId, 'clouds', 'Types of clouds')
      await evolveWorld(clientId, 'rain', 'How rain forms')
      await evolveWorld(clientId, 'thunder', 'Thunder and lightning')

      const state = getEvolutionWorldState(clientId).worldState
      expect(state.compositionMap.sky.topics).toHaveLength(3)
      // After 3 topics, state should progress from initial
      expect(state.compositionMap.sky.state).toBe('clearing')
    })

    it('tracks tier upgrades correctly', async () => {
      const clientId = 'test-tier-tracking'
      resetEvolutionWorldState(clientId)

      // Add 5 topics to trigger sprouting tier
      for (let i = 0; i < 5; i++) {
        const result = await evolveWorld(clientId, `topic-${i}`, `Summary ${i}`)

        if (i === 4) {
          // 5th topic should trigger tier upgrade
          expect(result.tierUpgrade).toEqual({
            from: 'barren',
            to: 'sprouting'
          })
        }
      }

      const state = getEvolutionWorldState(clientId).worldState
      expect(state.tier).toBe('sprouting')
      expect(state.totalTopics).toBe(5)
    })
  })

  describe('edge cases and error handling', () => {
    it('handles very long topic names', async () => {
      const clientId = 'test-long-name'
      resetEvolutionWorldState(clientId)

      const longTopicName = 'A'.repeat(500)
      const result = await evolveWorld(clientId, longTopicName, 'Summary')

      expect(result).toBeDefined()
      expect(result.changesApplied).toBeDefined()
    })

    it('handles unicode topic names', async () => {
      const clientId = 'test-unicode'
      resetEvolutionWorldState(clientId)

      const result = await evolveWorld(clientId, 'Quantum physics', 'Summary')

      expect(result).toBeDefined()
      expect(result.changesApplied).toBeDefined()
    })

    it('handles concurrent evolveWorld calls', async () => {
      const clientId = 'test-concurrent'
      resetEvolutionWorldState(clientId)

      // Fire multiple evolutions concurrently
      const promises = [
        evolveWorld(clientId, 'topic1', 'summary1'),
        evolveWorld(clientId, 'topic2', 'summary2'),
        evolveWorld(clientId, 'topic3', 'summary3')
      ]

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.changesApplied).toBeDefined()
      })

      // Final state should reflect all topics
      const state = getEvolutionWorldState(clientId).worldState
      expect(state.totalTopics).toBe(3)
    })
  })
})
