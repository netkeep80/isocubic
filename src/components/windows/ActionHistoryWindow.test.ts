/**
 * ActionHistoryWindow.test.ts — Tests for ActionHistoryWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ActionHistoryWindow from './ActionHistoryWindow.vue'
import type { Action } from '../../types/action'

describe('ActionHistoryWindow', () => {
  const mockActions: Action[] = [
    {
      id: 'action-1',
      type: 'create',
      timestamp: Date.now(),
      description: 'Created test cube',
      data: { cubeId: 'test-cube' },
    },
    {
      id: 'action-2',
      type: 'modify',
      timestamp: Date.now() + 1000,
      description: 'Modified cube color',
      data: { cubeId: 'test-cube', changes: { color: [1, 0, 0] } },
    },
  ]

  it('renders ActionHistory component with actions prop', () => {
    const wrapper = mount(ActionHistoryWindow, {
      props: { actions: mockActions },
    })

    expect(wrapper.findComponent({ name: 'ActionHistory' }).exists()).toBe(true)
  })

  it('passes actions prop to ActionHistory', () => {
    const wrapper = mount(ActionHistoryWindow, {
      props: { actions: mockActions },
    })

    const historyComponent = wrapper.findComponent({ name: 'ActionHistory' })
    expect(historyComponent.props('actions')).toEqual(mockActions)
  })

  it('works with empty actions array', () => {
    const wrapper = mount(ActionHistoryWindow, {
      props: { actions: [] },
    })

    expect(wrapper.findComponent({ name: 'ActionHistory' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'ActionHistory' }).props('actions')).toEqual([])
  })
})
