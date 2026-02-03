/**
 * Tests for MetaMode Pinia store and composables
 *
 * TASK 61: Migrated from React testing-library to Pinia testing (Phase 10)
 * TASK 72: Renamed from devmode to metamode-store (Phase 12)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import {
  useMetaModeStore,
  useMetaMode,
  useIsMetaModeEnabled,
  useMetaModeSettings,
} from './metamode-store'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('MetaMode Pinia Store', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should provide MetaMode store', () => {
    const store = useMetaModeStore()

    expect(store).toBeDefined()
    expect(store.settings).toBeDefined()
    expect(store.toggleMetaMode).toBeInstanceOf(Function)
    expect(store.updateSettings).toBeInstanceOf(Function)
    expect(store.updateCategory).toBeInstanceOf(Function)
    expect(store.resetSettings).toBeInstanceOf(Function)
  })

  it('should start with MetaMode disabled by default', () => {
    const store = useMetaModeStore()

    expect(store.settings.enabled).toBe(false)
  })

  it('should toggle MetaMode on/off', () => {
    const store = useMetaModeStore()

    expect(store.settings.enabled).toBe(false)

    store.toggleMetaMode()
    expect(store.settings.enabled).toBe(true)

    store.toggleMetaMode()
    expect(store.settings.enabled).toBe(false)
  })

  it('should update settings', () => {
    const store = useMetaModeStore()

    expect(store.settings.verbosity).toBe('normal')

    store.updateSettings({ verbosity: 'verbose' })
    expect(store.settings.verbosity).toBe('verbose')
  })

  it('should update individual categories', () => {
    const store = useMetaModeStore()

    expect(store.settings.categories.dependencies).toBe(false)

    store.updateCategory('dependencies', true)
    expect(store.settings.categories.dependencies).toBe(true)
  })

  it('should reset to default settings', () => {
    const store = useMetaModeStore()

    // Modify some settings
    store.updateSettings({ enabled: true, verbosity: 'verbose' })
    store.updateCategory('dependencies', true)

    expect(store.settings.enabled).toBe(true)
    expect(store.settings.verbosity).toBe('verbose')

    // Reset
    store.resetSettings()

    expect(store.settings.enabled).toBe(false)
    expect(store.settings.verbosity).toBe('normal')
    expect(store.settings.categories.dependencies).toBe(false)
  })

  it('should persist settings to localStorage', async () => {
    const store = useMetaModeStore()

    store.toggleMetaMode()

    // Pinia uses watchers which are async, give it a tick
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Should persist after toggle
    expect(localStorageMock.setItem).toHaveBeenCalled()

    // Find the last call to setItem for our key
    const calls = localStorageMock.setItem.mock.calls.filter(
      (call: string[]) => call[0] === 'isocubic_metamode_settings'
    )
    expect(calls.length).toBeGreaterThan(0)

    // Get the last call (after toggle)
    const lastCall = calls[calls.length - 1]
    const savedSettings = JSON.parse(lastCall[1])
    expect(savedSettings.enabled).toBe(true)
  })

  it('should load settings from localStorage', () => {
    // Pre-populate localStorage
    localStorageMock.setItem(
      'isocubic_metamode_settings',
      JSON.stringify({ enabled: true, verbosity: 'minimal' })
    )

    const store = useMetaModeStore()

    expect(store.settings.enabled).toBe(true)
    expect(store.settings.verbosity).toBe('minimal')
  })
})

describe('useMetaMode composable', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should return MetaMode context value', () => {
    const metaMode = useMetaMode()

    expect(metaMode).toBeDefined()
    expect(metaMode.settings).toBeDefined()
    expect(metaMode.toggleMetaMode).toBeInstanceOf(Function)
    expect(metaMode.updateSettings).toBeInstanceOf(Function)
    expect(metaMode.updateCategory).toBeInstanceOf(Function)
    expect(metaMode.resetSettings).toBeInstanceOf(Function)
    expect(metaMode.isEnabled).toBe(false)
  })
})

describe('useIsMetaModeEnabled composable', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should return a ComputedRef that is false by default', () => {
    const isEnabled = useIsMetaModeEnabled()
    expect(isEnabled.value).toBe(false)
  })

  it('should reactively update when toggling', () => {
    const store = useMetaModeStore()
    const isEnabled = useIsMetaModeEnabled()

    expect(isEnabled.value).toBe(false)

    store.toggleMetaMode()
    expect(isEnabled.value).toBe(true)

    store.toggleMetaMode()
    expect(isEnabled.value).toBe(false)
  })
})

describe('useMetaModeSettings composable', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should return a ComputedRef with default settings', () => {
    const settings = useMetaModeSettings()

    expect(settings.value.enabled).toBe(false)
    expect(settings.value.verbosity).toBe('normal')
    expect(settings.value.showOutline).toBe(true)
    expect(settings.value.showHoverInfo).toBe(true)
    expect(settings.value.panelPosition).toBe('top-right')
  })

  it('should reactively update after modification', () => {
    const store = useMetaModeStore()
    const settings = useMetaModeSettings()

    expect(settings.value.showOutline).toBe(true)

    store.updateSettings({
      showOutline: false,
      panelPosition: 'bottom-left',
    })

    expect(settings.value.showOutline).toBe(false)
    expect(settings.value.panelPosition).toBe('bottom-left')
  })
})

describe('Category settings', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('should have correct default categories', () => {
    const store = useMetaModeStore()

    const { categories } = store.settings
    expect(categories.basic).toBe(true)
    expect(categories.history).toBe(true)
    expect(categories.features).toBe(true)
    expect(categories.dependencies).toBe(false)
    expect(categories.relatedFiles).toBe(false)
    expect(categories.props).toBe(false)
    expect(categories.tips).toBe(true)
  })

  it('should update multiple categories', () => {
    const store = useMetaModeStore()

    store.updateCategory('dependencies', true)
    store.updateCategory('props', true)
    store.updateCategory('basic', false)

    const { categories } = store.settings
    expect(categories.dependencies).toBe(true)
    expect(categories.props).toBe(true)
    expect(categories.basic).toBe(false)
  })
})
