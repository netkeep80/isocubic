/**
 * Command Plugin system for isocubic
 * Allows modules to register and unregister command groups dynamically
 *
 * Phase 11, TASK 77: Extended command bar functionality
 */

/** A command definition that plugins can register */
export interface PluginCommand {
  id: string
  label: string
  icon: string
  description: string
  category: string
  /** Handler called when the command is executed */
  execute: () => void
}

/** A command plugin that groups related commands */
export interface CommandPlugin {
  id: string
  name: string
  description: string
  version: string
  commands: PluginCommand[]
}

/**
 * Create a command plugin registry for managing dynamic command providers
 */
export function createCommandPluginRegistry() {
  const plugins = new Map<string, CommandPlugin>()
  const listeners: Array<() => void> = []

  /** Notify listeners that plugins have changed */
  function notifyChange(): void {
    for (const listener of listeners) {
      listener()
    }
  }

  /** Register a plugin with its commands */
  function registerPlugin(plugin: CommandPlugin): void {
    plugins.set(plugin.id, plugin)
    notifyChange()
  }

  /** Unregister a plugin by id */
  function unregisterPlugin(pluginId: string): boolean {
    const removed = plugins.delete(pluginId)
    if (removed) notifyChange()
    return removed
  }

  /** Get a plugin by id */
  function getPlugin(pluginId: string): CommandPlugin | undefined {
    return plugins.get(pluginId)
  }

  /** Get all registered plugins */
  function getPlugins(): CommandPlugin[] {
    return Array.from(plugins.values())
  }

  /** Get all commands from all plugins */
  function getAllCommands(): PluginCommand[] {
    const commands: PluginCommand[] = []
    for (const plugin of plugins.values()) {
      commands.push(...plugin.commands)
    }
    return commands
  }

  /** Get commands filtered by category */
  function getCommandsByCategory(category: string): PluginCommand[] {
    return getAllCommands().filter((cmd) => cmd.category === category)
  }

  /** Find a specific command by id across all plugins */
  function findCommand(commandId: string): PluginCommand | undefined {
    for (const plugin of plugins.values()) {
      const cmd = plugin.commands.find((c) => c.id === commandId)
      if (cmd) return cmd
    }
    return undefined
  }

  /** Execute a command by id */
  function executeCommand(commandId: string): boolean {
    const cmd = findCommand(commandId)
    if (!cmd) return false
    cmd.execute()
    return true
  }

  /** Subscribe to plugin changes */
  function onChange(listener: () => void): () => void {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index !== -1) listeners.splice(index, 1)
    }
  }

  /** Get count of registered plugins */
  function getPluginCount(): number {
    return plugins.size
  }

  /** Get total count of registered commands */
  function getCommandCount(): number {
    let count = 0
    for (const plugin of plugins.values()) {
      count += plugin.commands.length
    }
    return count
  }

  /** Clear all plugins */
  function clearAll(): void {
    plugins.clear()
    notifyChange()
  }

  return {
    registerPlugin,
    unregisterPlugin,
    getPlugin,
    getPlugins,
    getAllCommands,
    getCommandsByCategory,
    findCommand,
    executeCommand,
    onChange,
    getPluginCount,
    getCommandCount,
    clearAll,
  }
}
