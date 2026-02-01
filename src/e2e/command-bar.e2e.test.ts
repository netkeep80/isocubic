/**
 * E2E tests for the CommandBar component
 * Tests command search, filtering, keyboard navigation, and command execution
 *
 * Phase 11, TASK 78: Comprehensive testing and optimization
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CommandBar from '../components/CommandBar.vue'
import type { CommandItem } from '../components/CommandBar.vue'

function createTestCommands(): CommandItem[] {
  return [
    {
      id: 'open-gallery',
      label: 'Open Gallery',
      description: 'Open the gallery window',
      category: 'window',
      icon: '🖼️',
    },
    {
      id: 'open-editor',
      label: 'Open Editor',
      description: 'Open the unified editor',
      category: 'window',
      icon: '✏️',
    },
    {
      id: 'tile-windows',
      label: 'Tile Windows',
      description: 'Arrange windows in tile layout',
      category: 'layout',
      icon: '⊞',
    },
    {
      id: 'export-json',
      label: 'Export JSON',
      description: 'Export cube as JSON',
      category: 'export',
      icon: '📄',
    },
    {
      id: 'theme-dark',
      label: 'Dark Theme',
      description: 'Switch to dark theme',
      category: 'settings',
      icon: '🌙',
    },
  ]
}

function createWrapper(commands?: CommandItem[]) {
  return shallowMount(CommandBar, {
    global: {
      stubs: { Teleport: true },
    },
    props: {
      commands: commands ?? createTestCommands(),
    },
  })
}

describe('E2E: CommandBar — Trigger and Open', () => {
  it('should render the trigger button', () => {
    const wrapper = createWrapper()
    const trigger = wrapper.find('[data-testid="command-bar-trigger"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.text()).toContain('Search or run a command...')
  })

  it('should show keyboard hint Ctrl+K', () => {
    const wrapper = createWrapper()
    expect(wrapper.text()).toContain('Ctrl+K')
  })

  it('should open the modal overlay on trigger click', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const overlay = wrapper.find('[data-testid="command-bar-overlay"]')
    expect(overlay.exists()).toBe(true)
  })

  it('should show input field after opening', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    expect(input.exists()).toBe(true)
  })

  it('should show all commands when opened with empty query', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const results = wrapper.find('[data-testid="command-bar-results"]')
    expect(results.exists()).toBe(true)
    expect(wrapper.text()).toContain('Open Gallery')
    expect(wrapper.text()).toContain('Open Editor')
    expect(wrapper.text()).toContain('Tile Windows')
    expect(wrapper.text()).toContain('Export JSON')
    expect(wrapper.text()).toContain('Dark Theme')
  })
})

describe('E2E: CommandBar — Search and Filter', () => {
  it('should filter commands by label text', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('gallery')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Open Gallery')
    expect(wrapper.text()).not.toContain('Export JSON')
  })

  it('should filter commands case-insensitively', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('TILE')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Tile Windows')
  })

  it('should filter by description text', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('unified')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Open Editor')
  })

  it('should filter by command id', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('theme-dark')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Dark Theme')
  })

  it('should show no results for non-matching search', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('xyznonexistent')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.cb__item')
    expect(items.length).toBe(0)
  })
})

describe('E2E: CommandBar — Keyboard Navigation', () => {
  it('should close on Escape key', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()
    const overlay = wrapper.find('[data-testid="command-bar-overlay"]')
    expect(overlay.exists()).toBe(false)
  })

  it('should navigate down with ArrowDown', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    const selected = wrapper.find('.cb__item--selected')
    expect(selected.exists()).toBe(true)
  })

  it('should navigate up with ArrowUp', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowUp' })
    await wrapper.vm.$nextTick()
    const selected = wrapper.find('.cb__item--selected')
    expect(selected.exists()).toBe(true)
  })

  it('should emit execute on Enter', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.trigger('keydown', { key: 'Enter' })
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('execute')).toBeTruthy()
  })
})

describe('E2E: CommandBar — Command Execution', () => {
  it('should emit execute event with command id on click', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.cb__item')
    if (items.length > 0) {
      await items[0].trigger('click')
      expect(wrapper.emitted('execute')).toBeTruthy()
      expect(wrapper.emitted('execute')![0]).toEqual(['open-gallery'])
    }
  })

  it('should close the bar after executing a command', async () => {
    const wrapper = createWrapper()
    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('.cb__item')
    if (items.length > 0) {
      await items[0].trigger('click')
      await wrapper.vm.$nextTick()
      const overlay = wrapper.find('[data-testid="command-bar-overlay"]')
      expect(overlay.exists()).toBe(false)
    }
  })

  it('should handle empty commands array', () => {
    const wrapper = createWrapper([])
    const trigger = wrapper.find('[data-testid="command-bar-trigger"]')
    expect(trigger.exists()).toBe(true)
  })
})
