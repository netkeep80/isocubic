/**
 * Unit tests for window-layout-manager
 * Tests tile, cascade, horizontal, vertical layout strategies
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  calculateTileLayout,
  calculateCascadeLayout,
  calculateHorizontalLayout,
  calculateVerticalLayout,
  calculateLayout,
} from './window-layout-manager'
import type { WindowState } from '../composables/useWindowManager'

function mockWindow(id: string, minWidth = 200, minHeight = 150): WindowState {
  return {
    id,
    title: id,
    icon: '',
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    minWidth,
    minHeight,
    isOpen: true,
    isMinimized: false,
    zIndex: 100,
  }
}

const defaultOptions = {
  workspaceWidth: 1200,
  workspaceHeight: 800,
}

describe('calculateTileLayout', () => {
  it('should return empty array for empty windows', () => {
    expect(calculateTileLayout([], defaultOptions)).toEqual([])
  })

  it('should layout a single window filling the workspace', () => {
    const windows = [mockWindow('a')]
    const result = calculateTileLayout(windows, defaultOptions)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
    expect(result[0].x).toBeGreaterThanOrEqual(0)
    expect(result[0].y).toBeGreaterThanOrEqual(0)
    expect(result[0].width).toBeGreaterThan(0)
    expect(result[0].height).toBeGreaterThan(0)
  })

  it('should layout 4 windows in a 2x2 grid', () => {
    const windows = [mockWindow('a'), mockWindow('b'), mockWindow('c'), mockWindow('d')]
    const result = calculateTileLayout(windows, defaultOptions)
    expect(result).toHaveLength(4)
    // Each window should have unique positions
    const positions = result.map((r) => `${r.x},${r.y}`)
    const uniquePositions = new Set(positions)
    expect(uniquePositions.size).toBe(4)
  })

  it('should respect minimum sizes', () => {
    const windows = [mockWindow('a', 500, 400)]
    const result = calculateTileLayout(windows, { workspaceWidth: 300, workspaceHeight: 200 })
    expect(result[0].width).toBeGreaterThanOrEqual(500)
    expect(result[0].height).toBeGreaterThanOrEqual(400)
  })

  it('should respect gap and topOffset options', () => {
    const windows = [mockWindow('a')]
    const result = calculateTileLayout(windows, {
      ...defaultOptions,
      gap: 20,
      topOffset: 60,
    })
    expect(result[0].x).toBeGreaterThanOrEqual(20)
    expect(result[0].y).toBeGreaterThanOrEqual(60)
  })
})

describe('calculateCascadeLayout', () => {
  it('should return empty array for empty windows', () => {
    expect(calculateCascadeLayout([], defaultOptions)).toEqual([])
  })

  it('should offset each window diagonally', () => {
    const windows = [mockWindow('a'), mockWindow('b'), mockWindow('c')]
    const result = calculateCascadeLayout(windows, defaultOptions)
    expect(result).toHaveLength(3)
    // Each subsequent window should be offset
    for (let i = 1; i < result.length; i++) {
      expect(result[i].x).toBeGreaterThan(result[i - 1].x)
      expect(result[i].y).toBeGreaterThan(result[i - 1].y)
    }
  })

  it('should use custom cascadeOffset', () => {
    const windows = [mockWindow('a'), mockWindow('b')]
    const result = calculateCascadeLayout(windows, {
      ...defaultOptions,
      cascadeOffset: 50,
    })
    const xDiff = result[1].x - result[0].x
    expect(xDiff).toBe(50)
  })
})

describe('calculateHorizontalLayout', () => {
  it('should return empty array for empty windows', () => {
    expect(calculateHorizontalLayout([], defaultOptions)).toEqual([])
  })

  it('should arrange windows side by side', () => {
    const windows = [mockWindow('a'), mockWindow('b')]
    const result = calculateHorizontalLayout(windows, defaultOptions)
    expect(result).toHaveLength(2)
    // Windows should be at same y but different x
    expect(result[0].y).toBe(result[1].y)
    expect(result[1].x).toBeGreaterThan(result[0].x)
  })

  it('should give equal width to each window', () => {
    const windows = [mockWindow('a'), mockWindow('b'), mockWindow('c')]
    const result = calculateHorizontalLayout(windows, defaultOptions)
    // All widths should be the same
    expect(result[0].width).toBe(result[1].width)
    expect(result[1].width).toBe(result[2].width)
  })
})

describe('calculateVerticalLayout', () => {
  it('should return empty array for empty windows', () => {
    expect(calculateVerticalLayout([], defaultOptions)).toEqual([])
  })

  it('should stack windows top to bottom', () => {
    const windows = [mockWindow('a'), mockWindow('b')]
    const result = calculateVerticalLayout(windows, defaultOptions)
    expect(result).toHaveLength(2)
    // Windows should be at same x but different y
    expect(result[0].x).toBe(result[1].x)
    expect(result[1].y).toBeGreaterThan(result[0].y)
  })

  it('should give equal height to each window', () => {
    const windows = [mockWindow('a'), mockWindow('b'), mockWindow('c')]
    const result = calculateVerticalLayout(windows, defaultOptions)
    expect(result[0].height).toBe(result[1].height)
    expect(result[1].height).toBe(result[2].height)
  })
})

describe('calculateLayout', () => {
  it('should dispatch to tile strategy', () => {
    const windows = [mockWindow('a')]
    const result = calculateLayout('tile', windows, defaultOptions)
    expect(result).toHaveLength(1)
  })

  it('should dispatch to cascade strategy', () => {
    const windows = [mockWindow('a'), mockWindow('b')]
    const result = calculateLayout('cascade', windows, defaultOptions)
    expect(result).toHaveLength(2)
  })

  it('should dispatch to horizontal strategy', () => {
    const windows = [mockWindow('a')]
    const result = calculateLayout('horizontal', windows, defaultOptions)
    expect(result).toHaveLength(1)
  })

  it('should dispatch to vertical strategy', () => {
    const windows = [mockWindow('a')]
    const result = calculateLayout('vertical', windows, defaultOptions)
    expect(result).toHaveLength(1)
  })

  it('should default to tile for unknown strategy', () => {
    const windows = [mockWindow('a')]
    const result = calculateLayout('unknown' as any, windows, defaultOptions)
    expect(result).toHaveLength(1)
  })
})
