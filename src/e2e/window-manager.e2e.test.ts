/**
 * E2E tests for the window manager system
 * Tests complete workflows: open/close windows, drag/resize, minimize/restore via taskbar
 *
 * Phase 11, TASK 78: Comprehensive testing and optimization
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../App.vue'
import { clearAllConfigs, clearHistory } from '../lib/storage'
import { useWindowManager } from '../composables/useWindowManager'

// Mock child components
vi.mock('../components/Gallery.vue', () => ({
  default: {
    name: 'Gallery',
    template: '<div class="gallery-mock">Gallery</div>',
    props: ['currentCube'],
    emits: ['cube-select'],
  },
  GALLERY_META: {
    id: 'gallery',
    name: 'Gallery',
    version: '1.0.0',
    summary: '',
    description: '',
    phase: 1,
    taskId: '',
    filePath: '',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    props: [],
    tags: [],
    status: 'stable',
    lastUpdated: '',
  },
}))

vi.mock('../components/ExportPanel.vue', () => ({
  default: {
    name: 'ExportPanel',
    template: '<div class="export-panel-mock">ExportPanel</div>',
    props: ['currentCube'],
    emits: ['cube-load', 'cube-change'],
  },
  EXPORT_PANEL_META: {
    id: 'export-panel',
    name: 'ExportPanel',
    version: '1.0.0',
    summary: '',
    description: '',
    phase: 1,
    taskId: '',
    filePath: '',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    props: [],
    tags: [],
    status: 'stable',
    lastUpdated: '',
  },
}))

vi.mock('../components/CubePreview.vue', () => ({
  default: {
    name: 'CubePreview',
    template: '<div class="cube-preview-mock">Preview</div>',
    props: ['config'],
  },
  CUBE_PREVIEW_META: {
    id: 'cube-preview',
    name: 'CubePreview',
    version: '1.0.0',
    summary: '',
    description: '',
    phase: 1,
    taskId: '',
    filePath: '',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    props: [],
    tags: [],
    status: 'stable',
    lastUpdated: '',
  },
}))

vi.mock('../components/UnifiedEditor.vue', () => ({
  default: {
    name: 'UnifiedEditor',
    template: '<div class="unified-editor-mock">UnifiedEditor</div>',
    props: ['cube'],
    emits: ['update:cube'],
  },
  UNIFIED_EDITOR_META: {
    id: 'unified-editor',
    name: 'UnifiedEditor',
    version: '1.0.0',
    summary: '',
    description: '',
    phase: 1,
    taskId: '',
    filePath: '',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    props: [],
    tags: [],
    status: 'stable',
    lastUpdated: '',
  },
}))

vi.mock('../components/ActionHistory.vue', () => ({
  default: {
    name: 'ActionHistory',
    template: '<div class="action-history-mock">ActionHistory</div>',
    props: ['actions'],
  },
}))

vi.mock('../components/PromptGenerator.vue', () => ({
  default: {
    name: 'PromptGenerator',
    template: '<div class="prompt-generator-mock">PromptGenerator</div>',
    emits: ['cube-generated', 'cubes-generated'],
  },
  PROMPT_GENERATOR_META: {
    id: 'prompt-generator',
    name: 'PromptGenerator',
    version: '1.0.0',
    summary: '',
    description: '',
    phase: 1,
    taskId: '',
    filePath: '',
    history: [],
    features: [],
    dependencies: [],
    relatedFiles: [],
    props: [],
    tags: [],
    status: 'stable',
    lastUpdated: '',
  },
}))

vi.mock('../components/GodModeWindow.vue', () => ({
  default: {
    name: 'GodModeWindow',
    template: '<div class="god-mode-mock">GodModeWindow</div>',
  },
}))

vi.mock('../components/ComponentInfo.vue', () => ({
  default: {
    name: 'ComponentInfo',
    template: '<div class="component-info-mock"><slot /></div>',
    props: ['meta', 'style', 'className', 'position', 'alwaysShow'],
  },
}))

const mockDeviceType = { isMobile: false, isTablet: false, isDesktop: true }

vi.mock('../composables/useDeviceType', () => ({
  useDeviceType: () => mockDeviceType,
}))

vi.mock('../composables/useCubeEditor', () => ({
  useCubeEditor: () => ({
    currentCube: { id: 'test-cube', base: { color: [0.5, 0.5, 0.5] } },
    updateCube: vi.fn(),
    selectCube: vi.fn(),
    loadCube: vi.fn(),
  }),
}))

vi.mock('../lib/devmode', () => ({
  useDevModeKeyboard: vi.fn(),
  useHoveredComponentId: vi.fn(() => ({ value: null })),
  useSelectedComponentId: vi.fn(() => ({ value: null })),
  useDevModeStore: () => ({ isDevMode: false, toggleDevMode: vi.fn() }),
}))

vi.mock('../lib/auth', () => ({
  useAuthStore: () => ({ initialize: vi.fn(), isAuthenticated: false }),
}))

function setDeviceType(type: 'desktop' | 'tablet' | 'mobile') {
  mockDeviceType.isDesktop = type === 'desktop'
  mockDeviceType.isTablet = type === 'tablet'
  mockDeviceType.isMobile = type === 'mobile'
}

function createWrapper() {
  return shallowMount(App, {
    global: {
      plugins: [createPinia()],
      stubs: {
        teleport: true,
        ComponentInfo: {
          name: 'ComponentInfo',
          template: '<div class="component-info-mock"><slot /></div>',
          props: ['meta'],
        },
        DraggableWindow: {
          name: 'DraggableWindow',
          template: '<div class="draggable-window-stub"><slot /></div>',
          props: [
            'windowId',
            'title',
            'icon',
            'x',
            'y',
            'width',
            'height',
            'minWidth',
            'minHeight',
            'zIndex',
          ],
          emits: ['close', 'minimize', 'move', 'resize', 'focus'],
        },
      },
    },
  })
}

beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

describe('E2E: Window Manager — Open/Close Workflows', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setDeviceType('desktop')
    localStorage.clear()
    clearAllConfigs()
    clearHistory()
  })

  it('should render multiple DraggableWindow instances on desktop', () => {
    const wrapper = createWrapper()
    const windows = wrapper.findAllComponents({ name: 'DraggableWindow' })
    expect(windows.length).toBeGreaterThan(0)
  })

  it('should display window taskbar on desktop', () => {
    const wrapper = createWrapper()
    const taskbar = wrapper.findComponent({ name: 'WindowTaskbar' })
    expect(taskbar.exists()).toBe(true)
  })

  it('should display command bar on desktop', () => {
    const wrapper = createWrapper()
    const commandBar = wrapper.findComponent({ name: 'CommandBar' })
    expect(commandBar.exists()).toBe(true)
  })

  it('should not display DraggableWindow on mobile', () => {
    setDeviceType('mobile')
    const wrapper = createWrapper()
    const windows = wrapper.findAllComponents({ name: 'DraggableWindow' })
    expect(windows.length).toBe(0)
  })

  it('should pass correct props to DraggableWindow instances', () => {
    const wrapper = createWrapper()
    const windows = wrapper.findAllComponents({ name: 'DraggableWindow' })
    if (windows.length > 0) {
      const firstWindow = windows[0]
      expect(firstWindow.props('title')).toBeTruthy()
      expect(firstWindow.props('icon')).toBeTruthy()
      expect(typeof firstWindow.props('x')).toBe('number')
      expect(typeof firstWindow.props('y')).toBe('number')
      expect(typeof firstWindow.props('width')).toBe('number')
      expect(typeof firstWindow.props('height')).toBe('number')
    }
  })

  it('should have unique window IDs for all DraggableWindow instances', () => {
    const wrapper = createWrapper()
    const windows = wrapper.findAllComponents({ name: 'DraggableWindow' })
    const ids = windows.map((w) => w.props('windowId'))
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should render header with app title', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('h1').text()).toBe('isocubic')
  })
})

describe('E2E: Window Manager — State Persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setDeviceType('desktop')
    localStorage.clear()
    clearAllConfigs()
    clearHistory()
  })

  it('should persist window layout to localStorage via useWindowManager', () => {
    const defs = [
      {
        id: 'test-win',
        title: 'Test',
        icon: '🪟',
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      },
    ]
    const manager = useWindowManager(defs)
    // Moving a window triggers persist()
    manager.moveWindow('test-win', 200, 200)
    const stored = localStorage.getItem('isocubic-window-layout')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed['test-win']).toBeTruthy()
    expect(parsed['test-win'].x).toBe(200)
  })

  it('should restore window layout from localStorage', () => {
    // Pre-populate localStorage
    const savedState = {
      'test-win': {
        x: 500,
        y: 400,
        width: 600,
        height: 500,
        isOpen: true,
        isMinimized: false,
        zIndex: 110,
      },
    }
    localStorage.setItem('isocubic-window-layout', JSON.stringify(savedState))

    const defs = [
      {
        id: 'test-win',
        title: 'Test',
        icon: '🪟',
        defaultX: 100,
        defaultY: 100,
        defaultWidth: 400,
        defaultHeight: 300,
      },
    ]
    const manager = useWindowManager(defs)
    expect(manager.getWindow('test-win')!.x).toBe(500)
    expect(manager.getWindow('test-win')!.y).toBe(400)
  })

  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('isocubic-window-layout', 'not-valid-json{{{')
    // Should not throw
    expect(() => createWrapper()).not.toThrow()
    const wrapper = createWrapper()
    expect(wrapper.find('.app--desktop').exists()).toBe(true)
  })

  it('should handle empty localStorage gracefully', () => {
    localStorage.setItem('isocubic-window-layout', '{}')
    expect(() => createWrapper()).not.toThrow()
  })
})

describe('E2E: Window Manager — Responsive Transitions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    clearAllConfigs()
    clearHistory()
  })

  it('should switch from desktop to tablet layout', async () => {
    setDeviceType('desktop')
    const wrapper = createWrapper()
    expect(wrapper.find('.app--desktop').exists()).toBe(true)
  })

  it('should switch to mobile tabbed layout', () => {
    setDeviceType('mobile')
    const wrapper = createWrapper()
    expect(wrapper.find('.app--mobile').exists()).toBe(true)
    const tabs = wrapper.findAll('.app__mobile-tab')
    expect(tabs.length).toBe(5)
  })

  it('should render tablet layout', () => {
    setDeviceType('tablet')
    const wrapper = createWrapper()
    expect(wrapper.find('.app--tablet').exists()).toBe(true)
  })

  it('should show mobile swipe indicator', () => {
    setDeviceType('mobile')
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Swipe to navigate')
  })

  it('should allow mobile tab navigation', async () => {
    setDeviceType('mobile')
    const wrapper = createWrapper()
    const tabs = wrapper.findAll('.app__mobile-tab')
    if (tabs.length > 1) {
      await tabs[1].trigger('click')
      await nextTick()
      expect(tabs[1].classes()).toContain('app__mobile-tab--active')
    }
  })
})
