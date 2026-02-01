/**
 * GalleryWindow.test.ts — Tests for GalleryWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import GalleryWindow from './GalleryWindow.vue'
import type { CubeConfig } from '../../types/cube'

// Mock ComponentInfo to avoid Pinia dependency
vi.mock('../ComponentInfo.vue', () => ({
  default: {
    name: 'ComponentInfo',
    template: '<div><slot /></div>',
  },
}))

describe('GalleryWindow', () => {
  const mockCube: CubeConfig = {
    id: 'test-cube',
    meta: { name: 'Test Cube' },
    prompt: 'A test cube',
    base: { color: [1, 0, 0], roughness: 0.5, transparency: 1.0 },
  }

  it('renders Gallery component with props', () => {
    const wrapper = mount(GalleryWindow, {
      props: { currentCube: mockCube },
    })

    expect(wrapper.findComponent({ name: 'Gallery' }).exists()).toBe(true)
  })

  it('passes currentCube prop to Gallery', () => {
    const wrapper = mount(GalleryWindow, {
      props: { currentCube: mockCube },
    })

    const galleryComponent = wrapper.findComponent({ name: 'Gallery' })
    expect(galleryComponent.props('currentCube')).toEqual(mockCube)
  })

  it('emits cubeSelect event when Gallery emits it', async () => {
    const wrapper = mount(GalleryWindow)

    await wrapper.findComponent({ name: 'Gallery' }).vm.$emit('cubeSelect', mockCube)

    expect(wrapper.emitted('cubeSelect')).toBeTruthy()
    expect(wrapper.emitted('cubeSelect')?.[0]).toEqual([mockCube])
  })

  it('works without currentCube', () => {
    const wrapper = mount(GalleryWindow)

    expect(wrapper.findComponent({ name: 'Gallery' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'Gallery' }).props('currentCube')).toBeNull()
  })
})
