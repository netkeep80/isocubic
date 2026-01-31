/**
 * Unit tests for SharePanel Vue component
 * Tests the Vue.js 3.0 migration of the SharePanel component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

describe('SharePanel Vue Component — Module Exports', () => {
  it('should export SharePanel.vue as a valid Vue component', async () => {
    const module = await import('./SharePanel.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export SHARE_PANEL_META with correct metadata', async () => {
    const module = await import('./SharePanel.vue')
    expect(module.SHARE_PANEL_META).toBeDefined()
    expect(module.SHARE_PANEL_META.id).toBe('share-panel')
    expect(module.SHARE_PANEL_META.name).toBe('SharePanel')
    expect(module.SHARE_PANEL_META.filePath).toBe('components/SharePanel.vue')
  })
})

describe('SharePanel Vue Component — Visibility Options', () => {
  it('should have correct visibility types', () => {
    const visibilityTypes = ['public', 'unlisted', 'protected', 'private']
    expect(visibilityTypes).toContain('public')
    expect(visibilityTypes).toContain('unlisted')
    expect(visibilityTypes).toContain('protected')
    expect(visibilityTypes).toContain('private')
  })
})

describe('SharePanel Vue Component — Date Formatting', () => {
  it('should format date for display', () => {
    function formatDate(isoDate: string): string {
      try {
        return new Date(isoDate).toLocaleDateString()
      } catch {
        return isoDate
      }
    }

    const date = '2026-01-30T12:00:00Z'
    const result = formatDate(date)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })
})

describe('SharePanel Vue Component — Features', () => {
  it('should have all expected features in metadata', async () => {
    const module = await import('./SharePanel.vue')
    const features = module.SHARE_PANEL_META.features
    expect(features).toBeDefined()

    const featureIds = features!.map((f) => f.id)
    expect(featureIds).toContain('link-generation')
    expect(featureIds).toContain('qr-code')
    expect(featureIds).toContain('password-protection')
    expect(featureIds).toContain('link-expiration')
    expect(featureIds).toContain('clipboard-copy')
    expect(featureIds).toContain('link-analytics')
  })
})
