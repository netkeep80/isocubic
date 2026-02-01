/**
 * E2E tests for responsive layout transitions
 * Tests window system behavior across desktop, tablet, and mobile devices
 *
 * Phase 11, TASK 78: Comprehensive testing and optimization
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  useWindowManager,
  type WindowDefinition,
  type WindowState,
} from '../composables/useWindowManager'
import { clampPosition } from '../composables/useResponsiveLayout'
import { calculateLayout, type LayoutOptions } from '../lib/window-layout-manager'

/** Helper to create test window definitions */
function createDefinitions(count: number): WindowDefinition[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `win-${i}`,
    title: `Window ${i}`,
    icon: '🪟',
    defaultX: 50 + i * 30,
    defaultY: 50 + i * 30,
    defaultWidth: 400,
    defaultHeight: 300,
    minWidth: 200,
    minHeight: 150,
  }))
}

/** Helper to create test window states */
function createWindowStates(count: number): WindowState[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `win-${i}`,
    title: `Window ${i}`,
    icon: '🪟',
    x: 50 + i * 30,
    y: 50 + i * 30,
    width: 400,
    height: 300,
    minWidth: 200,
    minHeight: 150,
    isOpen: true,
    isMinimized: false,
    zIndex: 100 + i,
  }))
}

describe('E2E: Responsive — Window Position Clamping', () => {
  it('should clamp window within desktop viewport', () => {
    const result = clampPosition(2000, 1500, 400, 300, 1920, 1080)
    expect(result.x).toBeLessThanOrEqual(1920 - 400)
    expect(result.y).toBeLessThanOrEqual(1080 - 300)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })

  it('should clamp window within tablet viewport', () => {
    const result = clampPosition(800, 600, 400, 300, 1024, 768, 8)
    expect(result.x).toBeLessThanOrEqual(1024 - 400 - 8)
    expect(result.y).toBeLessThanOrEqual(768 - 300 - 8)
    expect(result.x).toBeGreaterThanOrEqual(8)
    expect(result.y).toBeGreaterThanOrEqual(8)
  })

  it('should clamp window within small mobile viewport', () => {
    const result = clampPosition(100, 100, 375, 600, 375, 667)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })

  it('should handle window larger than viewport', () => {
    const result = clampPosition(0, 0, 2000, 1500, 1024, 768)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })

  it('should handle negative coordinates', () => {
    const result = clampPosition(-100, -50, 400, 300, 1920, 1080)
    expect(result.x).toBeGreaterThanOrEqual(0)
    expect(result.y).toBeGreaterThanOrEqual(0)
  })
})

describe('E2E: Responsive — Layout Strategies for Different Screen Sizes', () => {
  const desktopOptions: LayoutOptions = {
    workspaceWidth: 1920,
    workspaceHeight: 1080,
    gap: 8,
  }

  const tabletOptions: LayoutOptions = {
    workspaceWidth: 1024,
    workspaceHeight: 768,
    gap: 8,
  }

  const smallOptions: LayoutOptions = {
    workspaceWidth: 375,
    workspaceHeight: 667,
    gap: 4,
  }

  it('should tile 4 windows on desktop', () => {
    const windows = createWindowStates(4)
    const result = calculateLayout('tile', windows, desktopOptions)
    expect(result).toHaveLength(4)
    // All windows should fit within workspace
    for (const win of result) {
      expect(win.x).toBeGreaterThanOrEqual(0)
      expect(win.y).toBeGreaterThanOrEqual(0)
      expect(win.x + win.width).toBeLessThanOrEqual(desktopOptions.workspaceWidth + 50) // allow small overflow
    }
  })

  it('should cascade 4 windows on desktop', () => {
    const windows = createWindowStates(4)
    const result = calculateLayout('cascade', windows, desktopOptions)
    expect(result).toHaveLength(4)
    // Each subsequent window should be offset
    for (let i = 1; i < result.length; i++) {
      expect(result[i].x).toBeGreaterThanOrEqual(result[i - 1].x)
      expect(result[i].y).toBeGreaterThanOrEqual(result[i - 1].y)
    }
  })

  it('should tile windows on tablet', () => {
    const windows = createWindowStates(3)
    const result = calculateLayout('tile', windows, tabletOptions)
    expect(result).toHaveLength(3)
    for (const win of result) {
      expect(win.width).toBeGreaterThanOrEqual(200) // minWidth
      expect(win.height).toBeGreaterThanOrEqual(150) // minHeight
    }
  })

  it('should handle horizontal layout on tablet', () => {
    const windows = createWindowStates(2)
    const result = calculateLayout('horizontal', windows, tabletOptions)
    expect(result).toHaveLength(2)
    // Second window should be to the right of first
    expect(result[1].x).toBeGreaterThan(result[0].x)
  })

  it('should handle vertical layout', () => {
    const windows = createWindowStates(2)
    const result = calculateLayout('vertical', windows, desktopOptions)
    expect(result).toHaveLength(2)
    // Second window should be below first
    expect(result[1].y).toBeGreaterThan(result[0].y)
  })

  it('should return empty array for no windows', () => {
    const result = calculateLayout('tile', [], desktopOptions)
    expect(result).toHaveLength(0)
  })

  it('should respect minWidth and minHeight on small screens', () => {
    const windows = createWindowStates(4)
    const result = calculateLayout('tile', windows, smallOptions)
    for (const win of result) {
      expect(win.width).toBeGreaterThanOrEqual(200) // minWidth from state
      expect(win.height).toBeGreaterThanOrEqual(150) // minHeight from state
    }
  })
})

