/**
 * Unit tests for CommandBar Vue component
 * Tests search, keyboard navigation, command execution
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import CommandBar from './CommandBar.vue'
import type { CommandItem } from './CommandBar.vue'

const mockCommands: CommandItem[] = [
  {
    id: 'window:gallery',
    label: 'Open Gallery',
    icon: '\uD83C\uDFA8',
    description: 'Open the gallery window',
    category: 'window',
  },
  {
    id: 'window:preview',
    label: 'Open Preview',
    icon: '\uD83D\uDC41',
    description: 'Open the preview window',
    category: 'window',
  },
  {
    id: 'action:reset',
    label: 'Reset Layout',
    icon: '\u21BA',
    description: 'Reset all windows to default positions',
    category: 'action',
  },
]

describe('CommandBar — Module Export', () => {
  it('should export CommandBar as a valid Vue component', async () => {
    const module = await import('./CommandBar.vue')
    expect(module.default).toBeDefined()
    expect(typeof module.default).toBe('object')
  })

  it('should export COMMAND_BAR_META', async () => {
    const module = await import('./CommandBar.vue')
    expect(module.COMMAND_BAR_META).toBeDefined()
    expect(module.COMMAND_BAR_META.id).toBe('command-bar')
    expect(module.COMMAND_BAR_META.phase).toBe(11)
  })

  it('should export CommandItem interface type', async () => {
    // If it compiles, the type is available
    const item: CommandItem = {
      id: 'test',
      label: 'Test',
      icon: 'T',
      description: 'Test command',
      category: 'action',
    }
    expect(item.id).toBe('test')
  })
})

describe('CommandBar — Trigger Button', () => {
  it('should render trigger button', () => {
    const wrapper = shallowMount(CommandBar, { props: { commands: mockCommands } })
    const trigger = wrapper.find('[data-testid="command-bar-trigger"]')
    expect(trigger.exists()).toBe(true)
    expect(trigger.text()).toContain('Search or run a command...')
    expect(trigger.text()).toContain('Ctrl+K')
  })

  it('should open modal on trigger click', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    expect(wrapper.find('[data-testid="command-bar-overlay"]').exists()).toBe(false)

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="command-bar-overlay"]').exists()).toBe(true)
  })
})

describe('CommandBar — Command List', () => {
  it('should show all commands when modal is open', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.cb__item')
    expect(items.length).toBe(3)
  })

  it('should show command label and description', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const firstItem = wrapper.findAll('.cb__item')[0]
    expect(firstItem.text()).toContain('Open Gallery')
    expect(firstItem.text()).toContain('Open the gallery window')
  })

  it('should show category label', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const firstItem = wrapper.findAll('.cb__item')[0]
    expect(firstItem.text()).toContain('window')
  })
})

describe('CommandBar — Search Filtering', () => {
  it('should filter commands by label', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('gallery')
    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.cb__item')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('Open Gallery')
  })

  it('should filter commands by description', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('default positions')
    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.cb__item')
    expect(items.length).toBe(1)
    expect(items[0].text()).toContain('Reset Layout')
  })

  it('should show empty message when no commands match', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.setValue('xyznonexistent')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.cb__empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('No commands found')
  })
})

describe('CommandBar — Command Execution', () => {
  it('should emit execute when command clicked', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.findAll('.cb__item')[0].trigger('click')

    expect(wrapper.emitted('execute')).toBeTruthy()
    expect(wrapper.emitted('execute')![0]).toEqual(['window:gallery'])
  })

  it('should close modal after command execution', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.findAll('.cb__item')[0].trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="command-bar-overlay"]').exists()).toBe(false)
  })
})

describe('CommandBar — Keyboard Navigation', () => {
  it('should highlight first item by default', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.cb__item')
    expect(items[0].classes()).toContain('cb__item--selected')
    expect(items[1].classes()).not.toContain('cb__item--selected')
  })

  it('should navigate down with ArrowDown', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.trigger('keydown', { key: 'ArrowDown', preventDefault: vi.fn() })
    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.cb__item')
    expect(items[1].classes()).toContain('cb__item--selected')
  })

  it('should close on Escape', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.trigger('keydown', { key: 'Escape' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="command-bar-overlay"]').exists()).toBe(false)
  })

  it('should execute selected command on Enter', async () => {
    const wrapper = shallowMount(CommandBar, {
      props: { commands: mockCommands },
      global: { stubs: { Teleport: true } },
    })

    await wrapper.find('[data-testid="command-bar-trigger"]').trigger('click')
    await wrapper.vm.$nextTick()

    const input = wrapper.find('[data-testid="command-bar-input"]')
    await input.trigger('keydown', { key: 'Enter', preventDefault: vi.fn() })

    expect(wrapper.emitted('execute')).toBeTruthy()
    expect(wrapper.emitted('execute')![0]).toEqual(['window:gallery'])
  })
})
