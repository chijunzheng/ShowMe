/**
 * Test setup file for Vitest
 * Configures jest-dom matchers for DOM testing
 */

import '@testing-library/jest-dom'

/**
 * Mock ResizeObserver for jsdom environment
 * Required by react-zoom-pan-pinch library
 */
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback
  }

  observe() {
    // Mock implementation - could call callback with mock entries if needed
  }

  unobserve() {
    // Mock implementation
  }

  disconnect() {
    // Mock implementation
  }
}

global.ResizeObserver = ResizeObserverMock
