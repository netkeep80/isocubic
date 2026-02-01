/**
 * UnifiedEditorWindow.test.ts — Tests for UnifiedEditorWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UnifiedEditorWindow from './UnifiedEditorWindow.vue'
import type { CubeConfig } from '../../types/cube'

describe('UnifiedEditorWindow', () => {
  const mockCube: CubeConfig = {
    id: 'test-cube',
    meta: { name: 'Test Cube' },
    base: { color: [1, 0, 0], roughness: 0.5, transparency: 1.0 },
  }

  it('renders UnifiedEditor component with cube prop', () => {
    const wrapper = mount(UnifiedEditorWindow, {
      props: { cube: mockCube },
    })

    expect(wrapper.findComponent({ name: 'UnifiedEditor' }).exists()).toBe(true)
  })

  it('passes cube prop to UnifiedEditor', () => {
    const wrapper = mount(UnifiedEditorWindow, {
      props: { cube: mockCube },
    })

    const editorComponent = wrapper.findComponent({ name: 'UnifiedEditor' })
    expect(editorComponent.props('cube')).toEqual(mockCube)
  })

  it('emits update:cube event when UnifiedEditor emits it', async () => {
    const wrapper = mount(UnifiedEditorWindow)
    const updatedCube = { ...mockCube, meta: { name: 'Updated Cube' } }

    await wrapper.findComponent({ name: 'UnifiedEditor' }).vm.$emit('update:cube', updatedCube)

    expect(wrapper.emitted('update:cube')).toBeTruthy()
    expect(wrapper.emitted('update:cube')?.[0]).toEqual([updatedCube])
  })

  it('works with null cube', () => {
    const wrapper = mount(UnifiedEditorWindow, {
      props: { cube: null },
    })

    expect(wrapper.findComponent({ name: 'UnifiedEditor' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'UnifiedEditor' }).props('cube')).toBeNull()
  })
})
