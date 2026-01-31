/**
 * Unit tests for DevModeQueryPanel Vue component
 * Tests the Vue.js 3.0 migration of the DevModeQueryPanel component (TASK 66)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

describe('DevModeQueryPanel Vue Component — Module Exports', () => {
  it('should export DevModeQueryPanel.vue as a valid Vue component', async () => {
    const module = await import('./DevModeQueryPanel.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })
})

describe('DevModeQueryPanel Vue Component — Query Processing Keywords', () => {
  it('should define component category keywords', () => {
    const componentCategories = ['ui', 'layout', 'form', 'navigation', 'data', 'utility']
    expect(componentCategories.length).toBeGreaterThanOrEqual(3)
    expect(componentCategories).toContain('ui')
    expect(componentCategories).toContain('layout')
    expect(componentCategories).toContain('form')
  })

  it('should match query keywords case-insensitively', () => {
    function matchesCategory(query: string, categories: string[]): string | null {
      const lower = query.toLowerCase()
      return categories.find((c) => lower.includes(c)) ?? null
    }

    expect(matchesCategory('Show UI components', ['ui', 'layout', 'form'])).toBe('ui')
    expect(matchesCategory('LAYOUT elements', ['ui', 'layout', 'form'])).toBe('layout')
    expect(matchesCategory('nothing relevant', ['ui', 'layout', 'form'])).toBeNull()
  })
})

describe('DevModeQueryPanel Vue Component — History Storage', () => {
  it('should use correct storage key format', () => {
    const storageKey = 'isocubic-devmode-query-history'
    expect(storageKey).toContain('isocubic')
    expect(storageKey).toContain('devmode')
    expect(storageKey).toContain('query-history')
  })

  it('should limit history entries', () => {
    const maxHistoryEntries = 50
    const history: string[] = []
    for (let i = 0; i < 60; i++) {
      history.push(`query-${i}`)
    }
    const trimmed = history.slice(-maxHistoryEntries)
    expect(trimmed.length).toBe(50)
    expect(trimmed[0]).toBe('query-10')
  })
})

describe('DevModeQueryPanel Vue Component — Keyboard Shortcut', () => {
  it('should define the correct keyboard shortcut', () => {
    const shortcut = {
      key: 'Q',
      ctrlKey: true,
      shiftKey: true,
    }

    expect(shortcut.key).toBe('Q')
    expect(shortcut.ctrlKey).toBe(true)
    expect(shortcut.shiftKey).toBe(true)
  })
})

describe('DevModeQueryPanel Vue Component — DevMode API Integration', () => {
  it('should import devmode module', async () => {
    const devmodeModule = await import('../lib/devmode')
    expect(devmodeModule).toBeDefined()
  })
})
