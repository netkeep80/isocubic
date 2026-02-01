/**
 * SharePanelWindow.test.ts — Tests for SharePanelWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SharePanelWindow from './SharePanelWindow.vue'
import type { CubeConfig } from '../../types/cube'

describe('SharePanelWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  const mockCube: CubeConfig = {
    id: 'test-cube',
    meta: { name: 'Test Cube' },
    base: { color: [1, 0, 0], roughness: 0.5, transparency: 1.0 },
  }

  it('renders SharePanel component with cube prop', () => {
    const wrapper = mount(SharePanelWindow, {
      props: { cube: mockCube },
    })

    expect(wrapper.findComponent({ name: 'SharePanel' }).exists()).toBe(true)
  })

  it('passes cube prop to SharePanel', () => {
    const wrapper = mount(SharePanelWindow, {
      props: { cube: mockCube },
    })

    const shareComponent = wrapper.findComponent({ name: 'SharePanel' })
    expect(shareComponent.props('currentCube')).toEqual(mockCube)
  })

  it('works with null cube', () => {
    const wrapper = mount(SharePanelWindow, {
      props: { cube: null },
    })

    expect(wrapper.findComponent({ name: 'SharePanel' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'SharePanel' }).props('currentCube')).toBeNull()
  })
})
