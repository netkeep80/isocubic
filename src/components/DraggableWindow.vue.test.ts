/**
 * Unit tests for DraggableWindow Vue component
 * Tests dragging, resizing, minimize, close, collapse, z-order
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import DraggableWindow from './DraggableWindow.vue'

const defaultProps = {
  windowId: 'test-win',
  title: 'Test Window',
  icon: '\uD83D\uDCCB',
  x: 100,
  y: 100,
  width: 400,
  height: 300,
  zIndex: 100,
}

describe('DraggableWindow — Module Export', () => {
  it('should export DraggableWindow as a valid Vue component', async () => {
    const module = await import('./DraggableWindow.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export DRAGGABLE_WINDOW_META', async () => {
    const module = await import('./DraggableWindow.vue')
    expect(module.DRAGGABLE_WINDOW_META).toBeDefined()
    expect(module.DRAGGABLE_WINDOW_META.id).toBe('draggable-window')
    expect(module.DRAGGABLE_WINDOW_META.phase).toBe(11)
  })
})

describe('DraggableWindow — Rendering', () => {
  it('should render with title and icon', () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    expect(wrapper.text()).toContain('Test Window')
    expect(wrapper.text()).toContain('\uD83D\uDCCB')
  })

  it('should apply correct position style', () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    const el = wrapper.find('.dw')
    const style = el.attributes('style')
    expect(style).toContain('left: 100px')
    expect(style).toContain('top: 100px')
    expect(style).toContain('width: 400px')
    expect(style).toContain('height: 300px')
    expect(style).toContain('z-index: 100')
  })

  it('should set data-window-id attribute', () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    expect(wrapper.find('.dw').attributes('data-window-id')).toBe('test-win')
  })

  it('should render slot content', () => {
    const wrapper = shallowMount(DraggableWindow, {
      props: defaultProps,
      slots: { default: '<p>Hello from slot</p>' },
    })
    expect(wrapper.text()).toContain('Hello from slot')
  })
})

describe('DraggableWindow — Controls', () => {
  it('should have collapse, minimize, and close buttons', () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    expect(wrapper.find('.dw__btn--collapse').exists()).toBe(true)
    expect(wrapper.find('.dw__btn--minimize').exists()).toBe(true)
    expect(wrapper.find('.dw__btn--close').exists()).toBe(true)
  })

  it('should emit minimize event', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    await wrapper.find('.dw__btn--minimize').trigger('click')
    expect(wrapper.emitted('minimize')).toBeTruthy()
    expect(wrapper.emitted('minimize')![0]).toEqual(['test-win'])
  })

  it('should emit close event', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    await wrapper.find('.dw__btn--close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')![0]).toEqual(['test-win'])
  })

  it('should toggle collapse on collapse button click', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })

    // Initially in expanded state (label = "Collapse")
    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Collapse')

    // Collapse — label changes to "Expand"
    await wrapper.find('.dw__btn--collapse').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Expand')

    // Expand — label changes back to "Collapse"
    await wrapper.find('.dw__btn--collapse').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Collapse')
  })
})

describe('DraggableWindow — Focus', () => {
  it('should emit focus on mousedown', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    await wrapper.find('.dw').trigger('mousedown')
    expect(wrapper.emitted('focus')).toBeTruthy()
    expect(wrapper.emitted('focus')![0]).toEqual(['test-win'])
  })
})

describe('DraggableWindow — Drag', () => {
  it('should emit focus on title bar mousedown', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    await wrapper.find('.dw__titlebar').trigger('mousedown', {
      clientX: 150,
      clientY: 110,
      preventDefault: vi.fn(),
    })
    const focusEvents = wrapper.emitted('focus')
    expect(focusEvents).toBeTruthy()
  })

  it('should add dragging class during drag', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    await wrapper.find('.dw__titlebar').trigger('mousedown', {
      clientX: 150,
      clientY: 110,
      preventDefault: vi.fn(),
    })
    expect(wrapper.find('.dw').classes()).toContain('dw--dragging')
  })
})

describe('DraggableWindow — Resize Handle', () => {
  it('should have resize handle', () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    expect(wrapper.find('.dw__resize-handle').exists()).toBe(true)
  })

  it('should hide resize handle when collapsed', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    await wrapper.find('.dw__btn--collapse').trigger('click')
    expect(wrapper.find('.dw__resize-handle').isVisible()).toBe(false)
  })
})

describe('DraggableWindow — Accessibility', () => {
  it('should have aria labels on buttons', () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Collapse')
    expect(wrapper.find('.dw__btn--minimize').attributes('aria-label')).toBe('Minimize')
    expect(wrapper.find('.dw__btn--close').attributes('aria-label')).toBe('Close')
  })

  it('should update collapse button aria-label when collapsed', async () => {
    const wrapper = shallowMount(DraggableWindow, { props: defaultProps })
    await wrapper.find('.dw__btn--collapse').trigger('click')
    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Expand')
  })
})
