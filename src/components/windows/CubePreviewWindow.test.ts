/**
 * CubePreviewWindow.test.ts — Tests for CubePreviewWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CubePreviewWindow from './CubePreviewWindow.vue'
import type { CubeConfig } from '../../types/cube'

describe('CubePreviewWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  const mockCube: CubeConfig = {
    id: 'test-cube',
    meta: { name: 'Test Cube' },
    base: { color: [1, 0, 0], roughness: 0.5, transparency: 1.0 },
  }

  it('renders CubePreview component with config prop', () => {
    const wrapper = mount(CubePreviewWindow, {
      props: { config: mockCube },
    })

    expect(wrapper.findComponent({ name: 'CubePreview' }).exists()).toBe(true)
  })

  it('passes config prop to CubePreview', () => {
    const wrapper = mount(CubePreviewWindow, {
      props: { config: mockCube },
    })

    const previewComponent = wrapper.findComponent({ name: 'CubePreview' })
    expect(previewComponent.props('config')).toEqual(mockCube)
  })

  it('renders with null config', () => {
    const wrapper = mount(CubePreviewWindow, {
      props: { config: null },
    })

    expect(wrapper.findComponent({ name: 'CubePreview' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CubePreview' }).props('config')).toBeNull()
  })

  it('has proper styling wrapper', () => {
    const wrapper = mount(CubePreviewWindow, {
      props: { config: mockCube },
    })

    const container = wrapper.find('.cube-preview-window')
    expect(container.exists()).toBe(true)
    expect(container.classes()).toContain('cube-preview-window')
  })
})
