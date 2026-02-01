/**
 * Unit tests for useWindowManager composable
 * Tests window state management: positions, sizes, z-order, minimize, close, localStorage
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useWindowManager } from './useWindowManager'
import type { WindowDefinition } from './useWindowManager'

const mockDefinitions: WindowDefinition[] = [
  {
    id: 'gallery',
    title: 'Gallery',
    icon: '\uD83C\uDFA8',
    defaultX: 20,
    defaultY: 100,
    defaultWidth: 380,
    defaultHeight: 500,
    minWidth: 280,
    minHeight: 300,
  },
  {
    id: 'preview',
    title: 'Preview',
    icon: '\uD83D\uDC41',
    defaultX: 420,
    defaultY: 100,
    defaultWidth: 500,
    defaultHeight: 400,
    minWidth: 300,
    minHeight: 250,
  },
  {
    id: 'editor',
    title: 'Editor',
    icon: '\u270F\uFE0F',
    defaultX: 940,
    defaultY: 100,
    defaultWidth: 400,
    defaultHeight: 300,
  },
]

describe('useWindowManager — Initialization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should create windows from definitions', () => {
    const wm = useWindowManager(mockDefinitions)
    expect(wm.windows.value.size).toBe(3)
  })

  it('should set default positions and sizes', () => {
    const wm = useWindowManager(mockDefinitions)
    const gallery = wm.getWindow('gallery')
    expect(gallery).toBeDefined()
    expect(gallery!.x).toBe(20)
    expect(gallery!.y).toBe(100)
    expect(gallery!.width).toBe(380)
    expect(gallery!.height).toBe(500)
  })

  it('should set default minWidth/minHeight', () => {
    const wm = useWindowManager(mockDefinitions)
    const editor = wm.getWindow('editor')
    expect(editor!.minWidth).toBe(200) // default
    expect(editor!.minHeight).toBe(150) // default
  })

  it('should set custom minWidth/minHeight', () => {
    const wm = useWindowManager(mockDefinitions)
    const gallery = wm.getWindow('gallery')
    expect(gallery!.minWidth).toBe(280)
    expect(gallery!.minHeight).toBe(300)
  })

  it('should initialize windows as open and not minimized', () => {
    const wm = useWindowManager(mockDefinitions)
    const gallery = wm.getWindow('gallery')
    expect(gallery!.isOpen).toBe(true)
    expect(gallery!.isMinimized).toBe(false)
  })
})

describe('useWindowManager — Window Operations', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should move a window', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.moveWindow('gallery', 100, 200)
    const gallery = wm.getWindow('gallery')
    expect(gallery!.x).toBe(100)
    expect(gallery!.y).toBe(200)
  })

  it('should clamp position to >= 0', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.moveWindow('gallery', -50, -100)
    const gallery = wm.getWindow('gallery')
    expect(gallery!.x).toBe(0)
    expect(gallery!.y).toBe(0)
  })

  it('should resize a window', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.resizeWindow('gallery', 600, 700)
    const gallery = wm.getWindow('gallery')
    expect(gallery!.width).toBe(600)
    expect(gallery!.height).toBe(700)
  })

  it('should enforce minimum size on resize', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.resizeWindow('gallery', 100, 50)
    const gallery = wm.getWindow('gallery')
    expect(gallery!.width).toBe(280) // minWidth
    expect(gallery!.height).toBe(300) // minHeight
  })

  it('should minimize a window', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.minimizeWindow('gallery')
    const gallery = wm.getWindow('gallery')
    expect(gallery!.isMinimized).toBe(true)
    expect(gallery!.isOpen).toBe(true)
  })

  it('should restore a minimized window', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.minimizeWindow('gallery')
    wm.restoreWindow('gallery')
    const gallery = wm.getWindow('gallery')
    expect(gallery!.isMinimized).toBe(false)
  })

  it('should close a window', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.closeWindow('gallery')
    const gallery = wm.getWindow('gallery')
    expect(gallery!.isOpen).toBe(false)
  })

  it('should open a closed window', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.closeWindow('gallery')
    wm.openWindow('gallery')
    const gallery = wm.getWindow('gallery')
    expect(gallery!.isOpen).toBe(true)
    expect(gallery!.isMinimized).toBe(false)
  })

  it('should toggle window open/close', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.toggleWindow('gallery')
    expect(wm.getWindow('gallery')!.isOpen).toBe(false)
    wm.toggleWindow('gallery')
    expect(wm.getWindow('gallery')!.isOpen).toBe(true)
  })
})

describe('useWindowManager — Z-Order', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should bring window to front', () => {
    const wm = useWindowManager(mockDefinitions)
    const initialZ = wm.getWindow('gallery')!.zIndex
    wm.bringToFront('gallery')
    expect(wm.getWindow('gallery')!.zIndex).toBeGreaterThan(initialZ)
  })

  it('should set highest z-index when bringing to front', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.bringToFront('gallery')
    const galleryZ = wm.getWindow('gallery')!.zIndex
    const previewZ = wm.getWindow('preview')!.zIndex
    const editorZ = wm.getWindow('editor')!.zIndex
    expect(galleryZ).toBeGreaterThan(previewZ)
    expect(galleryZ).toBeGreaterThan(editorZ)
  })
})

describe('useWindowManager — Computed Lists', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return visible windows (open and not minimized)', () => {
    const wm = useWindowManager(mockDefinitions)
    expect(wm.visibleWindows.value.length).toBe(3)
  })

  it('should exclude minimized from visible', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.minimizeWindow('gallery')
    expect(wm.visibleWindows.value.length).toBe(2)
    expect(wm.visibleWindows.value.find((w) => w.id === 'gallery')).toBeUndefined()
  })

  it('should exclude closed from visible', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.closeWindow('gallery')
    expect(wm.visibleWindows.value.length).toBe(2)
  })

  it('should list minimized windows', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.minimizeWindow('gallery')
    expect(wm.minimizedWindows.value.length).toBe(1)
    expect(wm.minimizedWindows.value[0].id).toBe('gallery')
  })

  it('should list closed windows', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.closeWindow('gallery')
    wm.closeWindow('preview')
    expect(wm.closedWindows.value.length).toBe(2)
  })
})

describe('useWindowManager — localStorage Persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should save state to localStorage', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.moveWindow('gallery', 200, 300)
    const saved = localStorage.getItem('isocubic-window-layout')
    expect(saved).not.toBeNull()
    const parsed = JSON.parse(saved!)
    expect(parsed.gallery.x).toBe(200)
    expect(parsed.gallery.y).toBe(300)
  })

  it('should restore state from localStorage', () => {
    const data = {
      gallery: { x: 200, y: 300, width: 400, height: 600, isOpen: true, isMinimized: false },
    }
    localStorage.setItem('isocubic-window-layout', JSON.stringify(data))

    const wm = useWindowManager(mockDefinitions)
    const gallery = wm.getWindow('gallery')
    expect(gallery!.x).toBe(200)
    expect(gallery!.y).toBe(300)
    expect(gallery!.width).toBe(400)
    expect(gallery!.height).toBe(600)
  })

  it('should use defaults when localStorage has no data for a window', () => {
    const data = { gallery: { x: 200, y: 300 } }
    localStorage.setItem('isocubic-window-layout', JSON.stringify(data))

    const wm = useWindowManager(mockDefinitions)
    const preview = wm.getWindow('preview')
    expect(preview!.x).toBe(420) // default
    expect(preview!.y).toBe(100) // default
  })

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('isocubic-window-layout', 'not-json')
    const wm = useWindowManager(mockDefinitions)
    expect(wm.windows.value.size).toBe(3)
  })
})

describe('useWindowManager — Reset Layout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should reset all windows to default positions', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.moveWindow('gallery', 999, 999)
    wm.closeWindow('preview')
    wm.minimizeWindow('editor')

    wm.resetLayout()

    expect(wm.getWindow('gallery')!.x).toBe(20)
    expect(wm.getWindow('gallery')!.y).toBe(100)
    expect(wm.getWindow('preview')!.isOpen).toBe(true)
    expect(wm.getWindow('editor')!.isMinimized).toBe(false)
  })

  it('should clear localStorage on reset', () => {
    const wm = useWindowManager(mockDefinitions)
    wm.moveWindow('gallery', 999, 999)
    wm.resetLayout()
    expect(localStorage.getItem('isocubic-window-layout')).toBeNull()
  })
})

describe('useWindowManager — Edge Cases', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should handle operations on non-existent window id', () => {
    const wm = useWindowManager(mockDefinitions)
    // Should not throw
    wm.moveWindow('nonexistent', 100, 100)
    wm.resizeWindow('nonexistent', 500, 500)
    wm.minimizeWindow('nonexistent')
    wm.restoreWindow('nonexistent')
    wm.closeWindow('nonexistent')
    wm.openWindow('nonexistent')
    wm.bringToFront('nonexistent')
    expect(wm.getWindow('nonexistent')).toBeUndefined()
  })

  it('should handle empty definitions', () => {
    const wm = useWindowManager([])
    expect(wm.windows.value.size).toBe(0)
    expect(wm.visibleWindows.value.length).toBe(0)
  })
})