describe('E2E: Responsive — Window Manager Integration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should initialize windows from definitions', () => {
    const defs = createDefinitions(5)
    const { windows, visibleWindows } = useWindowManager(defs)
    expect(windows.value.size).toBe(5)
    expect(visibleWindows.value).toHaveLength(5)
  })

  it('should minimize and restore windows', () => {
    const defs = createDefinitions(3)
    const { minimizeWindow, restoreWindow, visibleWindows, minimizedWindows } =
      useWindowManager(defs)

    minimizeWindow('win-0')
    expect(visibleWindows.value).toHaveLength(2)
    expect(minimizedWindows.value).toHaveLength(1)

    restoreWindow('win-0')
    expect(visibleWindows.value).toHaveLength(3)
    expect(minimizedWindows.value).toHaveLength(0)
  })

  it('should close and reopen windows', () => {
    const defs = createDefinitions(3)
    const { closeWindow, openWindow, visibleWindows, closedWindows } = useWindowManager(defs)

    closeWindow('win-1')
    expect(visibleWindows.value).toHaveLength(2)
    expect(closedWindows.value).toHaveLength(1)

    openWindow('win-1')
    expect(visibleWindows.value).toHaveLength(3)
    expect(closedWindows.value).toHaveLength(0)
  })

  it('should toggle window open/close state', () => {
    const defs = createDefinitions(2)
    const { toggleWindow, visibleWindows, closedWindows } = useWindowManager(defs)

    toggleWindow('win-0')
    expect(closedWindows.value).toHaveLength(1)

    toggleWindow('win-0')
    expect(visibleWindows.value).toHaveLength(2)
  })

  it('should bring window to front on focus', () => {
    const defs = createDefinitions(3)
    const { bringToFront, getWindow } = useWindowManager(defs)

    const initialZIndex = getWindow('win-0')!.zIndex
    bringToFront('win-0')
    expect(getWindow('win-0')!.zIndex).toBeGreaterThan(initialZIndex)
  })

  it('should move window to new position', () => {
    const defs = createDefinitions(1)
    const { moveWindow, getWindow } = useWindowManager(defs)

    moveWindow('win-0', 500, 300)
    expect(getWindow('win-0')!.x).toBe(500)
    expect(getWindow('win-0')!.y).toBe(300)
  })

  it('should clamp window position to non-negative', () => {
    const defs = createDefinitions(1)
    const { moveWindow, getWindow } = useWindowManager(defs)

    moveWindow('win-0', -100, -50)
    expect(getWindow('win-0')!.x).toBe(0)
    expect(getWindow('win-0')!.y).toBe(0)
  })

  it('should resize window with minimum constraints', () => {
    const defs = createDefinitions(1)
    const { resizeWindow, getWindow } = useWindowManager(defs)

    resizeWindow('win-0', 100, 80) // below minWidth/minHeight
    expect(getWindow('win-0')!.width).toBe(200) // minWidth
    expect(getWindow('win-0')!.height).toBe(150) // minHeight
  })

  it('should reset layout to defaults', () => {
    const defs = createDefinitions(2)
    const { moveWindow, resetLayout, getWindow } = useWindowManager(defs)

    moveWindow('win-0', 999, 888)
    resetLayout()
    expect(getWindow('win-0')!.x).toBe(50) // defaultX
    expect(getWindow('win-0')!.y).toBe(50) // defaultY
  })
})
