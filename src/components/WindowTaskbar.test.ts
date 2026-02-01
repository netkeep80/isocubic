/**
 * Unit tests for WindowTaskbar component
 * Tests taskbar functionality for minimized and closed windows
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WindowTaskbar from './WindowTaskbar.vue'
import type { WindowState } from '../composables/useWindowManager'

const mockMinimizedWindows: WindowState[] = [
  {
    id: 'gallery',
    title: 'Gallery',
    icon: '🎨',
    x: 20,
    y: 100,
    width: 380,
    height: 500,
    minWidth: 280,
    minHeight: 300,
    isOpen: true,
    isMinimized: true,
    zIndex: 101,
  },
  {
    id: 'preview',
    title: 'Preview',
    icon: '👁',
    x: 420,
    y: 100,
    width: 500,
    height: 400,
    minWidth: 300,
    minHeight: 250,
    isOpen: true,
    isMinimized: true,
    zIndex: 102,
  },
]

const mockClosedWindows: WindowState[] = [
  {
    id: 'editor',
    title: 'Editor',
    icon: '✏️',
    x: 940,
    y: 100,
    width: 400,
    height: 300,
    minWidth: 350,
    minHeight: 250,
    isOpen: false,
    isMinimized: false,
    zIndex: 103,
  },
]

describe('WindowTaskbar', () => {
  beforeEach(() => {
    // Clear any previous test state
  })

  it('should render minimized windows as chips', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: mockMinimizedWindows,
        closedWindows: [],
      },
    })

    const chips = wrapper.findAll('.taskbar__chip')
    expect(chips).toHaveLength(2)

    // Check first minimized window
    const firstChip = chips[0]
    expect(firstChip.text()).toContain('🎨')
    expect(firstChip.text()).toContain('Gallery')
    expect(firstChip.attributes('title')).toBe('Restore Gallery')
  })

  it('should render closed windows section when there are closed windows', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: [],
        closedWindows: mockClosedWindows,
      },
    })

    const closedSection = wrapper.find('.taskbar__closed')
    expect(closedSection.exists()).toBe(true)

    expect(closedSection.text()).toContain('Closed:')
    expect(closedSection.text()).toContain('✏️')
    expect(closedSection.text()).toContain('Editor')
  })

  it('should not render closed windows section when no closed windows', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: mockMinimizedWindows,
        closedWindows: [],
      },
    })

    const closedSection = wrapper.find('.taskbar__closed')
    expect(closedSection.exists()).toBe(false)
  })

  it('should render reset button', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: [],
        closedWindows: [],
      },
    })

    const resetButton = wrapper.find('.taskbar__reset')
    expect(resetButton.exists()).toBe(true)
    expect(resetButton.text()).toBe('Reset Layout')
    expect(resetButton.attributes('title')).toBe('Reset window layout')
  })

  it('should emit restore event when minimized window chip clicked', async () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: mockMinimizedWindows,
        closedWindows: [],
      },
    })

    const galleryChip = wrapper.findAll('.taskbar__chip')[0]
    await galleryChip.trigger('click')

    expect(wrapper.emitted('restore')).toBeTruthy()
    expect(wrapper.emitted('restore')![0]).toEqual(['gallery'])
  })

  it('should emit open event when closed window chip clicked', async () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: [],
        closedWindows: mockClosedWindows,
      },
    })

    const editorChip = wrapper.find('.taskbar__chip--closed')
    await editorChip.trigger('click')

    expect(wrapper.emitted('open')).toBeTruthy()
    expect(wrapper.emitted('open')![0]).toEqual(['editor'])
  })

  it('should emit resetLayout event when reset button clicked', async () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: [],
        closedWindows: [],
      },
    })

    const resetButton = wrapper.find('.taskbar__reset')
    await resetButton.trigger('click')

    expect(wrapper.emitted('resetLayout')).toBeTruthy()
    expect(wrapper.emitted('resetLayout')).toHaveLength(1)
  })

  it('should apply closed styling to closed window chips', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: [],
        closedWindows: mockClosedWindows,
      },
    })

    const closedChip = wrapper.find('.taskbar__chip--closed')
    expect(closedChip.exists()).toBe(true)
  })

  it('should display correct icons and labels', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: mockMinimizedWindows,
        closedWindows: mockClosedWindows,
      },
    })

    // Check minimized window chips
    const minimizedChips = wrapper.findAll('.taskbar__chip:not(.taskbar__chip--closed)')
    expect(minimizedChips[0].find('.taskbar__chip-icon').text()).toBe('🎨')
    expect(minimizedChips[0].find('.taskbar__chip-label').text()).toBe('Gallery')
    expect(minimizedChips[1].find('.taskbar__chip-icon').text()).toBe('👁')
    expect(minimizedChips[1].find('.taskbar__chip-label').text()).toBe('Preview')

    // Check closed window chips
    const closedChip = wrapper.find('.taskbar__chip--closed')
    expect(closedChip.find('.taskbar__chip-icon').text()).toBe('✏️')
    expect(closedChip.find('.taskbar__chip-label').text()).toBe('Editor')
  })

  it('should have correct titles for accessibility', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: mockMinimizedWindows,
        closedWindows: mockClosedWindows,
      },
    })

    // Check minimized window chip titles
    const minimizedChips = wrapper.findAll('.taskbar__chip:not(.taskbar__chip--closed)')
    expect(minimizedChips[0].attributes('title')).toBe('Restore Gallery')
    expect(minimizedChips[1].attributes('title')).toBe('Restore Preview')

    // Check closed window chip title
    const closedChip = wrapper.find('.taskbar__chip--closed')
    expect(closedChip.attributes('title')).toBe('Open Editor')
  })

  it('should render taskbar with proper structure', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: mockMinimizedWindows,
        closedWindows: mockClosedWindows,
      },
    })

    const taskbar = wrapper.find('.taskbar')
    expect(taskbar.exists()).toBe(true)

    expect(taskbar.find('.taskbar__minimized').exists()).toBe(true)
    expect(taskbar.find('.taskbar__closed').exists()).toBe(true)
    expect(taskbar.find('.taskbar__reset').exists()).toBe(true)
  })

  it('should handle empty windows lists', () => {
    const wrapper = mount(WindowTaskbar, {
      props: {
        minimizedWindows: [],
        closedWindows: [],
      },
    })

    const chips = wrapper.findAll('.taskbar__chip')
    expect(chips).toHaveLength(0)

    const closedSection = wrapper.find('.taskbar__closed')
    expect(closedSection.exists()).toBe(false)

    // Should still have reset button
    const resetButton = wrapper.find('.taskbar__reset')
    expect(resetButton.exists()).toBe(true)
  })
})