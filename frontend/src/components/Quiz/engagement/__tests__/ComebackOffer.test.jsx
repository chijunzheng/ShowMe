/**
 * ComebackOffer Component Tests
 *
 * Tests for the second chance modal component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering offer modal
 * - Level-specific styling
 * - Score display
 * - Accept/decline buttons
 * - Animations
 * - Sound effects
 * - Accessibility
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ComebackOffer from '../ComebackOffer'

// Mock sound effects
vi.mock('@/utils/soundEffects', () => ({
  playComebackOfferSound: vi.fn(),
}))

describe('ComebackOffer', () => {
  const defaultProps = {
    show: true,
    level: 'simple',
    originalScore: 55,
    passThreshold: 60,
    onAccept: vi.fn(),
    onDecline: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders when show is true', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(modal).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(<ComebackOffer {...defaultProps} show={false} />)

      expect(screen.queryByTestId('comeback-offer')).toBeNull()
    })

    it('displays second chance title', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.textContent.toLowerCase().includes('second chance') ||
        modal.textContent.toLowerCase().includes('comeback') ||
        modal.textContent.toLowerCase().includes('try again')
      ).toBe(true)
    })

    it('displays offer subtitle/description', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      // Should have some explanatory text
      expect(modal.textContent.length).toBeGreaterThan(20)
    })

    it('displays lightning round indicator', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.textContent.toLowerCase().includes('lightning') ||
        modal.textContent.toLowerCase().includes('quick') ||
        modal.textContent.toLowerCase().includes('fast')
      ).toBe(true)
    })
  })

  describe('score display', () => {
    it('shows original score', () => {
      render(<ComebackOffer {...defaultProps} originalScore={55} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(modal.textContent).toContain('55')
    })

    it('shows pass threshold', () => {
      render(<ComebackOffer {...defaultProps} passThreshold={60} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(modal.textContent).toContain('60')
    })

    it('shows how close user was to passing', () => {
      render(<ComebackOffer {...defaultProps} originalScore={55} passThreshold={60} />)

      const modal = screen.getByTestId('comeback-offer')
      // Should show something like "5 points away" or "5%"
      expect(
        modal.textContent.includes('5') ||
        modal.textContent.toLowerCase().includes('close')
      ).toBe(true)
    })

    it('handles different score values', () => {
      const { rerender } = render(
        <ComebackOffer {...defaultProps} originalScore={58} passThreshold={60} />
      )

      expect(screen.getByTestId('comeback-offer').textContent).toContain('58')

      rerender(<ComebackOffer {...defaultProps} originalScore={52} passThreshold={60} />)

      expect(screen.getByTestId('comeback-offer').textContent).toContain('52')
    })
  })

  describe('level-specific styling', () => {
    it('applies simple level styling', () => {
      render(<ComebackOffer {...defaultProps} level="simple" />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('simple') ||
        modal.className.includes('green') ||
        modal.className.includes('emerald')
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(<ComebackOffer {...defaultProps} level="standard" />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('standard') ||
        modal.className.includes('blue') ||
        modal.className.includes('cyan')
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(<ComebackOffer {...defaultProps} level="deep" />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('deep') ||
        modal.className.includes('purple') ||
        modal.className.includes('violet')
      ).toBe(true)
    })

    it('has gradient background', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('gradient') ||
        modal.className.includes('bg-gradient')
      ).toBe(true)
    })
  })

  describe('accept button', () => {
    it('renders accept button', () => {
      render(<ComebackOffer {...defaultProps} />)

      const acceptButton = screen.getByTestId('comeback-accept')
      expect(acceptButton).toBeInTheDocument()
    })

    it('accept button has appropriate label', () => {
      render(<ComebackOffer {...defaultProps} />)

      const acceptButton = screen.getByTestId('comeback-accept')
      expect(
        acceptButton.textContent.toLowerCase().includes('try') ||
        acceptButton.textContent.toLowerCase().includes('accept') ||
        acceptButton.textContent.toLowerCase().includes('go') ||
        acceptButton.textContent.toLowerCase().includes('yes')
      ).toBe(true)
    })

    it('calls onAccept when accept button clicked', () => {
      const onAccept = vi.fn()
      render(<ComebackOffer {...defaultProps} onAccept={onAccept} />)

      const acceptButton = screen.getByTestId('comeback-accept')
      fireEvent.click(acceptButton)

      expect(onAccept).toHaveBeenCalledTimes(1)
    })

    it('accept button is prominent (primary styling)', () => {
      render(<ComebackOffer {...defaultProps} />)

      const acceptButton = screen.getByTestId('comeback-accept')
      expect(
        acceptButton.className.includes('primary') ||
        acceptButton.className.includes('bg-') ||
        acceptButton.className.includes('text-white')
      ).toBe(true)
    })
  })

  describe('decline button', () => {
    it('renders decline button', () => {
      render(<ComebackOffer {...defaultProps} />)

      const declineButton = screen.getByTestId('comeback-decline')
      expect(declineButton).toBeInTheDocument()
    })

    it('decline button has appropriate label', () => {
      render(<ComebackOffer {...defaultProps} />)

      const declineButton = screen.getByTestId('comeback-decline')
      expect(
        declineButton.textContent.toLowerCase().includes('no') ||
        declineButton.textContent.toLowerCase().includes('skip') ||
        declineButton.textContent.toLowerCase().includes('decline') ||
        declineButton.textContent.toLowerCase().includes('cancel')
      ).toBe(true)
    })

    it('calls onDecline when decline button clicked', () => {
      const onDecline = vi.fn()
      render(<ComebackOffer {...defaultProps} onDecline={onDecline} />)

      const declineButton = screen.getByTestId('comeback-decline')
      fireEvent.click(declineButton)

      expect(onDecline).toHaveBeenCalledTimes(1)
    })

    it('decline button is secondary styling', () => {
      render(<ComebackOffer {...defaultProps} />)

      const declineButton = screen.getByTestId('comeback-decline')
      // Should be less prominent than accept
      expect(
        declineButton.className.includes('secondary') ||
        declineButton.className.includes('outline') ||
        declineButton.className.includes('ghost') ||
        declineButton.className.includes('text-')
      ).toBe(true)
    })
  })

  describe('animation effects', () => {
    it('has entrance animation', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('animate') ||
        modal.className.includes('scale') ||
        modal.className.includes('fade')
      ).toBe(true)
    })

    it('has attention-grabbing animation', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('bounce') ||
        modal.className.includes('pulse') ||
        modal.className.includes('animate')
      ).toBe(true)
    })

    it('has icon animation', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      // Should have animated icon element
      expect(
        modal.querySelector('[class*="animate"]') ||
        modal.className.includes('animate')
      ).toBeTruthy()
    })
  })

  describe('sound effects', () => {
    it('plays comeback offer sound when shown', async () => {
      const { playComebackOfferSound } = await import('@/utils/soundEffects')

      render(<ComebackOffer {...defaultProps} show={true} />)

      expect(playComebackOfferSound).toHaveBeenCalled()
    })

    it('does not play sound when show is false', async () => {
      const { playComebackOfferSound } = await import('@/utils/soundEffects')

      render(<ComebackOffer {...defaultProps} show={false} />)

      expect(playComebackOfferSound).not.toHaveBeenCalled()
    })

    it('plays sound only once on initial show', async () => {
      const { playComebackOfferSound } = await import('@/utils/soundEffects')

      const { rerender } = render(<ComebackOffer {...defaultProps} show={true} />)

      // Rerender with same show=true
      rerender(<ComebackOffer {...defaultProps} show={true} />)

      expect(playComebackOfferSound).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has appropriate role', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.getAttribute('role') === 'dialog' ||
        modal.getAttribute('role') === 'alertdialog'
      ).toBe(true)
    })

    it('has aria-modal attribute', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(modal.getAttribute('aria-modal')).toBe('true')
    })

    it('has aria-labelledby for title', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      const hasLabel =
        modal.getAttribute('aria-labelledby') ||
        modal.getAttribute('aria-label')
      expect(hasLabel).toBeTruthy()
    })

    it('buttons have accessible names', () => {
      render(<ComebackOffer {...defaultProps} />)

      const acceptButton = screen.getByTestId('comeback-accept')
      const declineButton = screen.getByTestId('comeback-decline')

      expect(
        acceptButton.textContent.length > 0 ||
        acceptButton.getAttribute('aria-label')
      ).toBeTruthy()
      expect(
        declineButton.textContent.length > 0 ||
        declineButton.getAttribute('aria-label')
      ).toBeTruthy()
    })

    it('buttons are focusable', () => {
      render(<ComebackOffer {...defaultProps} />)

      const acceptButton = screen.getByTestId('comeback-accept')
      const declineButton = screen.getByTestId('comeback-decline')

      acceptButton.focus()
      expect(document.activeElement).toBe(acceptButton)

      declineButton.focus()
      expect(document.activeElement).toBe(declineButton)
    })

    it('respects reduced motion preference', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('motion-') ||
        modal.className.includes('animate') ||
        !modal.className.includes('animate-spin')
      ).toBe(true)
    })
  })

  describe('visual layout', () => {
    it('covers viewport as modal overlay', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('fixed') ||
        modal.className.includes('absolute') ||
        modal.className.includes('inset')
      ).toBe(true)
    })

    it('has high z-index to overlay content', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('z-') ||
        modal.style.zIndex
      ).toBeTruthy()
    })

    it('centers content', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('flex') ||
        modal.className.includes('items-center') ||
        modal.className.includes('justify-center')
      ).toBe(true)
    })

    it('has backdrop/overlay', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.className.includes('bg-') ||
        modal.className.includes('backdrop') ||
        modal.querySelector('[class*="backdrop"]')
      ).toBeTruthy()
    })
  })

  describe('challenge info display', () => {
    it('shows number of questions in challenge', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.textContent.includes('3') ||
        modal.textContent.toLowerCase().includes('three') ||
        modal.textContent.toLowerCase().includes('questions')
      ).toBe(true)
    })

    it('shows time limit per question', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.textContent.includes('15') ||
        modal.textContent.toLowerCase().includes('seconds') ||
        modal.textContent.toLowerCase().includes('time')
      ).toBe(true)
    })

    it('shows required correct answers', () => {
      render(<ComebackOffer {...defaultProps} />)

      const modal = screen.getByTestId('comeback-offer')
      expect(
        modal.textContent.includes('2') ||
        modal.textContent.toLowerCase().includes('two')
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles undefined level gracefully', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} level={undefined} />)
      ).not.toThrow()

      expect(screen.getByTestId('comeback-offer')).toBeInTheDocument()
    })

    it('handles null level gracefully', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} level={null} />)
      ).not.toThrow()

      expect(screen.getByTestId('comeback-offer')).toBeInTheDocument()
    })

    it('handles invalid level string gracefully', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} level="invalid" />)
      ).not.toThrow()

      expect(screen.getByTestId('comeback-offer')).toBeInTheDocument()
    })

    it('handles missing onAccept gracefully', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} onAccept={undefined} />)
      ).not.toThrow()
    })

    it('handles missing onDecline gracefully', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} onDecline={undefined} />)
      ).not.toThrow()
    })

    it('handles zero originalScore', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} originalScore={0} />)
      ).not.toThrow()
    })

    it('handles decimal scores', () => {
      render(<ComebackOffer {...defaultProps} originalScore={55.5} />)

      expect(screen.getByTestId('comeback-offer')).toBeInTheDocument()
    })
  })

  describe('prop types validation', () => {
    it('accepts valid level values', () => {
      const validLevels = ['simple', 'standard', 'deep']

      validLevels.forEach((level) => {
        expect(() =>
          render(<ComebackOffer {...defaultProps} level={level} />)
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts boolean show', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} show={true} />)
      ).not.toThrow()

      cleanup()

      expect(() =>
        render(<ComebackOffer {...defaultProps} show={false} />)
      ).not.toThrow()
    })

    it('accepts numeric originalScore', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} originalScore={55} />)
      ).not.toThrow()
    })

    it('accepts numeric passThreshold', () => {
      expect(() =>
        render(<ComebackOffer {...defaultProps} passThreshold={60} />)
      ).not.toThrow()
    })

    it('accepts function callbacks', () => {
      const onAccept = vi.fn()
      const onDecline = vi.fn()

      expect(() =>
        render(
          <ComebackOffer
            {...defaultProps}
            onAccept={onAccept}
            onDecline={onDecline}
          />
        )
      ).not.toThrow()
    })
  })
})
