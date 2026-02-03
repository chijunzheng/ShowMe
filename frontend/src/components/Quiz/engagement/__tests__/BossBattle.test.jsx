/**
 * BossBattle Component Tests
 *
 * Tests for the boss battle wrapper component that applies urgent styling.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering children correctly
 * - Level-specific styling
 * - Active/inactive states
 * - Animation effects
 * - Accessibility
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import BossBattle from '../BossBattle'

describe('BossBattle', () => {
  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('renders the boss battle container', () => {
      render(
        <BossBattle level="simple" isActive={true}>
          <div>Test Child</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(container).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(
        <BossBattle level="simple" isActive={true}>
          <div data-testid="child-content">Quiz Question Here</div>
        </BossBattle>
      )

      expect(screen.getByTestId('child-content')).toBeInTheDocument()
      expect(screen.getByText('Quiz Question Here')).toBeInTheDocument()
    })

    it('renders multiple children', () => {
      render(
        <BossBattle level="standard" isActive={true}>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </BossBattle>
      )

      expect(screen.getByTestId('child-1')).toBeInTheDocument()
      expect(screen.getByTestId('child-2')).toBeInTheDocument()
    })

    it('renders boss indicator or label', () => {
      render(
        <BossBattle level="deep" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      // Should have visual indicator that this is a boss battle
      expect(
        container.textContent.toLowerCase().includes('boss') ||
        container.querySelector('[data-testid="boss-indicator"]') ||
        container.className.includes('boss')
      ).toBeTruthy()
    })
  })

  describe('level-specific styling', () => {
    describe('simple level', () => {
      it('applies simple level styling', () => {
        render(
          <BossBattle level="simple" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )

        const container = screen.getByTestId('boss-battle')
        expect(
          container.className.includes('simple') ||
          container.className.includes('green') ||
          container.className.includes('emerald')
        ).toBe(true)
      })

      it('has gradient background for simple', () => {
        render(
          <BossBattle level="simple" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )

        const container = screen.getByTestId('boss-battle')
        expect(
          container.className.includes('gradient') ||
          container.className.includes('bg-gradient')
        ).toBe(true)
      })
    })

    describe('standard level', () => {
      it('applies standard level styling', () => {
        render(
          <BossBattle level="standard" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )

        const container = screen.getByTestId('boss-battle')
        expect(
          container.className.includes('standard') ||
          container.className.includes('blue') ||
          container.className.includes('cyan')
        ).toBe(true)
      })

      it('has more intense styling than simple', () => {
        const { rerender } = render(
          <BossBattle level="simple" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )
        const simpleClasses = screen.getByTestId('boss-battle').className

        rerender(
          <BossBattle level="standard" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )
        const standardClasses = screen.getByTestId('boss-battle').className

        expect(standardClasses).not.toBe(simpleClasses)
      })
    })

    describe('deep level', () => {
      it('applies deep level styling', () => {
        render(
          <BossBattle level="deep" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )

        const container = screen.getByTestId('boss-battle')
        expect(
          container.className.includes('deep') ||
          container.className.includes('purple') ||
          container.className.includes('violet')
        ).toBe(true)
      })

      it('has glow effect for deep', () => {
        render(
          <BossBattle level="deep" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )

        const container = screen.getByTestId('boss-battle')
        expect(
          container.className.includes('glow') ||
          container.className.includes('shadow') ||
          container.className.includes('ring')
        ).toBe(true)
      })
    })
  })

  describe('isActive prop', () => {
    it('shows boss styling when isActive is true', () => {
      render(
        <BossBattle level="simple" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(
        container.className.includes('active') ||
        container.className.includes('gradient') ||
        container.className.includes('border')
      ).toBe(true)
    })

    it('hides boss styling when isActive is false', () => {
      render(
        <BossBattle level="simple" isActive={false}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      // Should have minimal or no boss-specific styling
      expect(
        !container.className.includes('active') ||
        container.className.includes('inactive')
      ).toBe(true)
    })

    it('still renders children when inactive', () => {
      render(
        <BossBattle level="simple" isActive={false}>
          <div data-testid="child">Child Content</div>
        </BossBattle>
      )

      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('transitions between active states', () => {
      const { rerender } = render(
        <BossBattle level="standard" isActive={false}>
          <div>Content</div>
        </BossBattle>
      )

      const inactiveClasses = screen.getByTestId('boss-battle').className

      rerender(
        <BossBattle level="standard" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const activeClasses = screen.getByTestId('boss-battle').className
      expect(activeClasses).not.toBe(inactiveClasses)
    })
  })

  describe('animation effects', () => {
    it('has pulse animation when active', () => {
      render(
        <BossBattle level="deep" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(
        container.className.includes('pulse') ||
        container.className.includes('animate')
      ).toBe(true)
    })

    it('has urgent border animation', () => {
      render(
        <BossBattle level="standard" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(
        container.className.includes('border') ||
        container.className.includes('ring')
      ).toBe(true)
    })

    it('no animation when inactive', () => {
      render(
        <BossBattle level="simple" isActive={false}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(container.className.includes('animate-pulse')).toBe(false)
    })
  })

  describe('boss label/indicator', () => {
    it('shows BOSS label when active', () => {
      render(
        <BossBattle level="simple" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      // Should have visual BOSS indicator
      const container = screen.getByTestId('boss-battle')
      const hasIndicator =
        container.textContent.includes('BOSS') ||
        container.textContent.includes('Boss') ||
        container.querySelector('[data-testid="boss-indicator"]')
      expect(hasIndicator).toBeTruthy()
    })

    it('shows boss icon from config', () => {
      render(
        <BossBattle level="deep" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      // Should display level-specific icon
      const container = screen.getByTestId('boss-battle')
      expect(container.textContent.length).toBeGreaterThan(0)
    })

    it('hides boss label when inactive', () => {
      render(
        <BossBattle level="simple" isActive={false}>
          <div>Content</div>
        </BossBattle>
      )

      // Should not prominently display BOSS when inactive
      const container = screen.getByTestId('boss-battle')
      expect(container.textContent).not.toContain('BOSS')
    })
  })

  describe('accessibility', () => {
    it('has appropriate role', () => {
      render(
        <BossBattle level="simple" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(
        container.getAttribute('role') === 'region' ||
        container.getAttribute('role') === 'article' ||
        !container.getAttribute('role') // implicit role OK
      ).toBe(true)
    })

    it('has aria-label when active', () => {
      render(
        <BossBattle level="deep" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      const hasLabel =
        container.getAttribute('aria-label') ||
        container.getAttribute('aria-labelledby')
      expect(hasLabel).toBeTruthy()
    })

    it('does not trap focus', () => {
      render(
        <BossBattle level="simple" isActive={true}>
          <button data-testid="btn">Click me</button>
        </BossBattle>
      )

      const button = screen.getByTestId('btn')
      expect(button).toBeInTheDocument()
      // Button should be focusable
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('children remain interactive', () => {
      const onClick = vi.fn()
      render(
        <BossBattle level="standard" isActive={true}>
          <button data-testid="interactive" onClick={onClick}>
            Click
          </button>
        </BossBattle>
      )

      const button = screen.getByTestId('interactive')
      button.click()
      expect(onClick).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('handles undefined level gracefully', () => {
      expect(() =>
        render(
          <BossBattle level={undefined} isActive={true}>
            <div>Content</div>
          </BossBattle>
        )
      ).not.toThrow()

      expect(screen.getByTestId('boss-battle')).toBeInTheDocument()
    })

    it('handles null level gracefully', () => {
      expect(() =>
        render(
          <BossBattle level={null} isActive={true}>
            <div>Content</div>
          </BossBattle>
        )
      ).not.toThrow()

      expect(screen.getByTestId('boss-battle')).toBeInTheDocument()
    })

    it('handles invalid level string gracefully', () => {
      expect(() =>
        render(
          <BossBattle level="extreme" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )
      ).not.toThrow()

      expect(screen.getByTestId('boss-battle')).toBeInTheDocument()
    })

    it('handles undefined isActive (defaults to false)', () => {
      expect(() =>
        render(
          <BossBattle level="simple">
            <div>Content</div>
          </BossBattle>
        )
      ).not.toThrow()

      // Should render without active styling
      expect(screen.getByTestId('boss-battle')).toBeInTheDocument()
    })

    it('handles no children gracefully', () => {
      expect(() =>
        render(<BossBattle level="simple" isActive={true} />)
      ).not.toThrow()
    })

    it('handles null children gracefully', () => {
      expect(() =>
        render(
          <BossBattle level="simple" isActive={true}>
            {null}
          </BossBattle>
        )
      ).not.toThrow()
    })
  })

  describe('styling consistency', () => {
    it('has rounded corners', () => {
      render(
        <BossBattle level="simple" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(container.className.includes('rounded')).toBe(true)
    })

    it('has padding around children', () => {
      render(
        <BossBattle level="standard" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(
        container.className.includes('p-') ||
        container.className.includes('px-') ||
        container.className.includes('py-')
      ).toBe(true)
    })

    it('maintains transition classes for smooth state changes', () => {
      render(
        <BossBattle level="deep" isActive={true}>
          <div>Content</div>
        </BossBattle>
      )

      const container = screen.getByTestId('boss-battle')
      expect(
        container.className.includes('transition') ||
        container.className.includes('duration')
      ).toBe(true)
    })
  })

  describe('prop types validation', () => {
    it('accepts valid level values', () => {
      const validLevels = ['simple', 'standard', 'deep']

      validLevels.forEach((level) => {
        expect(() =>
          render(
            <BossBattle level={level} isActive={true}>
              <div>Content</div>
            </BossBattle>
          )
        ).not.toThrow()
        cleanup()
      })
    })

    it('accepts boolean for isActive', () => {
      expect(() =>
        render(
          <BossBattle level="simple" isActive={true}>
            <div>Content</div>
          </BossBattle>
        )
      ).not.toThrow()

      cleanup()

      expect(() =>
        render(
          <BossBattle level="simple" isActive={false}>
            <div>Content</div>
          </BossBattle>
        )
      ).not.toThrow()
    })

    it('accepts React nodes as children', () => {
      expect(() =>
        render(
          <BossBattle level="simple" isActive={true}>
            <span>Text</span>
            <div>
              <p>Nested</p>
            </div>
          </BossBattle>
        )
      ).not.toThrow()
    })
  })
})
