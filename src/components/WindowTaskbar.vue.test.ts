/**
 * Unit tests for WindowTaskbar Vue component
 * Tests minimized chips, closed windows, reset layout
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import WindowTaskbar from './WindowTaskbar.vue'
import type { WindowState } from '../composables/useWindowManager'

const createWindowState = (overrides: Partial<WindowState> = {}): WindowState => ({
  id: 'test-win',
  title: 'Test Window',
  icon: '\uD83D\uDCCB',
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  minWidth: 200,
  minHeight: 150,
  isOpen: true,
  isMinimized: true,
  zIndex: 100,
  ...overrides,
})

describe('WindowTaskbar — Module Export', () => {
  it('should export WindowTaskbar as a valid Vue component', async () => {
    const module = await import('./WindowTaskbar.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export WINDOW_TASKBAR_META', async () => {
    const module = await import('./WindowTaskbar.vue')
    expect(module.WINDOW_TASKBAR_META).toBeDefined()
    expect(module.WINDOW_TASKBAR_META.id).toBe('window-taskbar')
    expect(module.WINDOW_TASKBAR_META.phase).toBe(11)
  })
})

describe('WindowTaskbar — Rendering', () => {
  it('should render taskbar element', () => {
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: [], closedWindows: [] },
    })
    expect(wrapper.find('[data-testid="window-taskbar"]').exists()).toBe(true)
  })

  it('should render Reset Layout button', () => {
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: [], closedWindows: [] },
    })
    expect(wrapper.find('.taskbar__reset').exists()).toBe(true)
    expect(wrapper.find('.taskbar__reset').text()).toBe('Reset Layout')
  })
})

describe('WindowTaskbar — Minimized Windows', () => {
  it('should render minimized window chips', () => {
    const minimized = [
      createWindowState({ id: 'gallery', title: 'Gallery', icon: '\uD83C\uDFA8' }),
      createWindowState({ id: 'preview', title: 'Preview', icon: '\uD83D\uDC41' }),
    ]
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: minimized, closedWindows: [] },
    })

    const chips = wrapper.findAll('.taskbar__chip')
    expect(chips.length).toBe(2)
    expect(chips[0].text()).toContain('Gallery')
    expect(chips[1].text()).toContain('Preview')
  })

  it('should emit restore when minimized chip clicked', async () => {
    const minimized = [createWindowState({ id: 'gallery', title: 'Gallery' })]
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: minimized, closedWindows: [] },
    })

    await wrapper.findAll('.taskbar__chip')[0].trigger('click')
    expect(wrapper.emitted('restore')).toBeTruthy()
    expect(wrapper.emitted('restore')![0]).toEqual(['gallery'])
  })
})

describe('WindowTaskbar — Closed Windows', () => {
  it('should render closed window chips with label', () => {
    const closed = [createWindowState({ id: 'editor', title: 'Editor', isOpen: false })]
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: [], closedWindows: closed },
    })

    expect(wrapper.find('.taskbar__closed-label').text()).toBe('Closed:')
    expect(wrapper.findAll('.taskbar__chip--closed').length).toBe(1)
    expect(wrapper.findAll('.taskbar__chip--closed')[0].text()).toContain('Editor')
  })

  it('should not show closed section when no closed windows', () => {
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: [], closedWindows: [] },
    })
    expect(wrapper.find('.taskbar__closed').exists()).toBe(false)
  })

  it('should emit open when closed chip clicked', async () => {
    const closed = [createWindowState({ id: 'editor', title: 'Editor', isOpen: false })]
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: [], closedWindows: closed },
    })

    await wrapper.find('.taskbar__chip--closed').trigger('click')
    expect(wrapper.emitted('open')).toBeTruthy()
    expect(wrapper.emitted('open')![0]).toEqual(['editor'])
  })
})

describe('WindowTaskbar — Reset Layout', () => {
  it('should emit resetLayout when reset button clicked', async () => {
    const wrapper = shallowMount(WindowTaskbar, {
      props: { minimizedWindows: [], closedWindows: [] },
    })

    await wrapper.find('.taskbar__reset').trigger('click')
    expect(wrapper.emitted('resetLayout')).toBeTruthy()
  })
})
