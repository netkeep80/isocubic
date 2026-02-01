/**
 * Window Layout Manager for isocubic
 * Provides automatic window arrangement strategies: tile, cascade, minimize all, restore all
 *
 * Phase 11, TASK 77: Extended command bar functionality
 */

import type { WindowState } from '../composables/useWindowManager'

/** Layout strategy type */
export type LayoutStrategy = 'tile' | 'cascade' | 'horizontal' | 'vertical'

/** Options for layout calculation */
export interface LayoutOptions {
  /** Available workspace width (px) */
  workspaceWidth: number
  /** Available workspace height (px) */
  workspaceHeight: number
  /** Gap between windows (px) */
  gap?: number
  /** Offset for cascade starting position (px) */
  cascadeOffset?: number
  /** Top offset for workspace area (below header, px) */
  topOffset?: number
}

/** Calculated position and size for a window */
export interface LayoutResult {
  id: string
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_GAP = 8
const DEFAULT_CASCADE_OFFSET = 30
const DEFAULT_TOP_OFFSET = 0

/**
 * Calculate tile layout — windows arranged in a grid filling the workspace
 */
export function calculateTileLayout(
  windows: WindowState[],
  options: LayoutOptions
): LayoutResult[] {
  if (windows.length === 0) return []

  const gap = options.gap ?? DEFAULT_GAP
  const topOffset = options.topOffset ?? DEFAULT_TOP_OFFSET
  const count = windows.length

  // Calculate grid dimensions (try to make it roughly square)
  const cols = Math.ceil(Math.sqrt(count))
  const rows = Math.ceil(count / cols)

  const cellWidth = Math.floor((options.workspaceWidth - gap * (cols + 1)) / cols)
  const cellHeight = Math.floor((options.workspaceHeight - topOffset - gap * (rows + 1)) / rows)

  return windows.map((win, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)

    return {
      id: win.id,
      x: gap + col * (cellWidth + gap),
      y: topOffset + gap + row * (cellHeight + gap),
      width: Math.max(win.minWidth, cellWidth),
      height: Math.max(win.minHeight, cellHeight),
    }
  })
}

/**
 * Calculate cascade layout — windows offset diagonally
 */
export function calculateCascadeLayout(
  windows: WindowState[],
  options: LayoutOptions
): LayoutResult[] {
  if (windows.length === 0) return []

  const offset = options.cascadeOffset ?? DEFAULT_CASCADE_OFFSET
  const topOffset = options.topOffset ?? DEFAULT_TOP_OFFSET
  const gap = options.gap ?? DEFAULT_GAP

  // Default window size: 60% of workspace
  const defaultWidth = Math.floor(options.workspaceWidth * 0.6)
  const defaultHeight = Math.floor((options.workspaceHeight - topOffset) * 0.6)

  return windows.map((win, index) => {
    const x = gap + index * offset
    const y = topOffset + gap + index * offset

    // Wrap around if windows go off screen
    const maxX = options.workspaceWidth - 200
    const maxY = options.workspaceHeight - 150
    const wrappedX = x > maxX ? gap + ((index * offset) % maxX) : x
    const wrappedY = y > maxY ? topOffset + gap + ((index * offset) % (maxY - topOffset)) : y

    return {
      id: win.id,
      x: wrappedX,
      y: wrappedY,
      width: Math.max(
        win.minWidth,
        Math.min(defaultWidth, options.workspaceWidth - wrappedX - gap)
      ),
      height: Math.max(
        win.minHeight,
        Math.min(defaultHeight, options.workspaceHeight - wrappedY - gap)
      ),
    }
  })
}

/**
 * Calculate horizontal split layout — windows arranged side by side
 */
export function calculateHorizontalLayout(
  windows: WindowState[],
  options: LayoutOptions
): LayoutResult[] {
  if (windows.length === 0) return []

  const gap = options.gap ?? DEFAULT_GAP
  const topOffset = options.topOffset ?? DEFAULT_TOP_OFFSET
  const count = windows.length

  const cellWidth = Math.floor((options.workspaceWidth - gap * (count + 1)) / count)
  const cellHeight = options.workspaceHeight - topOffset - gap * 2

  return windows.map((win, index) => ({
    id: win.id,
    x: gap + index * (cellWidth + gap),
    y: topOffset + gap,
    width: Math.max(win.minWidth, cellWidth),
    height: Math.max(win.minHeight, cellHeight),
  }))
}

/**
 * Calculate vertical split layout — windows stacked top to bottom
 */
export function calculateVerticalLayout(
  windows: WindowState[],
  options: LayoutOptions
): LayoutResult[] {
  if (windows.length === 0) return []

  const gap = options.gap ?? DEFAULT_GAP
  const topOffset = options.topOffset ?? DEFAULT_TOP_OFFSET
  const count = windows.length

  const cellWidth = options.workspaceWidth - gap * 2
  const cellHeight = Math.floor((options.workspaceHeight - topOffset - gap * (count + 1)) / count)

  return windows.map((win, index) => ({
    id: win.id,
    x: gap,
    y: topOffset + gap + index * (cellHeight + gap),
    width: Math.max(win.minWidth, cellWidth),
    height: Math.max(win.minHeight, cellHeight),
  }))
}

/**
 * Calculate layout based on strategy name
 */
export function calculateLayout(
  strategy: LayoutStrategy,
  windows: WindowState[],
  options: LayoutOptions
): LayoutResult[] {
  switch (strategy) {
    case 'tile':
      return calculateTileLayout(windows, options)
    case 'cascade':
      return calculateCascadeLayout(windows, options)
    case 'horizontal':
      return calculateHorizontalLayout(windows, options)
    case 'vertical':
      return calculateVerticalLayout(windows, options)
    default:
      return calculateTileLayout(windows, options)
  }
}
