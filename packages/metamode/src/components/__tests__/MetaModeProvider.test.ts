/**
 * Unit tests for @netkeep80/metamode — MetaModeProvider composable
 *
 * Tests: provideMetaMode, useMetaMode, backward-compat aliases
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import {
  provideMetaMode,
  useMetaMode,
  provideGodMode,
  useGodMode,
  METAMODE_KEY,
  GOD_MODE_KEY,
} from '../MetaModeProvider'

// ============================================================
// Helpers — mount a component tree with provideMetaMode
// ============================================================

function mountWithProvider(config = {}) {
  let contextValue: ReturnType<typeof useMetaMode> | null = null

  const ChildComponent = defineComponent({
    setup() {
      contextValue = useMetaMode()
      return () => h('div')
    },
  })

  const ParentComponent = defineComponent({
    setup() {
      provideMetaMode(config)
      return () => h(ChildComponent)
    },
  })

  const wrapper = mount(ParentComponent, {
    attachTo: document.body,
  })

  return { wrapper, getContext: () => contextValue! }
}

// ============================================================
// provideMetaMode / useMetaMode basic functionality
// ============================================================

describe('provideMetaMode + useMetaMode — initial state', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should provide context accessible by useMetaMode', () => {
    const { getContext } = mountWithProvider()
    expect(getContext()).not.toBeNull()
  })

  it('should start with closed window state', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    expect(getContext().windowState.state).toBe('closed')
  })

  it('should expose config with defaults', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    expect(ctx.config).toBeDefined()
    expect(ctx.config.persistState).toBe(false)
  })

  it('should apply custom config overrides', () => {
    const { getContext } = mountWithProvider({
      persistState: false,
      storageKeyPrefix: 'test_app',
      preferredLanguage: 'en',
    })
    const ctx = getContext()
    expect(ctx.config.storageKeyPrefix).toBe('test_app')
    expect(ctx.config.preferredLanguage).toBe('en')
  })

  it('should merge custom shortcuts with defaults', () => {
    const { getContext } = mountWithProvider({
      persistState: false,
      shortcuts: { toggleWindow: 'Ctrl+Alt+D' },
    })
    const ctx = getContext()
    expect(ctx.config.shortcuts?.toggleWindow).toBe('Ctrl+Alt+D')
    // Default shortcuts preserved
    expect(ctx.config.shortcuts?.minimizeWindow).toBe('Escape')
  })
})

// ============================================================
// Window state actions
// ============================================================

describe('provideMetaMode — window actions', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should open the window', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    expect(ctx.windowState.state).toBe('open')
  })

  it('should set lastOpened when window is opened', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    expect(ctx.windowState.lastOpened).toBeTruthy()
  })

  it('should close the window', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    ctx.closeWindow()
    expect(ctx.windowState.state).toBe('closed')
  })

  it('should minimize the window', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    ctx.minimizeWindow()
    expect(ctx.windowState.state).toBe('minimized')
  })

  it('should restore from minimized when minimizeWindow called again', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    ctx.minimizeWindow() // → minimized
    ctx.minimizeWindow() // → open
    expect(ctx.windowState.state).toBe('open')
  })

  it('should toggle window from closed to open', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    expect(ctx.windowState.state).toBe('closed')
    ctx.toggleWindow()
    expect(ctx.windowState.state).toBe('open')
  })

  it('should toggle window from open to closed', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    ctx.toggleWindow()
    expect(ctx.windowState.state).toBe('closed')
  })

  it('should set active tab', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.setActiveTab('issues')
    expect(ctx.windowState.activeTab).toBe('issues')
  })

  it('should set window position', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.setPosition({ x: 300, y: 400 })
    expect(ctx.windowState.position.x).toBe(300)
    expect(ctx.windowState.position.y).toBe(400)
  })

  it('should set window size (partial)', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.setSize({ width: 750 })
    expect(ctx.windowState.size.width).toBe(750)
  })

  it('should toggle pin state', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    expect(ctx.windowState.isPinned).toBe(false)
    ctx.togglePin()
    expect(ctx.windowState.isPinned).toBe(true)
    ctx.togglePin()
    expect(ctx.windowState.isPinned).toBe(false)
  })

  it('should reset state to defaults', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    ctx.setActiveTab('search')
    ctx.resetState()
    expect(ctx.windowState.state).toBe('closed')
    expect(ctx.windowState.activeTab).toBe('query')
  })
})

// ============================================================
// isVisible computed property
// ============================================================

describe('provideMetaMode — isVisible', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should be false when window is closed', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    expect(ctx.isVisible).toBe(false)
  })

  it('should be true when window is open', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    expect(ctx.isVisible).toBe(true)
  })

  it('should be true when window is minimized', () => {
    const { getContext } = mountWithProvider({ persistState: false })
    const ctx = getContext()
    ctx.openWindow()
    ctx.minimizeWindow()
    expect(ctx.isVisible).toBe(true)
  })
})

// ============================================================
// useMetaMode error when no provider
// ============================================================

describe('useMetaMode — error handling', () => {
  it('should throw when used without provideMetaMode', () => {
    const ComponentWithoutProvider = defineComponent({
      setup() {
        expect(() => useMetaMode()).toThrow('useMetaMode must be used within')
        return () => h('div')
      },
    })
    mount(ComponentWithoutProvider)
  })
})

// ============================================================
// Backward compatibility aliases
// ============================================================

describe('backward compatibility aliases', () => {
  it('GOD_MODE_KEY should be the same as METAMODE_KEY', () => {
    expect(GOD_MODE_KEY).toBe(METAMODE_KEY)
  })

  it('provideGodMode should be the same function as provideMetaMode', () => {
    expect(provideGodMode).toBe(provideMetaMode)
  })

  it('useGodMode should be the same function as useMetaMode', () => {
    expect(useGodMode).toBe(useMetaMode)
  })
})
