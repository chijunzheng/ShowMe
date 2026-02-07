/**
 * Page Object for ShowMe Home Screen
 * Encapsulates selectors and actions for the main learning interface
 */
export class HomePage {
  constructor(page) {
    this.page = page

    // Core UI elements
    this.headline = page.locator('h1')
    this.micButton = page.locator('[data-testid="mic-button"], button:has-text("Start")')
    this.textInput = page.locator('input[type="text"], textarea').first()
    this.submitButton = page.locator('button[type="submit"], button:has-text("Ask")')
    this.surpriseMeButton = page.locator('button:has-text("Surprise")')

    // Navigation tabs
    this.learnTab = page.locator('[data-testid="tab-learn"], button:has-text("Learn")')
    this.worldTab = page.locator('[data-testid="tab-world"], button:has-text("World")')
    this.quizTab = page.locator('[data-testid="tab-quiz"], button:has-text("Quiz")')

    // Topic sidebar
    this.sidebar = page.locator('[data-testid="topic-sidebar"], aside')
    this.topicCards = page.locator('[data-testid="topic-card"]')
    this.newTopicButton = page.locator('button:has-text("New Topic")')
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
  }

  async submitQuestion(question) {
    // Look for text fallback input or trigger it
    const textInputVisible = await this.textInput.isVisible().catch(() => false)
    if (!textInputVisible) {
      // Try clicking "Type instead" link if available
      const typeInstead = this.page.locator('text=Type instead, text=type')
      if (await typeInstead.isVisible().catch(() => false)) {
        await typeInstead.click()
      }
    }

    await this.textInput.fill(question)
    await this.submitButton.click()
  }

  async navigateToTab(tabName) {
    const tab = this.page.locator(`button:has-text("${tabName}")`)
    await tab.click()
  }

  async getTopicCount() {
    return await this.topicCards.count()
  }
}
