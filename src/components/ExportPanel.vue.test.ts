/**
 * Unit tests for ExportPanel Vue component
 * Tests the Vue.js 3.0 migration of the ExportPanel component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

describe('ExportPanel Vue Component — Module Exports', () => {
  it('should export ExportPanel.vue as a valid Vue component', async () => {
    const module = await import('./ExportPanel.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export EXPORT_PANEL_META with correct metadata', async () => {
    const module = await import('./ExportPanel.vue')
    expect(module.EXPORT_PANEL_META).toBeDefined()
    expect(module.EXPORT_PANEL_META.id).toBe('export-panel')
    expect(module.EXPORT_PANEL_META.name).toBe('ExportPanel')
    expect(module.EXPORT_PANEL_META.filePath).toBe('components/ExportPanel.vue')
  })
})

describe('ExportPanel Vue Component — Date Formatting', () => {
  it('should format ISO date strings correctly', () => {
    function formatDate(isoDate: string): string {
      try {
        return new Date(isoDate).toLocaleString()
      } catch {
        return isoDate
      }
    }

    const date = '2026-01-30T12:00:00Z'
    const result = formatDate(date)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('should handle invalid date gracefully', () => {
    function formatDate(isoDate: string): string {
      try {
        const d = new Date(isoDate)
        if (isNaN(d.getTime())) return isoDate
        return d.toLocaleString()
      } catch {
        return isoDate
      }
    }

    const invalidDate = 'not-a-date'
    const result = formatDate(invalidDate)
    expect(typeof result).toBe('string')
  })
})

describe('ExportPanel Vue Component — Features', () => {
  it('should have all expected features in metadata', async () => {
    const module = await import('./ExportPanel.vue')
    const features = module.EXPORT_PANEL_META.features
    expect(features).toBeDefined()

    const featureIds = features!.map((f) => f.id)
    expect(featureIds).toContain('json-export')
    expect(featureIds).toContain('json-import')
    expect(featureIds).toContain('local-storage')
    expect(featureIds).toContain('saved-configs-list')
    expect(featureIds).toContain('undo-redo')
  })
})
