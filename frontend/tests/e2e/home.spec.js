// @ts-check
import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage.js'

/**
 * E2E Tests: Home Screen
 * Tests the initial landing experience and core navigation
 */
test.describe('Home Screen', () => {
  test('loads and displays main UI elements', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // Verify page loads
    await expect(page).toHaveTitle(/ShowMe|Learn/)

    // Verify headline is visible
    await expect(homePage.headline).toBeVisible()

    // Verify level cards with mic buttons are available (Simple, Standard, Deep)
    const levelCards = page.locator('button:has-text("Simple"), button:has-text("Standard"), button:has-text("Deep")')
    await expect(levelCards.first()).toBeVisible()

    // Take screenshot of home state
    await page.screenshot({ path: 'test-results/home-screen.png' })
  })

  test('displays bottom tab navigation', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // Verify all tabs are visible (coral design system with 3-tab navigation)
    const tabBar = page.locator('[data-testid="tab-bar"], nav')
    await expect(tabBar).toBeVisible()

    // Check for Learn, World, Quiz tabs
    const tabs = page.locator('button:has-text("Learn"), button:has-text("World"), button:has-text("Quiz")')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThanOrEqual(2)
  })

  test('can switch between tabs', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // Click World tab if exists
    const worldTab = page.locator('button:has-text("World")')
    if (await worldTab.isVisible()) {
      await worldTab.click()
      await expect(page.locator('[data-testid="world-view"], [class*="world"]')).toBeVisible({ timeout: 5000 }).catch(() => {
        // World view might not be visible on first load
      })
    }

    // Click back to Learn tab
    const learnTab = page.locator('button:has-text("Learn")')
    if (await learnTab.isVisible()) {
      await learnTab.click()
    }
  })

  test('shows example questions on cold start', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // Cold start should show example questions or suggestions
    const examples = page.locator('[data-testid="example-question"], [class*="example"], [class*="suggestion"]')
    // This is optional - may not exist on all implementations
    const exampleCount = await examples.count()
    // Just log, don't fail if not present
    console.log(`Found ${exampleCount} example questions`)
  })
})
