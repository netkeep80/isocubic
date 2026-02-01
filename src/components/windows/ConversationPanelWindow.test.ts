/**
 * ConversationPanelWindow.test.ts — Tests for ConversationPanelWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConversationPanelWindow from './ConversationPanelWindow.vue'

describe('ConversationPanelWindow', () => {
  it('renders ConversationPanel component', () => {
    const wrapper = mount(ConversationPanelWindow)
    expect(wrapper.findComponent({ name: 'ConversationPanel' }).exists()).toBe(true)
  })
})
