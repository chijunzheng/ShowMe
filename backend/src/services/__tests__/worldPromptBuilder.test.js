/**
 * World Prompt Builder Tests
 * TDD tests for the Living World prompt builder service
 *
 * Tests cover:
 * 1. buildBaseWorldPrompt() - Returns prompt with required style keywords
 * 2. buildBaseWorldPrompt() - Includes composition guidance
 * 3. buildEvolutionPrompt() - Includes topic name and terrain effect
 * 4. buildEvolutionPrompt() - Lists existing elements to preserve
 * 5. buildEvolutionPrompt() - Maintains style descriptor
 * 6. TERRAIN_EFFECTS - Maps topic domains to terrain types correctly
 */

import { describe, it, expect } from 'vitest'
import {
  buildBaseWorldPrompt,
  buildEvolutionPrompt,
  getTerrainElement,
  getTerrainEffectTypes,
  getTerrainEffectsForZone,
  TERRAIN_EFFECTS,
  WORLD_STYLE
} from '../worldPromptBuilder.js'

describe('worldPromptBuilder', () => {
  describe('buildBaseWorldPrompt', () => {
    it('returns prompt with required style keywords', () => {
      const prompt = buildBaseWorldPrompt()

      // Must include painterly digital illustration style
      expect(prompt.toLowerCase()).toContain('painterly')
      expect(prompt.toLowerCase()).toContain('digital illustration')

      // Must reference Studio Ghibli-inspired style
      expect(prompt.toLowerCase()).toContain('ghibli')

      // Must specify 16:9 widescreen format
      expect(prompt).toMatch(/16:9|widescreen/i)

      // Must describe barren but beautiful mood
      expect(prompt.toLowerCase()).toContain('barren')
      expect(prompt.toLowerCase()).toContain('dawn')

      // Must exclude certain elements (text and UI elements)
      expect(prompt.toLowerCase()).toContain('no text')
      expect(prompt.toLowerCase()).toMatch(/no.*ui/)
    })

    it('includes composition guidance for all layers', () => {
      const prompt = buildBaseWorldPrompt()

      // Must describe all composition layers
      expect(prompt.toLowerCase()).toContain('sky')
      expect(prompt.toLowerCase()).toContain('background')
      expect(prompt.toLowerCase()).toContain('mountains')
      expect(prompt.toLowerCase()).toContain('midground')
      expect(prompt.toLowerCase()).toContain('foreground')
    })

    it('describes misty atmospheric mood', () => {
      const prompt = buildBaseWorldPrompt()

      expect(prompt.toLowerCase()).toContain('mist')
    })

    it('excludes buildings and lush vegetation for base world', () => {
      const prompt = buildBaseWorldPrompt()

      expect(prompt.toLowerCase()).toContain('no')
      expect(prompt).toMatch(/no.*(building|lush|vegetation)/i)
    })
  })

  describe('buildEvolutionPrompt', () => {
    const baseOptions = {
      topicName: 'Volcanoes',
      zone: 'nature',
      terrainEffect: 'mountains',
      existingElements: ['small stream', 'distant hills'],
      styleDescriptor: 'painterly Ghibli-style landscape'
    }

    it('includes topic name in the evolution context', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      expect(prompt).toContain('Volcanoes')
    })

    it('includes terrain effect to add', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      // Should specify terrain-related addition (mountains start with hills, peaks, etc.)
      // The terrain description includes "elevated terrain" and "peaks"
      expect(prompt.toLowerCase()).toMatch(/hills|peaks|mountain|elevated terrain/)
    })

    it('lists existing elements to preserve', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      expect(prompt).toContain('small stream')
      expect(prompt).toContain('distant hills')
      expect(prompt.toLowerCase()).toContain('preserve')
    })

    it('maintains style descriptor', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      expect(prompt).toContain('painterly Ghibli-style landscape')
    })

    it('specifies what to ADD not replace', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      expect(prompt.toLowerCase()).toContain('add')
    })

    it('maintains consistent lighting reference', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      expect(prompt.toLowerCase()).toContain('lighting')
    })

    it('handles empty existing elements gracefully', () => {
      const optionsWithNoElements = {
        ...baseOptions,
        existingElements: []
      }

      const prompt = buildEvolutionPrompt(optionsWithNoElements)

      // Should still be valid prompt
      expect(prompt).toBeTruthy()
      expect(prompt.length).toBeGreaterThan(50)
      expect(prompt).toContain('Volcanoes')
    })

    it('handles different zones correctly', () => {
      const civilizationOptions = {
        ...baseOptions,
        zone: 'civilization',
        terrainEffect: 'structure'
      }

      const prompt = buildEvolutionPrompt(civilizationOptions)

      // Should reference civilization zone characteristics
      expect(prompt).toBeTruthy()
      expect(prompt.length).toBeGreaterThan(50)
    })

    it('handles arcane zone correctly', () => {
      const arcaneOptions = {
        ...baseOptions,
        zone: 'arcane',
        terrainEffect: 'weather'
      }

      const prompt = buildEvolutionPrompt(arcaneOptions)

      expect(prompt).toBeTruthy()
      expect(prompt.length).toBeGreaterThan(50)
    })

    it('references previous world state for AI conditioning', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      // Should reference the world's current state
      expect(prompt.toLowerCase()).toMatch(/existing|current|previous|world/i)
    })

    it('maintains horizon consistency', () => {
      const prompt = buildEvolutionPrompt(baseOptions)

      expect(prompt.toLowerCase()).toContain('horizon')
    })
  })

  describe('TERRAIN_EFFECTS', () => {
    it('defines water terrain effect with nature zone', () => {
      expect(TERRAIN_EFFECTS.water).toBeDefined()
      expect(TERRAIN_EFFECTS.water.zone).toBe('nature')
      expect(TERRAIN_EFFECTS.water.elements).toBeInstanceOf(Array)
      expect(TERRAIN_EFFECTS.water.elements.length).toBeGreaterThan(0)
    })

    it('water elements include progression from stream to ocean', () => {
      const waterElements = TERRAIN_EFFECTS.water.elements

      expect(waterElements).toContain('stream')
      expect(waterElements).toContain('river')
      expect(waterElements).toContain('lake')
      expect(waterElements).toContain('ocean')
    })

    it('defines mountains terrain effect with nature zone', () => {
      expect(TERRAIN_EFFECTS.mountains).toBeDefined()
      expect(TERRAIN_EFFECTS.mountains.zone).toBe('nature')
      expect(TERRAIN_EFFECTS.mountains.elements).toContain('hills')
      expect(TERRAIN_EFFECTS.mountains.elements).toContain('peaks')
      expect(TERRAIN_EFFECTS.mountains.elements).toContain('mountain range')
    })

    it('mountains elements include snow caps', () => {
      expect(TERRAIN_EFFECTS.mountains.elements).toContain('snow caps')
    })

    it('defines forest terrain effect with nature zone', () => {
      expect(TERRAIN_EFFECTS.forest).toBeDefined()
      expect(TERRAIN_EFFECTS.forest.zone).toBe('nature')
      expect(TERRAIN_EFFECTS.forest.elements).toContain('saplings')
      expect(TERRAIN_EFFECTS.forest.elements).toContain('trees')
      expect(TERRAIN_EFFECTS.forest.elements).toContain('forest')
    })

    it('defines desert terrain effect', () => {
      expect(TERRAIN_EFFECTS.desert).toBeDefined()
      expect(TERRAIN_EFFECTS.desert.elements).toBeInstanceOf(Array)
      expect(TERRAIN_EFFECTS.desert.elements.length).toBeGreaterThan(0)
    })

    it('defines weather terrain effect', () => {
      expect(TERRAIN_EFFECTS.weather).toBeDefined()
      expect(TERRAIN_EFFECTS.weather.elements).toBeInstanceOf(Array)
      expect(TERRAIN_EFFECTS.weather.elements.length).toBeGreaterThan(0)
    })

    it('defines life terrain effect', () => {
      expect(TERRAIN_EFFECTS.life).toBeDefined()
      expect(TERRAIN_EFFECTS.life.elements).toBeInstanceOf(Array)
      expect(TERRAIN_EFFECTS.life.elements.length).toBeGreaterThan(0)
    })

    it('defines structure terrain effect for civilization zone', () => {
      expect(TERRAIN_EFFECTS.structure).toBeDefined()
      expect(TERRAIN_EFFECTS.structure.zone).toBe('civilization')
      expect(TERRAIN_EFFECTS.structure.elements).toBeInstanceOf(Array)
      expect(TERRAIN_EFFECTS.structure.elements.length).toBeGreaterThan(0)
    })
  })

  describe('WORLD_STYLE', () => {
    it('defines base style with Ghibli reference', () => {
      expect(WORLD_STYLE.base).toBeDefined()
      expect(WORLD_STYLE.base.toLowerCase()).toContain('ghibli')
      expect(WORLD_STYLE.base.toLowerCase()).toContain('painterly')
    })

    it('defines consistent lighting direction', () => {
      expect(WORLD_STYLE.lighting).toBeDefined()
      expect(WORLD_STYLE.lighting.toLowerCase()).toContain('golden')
      expect(WORLD_STYLE.lighting.toLowerCase()).toContain('upper left')
    })

    it('defines color palette with soft watercolor textures', () => {
      expect(WORLD_STYLE.palette).toBeDefined()
      expect(WORLD_STYLE.palette.toLowerCase()).toContain('watercolor')
      expect(WORLD_STYLE.palette.toLowerCase()).toContain('soft')
    })

    it('has all required style properties', () => {
      expect(WORLD_STYLE.base).toBeTruthy()
      expect(WORLD_STYLE.lighting).toBeTruthy()
      expect(WORLD_STYLE.palette).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('buildEvolutionPrompt handles missing optional fields', () => {
      const minimalOptions = {
        topicName: 'Test Topic',
        zone: 'nature',
        terrainEffect: 'water'
      }

      const prompt = buildEvolutionPrompt(minimalOptions)

      expect(prompt).toBeTruthy()
      expect(prompt).toContain('Test Topic')
    })

    it('buildEvolutionPrompt validates zone parameter', () => {
      const invalidZoneOptions = {
        topicName: 'Test',
        zone: 'invalid_zone',
        terrainEffect: 'water'
      }

      // Should handle gracefully - either throw or use default
      expect(() => buildEvolutionPrompt(invalidZoneOptions)).not.toThrow()
    })

    it('buildEvolutionPrompt validates terrainEffect parameter', () => {
      const invalidTerrainOptions = {
        topicName: 'Test',
        zone: 'nature',
        terrainEffect: 'invalid_terrain'
      }

      // Should handle gracefully
      expect(() => buildEvolutionPrompt(invalidTerrainOptions)).not.toThrow()
    })

    it('buildEvolutionPrompt handles special characters in topic name', () => {
      const specialCharOptions = {
        topicName: "Newton's Laws & Motion",
        zone: 'nature',
        terrainEffect: 'water',
        existingElements: []
      }

      const prompt = buildEvolutionPrompt(specialCharOptions)

      expect(prompt).toContain("Newton's Laws & Motion")
    })
  })

  describe('Utility Functions', () => {
    describe('getTerrainElement', () => {
      it('returns first element at level 0', () => {
        const element = getTerrainElement('water', 0)
        expect(element).toBe('stream')
      })

      it('returns correct element at different levels', () => {
        expect(getTerrainElement('water', 1)).toBe('river')
        expect(getTerrainElement('water', 2)).toBe('lake')
        expect(getTerrainElement('water', 4)).toBe('ocean')
      })

      it('clamps level to valid range', () => {
        // Level beyond array length should return last element
        const element = getTerrainElement('water', 100)
        expect(element).toBe('ocean')
      })

      it('handles negative levels gracefully', () => {
        const element = getTerrainElement('water', -5)
        expect(element).toBe('stream')
      })

      it('returns fallback for invalid terrain type', () => {
        const element = getTerrainElement('invalid_type', 0)
        expect(element).toBe('subtle change')
      })
    })

    describe('getTerrainEffectTypes', () => {
      it('returns array of all terrain effect types', () => {
        const types = getTerrainEffectTypes()

        expect(types).toBeInstanceOf(Array)
        expect(types).toContain('water')
        expect(types).toContain('mountains')
        expect(types).toContain('forest')
        expect(types).toContain('desert')
        expect(types).toContain('weather')
        expect(types).toContain('life')
        expect(types).toContain('structure')
        expect(types).toContain('abstract')
      })

      it('returns all keys from TERRAIN_EFFECTS', () => {
        const types = getTerrainEffectTypes()
        const expectedKeys = Object.keys(TERRAIN_EFFECTS)

        expect(types.length).toBe(expectedKeys.length)
        expectedKeys.forEach(key => {
          expect(types).toContain(key)
        })
      })
    })

    describe('getTerrainEffectsForZone', () => {
      it('returns only nature zone effects for nature zone', () => {
        const effects = getTerrainEffectsForZone('nature')

        expect(effects.water).toBeDefined()
        expect(effects.mountains).toBeDefined()
        expect(effects.forest).toBeDefined()
        expect(effects.structure).toBeUndefined()
      })

      it('returns only civilization zone effects for civilization zone', () => {
        const effects = getTerrainEffectsForZone('civilization')

        expect(effects.structure).toBeDefined()
        expect(effects.water).toBeUndefined()
        expect(effects.mountains).toBeUndefined()
      })

      it('returns empty object for invalid zone', () => {
        const effects = getTerrainEffectsForZone('invalid_zone')

        expect(effects).toEqual({})
      })

      it('returns arcane zone effects for arcane zone', () => {
        const effects = getTerrainEffectsForZone('arcane')

        expect(effects.abstract).toBeDefined()
      })
    })
  })
})
