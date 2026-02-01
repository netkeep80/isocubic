/**
 * Unit tests for command-registry
 * Tests extended command definitions and search/filter utilities
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  getLayoutCommands,
  getCubeCommands,
  getExportCommands,
  getSettingsCommands,
  getAllExtendedCommands,
  filterCommandsByCategory,
  searchCommands,
} from './command-registry'

describe('getLayoutCommands', () => {
  it('should return layout commands', () => {
    const commands = getLayoutCommands()
    expect(commands.length).toBeGreaterThan(0)
    expect(commands.every((cmd) => cmd.category === 'layout')).toBe(true)
  })

  it('should include tile, cascade, horizontal, vertical, minimize-all, restore-all', () => {
    const commands = getLayoutCommands()
    const ids = commands.map((c) => c.id)
    expect(ids).toContain('layout:tile')
    expect(ids).toContain('layout:cascade')
    expect(ids).toContain('layout:horizontal')
    expect(ids).toContain('layout:vertical')
    expect(ids).toContain('layout:minimize-all')
    expect(ids).toContain('layout:restore-all')
  })
})

describe('getCubeCommands', () => {
  it('should return cube commands', () => {
    const commands = getCubeCommands()
    expect(commands.length).toBeGreaterThan(0)
    expect(commands.every((cmd) => cmd.category === 'cube')).toBe(true)
  })

  it('should include randomize, reset, duplicate', () => {
    const ids = getCubeCommands().map((c) => c.id)
    expect(ids).toContain('cube:randomize')
    expect(ids).toContain('cube:reset')
    expect(ids).toContain('cube:duplicate')
  })
})

describe('getExportCommands', () => {
  it('should return export commands', () => {
    const commands = getExportCommands()
    expect(commands.length).toBeGreaterThan(0)
    expect(commands.every((cmd) => cmd.category === 'export')).toBe(true)
  })

  it('should include json, png, share', () => {
    const ids = getExportCommands().map((c) => c.id)
    expect(ids).toContain('export:json')
    expect(ids).toContain('export:png')
    expect(ids).toContain('export:share')
  })
})

describe('getSettingsCommands', () => {
  it('should return settings commands', () => {
    const commands = getSettingsCommands()
    expect(commands.length).toBeGreaterThan(0)
    expect(commands.every((cmd) => cmd.category === 'settings')).toBe(true)
  })

  it('should include reset-layout and clear-storage', () => {
    const ids = getSettingsCommands().map((c) => c.id)
    expect(ids).toContain('settings:reset-layout')
    expect(ids).toContain('settings:clear-storage')
  })
})

describe('getAllExtendedCommands', () => {
  it('should include commands from all categories', () => {
    const commands = getAllExtendedCommands()
    const categories = new Set(commands.map((c) => c.category))
    expect(categories.has('layout')).toBe(true)
    expect(categories.has('cube')).toBe(true)
    expect(categories.has('export')).toBe(true)
    expect(categories.has('settings')).toBe(true)
  })

  it('should return all commands combined', () => {
    const all = getAllExtendedCommands()
    const sum =
      getLayoutCommands().length +
      getCubeCommands().length +
      getExportCommands().length +
      getSettingsCommands().length
    expect(all.length).toBe(sum)
  })

  it('should have unique ids across all commands', () => {
    const ids = getAllExtendedCommands().map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('should have non-empty label, icon, description for all commands', () => {
    for (const cmd of getAllExtendedCommands()) {
      expect(cmd.label.length).toBeGreaterThan(0)
      expect(cmd.icon.length).toBeGreaterThan(0)
      expect(cmd.description.length).toBeGreaterThan(0)
    }
  })
})

describe('filterCommandsByCategory', () => {
  it('should filter by category', () => {
    const commands = getAllExtendedCommands()
    const layoutCmds = filterCommandsByCategory(commands, 'layout')
    expect(layoutCmds.length).toBe(getLayoutCommands().length)
    expect(layoutCmds.every((c) => c.category === 'layout')).toBe(true)
  })

  it('should return empty for non-existent category', () => {
    const commands = getAllExtendedCommands()
    const result = filterCommandsByCategory(commands, 'nonexistent' as any)
    expect(result).toHaveLength(0)
  })
})

describe('searchCommands', () => {
  it('should return all commands for empty query', () => {
    const commands = getAllExtendedCommands()
    expect(searchCommands(commands, '')).toEqual(commands)
    expect(searchCommands(commands, '  ')).toEqual(commands)
  })

  it('should filter by label', () => {
    const commands = getAllExtendedCommands()
    const results = searchCommands(commands, 'tile')
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((c) => c.id === 'layout:tile')).toBe(true)
  })

  it('should filter by description', () => {
    const commands = getAllExtendedCommands()
    const results = searchCommands(commands, 'cascade')
    expect(results.length).toBeGreaterThan(0)
  })

  it('should filter by id', () => {
    const commands = getAllExtendedCommands()
    const results = searchCommands(commands, 'cube:randomize')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('cube:randomize')
  })

  it('should be case insensitive', () => {
    const commands = getAllExtendedCommands()
    const results = searchCommands(commands, 'TILE')
    expect(results.length).toBeGreaterThan(0)
  })
})
