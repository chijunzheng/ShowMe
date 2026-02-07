/**
 * Page Object for ShowMe Slideshow View
 * Encapsulates selectors and actions for viewing generated educational content
 */
export class SlideshowPage {
  constructor(page) {
    this.page = page

    // Slideshow content
    this.slideImage = page.locator('[data-testid="slide-image"], img').first()
    this.slideSubtitle = page.locator('[data-testid="subtitle"], [class*="subtitle"]')
    this.progressDots = page.locator('[data-testid="progress-dots"], [class*="progress"]')

    // Controls
    this.playPauseButton = page.locator('[data-testid="play-pause"], button[aria-label*="play"], button[aria-label*="pause"]')
    this.prevButton = page.locator('[data-testid="prev-slide"], button[aria-label*="previous"]')
    this.nextButton = page.locator('[data-testid="next-slide"], button[aria-label*="next"]')
    this.raiseHandButton = page.locator('[data-testid="raise-hand"], button:has-text("Question")')

    // Follow-up drawer
    this.followUpDrawer = page.locator('[data-testid="follow-up-drawer"]')
    this.followUpInput = page.locator('[data-testid="follow-up-input"]')
  }

  async waitForSlideshow() {
    // Wait for either slide image or subtitle to appear
    await this.page.waitForSelector('[data-testid="slide-image"], img, [class*="subtitle"]', {
      timeout: 60000, // Generation can take up to 30s
    })
  }

  async navigateToNextSlide() {
    await this.nextButton.click()
  }

  async navigateToPrevSlide() {
    await this.prevButton.click()
  }

  async togglePlayPause() {
    await this.playPauseButton.click()
  }

  async getCurrentSlideIndex() {
    const activeDot = this.page.locator('[data-testid="progress-dot"].active, [class*="active"]')
    const index = await activeDot.getAttribute('data-index')
    return parseInt(index || '0', 10)
  }
}
