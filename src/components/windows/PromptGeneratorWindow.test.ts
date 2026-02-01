/**
 * PromptGeneratorWindow.test.ts — Tests for PromptGeneratorWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PromptGeneratorWindow from './PromptGeneratorWindow.vue'
import type { CubeConfig } from '../../types/cube'

describe('PromptGeneratorWindow', () => {
  const mockCube: CubeConfig = {
    id: 'test-cube',
    meta: { name: 'Test Cube' },
    base: { color: [1, 0, 0], roughness: 0.5, transparency: 1.0 },
  }

  it('renders PromptGenerator component', () => {
    const wrapper = mount(PromptGeneratorWindow)
    expect(wrapper.findComponent({ name: 'PromptGenerator' }).exists()).toBe(true)
  })

  it('emits cubeGenerated event when PromptGenerator emits it', async () => {
    const wrapper = mount(PromptGeneratorWindow)

    await wrapper.findComponent({ name: 'PromptGenerator' }).vm.$emit('cubeGenerated', mockCube)

    expect(wrapper.emitted('cubeGenerated')).toBeTruthy()
    expect(wrapper.emitted('cubeGenerated')?.[0]).toEqual([mockCube])
  })

  it('emits cubesGenerated event when PromptGenerator emits it', async () => {
    const wrapper = mount(PromptGeneratorWindow)
    const mockCubes = [mockCube, { ...mockCube, id: 'test-cube-2' }]

    await wrapper.findComponent({ name: 'PromptGenerator' }).vm.$emit('cubesGenerated', mockCubes)

    expect(wrapper.emitted('cubesGenerated')).toBeTruthy()
    expect(wrapper.emitted('cubesGenerated')?.[0]).toEqual([mockCubes])
  })
})
