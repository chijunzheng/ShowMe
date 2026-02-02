// @ts-check
import { test, expect } from '@playwright/test'

/**
 * E2E Tests: TrophyBadge Component
 *
 * Tests the TrophyBadge component used for gamification achievements.
 * Access the test page via: /?test=trophy-badge
 */

const TEST_PAGE_URL = '/?test=trophy-badge'

test.describe('TrophyBadge Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(TEST_PAGE_URL)
    await page.waitForLoadState('networkidle')
    // Verify test page loaded
    await expect(page.locator('[data-testid="trophy-badge-test-page"]')).toBeVisible()
  })

  test.describe('Badge Rendering', () => {
    test('renders all badge types with correct styling', async ({ page }) => {
      // Explorer badge - emerald gradient
      const explorerBadge = page.locator('[data-testid="badge-container-explorer"]')
      await expect(explorerBadge).toBeVisible()
      const explorerInner = explorerBadge.locator('.rounded-full')
      await expect(explorerInner).toHaveClass(/from-emerald/)

      // Master badge - purple gradient
      const masterBadge = page.locator('[data-testid="badge-container-master"]')
      await expect(masterBadge).toBeVisible()
      const masterInner = masterBadge.locator('.rounded-full')
      await expect(masterInner).toHaveClass(/from-purple/)

      // Streak badge - orange gradient
      const streakBadge = page.locator('[data-testid="badge-container-streak"]')
      await expect(streakBadge).toBeVisible()
      const streakInner = streakBadge.locator('.rounded-full')
      await expect(streakInner).toHaveClass(/from-orange/)

      // Milestone badge - blue gradient
      const milestoneBadge = page.locator('[data-testid="badge-container-milestone"]')
      await expect(milestoneBadge).toBeVisible()
      const milestoneInner = milestoneBadge.locator('.rounded-full')
      await expect(milestoneInner).toHaveClass(/from-blue/)

      // Custom badge - pink gradient
      const customBadge = page.locator('[data-testid="badge-container-custom"]')
      await expect(customBadge).toBeVisible()
      const customInner = customBadge.locator('.rounded-full')
      await expect(customInner).toHaveClass(/from-pink/)

      // Take screenshot for visual verification
      await page.screenshot({ path: 'test-results/trophy-badge-types.png' })
    })

    test('renders correct icons/emojis for each badge type', async ({ page }) => {
      // Default emojis based on badge type
      const explorerBadge = page.locator('[data-testid="badge-container-explorer"]')
      await expect(explorerBadge.locator('span[role="img"]')).toContainText('🌍')

      const masterBadge = page.locator('[data-testid="badge-container-master"]')
      await expect(masterBadge.locator('span[role="img"]')).toContainText('🎓')

      const streakBadge = page.locator('[data-testid="badge-container-streak"]')
      await expect(streakBadge.locator('span[role="img"]')).toContainText('🔥')

      const milestoneBadge = page.locator('[data-testid="badge-container-milestone"]')
      await expect(milestoneBadge.locator('span[role="img"]')).toContainText('🏆')

      // Custom icon
      const customBadge = page.locator('[data-testid="badge-container-custom"]')
      await expect(customBadge.locator('span[role="img"]')).toContainText('🎉')
    })

    test('displays title when showTitle=true', async ({ page }) => {
      // Explorer badge should show title
      const explorerWrapper = page.locator('[data-testid="badge-wrapper-explorer"]')
      await expect(explorerWrapper.locator('span.truncate')).toContainText('Explorer')

      // Master badge should show title
      const masterWrapper = page.locator('[data-testid="badge-wrapper-master"]')
      await expect(masterWrapper.locator('span.truncate')).toContainText('Master')
    })
  })

  test.describe('Size Variants', () => {
    test('renders small badge with correct dimensions (32px)', async ({ page }) => {
      const smallBadge = page.locator('[data-testid="badge-container-size-sm"] .rounded-full').first()
      await expect(smallBadge).toBeVisible()

      // Check that it has the w-8 h-8 classes (32px = 2rem = 8 * 4px)
      await expect(smallBadge).toHaveClass(/w-8/)
      await expect(smallBadge).toHaveClass(/h-8/)

      // Verify actual computed dimensions
      const box = await smallBadge.boundingBox()
      expect(box?.width).toBeCloseTo(32, 0)
      expect(box?.height).toBeCloseTo(32, 0)
    })

    test('renders medium badge with correct dimensions (48px)', async ({ page }) => {
      const mediumBadge = page.locator('[data-testid="badge-container-size-md"] .rounded-full').first()
      await expect(mediumBadge).toBeVisible()

      // Check that it has the w-12 h-12 classes (48px = 3rem = 12 * 4px)
      await expect(mediumBadge).toHaveClass(/w-12/)
      await expect(mediumBadge).toHaveClass(/h-12/)

      // Verify actual computed dimensions
      const box = await mediumBadge.boundingBox()
      expect(box?.width).toBeCloseTo(48, 0)
      expect(box?.height).toBeCloseTo(48, 0)
    })

    test('renders large badge with correct dimensions (64px)', async ({ page }) => {
      const largeBadge = page.locator('[data-testid="badge-container-size-lg"] .rounded-full').first()
      await expect(largeBadge).toBeVisible()

      // Check that it has the w-16 h-16 classes (64px = 4rem = 16 * 4px)
      await expect(largeBadge).toHaveClass(/w-16/)
      await expect(largeBadge).toHaveClass(/h-16/)

      // Verify actual computed dimensions
      const box = await largeBadge.boundingBox()
      expect(box?.width).toBeCloseTo(64, 0)
      expect(box?.height).toBeCloseTo(64, 0)
    })

    test('all size variants are visually distinct', async ({ page }) => {
      await page.locator('[data-testid="section-size-variants"]').scrollIntoViewIfNeeded()
      await page.screenshot({ path: 'test-results/trophy-badge-sizes.png' })

      // Get bounding boxes to verify relative sizes
      const smallBox = await page.locator('[data-testid="badge-container-size-sm"] .rounded-full').first().boundingBox()
      const mediumBox = await page.locator('[data-testid="badge-container-size-md"] .rounded-full').first().boundingBox()
      const largeBox = await page.locator('[data-testid="badge-container-size-lg"] .rounded-full').first().boundingBox()

      // Verify size ordering: sm < md < lg
      expect(smallBox?.width).toBeLessThan(mediumBox?.width || 0)
      expect(mediumBox?.width).toBeLessThan(largeBox?.width || 0)
    })
  })

  test.describe('Level Rings', () => {
    test('renders bronze ring for level 1', async ({ page }) => {
      const bronzeBadge = page.locator('[data-testid="badge-container-level-bronze"] .rounded-full').first()
      await expect(bronzeBadge).toBeVisible()
      // Bronze uses ring-amber-600
      await expect(bronzeBadge).toHaveClass(/ring-amber-600/)
    })

    test('renders silver ring for level 2', async ({ page }) => {
      const silverBadge = page.locator('[data-testid="badge-container-level-silver"] .rounded-full').first()
      await expect(silverBadge).toBeVisible()
      // Silver uses ring-slate-300
      await expect(silverBadge).toHaveClass(/ring-slate-300/)
    })

    test('renders gold ring for level 3', async ({ page }) => {
      const goldBadge = page.locator('[data-testid="badge-container-level-gold"] .rounded-full').first()
      await expect(goldBadge).toBeVisible()
      // Gold uses ring-yellow-400
      await expect(goldBadge).toHaveClass(/ring-yellow-400/)
    })

    test('all level rings are visually distinct', async ({ page }) => {
      await page.locator('[data-testid="section-level-rings"]').scrollIntoViewIfNeeded()
      await page.screenshot({ path: 'test-results/trophy-badge-levels.png' })
    })
  })

  test.describe('Animated Badge', () => {
    test('applies shine animation when animated=true', async ({ page }) => {
      const animatedBadge = page.locator('[data-testid="badge-container-animated"] .rounded-full').first()
      await expect(animatedBadge).toBeVisible()

      // Should have the animate-badge-shine class
      await expect(animatedBadge).toHaveClass(/animate-badge-shine/)
    })

    test('does not apply shine animation when animated=false', async ({ page }) => {
      const notAnimatedBadge = page.locator('[data-testid="badge-container-not-animated"] .rounded-full').first()
      await expect(notAnimatedBadge).toBeVisible()

      // Should NOT have the animate-badge-shine class
      await expect(notAnimatedBadge).not.toHaveClass(/animate-badge-shine/)
    })

    test('animated badge has visible shine effect over time', async ({ page }) => {
      await page.locator('[data-testid="section-animated"]').scrollIntoViewIfNeeded()

      // Take multiple screenshots to capture animation
      await page.screenshot({ path: 'test-results/trophy-badge-animated-1.png' })
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/trophy-badge-animated-2.png' })
    })
  })

  test.describe('New Badge Celebration', () => {
    test('applies celebration animation when isNew=true', async ({ page }) => {
      const newBadge = page.locator('[data-testid="badge-container-new-badge"] .rounded-full').first()
      await expect(newBadge).toBeVisible()

      // Should have the animate-badge-celebrate class
      await expect(newBadge).toHaveClass(/animate-badge-celebrate/)
    })

    test('displays sparkle particles for new badge', async ({ page }) => {
      await page.locator('[data-testid="section-celebration"]').scrollIntoViewIfNeeded()

      // Sparkles should be visible initially
      const sparkles = page.locator('[data-testid="badge-container-new-badge"] .animate-trophy-sparkle')
      const sparkleCount = await sparkles.count()

      // Should have multiple sparkle elements (the component creates 6)
      expect(sparkleCount).toBeGreaterThan(0)

      // Take screenshot to capture sparkles
      await page.screenshot({ path: 'test-results/trophy-badge-celebration.png' })
    })

    test('fires onCelebrationComplete after animation ends', async ({ page }) => {
      // Initially celebration should be "Playing"
      const celebrationStatus = page.locator('[data-testid="celebration-status-new-badge"]')
      await expect(celebrationStatus).toContainText('Playing')

      // Wait for celebration to complete (sparkles last ~2 seconds)
      await page.waitForTimeout(2500)

      // Now it should show "Complete"
      await expect(celebrationStatus).toContainText('Complete')
    })
  })

  test.describe('Progress Ring (Mastery)', () => {
    test('renders progress ring when progress prop is provided', async ({ page }) => {
      await page.locator('[data-testid="section-progress"]').scrollIntoViewIfNeeded()

      // 25% progress badge should have a progress ring SVG
      const progressBadge25 = page.locator('[data-testid="badge-container-progress-25"]')
      await expect(progressBadge25).toBeVisible()

      // Look for the SVG progress ring
      const svg = progressBadge25.locator('svg')
      await expect(svg).toBeVisible()
    })

    test('progress ring shows correct percentage filled', async ({ page }) => {
      // 75% progress badge
      const progressBadge75 = page.locator('[data-testid="badge-container-progress-75"]')
      const svg = progressBadge75.locator('svg')
      await expect(svg).toBeVisible()

      // Get the progress circle (second circle in SVG)
      const progressCircle = svg.locator('circle').nth(1)
      await expect(progressCircle).toBeVisible()

      // Verify it has stroke-dashoffset (indicates progress)
      const dashOffset = await progressCircle.getAttribute('stroke-dashoffset')
      expect(dashOffset).not.toBe('0')
    })

    test('100% progress shows complete ring', async ({ page }) => {
      const progressBadge100 = page.locator('[data-testid="badge-container-progress-100"]')
      const svg = progressBadge100.locator('svg')
      await expect(svg).toBeVisible()

      // For 100%, the stroke-dashoffset should be 0 or very close to it
      const progressCircle = svg.locator('circle').nth(1)
      const dashOffset = await progressCircle.getAttribute('stroke-dashoffset')

      // At 100%, offset should be approximately 0
      expect(parseFloat(dashOffset || '0')).toBeLessThan(1)
    })

    test('takes screenshot of all progress variants', async ({ page }) => {
      await page.locator('[data-testid="section-progress"]').scrollIntoViewIfNeeded()
      await page.screenshot({ path: 'test-results/trophy-badge-progress.png' })
    })
  })

  test.describe('Click Interaction', () => {
    test('onClick handler is called when badge is clicked', async ({ page }) => {
      const clickableBadge = page.locator('[data-testid="badge-container-clickable"]')
      const clickCount = page.locator('[data-testid="click-count-clickable"]')

      // Initial count should be 0
      await expect(clickCount).toContainText('Clicks: 0')

      // Click the badge
      await clickableBadge.click()

      // Count should be 1
      await expect(clickCount).toContainText('Clicks: 1')

      // Click again
      await clickableBadge.click()

      // Count should be 2
      await expect(clickCount).toContainText('Clicks: 2')
    })

    test('badge shows hover state on pointer hover', async ({ page }) => {
      const clickableBadge = page.locator('[data-testid="badge-container-clickable"] .rounded-full').first()

      // Badge should have hover:scale-110 class
      await expect(clickableBadge).toHaveClass(/hover:scale-110/)

      // Hover over the badge
      await clickableBadge.hover()

      // Take screenshot to show hover state
      await page.screenshot({ path: 'test-results/trophy-badge-hover.png' })
    })

    test('badge shows cursor pointer when clickable', async ({ page }) => {
      const clickableWrapper = page.locator('[data-testid="badge-container-clickable"] > div').first()

      // Should have cursor-pointer class
      await expect(clickableWrapper).toHaveClass(/cursor-pointer/)
    })
  })

  test.describe('Keyboard Interaction', () => {
    test('badge is focusable via Tab key', async ({ page }) => {
      // Tab to the keyboard-focus badge section
      await page.locator('[data-testid="section-keyboard"]').scrollIntoViewIfNeeded()

      // Focus the badge via keyboard
      const keyboardBadge = page.locator('[data-testid="badge-container-keyboard-focus"] [role="button"]')
      await keyboardBadge.focus()

      // Verify it's focused
      await expect(keyboardBadge).toBeFocused()

      // Take screenshot showing focus state
      await page.screenshot({ path: 'test-results/trophy-badge-focused.png' })
    })

    test('Enter key activates the badge', async ({ page }) => {
      const clickCount = page.locator('[data-testid="click-count-keyboard-focus"]')

      // Initial count should be 0
      await expect(clickCount).toContainText('Clicks: 0')

      // Focus and press Enter
      const keyboardBadge = page.locator('[data-testid="badge-container-keyboard-focus"] [role="button"]')
      await keyboardBadge.focus()
      await page.keyboard.press('Enter')

      // Count should be 1
      await expect(clickCount).toContainText('Clicks: 1')
    })

    test('Space key activates the badge', async ({ page }) => {
      const clickCount = page.locator('[data-testid="click-count-keyboard-focus"]')

      // Initial count should be 0
      await expect(clickCount).toContainText('Clicks: 0')

      // Focus and press Space
      const keyboardBadge = page.locator('[data-testid="badge-container-keyboard-focus"] [role="button"]')
      await keyboardBadge.focus()
      await page.keyboard.press('Space')

      // Count should be 1
      await expect(clickCount).toContainText('Clicks: 1')
    })

    test('badge has correct aria-label for accessibility', async ({ page }) => {
      const keyboardBadge = page.locator('[data-testid="badge-container-keyboard-focus"] [role="button"]')
      const ariaLabel = await keyboardBadge.getAttribute('aria-label')

      // Should have a descriptive aria-label with title and level
      // Format: "Title, level N" or "type badge, level N"
      expect(ariaLabel).toContain('Tab to Focus')
      expect(ariaLabel).toContain('level 3')
    })
  })

  test.describe('Visual Regression', () => {
    test('full test page screenshot for visual regression', async ({ page }) => {
      // Take full page screenshot
      await page.screenshot({
        path: 'test-results/trophy-badge-full-page.png',
        fullPage: true,
      })
    })
  })
})
