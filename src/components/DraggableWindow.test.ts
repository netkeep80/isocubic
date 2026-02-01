/**
 * Unit tests for DraggableWindow component
 * Tests drag, resize, minimize, collapse, close, z-order functionality
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DraggableWindow from './DraggableWindow.vue'

describe('DraggableWindow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with correct props', () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test-window',
        title: 'Test Window',
        icon: '🧪',
        x: 100,
        y: 200,
        width: 400,
        height: 300,
        zIndex: 10,
      },
    })

    const windowEl = wrapper.find('.dw')
    expect(windowEl.attributes('style')).toContain('left: 100px')
    expect(windowEl.attributes('style')).toContain('top: 200px')
    expect(windowEl.attributes('style')).toContain('width: 400px')
    expect(windowEl.attributes('style')).toContain('height: 300px')
    expect(windowEl.attributes('style')).toContain('z-index: 10')
    expect(windowEl.attributes('data-window-id')).toBe('test-window')

    expect(wrapper.find('.dw__title').text()).toBe('Test Window')
    expect(wrapper.find('.dw__icon').text()).toBe('🧪')
  })

  it('should render content slot', () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
      slots: {
        default: '<div class="test-content">Hello World</div>',
      },
    })

    expect(wrapper.find('.test-content').text()).toBe('Hello World')
    expect(wrapper.find('.dw__content').exists()).toBe(true)
  })

  it('should apply default min sizes', () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    // Default min width/height should be applied during resize
    expect(wrapper.props().minWidth).toBe(200)
    expect(wrapper.props().minHeight).toBe(150)
  })

  it('should emit focus event when clicking window', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    await wrapper.find('.dw').trigger('mousedown')
    expect(wrapper.emitted('focus')).toBeTruthy()
    expect(wrapper.emitted('focus')![0]).toEqual(['test'])
  })

  it('should emit minimize event when minimize button clicked', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    await wrapper.find('.dw__btn--minimize').trigger('click')
    expect(wrapper.emitted('minimize')).toBeTruthy()
    expect(wrapper.emitted('minimize')![0]).toEqual(['test'])
  })

  it('should emit close event when close button clicked', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    await wrapper.find('.dw__btn--close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('close')![0]).toEqual(['test'])
  })

  it('should toggle collapse when collapse button clicked', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    // Initially not collapsed - content should be visible
    expect(wrapper.find('.dw__content').isVisible()).toBe(true)

    await wrapper.find('.dw__btn--collapse').trigger('click')
    
    // Should be collapsed - content hidden, collapse button shows '+'
    expect(wrapper.find('.dw__content').exists()).toBe(true)
    expect(wrapper.find('.dw__content').attributes('style')).toContain('display: none')
    expect(wrapper.find('.dw__btn--collapse').text()).toBe('+')
    
    await wrapper.find('.dw__btn--collapse').trigger('click')
    
    // Should be expanded again
    expect(wrapper.find('.dw__content').isVisible()).toBe(true)
    expect(wrapper.find('.dw__btn--collapse').text()).toBe('–')
  })

  it('should emit focus when starting drag on titlebar', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    await wrapper.find('.dw__titlebar').trigger('mousedown')
    expect(wrapper.emitted('focus')).toBeTruthy()
    expect(wrapper.emitted('focus')![0]).toEqual(['test'])
  })

  it('should emit focus when starting resize', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    await wrapper.find('.dw__resize-handle').trigger('mousedown')
    expect(wrapper.emitted('focus')).toBeTruthy()
    expect(wrapper.emitted('focus')![0]).toEqual(['test'])
  })

  it('should not emit focus when clicking control buttons', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    await wrapper.find('.dw__btn--minimize').trigger('click')
    // Should only emit minimize, not focus
    expect(wrapper.emitted('focus')).toBeFalsy()
    expect(wrapper.emitted('minimize')).toBeTruthy()
  })

  it('should handle custom min sizes', () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        minWidth: 300,
        minHeight: 200,
        zIndex: 1,
      },
    })

    expect(wrapper.props().minWidth).toBe(300)
    expect(wrapper.props().minHeight).toBe(200)
  })

  it('should hide resize handle when collapsed', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    // Initially visible
    expect(wrapper.find('.dw__resize-handle').isVisible()).toBe(true)

    await wrapper.find('.dw__btn--collapse').trigger('click')
    
    // Hidden when collapsed
    expect(wrapper.find('.dw__resize-handle').exists()).toBe(true)
    expect(wrapper.find('.dw__resize-handle').attributes('style')).toContain('display: none')
  })

  it('should have correct aria labels', () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Collapse')
    expect(wrapper.find('.dw__btn--minimize').attributes('aria-label')).toBe('Minimize')
    expect(wrapper.find('.dw__btn--close').attributes('aria-label')).toBe('Close')
  })

  it('should update collapse button aria label when collapsed', async () => {
    const wrapper = mount(DraggableWindow, {
      props: {
        windowId: 'test',
        title: 'Test',
        icon: '🧪',
        x: 0,
        y: 0,
        width: 400,
        height: 300,
        zIndex: 1,
      },
    })

    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Collapse')

    await wrapper.find('.dw__btn--collapse').trigger('click')
    
    expect(wrapper.find('.dw__btn--collapse').attributes('aria-label')).toBe('Expand')
  })
})