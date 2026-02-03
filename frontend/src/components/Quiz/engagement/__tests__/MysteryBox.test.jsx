/**
 * MysteryBox Component Tests
 *
 * Tests for the Mystery Box visual component showing the chest in various states.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering for each phase
 * - Tier-specific styling
 * - Click/tap interactions
 * - Animation states
 * - Accessibility
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import MysteryBox from '../MysteryBox'
import { MYSTERY_BOX_TIERS } from '../../../../hooks/game/mysteryBoxConfig'

describe('MysteryBox', () => {
  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders the mystery box container', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.bronze}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      expect(screen.getByTestId('mystery-box')).toBeInTheDocument()
    })

    it('renders the chest visual element', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.silver}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      // Should have visible chest representation
      expect(box.textContent.length).toBeGreaterThan(0)
    })

    it('renders tier icon', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      // Should display the tier's medal icon
      expect(box.textContent).toContain(MYSTERY_BOX_TIERS.gold.icon)
    })
  })

  describe('phase rendering', () => {
    describe('hidden phase', () => {
      it('is not visible when phase is hidden', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.bronze}
            phase="hidden"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('opacity-0') ||
          box.className.includes('hidden') ||
          box.className.includes('invisible')
        ).toBe(true)
      })

      it('does not show tap indicator when hidden', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.bronze}
            phase="hidden"
            onTap={vi.fn()}
            tapToOpen={true}
          />
        )

        expect(screen.queryByText(/tap/i)).not.toBeInTheDocument()
      })
    })

    describe('appearing phase', () => {
      it('shows fade-in animation', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.silver}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('animate') ||
          box.className.includes('fade') ||
          box.className.includes('opacity')
        ).toBe(true)
      })

      it('shows scale animation', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.silver}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('scale') ||
          box.className.includes('transform') ||
          box.className.includes('bounce')
        ).toBe(true)
      })
    })

    describe('shaking phase', () => {
      it('shows shake animation', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="shaking"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('shake') ||
          box.className.includes('wiggle') ||
          box.className.includes('animate')
        ).toBe(true)
      })

      it('shows tap to open indicator when tapToOpen is true', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="shaking"
            onTap={vi.fn()}
            tapToOpen={true}
          />
        )

        expect(
          screen.getByText(/tap/i) ||
          screen.queryByTestId('tap-indicator')
        ).toBeTruthy()
      })

      it('does not show tap indicator when tapToOpen is false', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="shaking"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        expect(screen.queryByText(/tap to open/i)).not.toBeInTheDocument()
      })
    })

    describe('opening phase', () => {
      it('shows opening animation', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.legendary}
            phase="opening"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('open') ||
          box.className.includes('animate')
        ).toBe(true)
      })

      it('shows glow effect during opening', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.legendary}
            phase="opening"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('glow') ||
          box.className.includes('shadow')
        ).toBe(true)
      })
    })

    describe('open phase', () => {
      it('shows opened chest visual', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="open"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('open') ||
          box.textContent.includes('opened') ||
          box.querySelector('[data-open="true"]')
        ).toBeTruthy()
      })

      it('shows particles or sparkles', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.legendary}
            phase="open"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        // Should have some celebratory effect
        expect(
          box.querySelector('[data-testid="particles"]') ||
          box.className.includes('sparkle') ||
          box.innerHTML.includes('particle')
        ).toBeTruthy()
      })
    })
  })

  describe('tier-specific styling', () => {
    describe('bronze tier', () => {
      it('applies bronze styling', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.bronze}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('bronze') ||
          box.className.includes('amber') ||
          box.className.includes('orange')
        ).toBe(true)
      })

      it('displays bronze icon', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.bronze}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        expect(screen.getByTestId('mystery-box').textContent).toContain('\uD83E\uDD49')
      })
    })

    describe('silver tier', () => {
      it('applies silver styling', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.silver}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('silver') ||
          box.className.includes('slate') ||
          box.className.includes('gray')
        ).toBe(true)
      })

      it('displays silver icon', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.silver}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        expect(screen.getByTestId('mystery-box').textContent).toContain('\uD83E\uDD48')
      })
    })

    describe('gold tier', () => {
      it('applies gold styling', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('gold') ||
          box.className.includes('yellow') ||
          box.className.includes('amber')
        ).toBe(true)
      })

      it('displays gold icon', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        expect(screen.getByTestId('mystery-box').textContent).toContain('\uD83E\uDD47')
      })

      it('has more prominent glow than bronze/silver', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="shaking"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('glow') ||
          box.className.includes('shadow-lg') ||
          box.className.includes('shadow-xl')
        ).toBe(true)
      })
    })

    describe('legendary tier', () => {
      it('applies legendary styling', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.legendary}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('legendary') ||
          box.className.includes('purple') ||
          box.className.includes('violet')
        ).toBe(true)
      })

      it('displays crown icon', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.legendary}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        expect(screen.getByTestId('mystery-box').textContent).toContain('\uD83D\uDC51')
      })

      it('has rainbow or special glow effect', () => {
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.legendary}
            phase="shaking"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )

        const box = screen.getByTestId('mystery-box')
        expect(
          box.className.includes('rainbow') ||
          box.className.includes('animate-pulse') ||
          box.className.includes('glow')
        ).toBe(true)
      })
    })
  })

  describe('click interactions', () => {
    it('calls onTap when clicked and tapToOpen is true', () => {
      const onTap = vi.fn()
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={onTap}
          tapToOpen={true}
        />
      )

      fireEvent.click(screen.getByTestId('mystery-box'))
      expect(onTap).toHaveBeenCalledTimes(1)
    })

    it('does not call onTap when clicked and tapToOpen is false', () => {
      const onTap = vi.fn()
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={onTap}
          tapToOpen={false}
        />
      )

      fireEvent.click(screen.getByTestId('mystery-box'))
      expect(onTap).not.toHaveBeenCalled()
    })

    it('does not call onTap when phase is hidden', () => {
      const onTap = vi.fn()
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="hidden"
          onTap={onTap}
          tapToOpen={true}
        />
      )

      fireEvent.click(screen.getByTestId('mystery-box'))
      expect(onTap).not.toHaveBeenCalled()
    })

    it('does not call onTap when phase is open', () => {
      const onTap = vi.fn()
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="open"
          onTap={onTap}
          tapToOpen={true}
        />
      )

      fireEvent.click(screen.getByTestId('mystery-box'))
      expect(onTap).not.toHaveBeenCalled()
    })

    it('handles keyboard enter for accessibility', () => {
      const onTap = vi.fn()
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={onTap}
          tapToOpen={true}
        />
      )

      fireEvent.keyDown(screen.getByTestId('mystery-box'), { key: 'Enter' })
      expect(onTap).toHaveBeenCalledTimes(1)
    })

    it('handles keyboard space for accessibility', () => {
      const onTap = vi.fn()
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={onTap}
          tapToOpen={true}
        />
      )

      fireEvent.keyDown(screen.getByTestId('mystery-box'), { key: ' ' })
      expect(onTap).toHaveBeenCalledTimes(1)
    })

    it('shows pointer cursor when tapToOpen is true', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={true}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(box.className.includes('cursor-pointer')).toBe(true)
    })
  })

  describe('accessibility', () => {
    it('has appropriate role', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={true}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(
        box.getAttribute('role') === 'button' ||
        box.tagName.toLowerCase() === 'button'
      ).toBe(true)
    })

    it('has aria-label describing the box', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={true}
        />
      )

      const box = screen.getByTestId('mystery-box')
      const ariaLabel = box.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel.toLowerCase()).toContain('mystery')
    })

    it('is focusable when tapToOpen is true', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={true}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(box.getAttribute('tabIndex')).toBe('0')
    })

    it('is not focusable when tapToOpen is false', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(
        box.getAttribute('tabIndex') === '-1' ||
        box.getAttribute('tabIndex') === null
      ).toBe(true)
    })

    it('announces tier name', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.legendary}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      const ariaLabel = box.getAttribute('aria-label') || ''
      expect(
        ariaLabel.toLowerCase().includes('legendary') ||
        box.textContent.toLowerCase().includes('legendary')
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles null tier gracefully', () => {
      expect(() =>
        render(
          <MysteryBox
            tier={null}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )
      ).not.toThrow()
    })

    it('handles undefined tier gracefully', () => {
      expect(() =>
        render(
          <MysteryBox
            tier={undefined}
            phase="appearing"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )
      ).not.toThrow()
    })

    it('handles invalid phase gracefully', () => {
      expect(() =>
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="invalid"
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )
      ).not.toThrow()
    })

    it('handles undefined onTap gracefully', () => {
      expect(() =>
        render(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase="shaking"
            tapToOpen={true}
          />
        )
      ).not.toThrow()

      // Should still render and be clickable without crashing
      const box = screen.getByTestId('mystery-box')
      expect(() => fireEvent.click(box)).not.toThrow()
    })

    it('handles phase transitions', () => {
      const { rerender } = render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="hidden"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const phases = ['appearing', 'shaking', 'opening', 'open']

      phases.forEach((phase) => {
        rerender(
          <MysteryBox
            tier={MYSTERY_BOX_TIERS.gold}
            phase={phase}
            onTap={vi.fn()}
            tapToOpen={false}
          />
        )
        expect(screen.getByTestId('mystery-box')).toBeInTheDocument()
      })
    })

    it('handles tier changes', () => {
      const { rerender } = render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.bronze}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      expect(screen.getByTestId('mystery-box').textContent).toContain(MYSTERY_BOX_TIERS.bronze.icon)

      rerender(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.legendary}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      expect(screen.getByTestId('mystery-box').textContent).toContain(MYSTERY_BOX_TIERS.legendary.icon)
    })
  })

  describe('visual styling', () => {
    it('has rounded corners', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(box.className.includes('rounded')).toBe(true)
    })

    it('has appropriate size', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      // Should have size classes
      expect(
        box.className.includes('w-') ||
        box.className.includes('h-') ||
        box.className.includes('size-')
      ).toBe(true)
    })

    it('has transition classes for smooth animations', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(
        box.className.includes('transition') ||
        box.className.includes('duration')
      ).toBe(true)
    })

    it('centers content', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="appearing"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(
        box.className.includes('flex') ||
        box.className.includes('items-center') ||
        box.className.includes('justify-center')
      ).toBe(true)
    })
  })

  describe('animations', () => {
    it('has CSS keyframe animation class for shaking', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.gold}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(
        box.className.includes('animate-') ||
        box.className.includes('shake') ||
        box.className.includes('wiggle')
      ).toBe(true)
    })

    it('has glow animation for legendary tier', () => {
      render(
        <MysteryBox
          tier={MYSTERY_BOX_TIERS.legendary}
          phase="shaking"
          onTap={vi.fn()}
          tapToOpen={false}
        />
      )

      const box = screen.getByTestId('mystery-box')
      expect(
        box.className.includes('animate-pulse') ||
        box.className.includes('glow') ||
        box.className.includes('shadow')
      ).toBe(true)
    })
  })
})
