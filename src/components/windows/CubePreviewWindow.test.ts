/**
 * CubePreviewWindow.test.ts — Tests for CubePreviewWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CubePreviewWindow from './CubePreviewWindow.vue'
import type { CubeConfig } from '../../types/cube'

// Mock TresJS dependencies to avoid ESM import issues in test environment
vi.mock('@tresjs/core', () => ({
  TresCanvas: {
    name: 'TresCanvas',
    template: '<div data-testid="canvas-mock"><slot /></div>',
    props: ['camera', 'antialias', 'alpha', 'powerPreference', 'dpr'],
  },
  useLoop: () => ({ onBeforeRender: vi.fn(), onRender: vi.fn() }),
  useTresContext: () => ({ camera: { value: null } }),
}))

vi.mock('@tresjs/cientos', () => ({
  OrbitControls: {
    name: 'OrbitControls',
    template: '<div data-testid="orbit-controls-mock" />',
  },
  ContactShadows: {
    name: 'ContactShadows',
    template: '<div data-testid="contact-shadows-mock" />',
  },
  Environment: {
    name: 'Environment',
    template: '<div data-testid="environment-mock" />',
  },
  Html: {
    name: 'Html',
    template: '<div />',
  },
}))

describe('CubePreviewWindow', () => {
  const globalStubs = {
    stubs: {
      TresCanvas: true,
      TresColor: true,
      TresAmbientLight: true,
      TresDirectionalLight: true,
      TresPointLight: true,
      OrbitControls: true,
      ContactShadows: true,
      Environment: true,
      ParametricCube: true,
    },
  }

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
      global: globalStubs,
    })

    expect(wrapper.findComponent({ name: 'CubePreview' }).exists()).toBe(true)
  })

  it('passes config prop to CubePreview', () => {
    const wrapper = mount(CubePreviewWindow, {
      props: { config: mockCube },
      global: globalStubs,
    })

    const previewComponent = wrapper.findComponent({ name: 'CubePreview' })
    expect(previewComponent.props('config')).toEqual(mockCube)
  })

  it('renders with null config', () => {
    const wrapper = mount(CubePreviewWindow, {
      props: { config: null },
      global: globalStubs,
    })

    expect(wrapper.findComponent({ name: 'CubePreview' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'CubePreview' }).props('config')).toBeNull()
  })

  it('has proper styling wrapper', () => {
    const wrapper = mount(CubePreviewWindow, {
      props: { config: mockCube },
      global: globalStubs,
    })

    const container = wrapper.find('.cube-preview-window')
    expect(container.exists()).toBe(true)
    expect(container.classes()).toContain('cube-preview-window')
  })
})
