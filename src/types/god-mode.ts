/**
 * GOD MODE Types
 *
 * TypeScript types for the unified GOD MODE development window.
 * Provides types for window state, tabs, configuration, and component integration.
 *
 * TASK 54: Unified DevMode Window (Phase 9 - GOD MODE)
 *
 * Features:
 * - Window position and size management
 * - Tab system for DevMode panels
 * - Persistent settings
 * - Keyboard shortcuts
 */

import type { QueryLanguage } from './ai-query'

/**
 * Available tabs in GOD MODE window
 */
export type GodModeTab = 'query' | 'context' | 'search' | 'conversation' | 'issues'

/**
 * Tab information for display
 */
export interface GodModeTabInfo {
  /** Tab identifier */
  id: GodModeTab
  /** Display label in Russian */
  labelRu: string
  /** Display label in English */
  labelEn: string
  /** Tab icon (emoji or character) */
  icon: string
  /** Whether the tab is available (some tabs may be pending implementation) */
  available: boolean
  /** Brief description in Russian */
  descriptionRu: string
  /** Brief description in English */
  descriptionEn: string
}

/**
 * All available tabs configuration
 */
export const GOD_MODE_TABS: GodModeTabInfo[] = [
  {
    id: 'query',
    labelRu: 'Запрос',
    labelEn: 'Query',
    icon: '🤖',
    available: true,
    descriptionRu: 'AI-запросы к метаданным компонентов',
    descriptionEn: 'AI queries for component metadata',
  },
  {
    id: 'context',
    labelRu: 'Контекст',
    labelEn: 'Context',
    icon: '🎯',
    available: true,
    descriptionRu: 'Контекстная информация о выбранном компоненте',
    descriptionEn: 'Context information for selected component',
  },
  {
    id: 'search',
    labelRu: 'Поиск',
    labelEn: 'Search',
    icon: '🔍',
    available: true,
    descriptionRu: 'Расширенный поиск компонентов',
    descriptionEn: 'Extended component search',
  },
  {
    id: 'conversation',
    labelRu: 'Диалог',
    labelEn: 'Chat',
    icon: '💬',
    available: false,
    descriptionRu: 'AI-диалог для обсуждения улучшений (TASK 55)',
    descriptionEn: 'AI conversation for discussing improvements (TASK 55)',
  },
  {
    id: 'issues',
    labelRu: 'Задачи',
    labelEn: 'Issues',
    icon: '📝',
    available: false,
    descriptionRu: 'Черновики GitHub Issues (TASK 56)',
    descriptionEn: 'GitHub Issue drafts (TASK 56)',
  },
]

/**
 * Window anchor positions
 */
export type WindowAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/**
 * Window position on screen
 */
export interface WindowPosition {
  /** X coordinate (left offset) */
  x: number
  /** Y coordinate (top offset) */
  y: number
  /** Anchor point for positioning */
  anchor?: WindowAnchor
}

/**
 * Window size constraints and current dimensions
 */
export interface WindowSize {
  /** Current width in pixels */
  width: number
  /** Current height in pixels */
  height: number
  /** Minimum width in pixels */
  minWidth: number
  /** Minimum height in pixels */
  minHeight: number
  /** Maximum width in pixels */
  maxWidth: number
  /** Maximum height in pixels */
  maxHeight: number
}

/**
 * Default window size configuration
 */
export const DEFAULT_WINDOW_SIZE: WindowSize = {
  width: 500,
  height: 600,
  minWidth: 380,
  minHeight: 400,
  maxWidth: 900,
  maxHeight: 900,
}

/**
 * Default window position
 */
export const DEFAULT_WINDOW_POSITION: WindowPosition = {
  x: 20,
  y: 80,
  anchor: 'top-right',
}

/**
 * Window state (open, minimized, pinned)
 */
export type WindowState = 'open' | 'minimized' | 'closed'

/**
 * Keyboard shortcuts configuration
 */
export interface KeyboardShortcuts {
  /** Shortcut to toggle GOD MODE window (default: Ctrl+Shift+G) */
  toggleWindow: string
  /** Shortcut to minimize window */
  minimizeWindow?: string
  /** Shortcut to switch to next tab */
  nextTab?: string
  /** Shortcut to switch to previous tab */
  prevTab?: string
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  toggleWindow: 'Ctrl+Shift+G',
  minimizeWindow: 'Escape',
  nextTab: 'Ctrl+Tab',
  prevTab: 'Ctrl+Shift+Tab',
}

/**
 * GOD MODE window configuration
 */
export interface GodModeConfig {
  /** GitHub repository owner for issue creation (TASK 57) */
  github?: {
    owner: string
    repo: string
    defaultLabels?: string[]
  }
  /** Initial window position */
  position?: WindowPosition
  /** Initial window size */
  size?: Partial<WindowSize>
  /** Visible tabs (default: all available) */
  tabs?: GodModeTab[]
  /** Keyboard shortcuts configuration */
  shortcuts?: Partial<KeyboardShortcuts>
  /** Preferred language for UI */
  preferredLanguage?: QueryLanguage
  /** Whether to remember window state between sessions */
  persistState?: boolean
}

/**
 * Default GOD MODE configuration
 */
export const DEFAULT_GOD_MODE_CONFIG: GodModeConfig = {
  position: DEFAULT_WINDOW_POSITION,
  size: DEFAULT_WINDOW_SIZE,
  tabs: ['query', 'context', 'search'],
  shortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
  preferredLanguage: 'ru',
  persistState: true,
}

