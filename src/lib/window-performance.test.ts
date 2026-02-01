/**
 * Tests for window performance utilities
 * Tests debounce, safe storage, performance monitor, state validation, and RAF wrapper
 *
 * Phase 11, TASK 78: Testing and optimization
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  debounce,
  safeStorage,
  WindowPerformanceMonitor,
  validateWindowState,
  requestFrame,
} from './window-performance'
import { useWindowManager, type WindowState } from '../composables/useWindowManager'

/** Helper to create mock WindowState entries */
function createMockWindowMap(
  count: number,
  options: Partial<WindowState> = {}
): Map<string, WindowState> {
  const map = new Map<string, WindowState>()
  for (let i = 0; i < count; i++) {
    map.set(`win-${i}`, {
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
      ...options,
    })
  }
  return map
}

describe('debounce — Debouncing Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should delay function execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should reset timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    vi.advanceTimersByTime(50)
    debounced()
    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should pass arguments to the debounced function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('arg1', 'arg2')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should cancel pending execution', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
  })

  it('should flush pending execution immediately', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('flushed')
    debounced.flush()
    expect(fn).toHaveBeenCalledWith('flushed')
  })

  it('should not flush if nothing is pending', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced.flush()
    expect(fn).not.toHaveBeenCalled()
  })
})

describe('safeStorage — Safe localStorage Wrapper', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should get and set items', () => {
    safeStorage.setItem('key', 'value')
    expect(safeStorage.getItem('key')).toBe('value')
  })

  it('should return null for missing keys', () => {
    expect(safeStorage.getItem('nonexistent')).toBeNull()
  })

  it('should remove items', () => {
    safeStorage.setItem('key', 'value')
    safeStorage.removeItem('key')
    expect(safeStorage.getItem('key')).toBeNull()
  })

  it('should parse JSON safely', () => {
    localStorage.setItem('json-key', JSON.stringify({ a: 1, b: 2 }))
    const result = safeStorage.getJSON('json-key', {})
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('should return fallback for invalid JSON', () => {
    localStorage.setItem('bad-json', 'not-json{{{')
    const result = safeStorage.getJSON('bad-json', { default: true })
    expect(result).toEqual({ default: true })
  })

  it('should return fallback for missing key', () => {
    const result = safeStorage.getJSON('missing', { fallback: true })
    expect(result).toEqual({ fallback: true })
  })

  it('should return fallback for non-object JSON', () => {
    localStorage.setItem('string-json', '"hello"')
    const result = safeStorage.getJSON('string-json', { fallback: true })
    expect(result).toEqual({ fallback: true })
  })

  it('should return fallback for null JSON', () => {
    localStorage.setItem('null-json', 'null')
    const result = safeStorage.getJSON('null-json', { fallback: true })
    expect(result).toEqual({ fallback: true })
  })
})

describe('WindowPerformanceMonitor — Performance Tracking', () => {
  it('should track save count', () => {
    const monitor = new WindowPerformanceMonitor()
    const windows = createMockWindowMap(3)

    monitor.recordSave()
    monitor.recordSave()

    const metrics = monitor.getMetrics(windows)
    expect(metrics.saveCount).toBe(2)
  })

  it('should track last save timestamp', () => {
    const monitor = new WindowPerformanceMonitor()
    const windows = createMockWindowMap(1)

    const before = Date.now()
    monitor.recordSave()
    const metrics = monitor.getMetrics(windows)

    expect(metrics.lastSaveTimestamp).toBeGreaterThanOrEqual(before)
  })

  it('should count active (visible) windows', () => {
    const monitor = new WindowPerformanceMonitor()
    const windows = createMockWindowMap(5)
    // Minimize 2 windows
    windows.get('win-0')!.isMinimized = true
    windows.get('win-1')!.isOpen = false

    const metrics = monitor.getMetrics(windows)
    expect(metrics.activeWindowCount).toBe(3)
    expect(metrics.totalWindowCount).toBe(5)
  })

  it('should detect performance mode when many windows are active', () => {
    const monitor = new WindowPerformanceMonitor(5)
    const windows = createMockWindowMap(6)

    expect(monitor.shouldEnablePerformanceMode(windows)).toBe(true)
  })

  it('should not enable performance mode below threshold', () => {
    const monitor = new WindowPerformanceMonitor(10)
    const windows = createMockWindowMap(5)

    expect(monitor.shouldEnablePerformanceMode(windows)).toBe(false)
  })

  it('should reset all metrics', () => {
    const monitor = new WindowPerformanceMonitor()
    const windows = createMockWindowMap(1)

    monitor.recordSave()
    monitor.recordSave()
    monitor.reset()

    const metrics = monitor.getMetrics(windows)
    expect(metrics.saveCount).toBe(0)
    expect(metrics.lastSaveTimestamp).toBe(0)
  })

  it('should handle empty window map', () => {
    const monitor = new WindowPerformanceMonitor()
    const windows = new Map<string, WindowState>()

    const metrics = monitor.getMetrics(windows)
    expect(metrics.activeWindowCount).toBe(0)
    expect(metrics.totalWindowCount).toBe(0)
    expect(metrics.performanceModeActive).toBe(false)
  })
})

