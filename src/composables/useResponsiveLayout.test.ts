/**
 * Unit tests for useResponsiveLayout composable
 * Tests device-dependent constraints, clampPosition, and computed properties
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { clampPosition, useResponsiveLayout } from './useResponsiveLayout'

describe('clampPosition', () => {
  it('should keep position unchanged when within bounds', () => {
    const result = clampPosition(100, 100, 400, 300, 1920, 1080)
    expect(result).toEqual({ x: 100, y: 100 })
  })

  it('should clamp x to 0 when negative', () => {
    const result = clampPosition(-50, 100, 400, 300, 1920, 1080)
    expect(result).toEqual({ x: 0, y: 100 })
  })

  it('should clamp y to 0 when negative', () => {
    const result = clampPosition(100, -30, 400, 300, 1920, 1080)
    expect(result).toEqual({ x: 100, y: 0 })
  })

  it('should clamp x when window overflows right edge', () => {
    const result = clampPosition(1800, 100, 400, 300, 1920, 1080)
    // maxX = 1920 - 400 = 1520
    expect(result.x).toBe(1520)
  })

  it('should clamp y when window overflows bottom edge', () => {
    const result = clampPosition(100, 900, 400, 300, 1920, 1080)
    // maxY = 1080 - 300 = 780
    expect(result.y).toBe(780)
  })

  it('should respect padding parameter', () => {
    const result = clampPosition(0, 0, 400, 300, 1920, 1080, 20)
    expect(result).toEqual({ x: 20, y: 20 })
  })

  it('should clamp x with padding when overflowing', () => {
    const result = clampPosition(1800, 100, 400, 300, 1920, 1080, 20)
    // maxX = 1920 - 400 - 20 = 1500
    expect(result.x).toBe(1500)
  })

  it('should handle window larger than viewport gracefully', () => {
    const result = clampPosition(100, 100, 2000, 2000, 1920, 1080)
    // maxX = max(0, 1920-2000) = 0, maxY = max(0, 1080-2000) = 0
    expect(result).toEqual({ x: 0, y: 0 })
  })
})

describe('useResponsiveLayout — desktop defaults', () => {
  beforeEach(() => {
    // Default jsdom window width is typically 1024, set it explicitly
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true })
  })

  it('should return desktop device type for wide viewport', () => {
    const layout = useResponsiveLayout()
    expect(layout.deviceType.value).toBe('desktop')
    expect(layout.isDesktop.value).toBe(true)
    expect(layout.isMobile.value).toBe(false)
    expect(layout.isTablet.value).toBe(false)
  })

  it('should provide desktop constraints', () => {
    const layout = useResponsiveLayout()
    expect(layout.constraints.value.allowDrag).toBe(true)
    expect(layout.constraints.value.allowResize).toBe(true)
    expect(layout.constraints.value.fullScreenWindows).toBe(false)
    expect(layout.constraints.value.maxVisibleWindows).toBe(20)
    expect(layout.constraints.value.minTouchTarget).toBe(22)
  })

  it('should return correct profile key', () => {
    const layout = useResponsiveLayout()
    expect(layout.profileKey.value).toBe('layout-desktop')
  })

  it('should allow drag on desktop', () => {
    const layout = useResponsiveLayout()
    expect(layout.allowDrag.value).toBe(true)
  })

  it('should allow resize on desktop', () => {
    const layout = useResponsiveLayout()
    expect(layout.allowResize.value).toBe(true)
  })

  it('should not use full screen windows on desktop', () => {
    const layout = useResponsiveLayout()
    expect(layout.useFullScreenWindows.value).toBe(false)
  })

  it('should export clampPosition function', () => {
    const layout = useResponsiveLayout()
    expect(typeof layout.clampPosition).toBe('function')
  })
})

describe('useResponsiveLayout — tablet', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 900, configurable: true })
  })

  it('should return tablet device type', () => {
    const layout = useResponsiveLayout()
    expect(layout.deviceType.value).toBe('tablet')
    expect(layout.isTablet.value).toBe(true)
  })

  it('should provide tablet constraints', () => {
    const layout = useResponsiveLayout()
    expect(layout.constraints.value.allowDrag).toBe(true)
    expect(layout.constraints.value.allowResize).toBe(true)
    expect(layout.constraints.value.fullScreenWindows).toBe(false)
    expect(layout.constraints.value.maxVisibleWindows).toBe(6)
    expect(layout.constraints.value.minTouchTarget).toBe(44)
  })

  it('should return correct profile key', () => {
    const layout = useResponsiveLayout()
    expect(layout.profileKey.value).toBe('layout-tablet')
  })

  it('should return buttonSize of 44 for tablet', () => {
    const layout = useResponsiveLayout()
    expect(layout.buttonSize.value).toBe(44)
  })
})

describe('useResponsiveLayout — mobile', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
  })

  it('should return mobile device type', () => {
    const layout = useResponsiveLayout()
    expect(layout.deviceType.value).toBe('mobile')
    expect(layout.isMobile.value).toBe(true)
  })

  it('should provide mobile constraints', () => {
    const layout = useResponsiveLayout()
    expect(layout.constraints.value.allowDrag).toBe(false)
    expect(layout.constraints.value.allowResize).toBe(false)
    expect(layout.constraints.value.fullScreenWindows).toBe(true)
    expect(layout.constraints.value.maxVisibleWindows).toBe(1)
    expect(layout.constraints.value.minTouchTarget).toBe(48)
  })

  it('should not allow drag on mobile', () => {
    const layout = useResponsiveLayout()
    expect(layout.allowDrag.value).toBe(false)
  })

  it('should not allow resize on mobile', () => {
    const layout = useResponsiveLayout()
    expect(layout.allowResize.value).toBe(false)
  })

  it('should use full screen windows on mobile', () => {
    const layout = useResponsiveLayout()
    expect(layout.useFullScreenWindows.value).toBe(true)
  })

  it('should return correct profile key', () => {
    const layout = useResponsiveLayout()
    expect(layout.profileKey.value).toBe('layout-mobile')
  })

  it('should return buttonSize of 48 for mobile', () => {
    const layout = useResponsiveLayout()
    expect(layout.buttonSize.value).toBe(48)
  })
})

describe('useResponsiveLayout — isTouchDevice', () => {
  it('should return a boolean for isTouchDevice', () => {
    const layout = useResponsiveLayout()
    expect(typeof layout.isTouchDevice.value).toBe('boolean')
  })
})
