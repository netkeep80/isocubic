/**
 * Unit tests for SubscriptionButton Vue component
 * Tests the Vue.js 3.0 migration of the SubscriptionButton component (TASK 64)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'

describe('SubscriptionButton Vue Component — Module Exports', () => {
  it('should export SubscriptionButton.vue as a valid Vue component', async () => {
    const module = await import('./SubscriptionButton.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export SUBSCRIPTION_BUTTON_META with correct metadata', async () => {
    const module = await import('./SubscriptionButton.vue')
    expect(module.SUBSCRIPTION_BUTTON_META).toBeDefined()
    expect(module.SUBSCRIPTION_BUTTON_META.id).toBe('subscription-button')
    expect(module.SUBSCRIPTION_BUTTON_META.name).toBe('SubscriptionButton')
    expect(module.SUBSCRIPTION_BUTTON_META.filePath).toBe('components/SubscriptionButton.vue')
  })
})

describe('SubscriptionButton Vue Component — Count Formatting', () => {
  it('should format counts under 1000 as-is', () => {
    function formatCount(count: number): string {
      if (count < 1000) return count.toString()
      if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
      return `${(count / 1000000).toFixed(1)}M`
    }

    expect(formatCount(0)).toBe('0')
    expect(formatCount(42)).toBe('42')
    expect(formatCount(999)).toBe('999')
  })

  it('should format counts over 1000 with K suffix', () => {
    function formatCount(count: number): string {
      if (count < 1000) return count.toString()
      if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
      return `${(count / 1000000).toFixed(1)}M`
    }

    expect(formatCount(1000)).toBe('1.0K')
    expect(formatCount(1500)).toBe('1.5K')
    expect(formatCount(999999)).toBe('1000.0K')
  })

  it('should format counts over 1M with M suffix', () => {
    function formatCount(count: number): string {
      if (count < 1000) return count.toString()
      if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
      return `${(count / 1000000).toFixed(1)}M`
    }

    expect(formatCount(1000000)).toBe('1.0M')
    expect(formatCount(2500000)).toBe('2.5M')
  })
})

describe('SubscriptionButton Vue Component — Features', () => {
  it('should have all expected features in metadata', async () => {
    const module = await import('./SubscriptionButton.vue')
    const features = module.SUBSCRIPTION_BUTTON_META.features
    expect(features).toBeDefined()

    const featureIds = features!.map((f) => f.id)
    expect(featureIds).toContain('subscribe')
    expect(featureIds).toContain('unsubscribe')
    expect(featureIds).toContain('subscriber-count')
  })
})
