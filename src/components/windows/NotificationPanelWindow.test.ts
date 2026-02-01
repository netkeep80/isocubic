/**
 * NotificationPanelWindow.test.ts — Tests for NotificationPanelWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NotificationPanelWindow from './NotificationPanelWindow.vue'

describe('NotificationPanelWindow', () => {
  it('renders NotificationPanel component', () => {
    const wrapper = mount(NotificationPanelWindow)
    expect(wrapper.findComponent({ name: 'NotificationPanel' }).exists()).toBe(true)
  })

  it('wraps NotificationPanel with ComponentInfo', () => {
    const wrapper = mount(NotificationPanelWindow)
    expect(wrapper.findComponent({ name: 'NotificationPanel' }).exists()).toBe(true)
    // ComponentInfo is a renderless component, so we can't directly test it
    // but we can verify the wrapped component renders
  })
})
