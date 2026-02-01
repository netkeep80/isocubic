/**
 * CommunityGalleryWindow.test.ts — Tests for CommunityGalleryWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CommunityGalleryWindow from './CommunityGalleryWindow.vue'
import type { CubeConfig } from '../../types/cube'

describe('CommunityGalleryWindow', () => {
  const mockCube: CubeConfig = {
    id: 'test-cube',
    meta: { name: 'Test Cube' },
    base: { color: [1, 0, 0], roughness: 0.5, transparency: 1.0 },
  }

  it('renders CommunityGallery component', () => {
    const wrapper = mount(CommunityGalleryWindow)
    expect(wrapper.findComponent({ name: 'CommunityGallery' }).exists()).toBe(true)
  })

  it('emits cubeSelect event when CommunityGallery emits it', async () => {
    const wrapper = mount(CommunityGalleryWindow)

    await wrapper.findComponent({ name: 'CommunityGallery' }).vm.$emit('cubeSelect', mockCube)

    expect(wrapper.emitted('cubeSelect')).toBeTruthy()
    expect(wrapper.emitted('cubeSelect')?.[0]).toEqual([mockCube])
  })
})
