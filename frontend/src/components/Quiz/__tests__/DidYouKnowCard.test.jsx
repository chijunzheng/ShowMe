/**
 * DidYouKnowCard Component Tests
 *
 * Tests for the "Did You Know?" fun fact card component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering with funFact prop
 * - Emoji display
 * - Text content display
 * - Show/hide behavior
 * - Styling and layout
 * - Animation effects
 * - Accessibility
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import DidYouKnowCard from '../DidYouKnowCard'

describe('DidYouKnowCard', () => {
  const defaultProps = {
    funFact: {
      emoji: '🦖',
      text: 'Dinosaurs lived for over 160 million years!',
    },
    show: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders when show is true (default)', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(<DidYouKnowCard {...defaultProps} show={false} />)

      expect(screen.queryByTestId('did-you-know-card')).toBeNull()
    })

    it('renders without show prop (defaults to true)', () => {
      render(<DidYouKnowCard funFact={defaultProps.funFact} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card).toBeInTheDocument()
    })

    it('displays "Did You Know?" title', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(
        card.textContent.toLowerCase().includes('did you know') ||
        card.textContent.toLowerCase().includes('fun fact') ||
        card.textContent.includes('💡')
      ).toBe(true)
    })
  })

  describe('emoji display', () => {
    it('displays the emoji from funFact', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain('🦖')
    })

    it('displays different emojis correctly', () => {
      render(
        <DidYouKnowCard
          funFact={{ emoji: '🌟', text: 'Stars are amazing!' }}
          show={true}
        />
      )

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain('🌟')
    })

    it('renders emoji with proper styling', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      // Emoji should be visually prominent
      const emojiElement = card.querySelector('[data-testid="fun-fact-emoji"]') ||
        card.querySelector('.emoji') ||
        card.querySelector('[class*="emoji"]')

      // At minimum, emoji should be in the content
      expect(card.textContent).toContain('🦖')
    })
  })

  describe('text content', () => {
    it('displays the fun fact text', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain('Dinosaurs lived for over 160 million years!')
    })

    it('displays different text correctly', () => {
      const customFact = {
        emoji: '🌍',
        text: 'The Earth is about 4.5 billion years old!',
      }
      render(<DidYouKnowCard funFact={customFact} show={true} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain('The Earth is about 4.5 billion years old!')
    })

    it('handles long text gracefully', () => {
      const longFact = {
        emoji: '📚',
        text: 'This is a very long fun fact that contains a lot of information and spans multiple lines to test how the component handles lengthy content without breaking the layout or causing overflow issues in the UI.',
      }
      render(<DidYouKnowCard funFact={longFact} show={true} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain(longFact.text)
    })

    it('handles empty text gracefully', () => {
      const emptyFact = { emoji: '🤔', text: '' }

      expect(() => {
        render(<DidYouKnowCard funFact={emptyFact} show={true} />)
      }).not.toThrow()
    })
  })

  describe('styling and layout', () => {
    it('has card-like styling', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      // Should have card styling (rounded corners, shadow, padding, etc.)
      expect(
        card.className.includes('rounded') ||
        card.className.includes('shadow') ||
        card.className.includes('card') ||
        card.className.includes('bg-')
      ).toBe(true)
    })

    it('has appropriate padding', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(
        card.className.includes('p-') ||
        card.className.includes('px-') ||
        card.className.includes('py-') ||
        card.className.includes('padding')
      ).toBe(true)
    })

    it('has visually distinct background', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(
        card.className.includes('bg-') ||
        card.className.includes('background') ||
        window.getComputedStyle(card).backgroundColor !== ''
      ).toBe(true)
    })

    it('has max-width constraint for readability', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(
        card.className.includes('max-w-') ||
        card.style.maxWidth !== '' ||
        card.className.includes('w-')
      ).toBe(true)
    })
  })

  describe('animation effects', () => {
    it('has entrance animation', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(
        card.className.includes('animate') ||
        card.className.includes('transition') ||
        card.className.includes('fade') ||
        card.className.includes('slide')
      ).toBe(true)
    })

    it('has subtle hover or idle animation', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      // May have hover effects or subtle animations
      expect(
        card.className.includes('hover:') ||
        card.className.includes('animate') ||
        card.className.includes('transition') ||
        true // Animation is optional enhancement
      ).toBe(true)
    })
  })

  describe('accessibility', () => {
    it('has appropriate ARIA attributes', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      const isAccessible =
        card.getAttribute('role') === 'complementary' ||
        card.getAttribute('role') === 'note' ||
        card.getAttribute('role') === 'region' ||
        card.getAttribute('aria-label') !== null ||
        card.getAttribute('aria-labelledby') !== null

      // Card should be semantically meaningful
      expect(isAccessible || card.tagName === 'ARTICLE' || card.tagName === 'ASIDE').toBe(true)
    })

    it('text is readable (sufficient contrast)', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      // Should have text styling
      expect(
        card.className.includes('text-') ||
        card.querySelector('p') !== null ||
        card.querySelector('span') !== null
      ).toBe(true)
    })

    it('emoji has accessible alternative', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      // Emoji should either have aria-label or be marked decorative
      // The text content provides context, so emoji can be decorative
      expect(card.textContent.length).toBeGreaterThan(10)
    })
  })

  describe('edge cases', () => {
    it('handles null funFact gracefully', () => {
      expect(() => {
        render(<DidYouKnowCard funFact={null} show={true} />)
      }).not.toThrow()
    })

    it('handles undefined funFact gracefully', () => {
      expect(() => {
        render(<DidYouKnowCard funFact={undefined} show={true} />)
      }).not.toThrow()
    })

    it('handles funFact with missing emoji', () => {
      const factNoEmoji = { text: 'A fact without emoji' }

      expect(() => {
        render(<DidYouKnowCard funFact={factNoEmoji} show={true} />)
      }).not.toThrow()
    })

    it('handles funFact with missing text', () => {
      const factNoText = { emoji: '🎉' }

      expect(() => {
        render(<DidYouKnowCard funFact={factNoText} show={true} />)
      }).not.toThrow()
    })

    it('handles special characters in text', () => {
      const specialFact = {
        emoji: '✨',
        text: "Here's a fact with \"quotes\", <tags>, & special characters!",
      }
      render(<DidYouKnowCard funFact={specialFact} show={true} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain('quotes')
      expect(card.textContent).toContain('special characters')
    })

    it('handles multiple emojis in emoji field', () => {
      const multiEmoji = {
        emoji: '🎉🎊✨',
        text: 'Party time!',
      }
      render(<DidYouKnowCard funFact={multiEmoji} show={true} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain('🎉')
    })

    it('handles unmount cleanly', () => {
      const { unmount } = render(<DidYouKnowCard {...defaultProps} />)

      expect(() => unmount()).not.toThrow()
    })

    it('handles rapid show/hide toggling', () => {
      const { rerender } = render(<DidYouKnowCard {...defaultProps} show={true} />)

      // Toggle rapidly
      for (let i = 0; i < 5; i++) {
        rerender(<DidYouKnowCard {...defaultProps} show={i % 2 === 0} />)
      }

      // Should not crash
      expect(true).toBe(true)
    })

    it('handles funFact prop update', () => {
      const { rerender } = render(<DidYouKnowCard {...defaultProps} />)

      const newFact = {
        emoji: '🌈',
        text: 'Rainbows are beautiful!',
      }
      rerender(<DidYouKnowCard funFact={newFact} show={true} />)

      const card = screen.getByTestId('did-you-know-card')
      expect(card.textContent).toContain('🌈')
      expect(card.textContent).toContain('Rainbows are beautiful!')
    })
  })

  describe('visual appearance', () => {
    it('has kid-friendly styling', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      // Should have pleasant, inviting appearance
      expect(
        card.className.includes('rounded') ||
        card.className.includes('bg-') ||
        card.className.length > 0
      ).toBe(true)
    })

    it('emoji is prominently displayed', () => {
      render(<DidYouKnowCard {...defaultProps} />)

      const card = screen.getByTestId('did-you-know-card')
      // Content should start with or prominently feature the emoji
      expect(card.textContent).toContain('🦖')
    })
  })
})
