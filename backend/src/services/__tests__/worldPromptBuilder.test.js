/**
 * World Prompt Builder Tests (Living World)
 *
 * Prompts should be deterministic and free of hardcoded topic classification.
 * Gemini decides what element to add; the builder only enforces composition and preservation.
 */

import { describe, it, expect } from 'vitest'
import {
  buildBaseWorldPrompt,
  buildEvolutionPrompt,
  WORLD_STYLE,
} from '../worldPromptBuilder.js'

describe('worldPromptBuilder', () => {
  describe('buildBaseWorldPrompt', () => {
    it('includes key style and composition guidance', () => {
      const prompt = buildBaseWorldPrompt()

      expect(prompt.toLowerCase()).toContain('painterly')
      expect(prompt.toLowerCase()).toContain('ghibli')
      expect(prompt).toMatch(/16:9|widescreen/i)

      expect(prompt.toLowerCase()).toContain('sky')
      expect(prompt.toLowerCase()).toContain('background')
      expect(prompt.toLowerCase()).toContain('midground')
      expect(prompt.toLowerCase()).toContain('foreground')

      expect(prompt.toLowerCase()).toContain('no text')
      expect(prompt.toLowerCase()).toMatch(/no.*ui/i)
    })
  })

  describe('buildEvolutionPrompt', () => {
    it('includes topic name and planned element', () => {
      const prompt = buildEvolutionPrompt({
        topicName: 'LTE Network',
        summary: 'How cell towers connect phones over radio waves',
        elementToAdd: 'a small cell tower with antennas',
        placementHint: 'midground center-right near the rocky ridge',
        targetLayer: 'midground',
        existingElements: ['a shallow streambed', 'distant mountains'],
        styleDescriptor: WORLD_STYLE.base,
        tier: 'barren',
      })

      expect(prompt).toContain('LTE Network')
      expect(prompt.toLowerCase()).toContain('cell tower')
      expect(prompt.toLowerCase()).toContain('preserve')
      expect(prompt.toLowerCase()).toContain('target layer')
      expect(prompt.toLowerCase()).toContain('midground')
      expect(prompt.toLowerCase()).toContain('add exactly one')
    })

    it('throws when elementToAdd is missing', () => {
      expect(() => buildEvolutionPrompt({ topicName: 'Test Topic' })).toThrow()
    })
  })
})

