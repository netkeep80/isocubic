/**
 * MetaModeProvider Composable
 *
 * Vue 3 provide/inject based provider for MetaMode library integration.
 * Provides MetaMode state management, keyboard shortcuts, and persistence.
 *
 * TASK 61: Migrated from React Context to Vue provide/inject (Phase 10 - Vue.js 3.0 Migration)
 * TASK 72: Unified DevMode + GodMode → MetaMode (Phase 12)
 *
 * ## Usage
 *
 * In App.vue, call provideMetaMode() in setup.
 * In any child component, call useMetaMode() to access the context.
 */

import { reactive, watch, onMounted, onUnmounted, provide, inject, type InjectionKey } from 'vue'
import type {
  MetaModeConfig,
  MetaModeWindowState,
  MetaModeContextValue,
  MetaModeTab,
  WindowPosition,
  WindowSize,
} from '../types/metamode'
import {
  DEFAULT_METAMODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  loadMetaModeState,
  saveMetaModeState,
  matchesShortcut,
} from '../types/metamode'

/**
 * Injection key for MetaMode context
 */
const METAMODE_KEY: InjectionKey<MetaModeContextValue> = Symbol('metamode')

/**
 * Props for provideMetaMode
 */
export interface MetaModeProviderProps {
  /** MetaMode configuration */
  config?: MetaModeConfig
}

/**
 * Provide MetaMode context to all child components.
 *
 * Call this in your root component's setup to enable MetaMode.
 * It sets up state management, keyboard shortcuts, and localStorage persistence.
 *
 * @param customConfig - Optional configuration overrides
 * @returns MetaModeContextValue for direct use in the providing component
 */
export function provideMetaMode(customConfig?: MetaModeConfig): MetaModeContextValue {
  // Merge config with defaults
  const config: MetaModeConfig = {
    ...DEFAULT_METAMODE_CONFIG,
    ...customConfig,
    shortcuts: {
      ...DEFAULT_METAMODE_CONFIG.shortcuts,
      ...customConfig?.shortcuts,
    },
  }

  const storagePrefix = config.storageKeyPrefix

  // Window state — use reactive for direct mutation tracking
  const initialState: MetaModeWindowState = config.persistState
    ? loadMetaModeState(storagePrefix)
    : { ...DEFAULT_WINDOW_STATE }

  const windowState = reactive<MetaModeWindowState>({ ...initialState })

  // Persist state on change
  watch(
    () => ({ ...windowState }),
    (newState) => {
      if (config.persistState) {
        saveMetaModeState(newState, storagePrefix)
      }
    },
    { deep: true }
  )

  // Window actions
  function openWindow() {
    windowState.state = 'open'
    windowState.lastOpened = new Date().toISOString()
  }

  function closeWindow() {
    windowState.state = 'closed'
  }

  function minimizeWindow() {
    windowState.state = windowState.state === 'minimized' ? 'open' : 'minimized'
  }

  function toggleWindow() {
    if (windowState.state === 'closed') {
      windowState.state = 'open'
      windowState.lastOpened = new Date().toISOString()
    } else {
      windowState.state = 'closed'
    }
  }

  function setActiveTab(tab: MetaModeTab) {
    windowState.activeTab = tab
  }

  function setPosition(position: WindowPosition) {
    windowState.position = position
  }

  function setSize(size: Partial<WindowSize>) {
    windowState.size = { ...windowState.size, ...size }
  }

  function togglePin() {
    windowState.isPinned = !windowState.isPinned
  }

  function resetState() {
    Object.assign(windowState, { ...DEFAULT_WINDOW_STATE })
  }

  // Keyboard shortcut: toggle window (default: Ctrl+Shift+M for MetaMode)
  const handleKeyDown = (e: KeyboardEvent) => {
    const shortcut = config.shortcuts?.toggleWindow || 'Ctrl+Shift+M'
    if (matchesShortcut(e, shortcut)) {
      e.preventDefault()
      toggleWindow()
    }
    if (e.key === 'Escape' && windowState.state === 'open') {
      e.preventDefault()
      minimizeWindow()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  // Create a mutable context object — windowState is reactive so consumers see updates
  const contextValue: MetaModeContextValue = reactive({
    windowState,
    config,
    openWindow,
    closeWindow,
    minimizeWindow,
    toggleWindow,
    setActiveTab,
    setPosition,
    setSize,
    togglePin,
    resetState,
    get isVisible() {
      return windowState.state !== 'closed'
    },
  })

  provide(METAMODE_KEY, contextValue)

  return contextValue
}

/**
 * Composable to access MetaMode context.
 *
 * Must be used within a component tree where `provideMetaMode()` has been called.
 *
 * @throws Error if used outside of a MetaMode provider
 */
export function useMetaMode(): MetaModeContextValue {
  const context = inject(METAMODE_KEY)
  if (!context) {
    throw new Error('useMetaMode must be used within a component that calls provideMetaMode()')
  }
  return context
}

// Backward compatibility aliases (deprecated, will be removed in future versions)
/** @deprecated Use METAMODE_KEY instead */
export const GOD_MODE_KEY = METAMODE_KEY

/** @deprecated Use provideMetaMode instead */
export const provideGodMode = provideMetaMode

/** @deprecated Use useMetaMode instead */
export const useGodMode = useMetaMode

/** @deprecated Use MetaModeProviderProps instead */
export type GodModeProviderProps = MetaModeProviderProps

export { METAMODE_KEY }
