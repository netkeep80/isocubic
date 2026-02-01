/**
 * ExtendedSearchPanelWindow.test.ts — Tests for ExtendedSearchPanelWindow component
 * Phase 11, TASK 74: Window wrapper components
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ExtendedSearchPanelWindow from './ExtendedSearchPanelWindow.vue'

describe('ExtendedSearchPanelWindow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })
  it('renders ExtendedSearchPanel component', () => {
    const wrapper = mount(ExtendedSearchPanelWindow)
    expect(wrapper.findComponent({ name: 'ExtendedSearchPanel' }).exists()).toBe(true)
  })
})
