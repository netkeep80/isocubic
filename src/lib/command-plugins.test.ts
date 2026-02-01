/**
 * Unit tests for command-plugins
 * Tests plugin registration, command lookup, and event notification
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { createCommandPluginRegistry } from './command-plugins'
import type { CommandPlugin } from './command-plugins'

function mockPlugin(id: string, commandCount = 2): CommandPlugin {
  const commands = Array.from({ length: commandCount }, (_, i) => ({
    id: `${id}:cmd${i + 1}`,
    label: `Command ${i + 1}`,
    icon: '📌',
    description: `Description for command ${i + 1}`,
    category: id,
    execute: vi.fn(),
  }))

  return {
    id,
    name: `Plugin ${id}`,
    description: `Test plugin ${id}`,
    version: '1.0.0',
    commands,
  }
}

describe('createCommandPluginRegistry', () => {
  describe('Plugin Registration', () => {
    it('should register a plugin', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('test'))
      expect(registry.getPluginCount()).toBe(1)
    })

    it('should get a registered plugin by id', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('test'))
      const plugin = registry.getPlugin('test')
      expect(plugin).toBeDefined()
      expect(plugin!.name).toBe('Plugin test')
    })

    it('should return undefined for non-existent plugin', () => {
      const registry = createCommandPluginRegistry()
      expect(registry.getPlugin('nonexistent')).toBeUndefined()
    })

    it('should unregister a plugin', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('test'))
      expect(registry.unregisterPlugin('test')).toBe(true)
      expect(registry.getPluginCount()).toBe(0)
    })

    it('should return false when unregistering non-existent plugin', () => {
      const registry = createCommandPluginRegistry()
      expect(registry.unregisterPlugin('nonexistent')).toBe(false)
    })

    it('should list all plugins', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('a'))
      registry.registerPlugin(mockPlugin('b'))
      expect(registry.getPlugins()).toHaveLength(2)
    })
  })

  describe('Command Operations', () => {
    it('should get all commands from all plugins', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('a', 2))
      registry.registerPlugin(mockPlugin('b', 3))
      expect(registry.getAllCommands()).toHaveLength(5)
    })

    it('should get commands by category', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('a', 2))
      registry.registerPlugin(mockPlugin('b', 3))
      expect(registry.getCommandsByCategory('a')).toHaveLength(2)
      expect(registry.getCommandsByCategory('b')).toHaveLength(3)
    })

    it('should find a command by id', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('test'))
      const cmd = registry.findCommand('test:cmd1')
      expect(cmd).toBeDefined()
      expect(cmd!.label).toBe('Command 1')
    })

    it('should return undefined for non-existent command', () => {
      const registry = createCommandPluginRegistry()
      expect(registry.findCommand('nonexistent')).toBeUndefined()
    })

    it('should execute a command by id', () => {
      const registry = createCommandPluginRegistry()
      const plugin = mockPlugin('test')
      registry.registerPlugin(plugin)
      expect(registry.executeCommand('test:cmd1')).toBe(true)
      expect(plugin.commands[0].execute).toHaveBeenCalledTimes(1)
    })

    it('should return false when executing non-existent command', () => {
      const registry = createCommandPluginRegistry()
      expect(registry.executeCommand('nonexistent')).toBe(false)
    })

    it('should report correct command count', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('a', 3))
      registry.registerPlugin(mockPlugin('b', 2))
      expect(registry.getCommandCount()).toBe(5)
    })
  })

  describe('Change Notification', () => {
    it('should notify listeners on register', () => {
      const registry = createCommandPluginRegistry()
      const listener = vi.fn()
      registry.onChange(listener)
      registry.registerPlugin(mockPlugin('test'))
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should notify listeners on unregister', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('test'))
      const listener = vi.fn()
      registry.onChange(listener)
      registry.unregisterPlugin('test')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should allow unsubscribing', () => {
      const registry = createCommandPluginRegistry()
      const listener = vi.fn()
      const unsubscribe = registry.onChange(listener)
      unsubscribe()
      registry.registerPlugin(mockPlugin('test'))
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Clear All', () => {
    it('should clear all plugins', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('a'))
      registry.registerPlugin(mockPlugin('b'))
      registry.clearAll()
      expect(registry.getPluginCount()).toBe(0)
      expect(registry.getCommandCount()).toBe(0)
    })

    it('should notify listeners on clear', () => {
      const registry = createCommandPluginRegistry()
      registry.registerPlugin(mockPlugin('test'))
      const listener = vi.fn()
      registry.onChange(listener)
      registry.clearAll()
      expect(listener).toHaveBeenCalledTimes(1)
    })
  })
})
