/**
 * MetaMode Store (Pinia)
 *
 * Provides a Pinia store for enabling MetaMode (unified Developer Mode) throughout
 * the application. When MetaMode is enabled, components display their metadata and
 * development information via tooltips and overlays, and the MetaMode window
 * becomes available.
 *
 * TASK 40: Developer Mode System (Phase 6 - Developer Experience)
 * TASK 61: Migrated from React Context to Pinia store (Phase 10 - Vue.js 3.0 Migration)
 * TASK 72: Unified DevMode + GodMode → MetaMode (Phase 12)
 *
 * Features:
 * - Toggle MetaMode on/off via UI or keyboard shortcut (Ctrl+Shift+M)
 * - Persist preference in localStorage
 * - Configure verbosity level (minimal, normal, verbose)
 * - Enable/disable specific metadata categories
 */

import { ref, computed, watch, onMounted, onUnmounted, type ComputedRef } from 'vue'
import { defineStore } from 'pinia'

/**
 * Verbosity level for metadata display
 */
export type MetaModeVerbosity = 'minimal' | 'normal' | 'verbose'

/**
 * Categories of metadata that can be shown/hidden
 */
export interface MetaModeCategories {
  /** Show basic info (name, summary, status) */
  basic: boolean
  /** Show component history */
  history: boolean
  /** Show feature list */
  features: boolean
  /** Show dependencies */
  dependencies: boolean
  /** Show related files */
  relatedFiles: boolean
  /** Show props documentation */
  props: boolean
  /** Show tips and known issues */
  tips: boolean
}

/**
 * Default category settings
 */
const DEFAULT_CATEGORIES: MetaModeCategories = {
  basic: true,
  history: true,
  features: true,
  dependencies: false,
  relatedFiles: false,
  props: false,
  tips: true,
}

/**
 * MetaMode settings interface
 */
export interface MetaModeSettings {
  /** Whether MetaMode is enabled */
  enabled: boolean
  /** Verbosity level */
  verbosity: MetaModeVerbosity
  /** Categories to display */
  categories: MetaModeCategories
  /** Show component outline/highlight */
  showOutline: boolean
  /** Show floating info panel on hover */
  showHoverInfo: boolean
  /** Position for info panels */
  panelPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

/**
 * Default MetaMode settings
 */
const DEFAULT_SETTINGS: MetaModeSettings = {
  enabled: false,
  verbosity: 'normal',
  categories: DEFAULT_CATEGORIES,
  showOutline: true,
  showHoverInfo: true,
  panelPosition: 'top-right',
}

/**
 * LocalStorage key for persisting MetaMode settings
 */
const STORAGE_KEY = 'isocubic_metamode_settings'

/**
 * Legacy storage key for migration
 */
const LEGACY_STORAGE_KEY = 'isocubic_devmode_settings'

/**
 * Load settings from localStorage (with migration from legacy key)
 */
function loadSettings(): MetaModeSettings {
  try {
    // Try new key first
    let stored = localStorage.getItem(STORAGE_KEY)

    // Migrate from legacy key if new key not found
    if (!stored) {
      stored = localStorage.getItem(LEGACY_STORAGE_KEY)
      if (stored) {
        // Migrate to new key
        localStorage.setItem(STORAGE_KEY, stored)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      }
    }

    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        categories: {
          ...DEFAULT_CATEGORIES,
          ...parsed.categories,
        },
      }
    }
  } catch (e) {
    console.warn('Failed to load MetaMode settings:', e)
  }
  return DEFAULT_SETTINGS
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: MetaModeSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch (e) {
    console.warn('Failed to save MetaMode settings:', e)
  }
}

/**
 * MetaMode context value interface (preserved for API compatibility)
 */
export interface MetaModeContextValue {
  /** Current settings */
  settings: MetaModeSettings
  /** Toggle MetaMode on/off */
  toggleMetaMode: () => void
  /** Update settings */
  updateSettings: (updates: Partial<MetaModeSettings>) => void
  /** Update a specific category */
  updateCategory: (category: keyof MetaModeCategories, enabled: boolean) => void
  /** Reset to default settings */
  resetSettings: () => void
  /** Check if MetaMode is enabled */
  isEnabled: boolean
}

/**
 * Pinia store for MetaMode
 */
