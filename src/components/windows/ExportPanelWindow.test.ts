/**
 * ExportPanelWindow.test.ts — Tests for ExportPanelWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ExportPanelWindow from './ExportPanelWindow.vue'
import type { CubeConfig } from '../../types/cube'

describe('ExportPanelWindow', () => {
  const mockCube: CubeConfig = {
    id: 'test-cube',
    meta: { name: 'Test Cube' },
    base: { color: [1, 0, 0], roughness: 0.5, transparency: 1.0 },
  }

  it('renders ExportPanel component with currentCube prop', () => {
    const wrapper = mount(ExportPanelWindow, {
      props: { currentCube: mockCube },
    })

    expect(wrapper.findComponent({ name: 'ExportPanel' }).exists()).toBe(true)
  })

  it('passes currentCube prop to ExportPanel', () => {
    const wrapper = mount(ExportPanelWindow, {
      props: { currentCube: mockCube },
    })

    const exportComponent = wrapper.findComponent({ name: 'ExportPanel' })
    expect(exportComponent.props('currentCube')).toEqual(mockCube)
  })

  it('emits cubeLoad event when ExportPanel emits it', async () => {
    const wrapper = mount(ExportPanelWindow)

    await wrapper.findComponent({ name: 'ExportPanel' }).vm.$emit('cubeLoad', mockCube)

    expect(wrapper.emitted('cubeLoad')).toBeTruthy()
    expect(wrapper.emitted('cubeLoad')?.[0]).toEqual([mockCube])
  })

  it('emits cubeChange event when ExportPanel emits it', async () => {
    const wrapper = mount(ExportPanelWindow)
    const updatedCube = { ...mockCube, meta: { name: 'Updated Cube' } }

    await wrapper.findComponent({ name: 'ExportPanel' }).vm.$emit('cubeChange', updatedCube)

    expect(wrapper.emitted('cubeChange')).toBeTruthy()
    expect(wrapper.emitted('cubeChange')?.[0]).toEqual([updatedCube])
  })

  it('works without currentCube', () => {
    const wrapper = mount(ExportPanelWindow)

    expect(wrapper.findComponent({ name: 'ExportPanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ExportPanel' }).props('currentCube')).toBeUndefined()
  })
})
