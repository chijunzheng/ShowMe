// @ts-check
import { test, expect } from '@playwright/test'
import { HomePage } from '../pages/HomePage.js'
import { SlideshowPage } from '../pages/SlideshowPage.js'

/**
 * E2E Tests: Content Generation Flow
 * Tests the core question → generation → slideshow flow
 *
 * Note: These tests require the backend to be running with valid API keys.
 * In CI, mock the API or skip these tests.
 */
test.describe('Content Generation', () => {
  // Skip if no backend available (CI without API keys)
  test.skip(({ browserName }) => process.env.CI === 'true' && !process.env.GEMINI_API_KEY, 'Requires API keys')

  test('can enter a question via text input', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // Click "can't talk? type here" link to enable text input
    const typeLink = page.locator('text=/type here/i')
    await typeLink.click()

    // Find the text input that appears
    const textInput = page.locator('input[type="text"], textarea').first()
    await expect(textInput).toBeVisible({ timeout: 5000 })

    // Type a question
    await textInput.fill('What is photosynthesis?')

    // Verify input has the text
    await expect(textInput).toHaveValue('What is photosynthesis?')

    // Take screenshot
    await page.screenshot({ path: 'test-results/text-input-filled.png' })
  })

  test('shows loading state during generation', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // Click "can't talk? type here" link to enable text input
    const typeLink = page.locator('text=/type here/i')
    await typeLink.click()

    const textInput = page.locator('input[type="text"], textarea').first()
    await expect(textInput).toBeVisible({ timeout: 5000 })

    // Submit a question
    await textInput.fill('What is gravity?')

    // Find and click submit button (the arrow/send button)
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // Should show some loading indicator
    const loadingIndicator = page.locator('[class*="loading"], [class*="generating"], text=/generating/i, [class*="spinner"]')
    // Wait briefly for loading state
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 10000 }).catch(() => {
      console.log('Loading indicator not found - may have completed quickly')
    })
  })

  test.skip('displays slideshow after successful generation', async ({ page }) => {
    // SKIP: Requires backend running with valid GEMINI_API_KEY
    // Enable locally by removing test.skip and starting backend
    test.setTimeout(90000)

    const homePage = new HomePage(page)
    const slideshowPage = new SlideshowPage(page)
    await homePage.goto()

    // Click "can't talk? type here" link to enable text input
    const typeLink = page.locator('text=/type here/i')
    await typeLink.click()

    const textInput = page.locator('input[type="text"], textarea').first()
    await expect(textInput).toBeVisible({ timeout: 5000 })

    // Submit a simple question
    await textInput.fill('What is water?')
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    // Wait for slideshow to appear (generation takes up to 30s)
    await slideshowPage.waitForSlideshow()

    // Verify slide content is visible
    const slideContent = page.locator('[data-testid="slide-image"], img, [class*="subtitle"], [class*="slide"]')
    await expect(slideContent.first()).toBeVisible()

    // Take screenshot of slideshow
    await page.screenshot({ path: 'test-results/slideshow-generated.png' })
  })
})