export const useMetaModeStore = defineStore('metaMode', () => {
  const settings = ref<MetaModeSettings>(loadSettings())

  /** ID of the component currently hovered by the mouse pointer */
  const hoveredComponentId = ref<string | null>(null)

  /** ID of the component selected by click (for MetaMode inspection) */
  const selectedComponentId = ref<string | null>(null)

  // Persist settings changes
  watch(
    settings,
    (newSettings) => {
      saveSettings(newSettings)
    },
    { deep: true }
  )

  function toggleMetaMode() {
    settings.value = {
      ...settings.value,
      enabled: !settings.value.enabled,
    }
  }

  function updateSettings(updates: Partial<MetaModeSettings>) {
    settings.value = {
      ...settings.value,
      ...updates,
    }
  }

  function updateCategory(category: keyof MetaModeCategories, enabled: boolean) {
    settings.value = {
      ...settings.value,
      categories: {
        ...settings.value.categories,
        [category]: enabled,
      },
    }
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
  }

  function setHoveredComponent(componentId: string | null) {
    hoveredComponentId.value = componentId
  }

  function setSelectedComponent(componentId: string | null) {
    selectedComponentId.value = componentId
  }

  return {
    settings,
    hoveredComponentId,
    selectedComponentId,
    toggleMetaMode,
    updateSettings,
    updateCategory,
    resetSettings,
    setHoveredComponent,
    setSelectedComponent,
  }
})

/**
 * Composable to set up MetaMode keyboard shortcut (Ctrl+Shift+M)
 *
 * Call this in your root App.vue or layout component to enable the shortcut.
 */
export function useMetaModeKeyboard() {
  const store = useMetaModeStore()

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
      e.preventDefault()
      store.toggleMetaMode()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return store
}

/**
 * Composable to access MetaMode state (convenience wrapper)
 *
 * @returns MetaMode context value compatible with the previous API
 */
export function useMetaMode(): MetaModeContextValue {
  const store = useMetaModeStore()
  return {
    get settings() {
      return store.settings
    },
    toggleMetaMode: store.toggleMetaMode,
    updateSettings: store.updateSettings,
    updateCategory: store.updateCategory,
    resetSettings: store.resetSettings,
    get isEnabled() {
      return store.settings.enabled
    },
  }
}

/**
 * Composable to check if MetaMode is enabled
 *
 * Returns a ComputedRef<boolean> that reactively tracks the enabled state.
 */
export function useIsMetaModeEnabled(): ComputedRef<boolean> {
  const store = useMetaModeStore()
  return computed(() => store.settings.enabled)
}

/**
 * Composable to get MetaMode settings
 *
 * Returns a ComputedRef<MetaModeSettings> that reactively tracks all settings.
 */
export function useMetaModeSettings(): ComputedRef<MetaModeSettings> {
  const store = useMetaModeStore()
  return computed(() => store.settings)
}

/**
 * Composable to get the currently hovered component ID
 *
 * Returns a ComputedRef<string | null> that reactively tracks the hovered component.
 */
export function useHoveredComponentId(): ComputedRef<string | null> {
  const store = useMetaModeStore()
  return computed(() => store.hoveredComponentId)
}

/**
 * Composable to get the currently selected (clicked) component ID
 *
 * Returns a ComputedRef<string | null> that reactively tracks the selected component.
 */
export function useSelectedComponentId(): ComputedRef<string | null> {
  const store = useMetaModeStore()
  return computed(() => store.selectedComponentId)
}

// =============================================================================
// Backward Compatibility Aliases (deprecated)
// =============================================================================

/** @deprecated Use MetaModeVerbosity instead */
export type DevModeVerbosity = MetaModeVerbosity

/** @deprecated Use MetaModeCategories instead */
export type DevModeCategories = MetaModeCategories

/** @deprecated Use MetaModeSettings instead */
export type DevModeSettings = MetaModeSettings

/** @deprecated Use MetaModeContextValue instead */
export type DevModeContextValue = MetaModeContextValue

/** @deprecated Use useMetaModeStore instead */
export const useDevModeStore = useMetaModeStore

/** @deprecated Use useMetaModeKeyboard instead */
export const useDevModeKeyboard = useMetaModeKeyboard

/** @deprecated Use useMetaMode instead */
export const useDevMode = useMetaMode

/** @deprecated Use useIsMetaModeEnabled instead */
export const useIsDevModeEnabled = useIsMetaModeEnabled

/** @deprecated Use useMetaModeSettings instead */
export const useDevModeSettings = useMetaModeSettings

export default useMetaModeStore
