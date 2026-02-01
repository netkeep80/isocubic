/**
 * Command Registry for isocubic
 * Provides extended command definitions for the command bar: window management,
 * cube operations, export/import, and settings commands
 *
 * Phase 11, TASK 77: Extended command bar functionality
 */

import type { CommandItem } from '../components/CommandBar.vue'

/** Extended command categories */
export type ExtendedCommandCategory =
  | 'window'
  | 'layout'
  | 'cube'
  | 'export'
  | 'settings'
  | 'macro'
  | 'action'

/** Extended command item with handler */
export interface RegisteredCommand extends CommandItem {
  category: ExtendedCommandCategory
}

/**
 * Get all window layout commands
 */
export function getLayoutCommands(): RegisteredCommand[] {
  return [
    {
      id: 'layout:tile',
      label: 'Tile Windows',
      icon: '⊞',
      description: 'Arrange all windows in a grid',
      category: 'layout',
    },
    {
      id: 'layout:cascade',
      label: 'Cascade Windows',
      icon: '🗗',
      description: 'Arrange windows in a cascade (diagonal offset)',
      category: 'layout',
    },
    {
      id: 'layout:horizontal',
      label: 'Split Horizontal',
      icon: '⬌',
      description: 'Arrange windows side by side horizontally',
      category: 'layout',
    },
    {
      id: 'layout:vertical',
      label: 'Split Vertical',
      icon: '⬍',
      description: 'Stack windows vertically',
      category: 'layout',
    },
    {
      id: 'layout:minimize-all',
      label: 'Minimize All',
      icon: '⏬',
      description: 'Minimize all open windows',
      category: 'layout',
    },
    {
      id: 'layout:restore-all',
      label: 'Restore All',
      icon: '⏫',
      description: 'Restore all minimized windows',
      category: 'layout',
    },
  ]
}

/**
 * Get cube operation commands
 */
export function getCubeCommands(): RegisteredCommand[] {
  return [
    {
      id: 'cube:randomize',
      label: 'Randomize Cube',
      icon: '🎲',
      description: 'Generate random cube parameters',
      category: 'cube',
    },
    {
      id: 'cube:reset',
      label: 'Reset Cube',
      icon: '🔄',
      description: 'Reset cube parameters to defaults',
      category: 'cube',
    },
    {
      id: 'cube:duplicate',
      label: 'Duplicate Cube',
      icon: '📋',
      description: 'Create a copy of the current cube',
      category: 'cube',
    },
  ]
}

/**
 * Get export/import commands
 */
export function getExportCommands(): RegisteredCommand[] {
  return [
    {
      id: 'export:json',
      label: 'Export JSON',
      icon: '📄',
      description: 'Export current cube as JSON file',
      category: 'export',
    },
    {
      id: 'export:png',
      label: 'Export PNG',
      icon: '🖼️',
      description: 'Export cube preview as PNG image',
      category: 'export',
    },
    {
      id: 'export:share',
      label: 'Share Cube',
      icon: '🔗',
      description: 'Share cube via link or QR code',
      category: 'export',
    },
  ]
}

/**
 * Get settings commands
 */
export function getSettingsCommands(): RegisteredCommand[] {
  return [
    {
      id: 'settings:reset-layout',
      label: 'Reset Layout',
      icon: '↺',
      description: 'Reset all windows to default positions',
      category: 'settings',
    },
    {
      id: 'settings:clear-storage',
      label: 'Clear Storage',
      icon: '🗑️',
      description: 'Clear all saved data from localStorage',
      category: 'settings',
    },
  ]
}

/**
 * Get all built-in extended commands
 */
export function getAllExtendedCommands(): RegisteredCommand[] {
  return [
    ...getLayoutCommands(),
    ...getCubeCommands(),
    ...getExportCommands(),
    ...getSettingsCommands(),
  ]
}

/**
 * Filter commands by category
 */
export function filterCommandsByCategory(
  commands: RegisteredCommand[],
  category: ExtendedCommandCategory
): RegisteredCommand[] {
  return commands.filter((cmd) => cmd.category === category)
}

/**
 * Search commands by query (fuzzy match across label, description, id)
 */
export function searchCommands(commands: RegisteredCommand[], query: string): RegisteredCommand[] {
  if (!query.trim()) return commands
  const q = query.toLowerCase()
  return commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q)
  )
}
