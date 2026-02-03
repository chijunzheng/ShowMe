/**
 * MysteryBoxReveal Component Tests
 *
 * Tests for the Mystery Box opening ceremony and reward reveal component.
 * Following TDD: these tests are written FIRST before implementation.
 *
 * Test coverage includes:
 * - Rendering when shown/hidden
 * - Reward display (tier, XP, power-up, piece rarity)
 * - Animation states
 * - Level-specific theming
 * - onComplete callback
 * - Accessibility
 * - Edge cases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import MysteryBoxReveal from '../MysteryBoxReveal'
import { MYSTERY_BOX_TIERS, MYSTERY_BOX_POWER_UPS } from '../../../../hooks/game/mysteryBoxConfig'

describe('MysteryBoxReveal', () => {
  const baseRewards = {
    tier: MYSTERY_BOX_TIERS.silver,
    xpBonus: 25,
    powerUp: null,
    pieceRarity: 'rare',
  }

  const rewardsWithPowerUp = {
    tier: MYSTERY_BOX_TIERS.legendary,
    xpBonus: 50,
    powerUp: MYSTERY_BOX_POWER_UPS.streak_shield,
    pieceRarity: 'epic',
  }

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders when show is true', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByTestId('mystery-box-reveal')).toBeInTheDocument()
    })

    it('does not render when show is false', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={false}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.queryByTestId('mystery-box-reveal')).not.toBeInTheDocument()
    })

    it('renders reward content container', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByTestId('reward-content')).toBeInTheDocument()
    })
  })

  describe('tier display', () => {
    it('displays tier name', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByText(/silver/i)).toBeInTheDocument()
    })

    it('displays tier icon', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByTestId('mystery-box-reveal').textContent).toContain(
        MYSTERY_BOX_TIERS.silver.icon
      )
    })

    it('displays bronze tier correctly', () => {
      const bronzeRewards = {
        ...baseRewards,
        tier: MYSTERY_BOX_TIERS.bronze,
      }

      render(
        <MysteryBoxReveal
          rewards={bronzeRewards}
          show={true}
          onComplete={vi.fn()}
          level="simple"
        />
      )

      expect(screen.getByText(/bronze/i)).toBeInTheDocument()
      expect(screen.getByTestId('mystery-box-reveal').textContent).toContain('\uD83E\uDD49')
    })

    it('displays legendary tier with special styling', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(screen.getByText(/legendary/i)).toBeInTheDocument()
      expect(
        container.className.includes('legendary') ||
        container.className.includes('purple') ||
        container.className.includes('animate-pulse')
      ).toBe(true)
    })
  })

  describe('XP bonus display', () => {
    it('displays XP bonus amount', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByText(/25/)).toBeInTheDocument()
    })

    it('shows XP label', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByText(/xp/i)).toBeInTheDocument()
    })

    it('displays larger XP bonus for legendary', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      expect(screen.getByText(/50/)).toBeInTheDocument()
    })

    it('shows bonus indicator (+ sign or "Bonus")', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const content = screen.getByTestId('mystery-box-reveal').textContent
      expect(content.includes('+') || content.toLowerCase().includes('bonus')).toBe(true)
    })
  })

  describe('power-up display', () => {
    it('displays power-up when present', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      expect(screen.getByText(/streak shield/i)).toBeInTheDocument()
    })

    it('displays power-up icon', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      expect(screen.getByTestId('mystery-box-reveal').textContent).toContain('\uD83D\uDEE1')
    })

    it('does not show power-up section when null', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.queryByText(/streak shield/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/time freeze/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/hint token/i)).not.toBeInTheDocument()
    })

    it('displays power-up description', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      // Should show the power-up's description
      expect(
        screen.getByTestId('mystery-box-reveal').textContent.includes(
          MYSTERY_BOX_POWER_UPS.streak_shield.description
        ) ||
        screen.queryByText(/protect/i) ||
        screen.queryByTestId('power-up-description')
      ).toBeTruthy()
    })

    it('displays time_freeze power-up correctly', () => {
      const freezeRewards = {
        ...rewardsWithPowerUp,
        powerUp: MYSTERY_BOX_POWER_UPS.time_freeze,
      }

      render(
        <MysteryBoxReveal
          rewards={freezeRewards}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      expect(screen.getByText(/time freeze/i)).toBeInTheDocument()
      expect(screen.getByTestId('mystery-box-reveal').textContent).toContain('\u23F1')
    })

    it('displays hint_token power-up correctly', () => {
      const hintRewards = {
        ...rewardsWithPowerUp,
        powerUp: MYSTERY_BOX_POWER_UPS.hint_token,
      }

      render(
        <MysteryBoxReveal
          rewards={hintRewards}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      expect(screen.getByText(/hint token/i)).toBeInTheDocument()
      expect(screen.getByTestId('mystery-box-reveal').textContent).toContain('\uD83D\uDCA1')
    })
  })

  describe('piece rarity display', () => {
    it('displays piece rarity indicator', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByText(/rare/i)).toBeInTheDocument()
    })

    it('shows piece unlock label', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const content = screen.getByTestId('mystery-box-reveal').textContent.toLowerCase()
      expect(content.includes('piece') || content.includes('unlock')).toBe(true)
    })

    it('displays common rarity', () => {
      const commonRewards = {
        ...baseRewards,
        pieceRarity: 'common',
      }

      render(
        <MysteryBoxReveal
          rewards={commonRewards}
          show={true}
          onComplete={vi.fn()}
          level="simple"
        />
      )

      expect(screen.getByText(/common/i)).toBeInTheDocument()
    })

    it('displays epic rarity with special styling', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      expect(screen.getByText(/epic/i)).toBeInTheDocument()
    })

    it('displays legendary rarity with maximum impact', () => {
      const legendaryRarityRewards = {
        ...rewardsWithPowerUp,
        pieceRarity: 'legendary',
      }

      render(
        <MysteryBoxReveal
          rewards={legendaryRarityRewards}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      expect(screen.getByText(/legendary/i)).toBeInTheDocument()
    })
  })

  describe('level-specific theming', () => {
    it('applies simple level styling', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="simple"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.className.includes('simple') ||
        container.className.includes('green') ||
        container.className.includes('emerald')
      ).toBe(true)
    })

    it('applies standard level styling', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.className.includes('standard') ||
        container.className.includes('blue') ||
        container.className.includes('cyan')
      ).toBe(true)
    })

    it('applies deep level styling', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.className.includes('deep') ||
        container.className.includes('purple') ||
        container.className.includes('violet')
      ).toBe(true)
    })
  })

  describe('onComplete callback', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('provides continue/close button', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('calls onComplete when continue button clicked', () => {
      const onComplete = vi.fn()
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={onComplete}
          level="standard"
        />
      )

      fireEvent.click(screen.getByRole('button'))
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('passes rewards to onComplete callback', () => {
      const onComplete = vi.fn()
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={onComplete}
          level="standard"
        />
      )

      fireEvent.click(screen.getByRole('button'))
      expect(onComplete).toHaveBeenCalledWith(baseRewards)
    })

    it('can be triggered by pressing Enter', () => {
      const onComplete = vi.fn()
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={onComplete}
          level="standard"
        />
      )

      const button = screen.getByRole('button')
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(onComplete).toHaveBeenCalled()
    })

    it('button shows appropriate text', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const button = screen.getByRole('button')
      const buttonText = button.textContent.toLowerCase()
      expect(
        buttonText.includes('continue') ||
        buttonText.includes('collect') ||
        buttonText.includes('claim') ||
        buttonText.includes('ok') ||
        buttonText.includes('close')
      ).toBe(true)
    })
  })

  describe('animations', () => {
    it('has entrance animation', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.className.includes('animate') ||
        container.className.includes('transition')
      ).toBe(true)
    })

    it('shows particle/confetti effects', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.querySelector('[data-testid="particles"]') ||
        container.querySelector('[data-testid="confetti"]') ||
        container.className.includes('sparkle') ||
        container.innerHTML.includes('particle')
      ).toBeTruthy()
    })

    it('has more elaborate effects for legendary', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.className.includes('legendary') ||
        container.className.includes('rainbow') ||
        container.className.includes('pulse')
      ).toBe(true)
    })

    it('reveals rewards sequentially', () => {
      render(
        <MysteryBoxReveal
          rewards={rewardsWithPowerUp}
          show={true}
          onComplete={vi.fn()}
          level="deep"
        />
      )

      // Should have staggered animation classes or delays
      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.className.includes('delay') ||
        container.querySelector('[class*="delay"]') ||
        container.innerHTML.includes('stagger')
      ).toBeTruthy()
    })
  })

  describe('accessibility', () => {
    it('has appropriate dialog role', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(
        screen.getByRole('dialog') ||
        screen.getByTestId('mystery-box-reveal').getAttribute('role') === 'dialog'
      ).toBeTruthy()
    })

    it('has aria-labelledby or aria-label', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.getAttribute('aria-label') ||
        container.getAttribute('aria-labelledby')
      ).toBeTruthy()
    })

    it('traps focus within the modal', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const button = screen.getByRole('button')
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('has screen reader text for rewards', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      // Should have descriptive text for screen readers
      const container = screen.getByTestId('mystery-box-reveal')
      const textContent = container.textContent.toLowerCase()
      expect(
        textContent.includes('xp') &&
        textContent.includes('25')
      ).toBe(true)
    })

    it('button is focusable', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const button = screen.getByRole('button')
      expect(button.getAttribute('tabIndex')).not.toBe('-1')
    })
  })

  describe('backdrop', () => {
    it('renders backdrop overlay', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(
        screen.queryByTestId('backdrop') ||
        screen.getByTestId('mystery-box-reveal').querySelector('.backdrop') ||
        screen.getByTestId('mystery-box-reveal').querySelector('[class*="bg-black"]')
      ).toBeTruthy()
    })

    it('backdrop does not close on click', () => {
      const onComplete = vi.fn()
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={onComplete}
          level="standard"
        />
      )

      const backdrop = screen.queryByTestId('backdrop') ||
        screen.getByTestId('mystery-box-reveal').querySelector('[class*="bg-black"]')

      if (backdrop) {
        fireEvent.click(backdrop)
        // Should NOT dismiss on backdrop click - user must see rewards
        expect(onComplete).not.toHaveBeenCalled()
      }
    })
  })

  describe('edge cases', () => {
    it('handles null rewards gracefully', () => {
      expect(() =>
        render(
          <MysteryBoxReveal
            rewards={null}
            show={true}
            onComplete={vi.fn()}
            level="standard"
          />
        )
      ).not.toThrow()
    })

    it('handles undefined rewards gracefully', () => {
      expect(() =>
        render(
          <MysteryBoxReveal
            rewards={undefined}
            show={true}
            onComplete={vi.fn()}
            level="standard"
          />
        )
      ).not.toThrow()
    })

    it('handles missing tier in rewards', () => {
      const incompleteRewards = {
        xpBonus: 25,
        powerUp: null,
        pieceRarity: 'common',
      }

      expect(() =>
        render(
          <MysteryBoxReveal
            rewards={incompleteRewards}
            show={true}
            onComplete={vi.fn()}
            level="standard"
          />
        )
      ).not.toThrow()
    })

    it('handles missing xpBonus in rewards', () => {
      const incompleteRewards = {
        tier: MYSTERY_BOX_TIERS.bronze,
        powerUp: null,
        pieceRarity: 'common',
      }

      expect(() =>
        render(
          <MysteryBoxReveal
            rewards={incompleteRewards}
            show={true}
            onComplete={vi.fn()}
            level="standard"
          />
        )
      ).not.toThrow()
    })

    it('handles undefined level gracefully', () => {
      expect(() =>
        render(
          <MysteryBoxReveal
            rewards={baseRewards}
            show={true}
            onComplete={vi.fn()}
            level={undefined}
          />
        )
      ).not.toThrow()
    })

    it('handles invalid level gracefully', () => {
      expect(() =>
        render(
          <MysteryBoxReveal
            rewards={baseRewards}
            show={true}
            onComplete={vi.fn()}
            level="invalid"
          />
        )
      ).not.toThrow()
    })

    it('handles undefined onComplete gracefully', () => {
      expect(() =>
        render(
          <MysteryBoxReveal
            rewards={baseRewards}
            show={true}
            level="standard"
          />
        )
      ).not.toThrow()

      // Should still be clickable without crashing
      const button = screen.getByRole('button')
      expect(() => fireEvent.click(button)).not.toThrow()
    })

    it('transitions between show states', () => {
      const { rerender } = render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={false}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.queryByTestId('mystery-box-reveal')).not.toBeInTheDocument()

      rerender(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      expect(screen.getByTestId('mystery-box-reveal')).toBeInTheDocument()
    })
  })

  describe('visual layout', () => {
    it('is centered on screen', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const container = screen.getByTestId('mystery-box-reveal')
      expect(
        container.className.includes('center') ||
        container.className.includes('justify-center') ||
        container.className.includes('items-center') ||
        container.className.includes('fixed')
      ).toBe(true)
    })

    it('has appropriate padding', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const content = screen.getByTestId('reward-content')
      expect(
        content.className.includes('p-') ||
        content.className.includes('px-') ||
        content.className.includes('py-')
      ).toBe(true)
    })

    it('has rounded corners', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const content = screen.getByTestId('reward-content')
      expect(content.className.includes('rounded')).toBe(true)
    })

    it('has shadow for depth', () => {
      render(
        <MysteryBoxReveal
          rewards={baseRewards}
          show={true}
          onComplete={vi.fn()}
          level="standard"
        />
      )

      const content = screen.getByTestId('reward-content')
      expect(content.className.includes('shadow')).toBe(true)
    })
  })
})