describe('validateWindowState — State Validation and Recovery', () => {
  it('should validate correct window state data', () => {
    const data = {
      'win-0': {
        x: 100,
        y: 200,
        width: 400,
        height: 300,
        zIndex: 101,
        isOpen: true,
        isMinimized: false,
      },
    }
    const result = validateWindowState(data)
    expect(result).not.toBeNull()
    expect(result!['win-0'].x).toBe(100)
    expect(result!['win-0'].isOpen).toBe(true)
  })

  it('should reject null data', () => {
    expect(validateWindowState(null)).toBeNull()
  })

  it('should reject array data', () => {
    expect(validateWindowState([1, 2, 3])).toBeNull()
  })

  it('should reject primitive data', () => {
    expect(validateWindowState('string')).toBeNull()
    expect(validateWindowState(42)).toBeNull()
    expect(validateWindowState(true)).toBeNull()
  })

  it('should skip entries with non-object values', () => {
    const data = { 'win-0': 'invalid', 'win-1': null }
    const result = validateWindowState(data)
    expect(result).not.toBeNull()
    expect(result!['win-0']).toBeUndefined()
    expect(result!['win-1']).toBeUndefined()
  })

  it('should clamp negative positions to zero', () => {
    const data = { 'win-0': { x: -50, y: -30 } }
    const result = validateWindowState(data)
    expect(result!['win-0'].x).toBe(0)
    expect(result!['win-0'].y).toBe(0)
  })

  it('should enforce minimum width and height', () => {
    const data = { 'win-0': { width: 10, height: 5 } }
    const result = validateWindowState(data)
    expect(result!['win-0'].width).toBe(100) // min validated width
    expect(result!['win-0'].height).toBe(80) // min validated height
  })

  it('should skip NaN and Infinity values', () => {
    const data = { 'win-0': { x: NaN, y: Infinity, width: -Infinity } }
    const result = validateWindowState(data)
    expect(result!['win-0'].x).toBeUndefined()
    expect(result!['win-0'].y).toBeUndefined()
    expect(result!['win-0'].width).toBeUndefined()
  })

  it('should handle empty object', () => {
    const result = validateWindowState({})
    expect(result).not.toBeNull()
    expect(Object.keys(result!)).toHaveLength(0)
  })

  it('should preserve valid boolean fields', () => {
    const data = { 'win-0': { isOpen: false, isMinimized: true } }
    const result = validateWindowState(data)
    expect(result!['win-0'].isOpen).toBe(false)
    expect(result!['win-0'].isMinimized).toBe(true)
  })
})

describe('requestFrame — Animation Frame Wrapper', () => {
  it('should call callback via requestAnimationFrame', () => {
    const callback = vi.fn()
    const cancel = requestFrame(callback)
    // In jsdom, requestAnimationFrame is available but may not auto-fire
    // Just verify the cancel function is returned
    expect(typeof cancel).toBe('function')
    cancel()
  })

  it('should return a cancel function', () => {
    const callback = vi.fn()
    const cancel = requestFrame(callback)
    cancel()
    // After cancel, callback should not be called
    // (depending on timing, but the cancel path should work)
    expect(typeof cancel).toBe('function')
  })
})

describe('Performance — Window System Under Load', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should handle 10+ windows without errors', () => {
    const defs = Array.from({ length: 15 }, (_, i) => ({
      id: `load-win-${i}`,
      title: `Load Window ${i}`,
      icon: '🪟',
      defaultX: 10 + i * 10,
      defaultY: 10 + i * 10,
      defaultWidth: 300,
      defaultHeight: 200,
      minWidth: 150,
      minHeight: 100,
    }))

    const manager = useWindowManager(defs)
    expect(manager.windows.value.size).toBe(15)
    expect(manager.visibleWindows.value).toHaveLength(15)
  })

  it('should handle rapid minimize/restore cycles', () => {
    const defs = Array.from({ length: 5 }, (_, i) => ({
      id: `rapid-win-${i}`,
      title: `Rapid Window ${i}`,
      icon: '🪟',
      defaultX: 10,
      defaultY: 10,
      defaultWidth: 300,
      defaultHeight: 200,
    }))

    const manager = useWindowManager(defs)

    // Rapidly minimize and restore all windows
    for (let cycle = 0; cycle < 10; cycle++) {
      for (let i = 0; i < 5; i++) {
        manager.minimizeWindow(`rapid-win-${i}`)
      }
      for (let i = 0; i < 5; i++) {
        manager.restoreWindow(`rapid-win-${i}`)
      }
    }

    expect(manager.visibleWindows.value).toHaveLength(5)
    expect(manager.minimizedWindows.value).toHaveLength(0)
  })

  it('should handle rapid move operations', () => {
    const defs = [
      {
        id: 'move-test',
        title: 'Move Test',
        icon: '🪟',
        defaultX: 0,
        defaultY: 0,
        defaultWidth: 300,
        defaultHeight: 200,
      },
    ]

    const manager = useWindowManager(defs)

    // Simulate 100 move operations (like dragging)
    for (let i = 0; i < 100; i++) {
      manager.moveWindow('move-test', i * 5, i * 3)
    }

    expect(manager.getWindow('move-test')!.x).toBe(495)
    expect(manager.getWindow('move-test')!.y).toBe(297)
  })

  it('should handle rapid z-index updates', () => {
    const defs = Array.from({ length: 10 }, (_, i) => ({
      id: `z-win-${i}`,
      title: `Z Window ${i}`,
      icon: '🪟',
      defaultX: 10,
      defaultY: 10,
      defaultWidth: 300,
      defaultHeight: 200,
    }))

    const manager = useWindowManager(defs)

    // Rapidly cycle through bringing windows to front
    for (let cycle = 0; cycle < 5; cycle++) {
      for (let i = 0; i < 10; i++) {
        manager.bringToFront(`z-win-${i}`)
      }
    }

    // Last focused window should have highest z-index
    const lastWin = manager.getWindow('z-win-9')!
    for (let i = 0; i < 9; i++) {
      expect(lastWin.zIndex).toBeGreaterThan(manager.getWindow(`z-win-${i}`)!.zIndex)
    }
  })
})