/**
 * GOD MODE window state (for persistence)
 */
export interface GodModeWindowState {
  /** Current window state */
  state: WindowState
  /** Current position */
  position: WindowPosition
  /** Current size */
  size: WindowSize
  /** Currently active tab */
  activeTab: GodModeTab
  /** Whether window is pinned (stays on top) */
  isPinned: boolean
  /** Last opened timestamp */
  lastOpened?: string
}

/**
 * Default window state
 */
export const DEFAULT_WINDOW_STATE: GodModeWindowState = {
  state: 'closed',
  position: DEFAULT_WINDOW_POSITION,
  size: DEFAULT_WINDOW_SIZE,
  activeTab: 'query',
  isPinned: false,
}

/**
 * LocalStorage key for GOD MODE state
 */
export const GOD_MODE_STORAGE_KEY = 'isocubic_god_mode_state'

/**
 * Loads GOD MODE state from localStorage
 */
export function loadGodModeState(): GodModeWindowState {
  try {
    const stored = localStorage.getItem(GOD_MODE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_WINDOW_STATE,
        ...parsed,
        position: { ...DEFAULT_WINDOW_POSITION, ...parsed.position },
        size: { ...DEFAULT_WINDOW_SIZE, ...parsed.size },
      }
    }
  } catch (e) {
    console.warn('Failed to load GOD MODE state:', e)
  }
  return DEFAULT_WINDOW_STATE
}

/**
 * Saves GOD MODE state to localStorage
 */
export function saveGodModeState(state: GodModeWindowState): void {
  try {
    localStorage.setItem(GOD_MODE_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Failed to save GOD MODE state:', e)
  }
}

/**
 * Drag operation state
 */
export interface DragState {
  /** Whether dragging is active */
  isDragging: boolean
  /** Starting mouse X position */
  startX: number
  /** Starting mouse Y position */
  startY: number
  /** Starting window X position */
  startWindowX: number
  /** Starting window Y position */
  startWindowY: number
}

/**
 * Resize operation state
 */
export interface ResizeState {
  /** Whether resizing is active */
  isResizing: boolean
  /** Resize edge being dragged */
  edge: 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null
  /** Starting mouse X position */
  startX: number
  /** Starting mouse Y position */
  startY: number
  /** Starting window width */
  startWidth: number
  /** Starting window height */
  startHeight: number
  /** Starting window X position */
  startWindowX: number
  /** Starting window Y position */
  startWindowY: number
}

/**
 * GOD MODE context value interface
 */
export interface GodModeContextValue {
  /** Current window state */
  windowState: GodModeWindowState
  /** Configuration */
  config: GodModeConfig
  /** Open the GOD MODE window */
  openWindow: () => void
  /** Close the GOD MODE window */
  closeWindow: () => void
  /** Minimize the GOD MODE window */
  minimizeWindow: () => void
  /** Toggle window state (open/closed) */
  toggleWindow: () => void
  /** Switch to a specific tab */
  setActiveTab: (tab: GodModeTab) => void
  /** Update window position */
  setPosition: (position: WindowPosition) => void
  /** Update window size */
  setSize: (size: Partial<WindowSize>) => void
  /** Toggle pin state */
  togglePin: () => void
  /** Reset to default state */
  resetState: () => void
  /** Whether window is currently visible */
  isVisible: boolean
}

/**
 * Validates a GOD MODE tab ID
 */
export function isValidTab(tab: string): tab is GodModeTab {
  return ['query', 'context', 'search', 'conversation', 'issues'].includes(tab)
}

/**
 * Gets tab info by ID
 */
export function getTabInfo(tabId: GodModeTab): GodModeTabInfo | undefined {
  return GOD_MODE_TABS.find((tab) => tab.id === tabId)
}

/**
 * Gets available tabs based on config
 */
export function getAvailableTabs(config?: GodModeConfig): GodModeTabInfo[] {
  const configTabs = config?.tabs || DEFAULT_GOD_MODE_CONFIG.tabs
  return GOD_MODE_TABS.filter(
    (tab) => tab.available && (!configTabs || configTabs.includes(tab.id))
  )
}

/**
 * Clamps a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Ensures window position is within viewport bounds
 */
export function constrainPosition(
  position: WindowPosition,
  size: WindowSize,
  viewportWidth: number,
  viewportHeight: number
): WindowPosition {
  const padding = 20
  return {
    ...position,
    x: clamp(position.x, padding, viewportWidth - size.width - padding),
    y: clamp(position.y, padding, viewportHeight - size.height - padding),
  }
}

/**
 * Ensures window size is within constraints
 */
export function constrainSize(size: Partial<WindowSize>): WindowSize {
  const base = { ...DEFAULT_WINDOW_SIZE, ...size }
  return {
    ...base,
    width: clamp(base.width, base.minWidth, base.maxWidth),
    height: clamp(base.height, base.minHeight, base.maxHeight),
  }
}

/**
 * Parses keyboard shortcut string into key components
 */
export function parseShortcut(shortcut: string): {
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
  key: string
} {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts[parts.length - 1]

  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key,
  }
}

/**
 * Checks if a keyboard event matches a shortcut
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parsed = parseShortcut(shortcut)
  return (
    (parsed.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey) &&
    parsed.shift === event.shiftKey &&
    parsed.alt === event.altKey &&
    event.key.toLowerCase() === parsed.key
  )
}
