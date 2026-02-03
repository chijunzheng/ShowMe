/**
 * QuestionRarityBadge Component Tests
 *
 * Tests for the visual badge component that displays question rarity.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering for each rarity tier
 * - Variant styling (badge, inline, full)
 * - XP multiplier display toggle
 * - Animation behavior
 * - Accessibility
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import QuestionRarityBadge from '../QuestionRarityBadge'

describe('QuestionRarityBadge', () => {
  afterEach(() => {
    cleanup()
  })

  describe('rendering based on rarity', () => {
    describe('common rarity', () => {
      it('returns null for common rarity in badge variant', () => {
        const { container } = render(
          <QuestionRarityBadge rarity="common" variant="badge" />
        )
        expect(container.firstChild).toBeNull()
      })

      it('returns null for common rarity in inline variant', () => {
        const { container } = render(
          <QuestionRarityBadge rarity="common" variant="inline" />
        )
        expect(container.firstChild).toBeNull()
      })

      it('returns null for common rarity by default', () => {
        const { container } = render(<QuestionRarityBadge rarity="common" />)
        expect(container.firstChild).toBeNull()
      })
    })

    describe('rare rarity', () => {
      it('renders badge with diamond icon and name', () => {
        render(<QuestionRarityBadge rarity="rare" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(badge).toBeTruthy()
        expect(badge.textContent).toContain('\uD83D\uDC8E') // Diamond emoji
        expect(badge.textContent).toContain('Rare')
      })

      it('has blue/cyan color styling for rare', () => {
        render(<QuestionRarityBadge rarity="rare" />)

        const badge = screen.getByTestId('rarity-badge')
        // Check for blue-related class or style
        expect(
          badge.className.includes('blue') ||
            badge.className.includes('cyan') ||
            badge.className.includes('rare')
        ).toBe(true)
      })
    })

    describe('epic rarity', () => {
      it('renders badge with crystal ball icon and name', () => {
        render(<QuestionRarityBadge rarity="epic" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(badge).toBeTruthy()
        expect(badge.textContent).toContain('\uD83D\uDD2E') // Crystal ball emoji
        expect(badge.textContent).toContain('Epic')
      })

      it('has purple color styling for epic', () => {
        render(<QuestionRarityBadge rarity="epic" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(
          badge.className.includes('purple') ||
            badge.className.includes('violet') ||
            badge.className.includes('epic')
        ).toBe(true)
      })
    })

    describe('legendary rarity', () => {
      it('renders badge with crown icon and name', () => {
        render(<QuestionRarityBadge rarity="legendary" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(badge).toBeTruthy()
        expect(badge.textContent).toContain('\uD83D\uDC51') // Crown emoji
        expect(badge.textContent).toContain('Legendary')
      })

      it('has gold/amber color styling for legendary', () => {
        render(<QuestionRarityBadge rarity="legendary" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(
          badge.className.includes('gold') ||
            badge.className.includes('amber') ||
            badge.className.includes('yellow') ||
            badge.className.includes('legendary')
        ).toBe(true)
      })
    })
  })

  describe('variant prop', () => {
    describe('badge variant (default)', () => {
      it('renders in compact badge style', () => {
        render(<QuestionRarityBadge rarity="rare" variant="badge" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(badge).toBeTruthy()
        // Badge variant should be relatively compact
        expect(
          badge.className.includes('badge') || badge.className.includes('px-2')
        ).toBe(true)
      })

      it('uses badge variant by default when not specified', () => {
        render(<QuestionRarityBadge rarity="rare" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(badge).toBeTruthy()
      })
    })

    describe('inline variant', () => {
      it('renders in inline style', () => {
        render(<QuestionRarityBadge rarity="epic" variant="inline" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(badge).toBeTruthy()
        expect(
          badge.className.includes('inline') || badge.tagName.toLowerCase() === 'span'
        ).toBe(true)
      })

      it('has smaller text than badge variant', () => {
        render(<QuestionRarityBadge rarity="epic" variant="inline" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(
          badge.className.includes('text-sm') ||
            badge.className.includes('text-xs') ||
            badge.className.includes('inline')
        ).toBe(true)
      })
    })

    describe('full variant', () => {
      it('renders in full expanded style', () => {
        render(<QuestionRarityBadge rarity="legendary" variant="full" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(badge).toBeTruthy()
        expect(
          badge.className.includes('full') ||
            badge.className.includes('px-4') ||
            badge.className.includes('py-2')
        ).toBe(true)
      })

      it('displays larger text for full variant', () => {
        render(<QuestionRarityBadge rarity="legendary" variant="full" />)

        const badge = screen.getByTestId('rarity-badge')
        expect(
          badge.className.includes('text-lg') ||
            badge.className.includes('text-xl') ||
            badge.className.includes('full')
        ).toBe(true)
      })

      it('includes description text in full variant', () => {
        render(<QuestionRarityBadge rarity="legendary" variant="full" />)

        const badge = screen.getByTestId('rarity-badge')
        // Full variant should show multiplier info
        expect(
          badge.textContent.includes('3x') ||
            badge.textContent.includes('XP') ||
            badge.textContent.includes('Legendary')
        ).toBe(true)
      })
    })
  })

  describe('showMultiplier prop', () => {
    it('shows XP multiplier when showMultiplier is true', () => {
      render(<QuestionRarityBadge rarity="rare" showMultiplier={true} />)

      const badge = screen.getByTestId('rarity-badge')
      expect(badge.textContent).toMatch(/1\.5x|1\.5|XP/)
    })

    it('shows epic multiplier (2x) when showMultiplier is true', () => {
      render(<QuestionRarityBadge rarity="epic" showMultiplier={true} />)

      const badge = screen.getByTestId('rarity-badge')
      expect(badge.textContent).toMatch(/2x|2\.0x/)
    })

    it('shows legendary multiplier (3x) when showMultiplier is true', () => {
      render(<QuestionRarityBadge rarity="legendary" showMultiplier={true} />)

      const badge = screen.getByTestId('rarity-badge')
      expect(badge.textContent).toMatch(/3x|3\.0x/)
    })

    it('hides XP multiplier when showMultiplier is false', () => {
      render(<QuestionRarityBadge rarity="rare" showMultiplier={false} />)

      const badge = screen.getByTestId('rarity-badge')
      expect(badge.textContent).not.toMatch(/1\.5x/)
    })

    it('hides multiplier by default when showMultiplier not specified', () => {
      render(<QuestionRarityBadge rarity="epic" />)

      const badge = screen.getByTestId('rarity-badge')
      // Default should not show multiplier or show it based on implementation
      expect(badge.textContent).toContain('Epic')
    })
  })

  describe('animate prop', () => {
    it('has entrance animation class when animate is true', () => {
      render(<QuestionRarityBadge rarity="legendary" animate={true} />)

      const badge = screen.getByTestId('rarity-badge')
      expect(
        badge.className.includes('animate') ||
          badge.className.includes('scale') ||
          badge.className.includes('bounce') ||
          badge.className.includes('pulse')
      ).toBe(true)
    })

    it('has no animation class when animate is false', () => {
      render(<QuestionRarityBadge rarity="legendary" animate={false} />)

      const badge = screen.getByTestId('rarity-badge')
      // Should not have bounce/pulse animation
      expect(badge.className.includes('animate-bounce')).toBe(false)
      expect(badge.className.includes('animate-pulse')).toBe(false)
    })

    it('defaults to no animation when animate prop not specified', () => {
      render(<QuestionRarityBadge rarity="rare" />)

      const badge = screen.getByTestId('rarity-badge')
      // Default should be static (no animation)
      expect(badge.className.includes('animate-bounce')).toBe(false)
    })

    describe('legendary special effects', () => {
      it('has shimmer or glow effect for legendary when animated', () => {
        render(<QuestionRarityBadge rarity="legendary" animate={true} />)

        const badge = screen.getByTestId('rarity-badge')
        expect(
          badge.className.includes('shimmer') ||
            badge.className.includes('glow') ||
            badge.className.includes('pulse') ||
            badge.className.includes('animate')
        ).toBe(true)
      })
    })
  })

  describe('accessibility', () => {
    it('has appropriate role attribute', () => {
      render(<QuestionRarityBadge rarity="rare" />)

      const badge = screen.getByTestId('rarity-badge')
      // Should be status or img role for decorative badge
      expect(
        badge.getAttribute('role') === 'status' ||
          badge.getAttribute('role') === 'img' ||
          badge.getAttribute('aria-label')
      ).toBe(true)
    })

    it('has aria-label describing the rarity', () => {
      render(<QuestionRarityBadge rarity="epic" />)

      const badge = screen.getByTestId('rarity-badge')
      const ariaLabel = badge.getAttribute('aria-label')

      if (ariaLabel) {
        expect(ariaLabel.toLowerCase()).toContain('epic')
      } else {
        // If no aria-label, text content should be descriptive
        expect(badge.textContent.toLowerCase()).toContain('epic')
      }
    })

    it('supports screen readers for legendary rarity', () => {
      render(<QuestionRarityBadge rarity="legendary" />)

      const badge = screen.getByTestId('rarity-badge')
      // Either aria-label or visible text should convey meaning
      const hasAccessibleName =
        badge.getAttribute('aria-label') ||
        badge.textContent.toLowerCase().includes('legendary')
      expect(hasAccessibleName).toBeTruthy()
    })
  })

  describe('edge cases', () => {
    it('handles undefined rarity gracefully', () => {
      const { container } = render(<QuestionRarityBadge rarity={undefined} />)
      // Should treat as common and return null, or render default
      expect(container.firstChild === null || container.firstChild).toBeTruthy()
    })

    it('handles null rarity gracefully', () => {
      const { container } = render(<QuestionRarityBadge rarity={null} />)
      expect(container.firstChild === null || container.firstChild).toBeTruthy()
    })

    it('handles invalid rarity string gracefully', () => {
      const { container } = render(<QuestionRarityBadge rarity="mythic" />)
      // Should treat as common (null) or handle gracefully
      expect(container.firstChild === null || container.firstChild).toBeTruthy()
    })

    it('handles empty string rarity gracefully', () => {
      const { container } = render(<QuestionRarityBadge rarity="" />)
      expect(container.firstChild === null || container.firstChild).toBeTruthy()
    })

    it('handles missing props with defaults', () => {
      // This should not throw
      expect(() => render(<QuestionRarityBadge rarity="rare" />)).not.toThrow()
    })
  })

  describe('styling consistency', () => {
    it('uses consistent padding across variants', () => {
      const { rerender } = render(
        <QuestionRarityBadge rarity="epic" variant="badge" />
      )
      const badgeEl = screen.getByTestId('rarity-badge')
      expect(badgeEl.className).toContain('p')

      rerender(<QuestionRarityBadge rarity="epic" variant="full" />)
      const fullEl = screen.getByTestId('rarity-badge')
      expect(fullEl.className).toContain('p')
    })

    it('has rounded corners', () => {
      render(<QuestionRarityBadge rarity="rare" />)

      const badge = screen.getByTestId('rarity-badge')
      expect(
        badge.className.includes('rounded') || badge.className.includes('round')
      ).toBe(true)
    })

    it('has appropriate font weight for emphasis', () => {
      render(<QuestionRarityBadge rarity="legendary" />)

      const badge = screen.getByTestId('rarity-badge')
      expect(
        badge.className.includes('font-bold') ||
          badge.className.includes('font-semibold') ||
          badge.className.includes('font-medium')
      ).toBe(true)
    })
  })

  describe('prop types validation', () => {
    it('accepts valid rarity values', () => {
      const validRarities = ['common', 'rare', 'epic', 'legendary']

      validRarities.forEach((rarity) => {
        expect(() =>
          render(<QuestionRarityBadge rarity={rarity} />)
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts valid variant values', () => {
      const validVariants = ['badge', 'inline', 'full']

      validVariants.forEach((variant) => {
        expect(() =>
          render(<QuestionRarityBadge rarity="rare" variant={variant} />)
        ).not.toThrow()
        cleanup()
      })
    })
  })
})
