/**
 * ExtendedSearchPanelWindow.test.ts — Tests for ExtendedSearchPanelWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ExtendedSearchPanelWindow from './ExtendedSearchPanelWindow.vue'

describe('ExtendedSearchPanelWindow', () => {
  it('renders ExtendedSearchPanel component', () => {
    const wrapper = mount(ExtendedSearchPanelWindow)
    expect(wrapper.findComponent({ name: 'ExtendedSearchPanel' }).exists()).toBe(true)
  })
})