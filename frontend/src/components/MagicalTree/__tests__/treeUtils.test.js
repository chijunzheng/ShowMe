/**
 * Tree Utility Function Tests
 *
 * TDD: These tests define the behavior for tree level calculation
 * and branch grouping utilities BEFORE implementation.
 *
 * Tree Level Thresholds:
 * - 0 topics = 'seed'
 * - 1-2 topics = 'sprout'
 * - 3-5 topics = 'sapling'
 * - 6-10 topics = 'young'
 * - 11-20 topics = 'mature'
 * - 21+ topics = 'magical'
 *
 * Zones (category groupings):
 * - nature: green leaves (animals, plants, weather, geography)
 * - civilization: amber leaves (history, technology, society)
 * - arcane: purple leaves (science, space, math, mysteries)
 */

import { describe, it, expect } from 'vitest'
import {
  calculateTreeLevel,
  groupTopicsByZone,
  getZoneForCategory,
  TREE_LEVELS,
  ZONES,
} from '../treeUtils'

describe('calculateTreeLevel', () => {
  describe('boundary conditions', () => {
    it('returns "seed" for 0 topics', () => {
      expect(calculateTreeLevel(0)).toBe('seed')
    })

    it('returns "sprout" for 1 topic', () => {
      expect(calculateTreeLevel(1)).toBe('sprout')
    })

    it('returns "sprout" for 2 topics', () => {
      expect(calculateTreeLevel(2)).toBe('sprout')
    })

    it('returns "sapling" for 3 topics', () => {
      expect(calculateTreeLevel(3)).toBe('sapling')
    })

    it('returns "sapling" for 5 topics', () => {
      expect(calculateTreeLevel(5)).toBe('sapling')
    })

    it('returns "young" for 6 topics', () => {
      expect(calculateTreeLevel(6)).toBe('young')
    })

    it('returns "young" for 10 topics', () => {
      expect(calculateTreeLevel(10)).toBe('young')
    })

    it('returns "mature" for 11 topics', () => {
      expect(calculateTreeLevel(11)).toBe('mature')
    })

    it('returns "mature" for 20 topics', () => {
      expect(calculateTreeLevel(20)).toBe('mature')
    })

    it('returns "magical" for 21 topics', () => {
      expect(calculateTreeLevel(21)).toBe('magical')
    })

    it('returns "magical" for 100+ topics', () => {
      expect(calculateTreeLevel(100)).toBe('magical')
      expect(calculateTreeLevel(1000)).toBe('magical')
    })
  })

  describe('edge cases', () => {
    it('handles negative numbers by returning "seed"', () => {
      expect(calculateTreeLevel(-1)).toBe('seed')
      expect(calculateTreeLevel(-100)).toBe('seed')
    })

    it('handles null by returning "seed"', () => {
      expect(calculateTreeLevel(null)).toBe('seed')
    })

    it('handles undefined by returning "seed"', () => {
      expect(calculateTreeLevel(undefined)).toBe('seed')
    })

    it('handles NaN by returning "seed"', () => {
      expect(calculateTreeLevel(NaN)).toBe('seed')
    })

    it('handles floating point numbers by flooring', () => {
      expect(calculateTreeLevel(2.9)).toBe('sprout')
      expect(calculateTreeLevel(5.5)).toBe('sapling')
      expect(calculateTreeLevel(10.99)).toBe('young')
    })

    it('handles string numbers by parsing', () => {
      expect(calculateTreeLevel('5')).toBe('sapling')
      expect(calculateTreeLevel('21')).toBe('magical')
    })

    it('handles non-numeric strings by returning "seed"', () => {
      expect(calculateTreeLevel('abc')).toBe('seed')
      expect(calculateTreeLevel('')).toBe('seed')
    })
  })
})

describe('TREE_LEVELS', () => {
  it('exports all tree level constants', () => {
    expect(TREE_LEVELS).toBeDefined()
    expect(TREE_LEVELS.SEED).toBe('seed')
    expect(TREE_LEVELS.SPROUT).toBe('sprout')
    expect(TREE_LEVELS.SAPLING).toBe('sapling')
    expect(TREE_LEVELS.YOUNG).toBe('young')
    expect(TREE_LEVELS.MATURE).toBe('mature')
    expect(TREE_LEVELS.MAGICAL).toBe('magical')
  })

  it('has exactly 6 levels', () => {
    expect(Object.keys(TREE_LEVELS)).toHaveLength(6)
  })
})

describe('ZONES', () => {
  it('exports all zone constants', () => {
    expect(ZONES).toBeDefined()
    expect(ZONES.NATURE).toBe('nature')
    expect(ZONES.CIVILIZATION).toBe('civilization')
    expect(ZONES.ARCANE).toBe('arcane')
  })

  it('has exactly 3 zones', () => {
    expect(Object.keys(ZONES)).toHaveLength(3)
  })
})

