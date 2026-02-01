/**
 * Window manager composable for isocubic
 * Manages window state: positions, sizes, z-order, minimize/close, localStorage persistence
 *
 * Phase 11: New user interface with window manager
 */

import { ref, computed } from 'vue'

/** Window state for a single window */
export interface WindowState {
  id: string
  title: string
  icon: string
  x: number
  y: number
  width: number
  height: number
  minWidth: number
  minHeight: number
  isOpen: boolean
  isMinimized: boolean
  zIndex: number
}

/** Window definition for registration */
export interface WindowDefinition {
  id: string
  title: string
  icon: string
  defaultX: number
  defaultY: number
  defaultWidth: number
  defaultHeight: number
  minWidth?: number
  minHeight?: number
}

const STORAGE_KEY = 'isocubic-window-layout'

/** Top z-index counter (shared across all instances) */
let topZIndex = 100

/**
 * Serialize window states to localStorage
 */
function saveToStorage(windows: Map<string, WindowState>): void {
  try {
    const data: Record<string, Omit<WindowState, 'id' | 'title' | 'icon'>> = {}
    for (const [id, state] of windows) {
      data[id] = {
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height,
        minWidth: state.minWidth,
        minHeight: state.minHeight,
        isOpen: state.isOpen,
        isMinimized: state.isMinimized,
        zIndex: state.zIndex,
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Load window states from localStorage
 */
function loadFromStorage(): Record<string, Partial<WindowState>> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Composable for managing window layout state
 */
export function useWindowManager(definitions: WindowDefinition[]) {
  const windows = ref<Map<string, WindowState>>(new Map())

  /** Initialize windows from definitions + localStorage */
  function initialize(): void {
    const saved = loadFromStorage()
    const map = new Map<string, WindowState>()

    for (const def of definitions) {
      const savedState = saved?.[def.id]
      const state: WindowState = {
        id: def.id,
        title: def.title,
        icon: def.icon,
        x: savedState?.x ?? def.defaultX,
        y: savedState?.y ?? def.defaultY,
        width: savedState?.width ?? def.defaultWidth,
        height: savedState?.height ?? def.defaultHeight,
        minWidth: def.minWidth ?? 200,
        minHeight: def.minHeight ?? 150,
        isOpen: savedState?.isOpen ?? true,
        isMinimized: savedState?.isMinimized ?? false,
        zIndex: savedState?.zIndex ?? topZIndex++,
      }
      map.set(def.id, state)
    }

    windows.value = map
  }

  /** Get all open (non-minimized) windows sorted by z-index */
  const visibleWindows = computed(() => {
    const result: WindowState[] = []
    for (const state of windows.value.values()) {
      if (state.isOpen && !state.isMinimized) {
        result.push(state)
      }
    }
    return result.sort((a, b) => a.zIndex - b.zIndex)
  })

  /** Get all minimized windows */
  const minimizedWindows = computed(() => {
    const result: WindowState[] = []
    for (const state of windows.value.values()) {
      if (state.isOpen && state.isMinimized) {
        result.push(state)
      }
    }
    return result
  })

  /** Get all closed windows */
  const closedWindows = computed(() => {
    const result: WindowState[] = []
    for (const state of windows.value.values()) {
      if (!state.isOpen) {
        result.push(state)
      }
    }
    return result
  })

  /** Bring window to front */
  function bringToFront(id: string): void {
    const state = windows.value.get(id)
    if (!state) return
    topZIndex++
    state.zIndex = topZIndex
    persist()
  }

  /** Move window */
  function moveWindow(id: string, x: number, y: number): void {
    const state = windows.value.get(id)
    if (!state) return
    state.x = Math.max(0, x)
    state.y = Math.max(0, y)
    persist()
  }

  /** Resize window */
  function resizeWindow(id: string, width: number, height: number): void {
    const state = windows.value.get(id)
    if (!state) return
    state.width = Math.max(state.minWidth, width)
    state.height = Math.max(state.minHeight, height)
    persist()
  }

  /** Minimize window */
  function minimizeWindow(id: string): void {
    const state = windows.value.get(id)
    if (!state) return
    state.isMinimized = true
    persist()
  }

  /** Restore minimized window */
  function restoreWindow(id: string): void {
    const state = windows.value.get(id)
    if (!state) return
    state.isMinimized = false
    bringToFront(id)
  }

  /** Close window */
  function closeWindow(id: string): void {
    const state = windows.value.get(id)
    if (!state) return
    state.isOpen = false
    state.isMinimized = false
    persist()
  }

  /** Open a closed window */
  function openWindow(id: string): void {
    const state = windows.value.get(id)
    if (!state) return
    state.isOpen = true
    state.isMinimized = false
    bringToFront(id)
  }

  /** Toggle window open/close */
  function toggleWindow(id: string): void {
    const state = windows.value.get(id)
    if (!state) return
    if (state.isOpen) {
      closeWindow(id)
    } else {
      openWindow(id)
    }
  }

  /** Reset all windows to default positions */
  function resetLayout(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    topZIndex = 100
    initialize()
  }

  /** Get window state by id */
  function getWindow(id: string): WindowState | undefined {
    return windows.value.get(id)
  }

  /** Persist to localStorage (debounced internally by watchers) */
  function persist(): void {
    saveToStorage(windows.value)
  }

  // Initialize on creation
  initialize()

  return {
    windows,
    visibleWindows,
    minimizedWindows,
    closedWindows,
    bringToFront,
    moveWindow,
    resizeWindow,
    minimizeWindow,
    restoreWindow,
    closeWindow,
    openWindow,
    toggleWindow,
    resetLayout,
    getWindow,
  }
}
