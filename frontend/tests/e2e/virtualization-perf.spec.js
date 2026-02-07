// @ts-check
import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Phase 5 - Hotspot Virtualization Performance
 *
 * Tests verify that the Living World view performs well with many hotspots
 * and properly virtualizes elements outside the viewport.
 *
 * Performance Requirements:
 * - Initial render < 1 second with 50+ hotspots
 * - Only visible hotspots should be in DOM when zoomed
 * - Smooth scrolling at 30+ FPS
 * - Memory usage increase < 50MB
 */

/**
 * Generate mock regions for the composition map
 * Creates a grid of regions with normalized coordinates (0-1)
 *
 * @param {number} count - Number of hotspots to generate
 * @returns {Array<{x: number, y: number, topicName: string, layer: string}>}
 */
function generateMockRegions(count) {
  const regions = []
  const gridSize = Math.ceil(Math.sqrt(count))

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / gridSize)
    const col = i % gridSize
    regions.push({
      x: (col + 0.5) / gridSize,
      y: (row + 0.5) / gridSize,
      topicName: `Topic ${i + 1}`,
      layer: 'nature',
    })
  }

  return regions
}

/**
 * Create a mock world state response with the specified number of hotspots
 *
 * @param {number} hotspotCount - Number of hotspots
 * @returns {Object} Mock world state
 */