describe('getZoneForCategory', () => {
  describe('nature zone categories', () => {
    it('classifies "Animals" as nature', () => {
      expect(getZoneForCategory('Animals')).toBe('nature')
    })

    it('classifies "Plants" as nature', () => {
      expect(getZoneForCategory('Plants')).toBe('nature')
    })

    it('classifies "Weather" as nature', () => {
      expect(getZoneForCategory('Weather')).toBe('nature')
    })

    it('classifies "Geography" as nature', () => {
      expect(getZoneForCategory('Geography')).toBe('nature')
    })

    it('classifies "Ocean" as nature', () => {
      expect(getZoneForCategory('Ocean')).toBe('nature')
    })

    it('classifies "Dinosaurs" as nature', () => {
      expect(getZoneForCategory('Dinosaurs')).toBe('nature')
    })
  })

  describe('civilization zone categories', () => {
    it('classifies "History" as civilization', () => {
      expect(getZoneForCategory('History')).toBe('civilization')
    })

    it('classifies "Technology" as civilization', () => {
      expect(getZoneForCategory('Technology')).toBe('civilization')
    })

    it('classifies "Society" as civilization', () => {
      expect(getZoneForCategory('Society')).toBe('civilization')
    })

    it('classifies "Art" as civilization', () => {
      expect(getZoneForCategory('Art')).toBe('civilization')
    })

    it('classifies "Music" as civilization', () => {
      expect(getZoneForCategory('Music')).toBe('civilization')
    })

    it('classifies "Food" as civilization', () => {
      expect(getZoneForCategory('Food')).toBe('civilization')
    })
  })

  describe('arcane zone categories', () => {
    it('classifies "Science" as arcane', () => {
      expect(getZoneForCategory('Science')).toBe('arcane')
    })

    it('classifies "Space" as arcane', () => {
      expect(getZoneForCategory('Space')).toBe('arcane')
    })

    it('classifies "Math" as arcane', () => {
      expect(getZoneForCategory('Math')).toBe('arcane')
    })

    it('classifies "Physics" as arcane', () => {
      expect(getZoneForCategory('Physics')).toBe('arcane')
    })

    it('classifies "Chemistry" as arcane', () => {
      expect(getZoneForCategory('Chemistry')).toBe('arcane')
    })
  })

  describe('edge cases', () => {
    it('handles case-insensitive matching', () => {
      expect(getZoneForCategory('ANIMALS')).toBe('nature')
      expect(getZoneForCategory('history')).toBe('civilization')
      expect(getZoneForCategory('ScIeNcE')).toBe('arcane')
    })

    it('defaults to "nature" for unknown categories', () => {
      expect(getZoneForCategory('Unknown')).toBe('nature')
      expect(getZoneForCategory('Random')).toBe('nature')
    })

    it('handles null gracefully', () => {
      expect(getZoneForCategory(null)).toBe('nature')
    })

    it('handles undefined gracefully', () => {
      expect(getZoneForCategory(undefined)).toBe('nature')
    })

    it('handles empty string gracefully', () => {
      expect(getZoneForCategory('')).toBe('nature')
    })
  })
})

describe('groupTopicsByZone', () => {
  const sampleTopics = [
    { id: '1', name: 'Lions', category: 'Animals' },
    { id: '2', name: 'Pyramids', category: 'History' },
    { id: '3', name: 'Black Holes', category: 'Space' },
    { id: '4', name: 'Rainforest', category: 'Plants' },
    { id: '5', name: 'Robots', category: 'Technology' },
    { id: '6', name: 'Atoms', category: 'Science' },
  ]

  it('groups topics into nature, civilization, and arcane zones', () => {
    const result = groupTopicsByZone(sampleTopics)

    expect(result).toHaveProperty('nature')
    expect(result).toHaveProperty('civilization')
    expect(result).toHaveProperty('arcane')
  })

  it('correctly groups nature topics', () => {
    const result = groupTopicsByZone(sampleTopics)

    expect(result.nature).toHaveLength(2)
    expect(result.nature.map(t => t.name)).toContain('Lions')
    expect(result.nature.map(t => t.name)).toContain('Rainforest')
  })

  it('correctly groups civilization topics', () => {
    const result = groupTopicsByZone(sampleTopics)

    expect(result.civilization).toHaveLength(2)
    expect(result.civilization.map(t => t.name)).toContain('Pyramids')
    expect(result.civilization.map(t => t.name)).toContain('Robots')
  })

  it('correctly groups arcane topics', () => {
    const result = groupTopicsByZone(sampleTopics)

    expect(result.arcane).toHaveLength(2)
    expect(result.arcane.map(t => t.name)).toContain('Black Holes')
    expect(result.arcane.map(t => t.name)).toContain('Atoms')
  })

  it('preserves topic object properties', () => {
    const result = groupTopicsByZone(sampleTopics)

    const lion = result.nature.find(t => t.name === 'Lions')
    expect(lion).toEqual({ id: '1', name: 'Lions', category: 'Animals' })
  })

  it('handles empty array', () => {
    const result = groupTopicsByZone([])

    expect(result.nature).toHaveLength(0)
    expect(result.civilization).toHaveLength(0)
    expect(result.arcane).toHaveLength(0)
  })

  it('handles null gracefully', () => {
    const result = groupTopicsByZone(null)

    expect(result).toEqual({
      nature: [],
      civilization: [],
      arcane: [],
    })
  })

  it('handles undefined gracefully', () => {
    const result = groupTopicsByZone(undefined)

    expect(result).toEqual({
      nature: [],
      civilization: [],
      arcane: [],
    })
  })

  it('handles topics without category by defaulting to nature', () => {
    const topicsWithoutCategory = [
      { id: '1', name: 'Mystery Topic' },
      { id: '2', name: 'Lions', category: 'Animals' },
    ]

    const result = groupTopicsByZone(topicsWithoutCategory)

    expect(result.nature).toHaveLength(2)
    expect(result.nature.map(t => t.name)).toContain('Mystery Topic')
  })

  it('adds zone property to each grouped topic', () => {
    const result = groupTopicsByZone(sampleTopics)

    result.nature.forEach(topic => {
      expect(topic.zone).toBe('nature')
    })
    result.civilization.forEach(topic => {
      expect(topic.zone).toBe('civilization')
    })
    result.arcane.forEach(topic => {
      expect(topic.zone).toBe('arcane')
    })
  })
})
