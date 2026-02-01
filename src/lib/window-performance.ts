/**
 * Window Performance Utilities for isocubic
 * Provides debounced localStorage persistence, performance monitoring,
 * and graceful error handling for the window manager system.
 *
 * Phase 11, TASK 78: Testing and optimization
 */

import type { WindowState } from '../composables/useWindowManager'

/**
 * Debounce a function call — delays execution until after `delay` ms of inactivity
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel(): void; flush(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: unknown[] | null = null

  const debounced = (...args: unknown[]) => {
    lastArgs = args
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      lastArgs = null
      fn(...args)
    }, delay)
  }

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
      lastArgs = null
    }
  }

  debounced.flush = () => {
    if (timer !== null && lastArgs !== null) {
      clearTimeout(timer)
      timer = null
      const args = lastArgs
      lastArgs = null
      fn(...args)
    }
  }

  return debounced as T & { cancel(): void; flush(): void }
}

/**
 * Safe localStorage wrapper with error recovery
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value)
      return true
    } catch {
      // localStorage may be full or unavailable
      return false
    }
  },

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },

  /**
   * Parse JSON from localStorage safely, returning fallback on any error
   */
  getJSON<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      const parsed = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return fallback
      return parsed as T
    } catch {
      return fallback
    }
  },
}

/**
 * Performance metrics for window operations
 */
export interface WindowPerformanceMetrics {
  /** Number of active (visible) windows */
  activeWindowCount: number
  /** Total number of registered windows */
  totalWindowCount: number
  /** Time of last layout save (ms since epoch) */
  lastSaveTimestamp: number
  /** Number of localStorage save operations */
  saveCount: number
  /** Whether performance mode is active (many windows) */
  performanceModeActive: boolean
}

/**
 * Performance monitor for window system
 * Tracks metrics and suggests optimizations
 */
export class WindowPerformanceMonitor {
  private saveCount = 0
  private lastSaveTimestamp = 0
  private readonly performanceThreshold: number

  constructor(performanceThreshold = 10) {
    this.performanceThreshold = performanceThreshold
  }

  /** Record a save operation */
  recordSave(): void {
    this.saveCount++
    this.lastSaveTimestamp = Date.now()
  }

  /** Get current metrics */
  getMetrics(windows: Map<string, WindowState>): WindowPerformanceMetrics {
    let activeCount = 0
    for (const state of windows.values()) {
      if (state.isOpen && !state.isMinimized) {
        activeCount++
      }
    }

    return {
      activeWindowCount: activeCount,
      totalWindowCount: windows.size,
      lastSaveTimestamp: this.lastSaveTimestamp,
      saveCount: this.saveCount,
      performanceModeActive: activeCount >= this.performanceThreshold,
    }
  }

  /** Check if performance mode should be enabled */
  shouldEnablePerformanceMode(windows: Map<string, WindowState>): boolean {
    const metrics = this.getMetrics(windows)
    return metrics.performanceModeActive
  }

  /** Reset all metrics */
  reset(): void {
    this.saveCount = 0
    this.lastSaveTimestamp = 0
  }
}

/**
 * Validate and repair corrupted window state from localStorage
 * Returns null if the data is unrecoverable
 */
export function validateWindowState(data: unknown): Record<string, Partial<WindowState>> | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null
  }

  const result: Record<string, Partial<WindowState>> = {}
  const record = data as Record<string, unknown>

  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== 'object' || value === null) continue

    const state = value as Record<string, unknown>
    const validated: Partial<WindowState> = {}

    // Validate numeric fields with sensible defaults
    if (typeof state.x === 'number' && isFinite(state.x)) validated.x = Math.max(0, state.x)
    if (typeof state.y === 'number' && isFinite(state.y)) validated.y = Math.max(0, state.y)
    if (typeof state.width === 'number' && isFinite(state.width))
      validated.width = Math.max(100, state.width)
    if (typeof state.height === 'number' && isFinite(state.height))
      validated.height = Math.max(80, state.height)
    if (typeof state.zIndex === 'number' && isFinite(state.zIndex)) validated.zIndex = state.zIndex

    // Validate boolean fields
    if (typeof state.isOpen === 'boolean') validated.isOpen = state.isOpen
    if (typeof state.isMinimized === 'boolean') validated.isMinimized = state.isMinimized

    result[key] = validated
  }

  return result
}

/**
 * Request animation frame wrapper with fallback
 * Returns a cancel function
 */
export function requestFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const id = requestAnimationFrame(callback)
    return () => cancelAnimationFrame(id)
  }
  // Fallback for environments without RAF
  const id = setTimeout(callback, 16) // ~60fps
  return () => clearTimeout(id)
}
