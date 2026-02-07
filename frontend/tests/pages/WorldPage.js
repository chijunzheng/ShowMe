/**
 * Page Object for ShowMe Living World View
 * Encapsulates selectors and actions for the Living World feature
 */
export class WorldPage {
  constructor(page) {
    this.page = page

    // Core Living World elements
    this.worldView = page.locator('[data-testid="living-world-view"]')
    this.worldSkeleton = page.locator('[data-testid="living-world-skeleton"]')
    this.createWorldButton = page.locator('button:has-text("Create Your World")')
    this.worldImage = page.locator('[data-testid="living-world-view"] img, [data-testid="panorama-image"]')

    // Connection lines (SVG elements)
    this.connectionSvg = page.locator('[data-testid="living-world-view"] svg[aria-hidden="true"]')
    this.connectionPaths = page.locator('[data-testid="living-world-view"] svg[aria-hidden="true"] path')
    this.discoveredConnections = page.locator('[data-testid="living-world-view"] svg path[stroke="#818CF8"]')
    this.undiscoveredConnections = page.locator('[data-testid="living-world-view"] svg path[stroke="#94A3B8"]')

    // Discovery Popover
    this.discoveryPopover = page.locator('[data-testid="discovery-popover"]')
    this.discoveryCloseButton = page.locator('[data-testid="discovery-popover"] button[aria-label="Close suggestions"]')
    this.discoverySuggestions = page.locator('[data-testid="discovery-popover"] button[aria-label*="Learn about"]')

    // Hotspots
    this.hotspots = page.locator('[data-testid="hotspot"], [class*="hotspot"]')

    // World Info Panel
    this.worldInfoPanel = page.locator('[data-testid="world-info-panel"]')

    // Minimap
    this.minimap = page.locator('[data-testid="minimap"]')

    // Navigation tabs
    this.worldTab = page.locator('[data-testid="tab-world"], button:has-text("World")')
    this.learnTab = page.locator('[data-testid="tab-learn"], button:has-text("Learn")')
  }

  async goto() {
    await this.page.goto('/')
    await this.page.waitForLoadState('networkidle')
    // Navigate to World tab
    if (await this.worldTab.isVisible()) {
      await this.worldTab.click()
      await this.page.waitForTimeout(500)
    }
  }

  async gotoWorld() {
    await this.goto()
  }

  async waitForWorldToLoad() {
    // Wait for either the world view or skeleton to appear
    await this.worldView.waitFor({ state: 'visible', timeout: 10000 })
    // Wait for skeleton to disappear if present
    await this.worldSkeleton.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {
      // Skeleton might not be present if world is already loaded
    })
  }

  async createWorld() {
    if (await this.createWorldButton.isVisible()) {
      await this.createWorldButton.click()
      await this.waitForWorldToLoad()
    }
  }

  async getConnectionCount() {
    return await this.connectionPaths.count()
  }

  async getDiscoveredConnectionCount() {
    // Discovered connections have solid stroke (no dash array)
    const paths = await this.connectionPaths.all()
    let count = 0
    for (const path of paths) {
      const dashArray = await path.getAttribute('stroke-dasharray')
      if (dashArray === 'none' || !dashArray) {
        count++
      }
    }
    return count
  }

  async getUndiscoveredConnectionCount() {
    // Undiscovered connections have dashed stroke
    const paths = await this.connectionPaths.all()
    let count = 0
    for (const path of paths) {
      const dashArray = await path.getAttribute('stroke-dasharray')
      if (dashArray && dashArray !== 'none') {
        count++
      }
    }
    return count
  }

  async getConnectionStrokeWidth() {
    const firstPath = this.connectionPaths.first()
    if (await firstPath.isVisible().catch(() => false)) {
      return await firstPath.getAttribute('stroke-width')
    }
    return null
  }

  async openDiscoveryPopover(x = 200, y = 200) {
    // Simulate a tap/click at specific coordinates to trigger discovery
    await this.worldView.click({ position: { x, y } })
    await this.page.waitForTimeout(300)
  }

  async isDiscoveryPopoverOpen() {
    return await this.discoveryPopover.isVisible()
  }

  async closeDiscoveryPopoverByButton() {
    await this.discoveryCloseButton.click()
    await this.page.waitForTimeout(200)
  }

  async closeDiscoveryPopoverByClickOutside() {
    // Click outside the popover
    await this.page.mouse.click(10, 10)
    await this.page.waitForTimeout(200)
  }

  async closeDiscoveryPopoverByEscape() {
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  async getSuggestionCount() {
    return await this.discoverySuggestions.count()
  }

  async clickSuggestion(index = 0) {
    await this.discoverySuggestions.nth(index).click()
  }

  async zoomIn() {
    // Simulate pinch zoom or scroll to zoom in
    await this.worldView.evaluate((el) => {
      const event = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true,
      })
      el.dispatchEvent(event)
    })
    await this.page.waitForTimeout(300)
  }

  async zoomOut() {
    await this.worldView.evaluate((el) => {
      const event = new WheelEvent('wheel', {
        deltaY: 100,
        ctrlKey: true,
        bubbles: true,
      })
      el.dispatchEvent(event)
    })
    await this.page.waitForTimeout(300)
  }

  async getHotspotCount() {
    return await this.hotspots.count()
  }
}
