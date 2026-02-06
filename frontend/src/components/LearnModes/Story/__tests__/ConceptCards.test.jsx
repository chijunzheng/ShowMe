/**
 * ConceptCards Component Tests
 *
 * Tests for visual concept badges in Story Studio.
 * Supports two modes: full (grid layout) and compact (horizontal badges).
 * Highlights found concepts in green.
 *
 * Test coverage includes:
 * - Null return when no cards
 * - Full mode rendering with grid layout
 * - Compact mode rendering with badges
 * - Found concept highlighting
 * - Default icon fallback
 *
 * @vitest-environment jsdom
 */

import { StrictMode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import ConceptCards from '../ConceptCards'

describe('ConceptCards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('empty state', () => {
    it('returns null when conceptCards is empty', () => {
      const { container } = render(
        <StrictMode>
          <ConceptCards conceptCards={[]} />
        </StrictMode>
      )

      expect(container.firstChild).toBeNull()
    })

    it('returns null when conceptCards is not provided', () => {
      const { container } = render(
        <StrictMode>
          <ConceptCards />
        </StrictMode>
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('full mode (default)', () => {
    it('renders grid of concept cards with name, icon, description', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡', description: 'Power to do work' },
        { concept: 'Motion', icon: '🏃', description: 'Change in position' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} />
        </StrictMode>
      )

      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('⚡')).toBeInTheDocument()
      expect(screen.getByText('Power to do work')).toBeInTheDocument()

      expect(screen.getByText('Motion')).toBeInTheDocument()
      expect(screen.getByText('🏃')).toBeInTheDocument()
      expect(screen.getByText('Change in position')).toBeInTheDocument()
    })

    it('highlights found concepts with "Found!" text', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡', description: 'Power to do work' },
        { concept: 'Motion', icon: '🏃', description: 'Change in position' },
      ]
      const conceptsFound = new Set(['Energy'])

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} />
        </StrictMode>
      )

      expect(screen.getByText('Found!')).toBeInTheDocument()
    })

    it('uses default icon 📝 when icon not provided', () => {
      const conceptCards = [
        { concept: 'Energy', description: 'Power to do work' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} />
        </StrictMode>
      )

      expect(screen.getByText('📝')).toBeInTheDocument()
      expect(screen.getByText('Energy')).toBeInTheDocument()
    })

    it('renders without description when not provided', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} />
        </StrictMode>
      )

      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('⚡')).toBeInTheDocument()
    })

    it('multiple found concepts work correctly', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
        { concept: 'Motion', icon: '🏃' },
        { concept: 'Force', icon: '💪' },
      ]
      const conceptsFound = new Set(['Energy', 'Motion'])

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} />
        </StrictMode>
      )

      const foundTexts = screen.getAllByText('Found!')
      expect(foundTexts).toHaveLength(2)
    })
  })

  describe('compact mode', () => {
    it('renders horizontal badges when compact=true', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
        { concept: 'Motion', icon: '🏃' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} compact={true} />
        </StrictMode>
      )

      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('Motion')).toBeInTheDocument()
      expect(screen.getByText('⚡')).toBeInTheDocument()
      expect(screen.getByText('🏃')).toBeInTheDocument()
    })

    it('shows checkmark ✓ for found concepts', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
        { concept: 'Motion', icon: '🏃' },
      ]
      const conceptsFound = new Set(['Energy'])

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} compact={true} />
        </StrictMode>
      )

      expect(screen.getByText('✓')).toBeInTheDocument()
    })

    it('does not show "Found!" text in compact mode', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
      ]
      const conceptsFound = new Set(['Energy'])

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} compact={true} />
        </StrictMode>
      )

      expect(screen.queryByText('Found!')).not.toBeInTheDocument()
    })

    it('uses default icon 📝 when not provided in compact mode', () => {
      const conceptCards = [
        { concept: 'Energy' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} compact={true} />
        </StrictMode>
      )

      expect(screen.getByText('📝')).toBeInTheDocument()
    })

    it('multiple found concepts show multiple checkmarks', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
        { concept: 'Motion', icon: '🏃' },
      ]
      const conceptsFound = new Set(['Energy', 'Motion'])

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} compact={true} />
        </StrictMode>
      )

      const checkmarks = screen.getAllByText('✓')
      expect(checkmarks).toHaveLength(2)
    })
  })

  describe('conceptsFound behavior', () => {
    it('works with empty Set', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
      ]
      const conceptsFound = new Set()

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} />
        </StrictMode>
      )

      expect(screen.queryByText('Found!')).not.toBeInTheDocument()
    })

    it('uses default empty Set when conceptsFound not provided', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} />
        </StrictMode>
      )

      expect(screen.queryByText('Found!')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles single concept card', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡', description: 'Power to do work' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} />
        </StrictMode>
      )

      expect(screen.getByText('Energy')).toBeInTheDocument()
    })

    it('handles many concept cards', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
        { concept: 'Motion', icon: '🏃' },
        { concept: 'Force', icon: '💪' },
        { concept: 'Gravity', icon: '🌍' },
        { concept: 'Friction', icon: '🔥' },
      ]

      render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} />
        </StrictMode>
      )

      expect(screen.getByText('Energy')).toBeInTheDocument()
      expect(screen.getByText('Motion')).toBeInTheDocument()
      expect(screen.getByText('Force')).toBeInTheDocument()
      expect(screen.getByText('Gravity')).toBeInTheDocument()
      expect(screen.getByText('Friction')).toBeInTheDocument()
    })

    it('switches between full and compact modes', () => {
      const conceptCards = [
        { concept: 'Energy', icon: '⚡' },
      ]
      const conceptsFound = new Set(['Energy'])

      const { rerender } = render(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} compact={false} />
        </StrictMode>
      )

      expect(screen.getByText('Found!')).toBeInTheDocument()

      rerender(
        <StrictMode>
          <ConceptCards conceptCards={conceptCards} conceptsFound={conceptsFound} compact={true} />
        </StrictMode>
      )

      expect(screen.queryByText('Found!')).not.toBeInTheDocument()
      expect(screen.getByText('✓')).toBeInTheDocument()
    })
  })
})