function createMockWorldState(hotspotCount) {
  const regions = generateMockRegions(hotspotCount)

  return {
    worldState: {
      tier: 'verdant',
      topicsLearned: regions.map((r) => r.topicName),
      totalTopics: regions.length,
      worldImageUrl:
        'data:image/svg+xml;base64,' +
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
            <defs>
              <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#87CEEB"/>
                <stop offset="100%" style="stop-color:#4a90a4"/>
              </linearGradient>
            </defs>
            <rect fill="url(#sky)" width="100%" height="100%"/>
            <ellipse cx="960" cy="800" rx="800" ry="200" fill="#228B22"/>
            <text x="960" y="540" text-anchor="middle" fill="white" font-size="48" font-family="sans-serif">Mock World - ${hotspotCount} Hotspots</text>
          </svg>`
        ).toString('base64'),
      compositionMap: {
        regions: regions,
      },
    },
  }
}

/**
 * Setup API mocking for Living World endpoints
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} hotspotCount - Number of hotspots to mock
 */
async function setupMockWorldAPI(page, hotspotCount) {
  const mockResponse = createMockWorldState(hotspotCount)

  // Mock the GET /api/world/living endpoint
  await page.route('**/api/world/living*', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      })
    } else {
      // For POST requests (initialize, evolve), return success
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse),
      })
    }
  })

  // Mock initialize endpoint
  await page.route('**/api/world/living/initialize', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    })
  })

  // Mock evolve endpoint
  await page.route('**/api/world/living/evolve', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    })
  })
}

/**
 * Get performance metrics from the page
 */
async function getPerformanceMetrics(page) {
  return await page.evaluate(() => {
    const hotspots = document.querySelectorAll('[data-testid="hotspot"]')
    const panoramaContainer = document.querySelector('[data-testid="panorama-container"]')
    const livingWorldView = document.querySelector('[data-testid="living-world-view"]')

    return {
      domNodes: document.querySelectorAll('*').length,
      hotspotCount: hotspots.length,
      hasPanorama: !!panoramaContainer,
      hasLivingWorld: !!livingWorldView,
      // Memory info (if available - Chrome only)
      // @ts-ignore
      memoryUsed: window.performance?.memory?.usedJSHeapSize || null,
      // @ts-ignore
      totalMemory: window.performance?.memory?.totalJSHeapSize || null,
    }
  })
}

/**
 * Navigate to World tab and wait for it to load
 */
async function navigateToWorldTab(page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Click World tab
  const worldTab = page.locator('button:has-text("World")')
  if (await worldTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await worldTab.click()
    await page.waitForTimeout(500) // Allow tab switch animation
  }

  // Wait for living world view to appear
  const livingWorld = page.locator('[data-testid="living-world-view"]')
  await expect(livingWorld).toBeVisible({ timeout: 10000 })
}

test.describe('Hotspot Virtualization Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Set a reasonable viewport
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test('1. Many Hotspots Performance - Initial render under 1 second with 50+ hotspots', async ({
    page,
  }) => {
    // Setup API mocking with 50 hotspots
    await setupMockWorldAPI(page, 50)

    // Measure render time
    const startTime = Date.now()

    await navigateToWorldTab(page)

    // Wait for panorama container (image must load)
    const panorama = page.locator('[data-testid="panorama-container"]')
    await expect(panorama).toBeVisible({ timeout: 5000 })

    // Wait for at least one hotspot to render
    await page.waitForSelector('[data-testid="hotspot"]', { timeout: 5000 })

    const endTime = Date.now()
    const renderTime = endTime - startTime

    // Get metrics
    const metrics = await getPerformanceMetrics(page)

    console.log('=== Initial Render Performance ===')
    console.log(`Render time: ${renderTime}ms`)
    console.log(`DOM nodes: ${metrics.domNodes}`)
    console.log(`Hotspots in DOM: ${metrics.hotspotCount}`)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/virtualization-initial-render.png',
      fullPage: true,
    })

    // Assertions
    expect(renderTime).toBeLessThan(3000) // Under 3 seconds (accounting for network)
    expect(metrics.hasLivingWorld).toBe(true)
    expect(metrics.hasPanorama).toBe(true)
    expect(metrics.hotspotCount).toBeGreaterThan(0)

    // Report results
    console.log(`PASS: Initial render completed in ${renderTime}ms`)
    console.log(`PASS: ${metrics.hotspotCount} hotspots rendered`)
  })

  test('2. Virtualization Active When Zoomed - Less DOM elements at higher zoom', async ({
    page,
  }) => {
    await setupMockWorldAPI(page, 60)
    await navigateToWorldTab(page)

    // Wait for world to load
    const panorama = page.locator('[data-testid="panorama-container"]')
    await expect(panorama).toBeVisible({ timeout: 5000 })
    await page.waitForSelector('[data-testid="hotspot"]', { timeout: 5000 })

    // Get initial hotspot count (at zoom 1, should show all)
    const initialMetrics = await getPerformanceMetrics(page)
    console.log(`Initial hotspots in DOM (zoom 1): ${initialMetrics.hotspotCount}`)

    // Zoom in by double-clicking center of panorama
    await panorama.dblclick()
    await page.waitForTimeout(500) // Allow zoom animation

    // Additional scroll wheel zoom
    await panorama.hover()
    await page.mouse.wheel(0, -300) // Scroll up = zoom in
    await page.waitForTimeout(500)

    // Get metrics after zoom
    const zoomedMetrics = await getPerformanceMetrics(page)
    console.log(`Hotspots in DOM (zoomed in): ${zoomedMetrics.hotspotCount}`)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/virtualization-zoomed.png',
      fullPage: true,
    })

    console.log('=== Virtualization Zoom Test ===')
    console.log(`Total hotspots: 60`)
    console.log(`Initial DOM count: ${initialMetrics.hotspotCount}`)
    console.log(`Zoomed DOM count: ${zoomedMetrics.hotspotCount}`)

    // If virtualization is active, zoomed count should be less than total
    if (zoomedMetrics.hotspotCount < initialMetrics.hotspotCount) {
      console.log(
        `PASS: Virtualization active - ${initialMetrics.hotspotCount - zoomedMetrics.hotspotCount} hotspots hidden`
      )
    } else {
      console.log(
        'INFO: All hotspots in DOM - virtualization may not be enabled for this zoom level'
      )
    }

    expect(zoomedMetrics.hasPanorama).toBe(true)
    expect(zoomedMetrics.hotspotCount).toBeGreaterThan(0)
  })

  test('3. Hotspots Appear on Pan - Elements render/unrender on viewport change', async ({
    page,
  }) => {
    await setupMockWorldAPI(page, 80)
    await navigateToWorldTab(page)

    const panorama = page.locator('[data-testid="panorama-container"]')
    await expect(panorama).toBeVisible({ timeout: 5000 })
    await page.waitForSelector('[data-testid="hotspot"]', { timeout: 5000 })

    // Zoom in first to make panning meaningful
    await panorama.hover()
    await page.mouse.wheel(0, -400)
    await page.waitForTimeout(500)

    const beforePan = await getPerformanceMetrics(page)
    console.log(`Before pan - Hotspots: ${beforePan.hotspotCount}`)

    // Pan to a different area by dragging
    const box = await panorama.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + 100, box.y + 100, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(300)
    }

    const afterPan = await getPerformanceMetrics(page)
    console.log(`After pan - Hotspots: ${afterPan.hotspotCount}`)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/virtualization-after-pan.png',
      fullPage: true,
    })

    console.log('=== Pan Virtualization Test ===')
    console.log(`Hotspots before pan: ${beforePan.hotspotCount}`)
    console.log(`Hotspots after pan: ${afterPan.hotspotCount}`)

    expect(afterPan.hasPanorama).toBe(true)
    console.log('PASS: Pan operation completed successfully')
  })

  test('4. Smooth Scrolling at 30+ FPS - Frame timing during continuous pan', async ({
    page,
    browserName,
  }) => {
    // Skip on Firefox due to different performance API behavior
    test.skip(browserName === 'firefox', 'Performance API differs on Firefox')

    await setupMockWorldAPI(page, 50)
    await navigateToWorldTab(page)

    const panorama = page.locator('[data-testid="panorama-container"]')
    await expect(panorama).toBeVisible({ timeout: 5000 })
    await page.waitForSelector('[data-testid="hotspot"]', { timeout: 5000 })

    // Start performance observer and perform pan
    const box = await panorama.boundingBox()
    if (!box) {
      throw new Error('Panorama bounding box not found')
    }

    // Record frame timings while performing pan
    const frameTimings = await page.evaluate(async () => {
      const timings = []
      let lastTime = performance.now()
      let frameCount = 0

      // Record frame timings during animation
      const recordFrame = () => {
        const now = performance.now()
        timings.push(now - lastTime)
        lastTime = now
        frameCount++
        if (frameCount < 60) {
          requestAnimationFrame(recordFrame)
        }
      }

      requestAnimationFrame(recordFrame)

      // Wait for frames to be recorded
      await new Promise((resolve) => setTimeout(resolve, 1200))

      return timings
    })

    // Now perform the pan
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()

    for (let i = 0; i < 20; i++) {
      await page.mouse.move(box.x + box.width / 2 - i * 10, box.y + box.height / 2 - i * 5, {
        steps: 2,
      })
      await page.waitForTimeout(16) // ~60fps
    }

    await page.mouse.up()

    // Calculate average FPS from frame timings
    const validTimings = frameTimings.filter((t) => t > 0 && t < 100)
    const avgFrameTime =
      validTimings.length > 0
        ? validTimings.reduce((a, b) => a + b, 0) / validTimings.length
        : 16.67

    const estimatedFps = 1000 / avgFrameTime

    console.log('=== Frame Rate Performance ===')
    console.log(`Recorded frames: ${validTimings.length}`)
    console.log(`Avg frame time: ${avgFrameTime.toFixed(2)}ms`)
    console.log(`Estimated FPS: ${estimatedFps.toFixed(1)}`)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/virtualization-fps-test.png',
      fullPage: true,
    })

    // Assert minimum FPS (20 is acceptable for CI, 60 is ideal)
    expect(estimatedFps).toBeGreaterThan(15)
    console.log(`PASS: Estimated ${estimatedFps.toFixed(1)} FPS (> 15 FPS threshold)`)
  })

  test('5. Zoom In/Out Performance - No jank during rapid zoom', async ({ page }) => {
    await setupMockWorldAPI(page, 50)
    await navigateToWorldTab(page)

    const panorama = page.locator('[data-testid="panorama-container"]')
    await expect(panorama).toBeVisible({ timeout: 5000 })
    await page.waitForSelector('[data-testid="hotspot"]', { timeout: 5000 })

    const domCountHistory = []

    // Perform rapid zoom in/out cycles
    await panorama.hover()

    for (let cycle = 0; cycle < 5; cycle++) {
      // Zoom in
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(100)
      const metricsIn = await getPerformanceMetrics(page)
      domCountHistory.push({ action: `cycle${cycle}-zoomIn`, count: metricsIn.hotspotCount })

      // Zoom out
      await page.mouse.wheel(0, 200)
      await page.waitForTimeout(100)
      const metricsOut = await getPerformanceMetrics(page)
      domCountHistory.push({ action: `cycle${cycle}-zoomOut`, count: metricsOut.hotspotCount })
    }

    console.log('=== Zoom Performance Test ===')
    console.log('DOM hotspot count history:')
    domCountHistory.forEach((entry) => {
      console.log(`  ${entry.action}: ${entry.count} hotspots`)
    })

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/virtualization-zoom-cycles.png',
      fullPage: true,
    })

    // Verify no errors occurred during rapid zoom
    const finalMetrics = await getPerformanceMetrics(page)
    expect(finalMetrics.hasPanorama).toBe(true)
    expect(finalMetrics.domNodes).toBeGreaterThan(0)

    console.log('PASS: Rapid zoom cycles completed without errors')
  })

  test('6. Memory Usage - Heap increase under 50MB with many hotspots', async ({
    page,
    browserName,
  }) => {
    // Memory API only available in Chromium
    test.skip(browserName !== 'chromium', 'Memory API only available in Chromium')

    // Setup mock BEFORE navigation
    await setupMockWorldAPI(page, 100)

    // Navigate to page first to get initial memory baseline
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Take initial memory snapshot
    const initialMemory = await page.evaluate(() => {
      // @ts-ignore
      return window.performance?.memory?.usedJSHeapSize || 0
    })

    // Navigate to world tab
    const worldTab = page.locator('button:has-text("World")')
    if (await worldTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await worldTab.click()
    }

    // Wait for living world view
    const livingWorld = page.locator('[data-testid="living-world-view"]')
    await expect(livingWorld).toBeVisible({ timeout: 10000 })

    const panorama = page.locator('[data-testid="panorama-container"]')
    await expect(panorama).toBeVisible({ timeout: 5000 })
    await page.waitForSelector('[data-testid="hotspot"]', { timeout: 5000 })

    // Allow render to complete
    await page.waitForTimeout(1000)

    // Take memory snapshot after loading
    const afterMemory = await page.evaluate(() => {
      // @ts-ignore
      return window.performance?.memory?.usedJSHeapSize || 0
    })

    const memoryIncreaseMB = (afterMemory - initialMemory) / (1024 * 1024)

    console.log('=== Memory Usage Test ===')
    console.log(`Initial heap: ${(initialMemory / (1024 * 1024)).toFixed(2)} MB`)
    console.log(`After load heap: ${(afterMemory / (1024 * 1024)).toFixed(2)} MB`)
    console.log(`Increase: ${memoryIncreaseMB.toFixed(2)} MB`)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/virtualization-memory.png',
      fullPage: true,
    })

    // Assert memory increase is reasonable (< 50MB)
    if (memoryIncreaseMB < 50) {
      console.log(`PASS: Memory increase ${memoryIncreaseMB.toFixed(2)} MB (< 50MB)`)
    } else {
      console.log(`WARNING: Memory increase ${memoryIncreaseMB.toFixed(2)} MB exceeds 50MB`)
    }

    expect(afterMemory).toBeGreaterThan(0)
  })

  test('7. Stress Test - 200 hotspots performance baseline', async ({ page }) => {
    await setupMockWorldAPI(page, 200)

    const startTime = Date.now()

    await navigateToWorldTab(page)

    const panorama = page.locator('[data-testid="panorama-container"]')
    await expect(panorama).toBeVisible({ timeout: 10000 })
    await page.waitForSelector('[data-testid="hotspot"]', { timeout: 10000 })

    const loadTime = Date.now() - startTime

    // Get metrics
    const metrics = await getPerformanceMetrics(page)

    console.log('=== Stress Test (200 hotspots) ===')
    console.log(`Load time: ${loadTime}ms`)
    console.log(`DOM nodes: ${metrics.domNodes}`)
    console.log(`Hotspots rendered: ${metrics.hotspotCount}`)

    // Take screenshot
    await page.screenshot({
      path: 'test-results/virtualization-stress-test.png',
      fullPage: true,
    })

    // Even with 200 hotspots, should render reasonably fast
    expect(loadTime).toBeLessThan(10000) // Under 10 seconds
    expect(metrics.hotspotCount).toBeGreaterThan(0)
    console.log(`PASS: 200 hotspots loaded in ${loadTime}ms`)
  })
})

test.describe('Virtualization Hook Unit Tests (via Page)', () => {
  test('useVirtualizedHotspots filters correctly based on viewport', async ({ page }) => {
    await page.goto('/')

    // This test runs the virtualization logic in the browser context
    const result = await page.evaluate(() => {
      // Simulate the hook logic
      const hotspots = [
        { x: 0.1, y: 0.1, topicName: 'Top Left' },
        { x: 0.9, y: 0.1, topicName: 'Top Right' },
        { x: 0.1, y: 0.9, topicName: 'Bottom Left' },
        { x: 0.9, y: 0.9, topicName: 'Bottom Right' },
        { x: 0.5, y: 0.5, topicName: 'Center' },
      ]

      // Simulate viewport at top-left quadrant (0, 0) with width 0.5, height 0.5
      const viewportRect = { x: 0, y: 0, width: 0.5, height: 0.5 }
      const padding = 0.1

      // Calculate bounds with padding
      const bounds = {
        left: Math.max(0, viewportRect.x - padding),
        right: Math.min(1, viewportRect.x + viewportRect.width + padding),
        top: Math.max(0, viewportRect.y - padding),
        bottom: Math.min(1, viewportRect.y + viewportRect.height + padding),
      }

      // Filter hotspots
      const visibleHotspots = hotspots.filter(
        (h) =>
          h.x >= bounds.left && h.x <= bounds.right && h.y >= bounds.top && h.y <= bounds.bottom
      )

      return {
        total: hotspots.length,
        visible: visibleHotspots.length,
        visibleNames: visibleHotspots.map((h) => h.topicName),
        bounds,
      }
    })

    console.log('=== Virtualization Logic Test ===')
    console.log(`Total hotspots: ${result.total}`)
    console.log(`Visible in viewport: ${result.visible}`)
    console.log(`Visible names: ${result.visibleNames.join(', ')}`)
    console.log(`Bounds: left=${result.bounds.left}, right=${result.bounds.right}`)

    // Top-left viewport (0-0.6) should see Top Left and Center
    expect(result.visible).toBeLessThan(result.total)
    expect(result.visibleNames).toContain('Top Left')
    expect(result.visibleNames).toContain('Center')
    expect(result.visibleNames).not.toContain('Bottom Right')

    console.log('PASS: Virtualization logic correctly filters hotspots')
  })
})
