/**
 * Storage module for SpectralCube configurations
 * Provides LocalStorage persistence, JSON file export/import, and undo/redo history
 */

import type { SpectralCube } from '../types/cube'
import { validateCube, isValidCube } from './validation'

// Storage keys
const STORAGE_KEY_CONFIGS = 'isocubic_configs'
const STORAGE_KEY_CURRENT = 'isocubic_current'
const STORAGE_KEY_HISTORY = 'isocubic_history'
const MAX_HISTORY_SIZE = 50

/**
 * Stored configuration with metadata
 */
export interface StoredConfig {
  cube: SpectralCube
  savedAt: string
}

/**
 * History state for undo/redo
 */
export interface HistoryState {
  past: SpectralCube[]
  present: SpectralCube | null
  future: SpectralCube[]
}

/**
 * Result of import operation
 */
export interface ImportResult {
  success: boolean
  cube?: SpectralCube
  error?: string
}

/**
 * Storage error class
 */
export class StorageError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'StorageError'
    this.cause = cause
  }
}

// ============================================================================
// LocalStorage Functions
// ============================================================================

/**
 * Saves a cube configuration to LocalStorage
 * @param cube - The cube to save
 * @throws StorageError if saving fails
 */
export function saveCubeToStorage(cube: SpectralCube): void {
  try {
    const configs = getAllConfigsFromStorage()
    const storedConfig: StoredConfig = {
      cube: { ...cube, meta: { ...cube.meta, modified: new Date().toISOString() } },
      savedAt: new Date().toISOString(),
    }
    configs[cube.id] = storedConfig
    localStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(configs))
  } catch (error) {
    throw new StorageError('Failed to save cube to LocalStorage', error)
  }
}

/**
 * Loads a cube configuration from LocalStorage by ID
 * @param id - The cube ID to load
 * @returns The cube if found, null otherwise
 */
export function loadCubeFromStorage(id: string): SpectralCube | null {
  try {
    const configs = getAllConfigsFromStorage()
    const stored = configs[id]
    return stored?.cube ?? null
  } catch {
    return null
  }
}

/**
 * Gets all stored cube configurations
 * @returns Record of cube IDs to stored configs
 */
export function getAllConfigsFromStorage(): Record<string, StoredConfig> {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CONFIGS)
    if (!data) return {}
    return JSON.parse(data) as Record<string, StoredConfig>
  } catch {
    return {}
  }
}

/**
 * Gets a list of all saved cubes with metadata
 * @returns Array of stored configs sorted by save date (newest first)
 */
export function getSavedCubesList(): StoredConfig[] {
  const configs = getAllConfigsFromStorage()
  return Object.values(configs).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  )
}

/**
 * Deletes a cube configuration from LocalStorage
 * @param id - The cube ID to delete
 * @returns True if deleted, false if not found
 */
export function deleteCubeFromStorage(id: string): boolean {
  try {
    const configs = getAllConfigsFromStorage()
    if (!(id in configs)) return false
    delete configs[id]
    localStorage.setItem(STORAGE_KEY_CONFIGS, JSON.stringify(configs))
    return true
  } catch {
    return false
  }
}

/**
 * Clears all cube configurations from LocalStorage
 */
export function clearAllConfigs(): void {
  localStorage.removeItem(STORAGE_KEY_CONFIGS)
}

// ============================================================================
// Current Cube State (for autosave)
// ============================================================================

/**
 * Saves the current working cube state
 * @param cube - The current cube to save
 */
export function saveCurrentCube(cube: SpectralCube): void {
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(cube))
  } catch {
    // Silently fail for autosave
  }
}

/**
 * Loads the current working cube state
 * @returns The current cube if found, null otherwise
 */
export function loadCurrentCube(): SpectralCube | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CURRENT)
    if (!data) return null
    const parsed = JSON.parse(data)
    return isValidCube(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Clears the current working cube state
 */
export function clearCurrentCube(): void {
  localStorage.removeItem(STORAGE_KEY_CURRENT)
}

// ============================================================================
// JSON File Export/Import
// ============================================================================

/**
 * Exports a cube configuration to a JSON file download
 * @param cube - The cube to export
 * @param filename - Optional custom filename (without extension)
 */
export function exportCubeToFile(cube: SpectralCube, filename?: string): void {
  const json = JSON.stringify(cube, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const name = filename || cube.meta?.name || cube.id
  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_')

  const link = document.createElement('a')
  link.href = url
  link.download = `${sanitizedName}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports multiple cube configurations to a single JSON file
 * @param cubes - Array of cubes to export
 * @param filename - Optional custom filename (without extension)
 */
export function exportCubesToFile(cubes: SpectralCube[], filename?: string): void {
  const json = JSON.stringify(cubes, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const name = filename || `isocubic_export_${new Date().toISOString().slice(0, 10)}`

  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Imports a cube configuration from a JSON file
 * @param file - The file to import
 * @returns Promise with import result
 */
export async function importCubeFromFile(file: File): Promise<ImportResult> {
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)

    // Handle array of cubes (return first one)
    const cubeData = Array.isArray(parsed) ? parsed[0] : parsed

    const validation = validateCube(cubeData)
    if (!validation.valid) {
      const errorMessages = validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
      return {
        success: false,
        error: `Invalid cube configuration: ${errorMessages}`,
      }
    }

    return {
      success: true,
      cube: cubeData as SpectralCube,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      error: `Failed to parse JSON file: ${message}`,
    }
  }
}

/**
 * Imports multiple cube configurations from a JSON file
 * @param file - The file to import
 * @returns Promise with array of import results
 */
export async function importCubesFromFile(file: File): Promise<ImportResult[]> {
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)

    const cubes = Array.isArray(parsed) ? parsed : [parsed]
    const results: ImportResult[] = []

    for (const cubeData of cubes) {
      const validation = validateCube(cubeData)
      if (validation.valid) {
        results.push({ success: true, cube: cubeData as SpectralCube })
      } else {
        const errorMessages = validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ')
        results.push({ success: false, error: `Invalid cube: ${errorMessages}` })
      }
    }

    return results
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return [{ success: false, error: `Failed to parse JSON file: ${message}` }]
  }
}

/**
 * Creates a file input and triggers file selection
 * @param onFileSelected - Callback when file is selected
 * @param accept - Accepted file types (default: .json)
 */
export function triggerFileInput(
  onFileSelected: (file: File) => void,
  accept: string = '.json'
): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) {
      onFileSelected(file)
    }
  }
  input.click()
}

// ============================================================================
// Undo/Redo History
// ============================================================================

/**
 * Gets the current history state from storage
 * @returns The history state
 */
export function getHistoryState(): HistoryState {
  try {
    const data = localStorage.getItem(STORAGE_KEY_HISTORY)
    if (!data) {
      return { past: [], present: null, future: [] }
    }
    return JSON.parse(data) as HistoryState
  } catch {
    return { past: [], present: null, future: [] }
  }
}

/**
 * Saves history state to storage
 * @param state - The history state to save
 */
function saveHistoryState(state: HistoryState): void {
  try {
    // Limit history size
    const limitedState: HistoryState = {
      past: state.past.slice(-MAX_HISTORY_SIZE),
      present: state.present,
      future: state.future.slice(0, MAX_HISTORY_SIZE),
    }
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(limitedState))
  } catch {
    // Silently fail
  }
}

/**
 * Pushes a new state to history
 * @param cube - The new cube state to push
 */
export function pushToHistory(cube: SpectralCube): void {
  const state = getHistoryState()

  if (state.present !== null) {
    state.past.push(state.present)
  }

  state.present = cube
  state.future = [] // Clear redo stack on new action

  saveHistoryState(state)
}

/**
 * Performs an undo operation
 * @returns The previous cube state, or null if nothing to undo
 */
export function undo(): SpectralCube | null {
  const state = getHistoryState()

  if (state.past.length === 0) {
    return null
  }

  const previous = state.past.pop()!

  if (state.present !== null) {
    state.future.unshift(state.present)
  }

  state.present = previous
  saveHistoryState(state)

  return previous
}

/**
 * Performs a redo operation
 * @returns The next cube state, or null if nothing to redo
 */
export function redo(): SpectralCube | null {
  const state = getHistoryState()

  if (state.future.length === 0) {
    return null
  }

  const next = state.future.shift()!

  if (state.present !== null) {
    state.past.push(state.present)
  }

  state.present = next
  saveHistoryState(state)

  return next
}

/**
 * Checks if undo is available
 * @returns True if undo is available
 */
export function canUndo(): boolean {
  return getHistoryState().past.length > 0
}

/**
 * Checks if redo is available
 * @returns True if redo is available
 */
export function canRedo(): boolean {
  return getHistoryState().future.length > 0
}

/**
 * Clears all history
 */
export function clearHistory(): void {
  localStorage.removeItem(STORAGE_KEY_HISTORY)
}

/**
 * Initializes history with a cube (for fresh start)
 * @param cube - The initial cube state
 */
export function initializeHistory(cube: SpectralCube): void {
  const state: HistoryState = {
    past: [],
    present: cube,
    future: [],
  }
  saveHistoryState(state)
}

// ============================================================================
// Autosave Manager
// ============================================================================

/**
 * Autosave manager for debounced saving
 */
export class AutosaveManager {
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  private debounceMs: number

  /**
   * Creates a new AutosaveManager
   * @param debounceMs - Debounce delay in milliseconds (default: 1000)
   */
  constructor(debounceMs: number = 1000) {
    this.debounceMs = debounceMs
  }

  /**
   * Schedules an autosave
   * @param cube - The cube to save
   * @param pushHistory - Whether to push to history (default: true)
   */
  schedule(cube: SpectralCube, pushHistory: boolean = true): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
    }

    this.timeoutId = setTimeout(() => {
      saveCurrentCube(cube)
      if (pushHistory) {
        pushToHistory(cube)
      }
      this.timeoutId = null
    }, this.debounceMs)
  }

  /**
   * Cancels pending autosave
   */
  cancel(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  /**
   * Forces immediate save
   * @param cube - The cube to save
   * @param pushHistory - Whether to push to history (default: true)
   */
  saveNow(cube: SpectralCube, pushHistory: boolean = true): void {
    this.cancel()
    saveCurrentCube(cube)
    if (pushHistory) {
      pushToHistory(cube)
    }
  }
}

/**
 * Creates a default autosave manager instance
 */
export function createAutosaveManager(debounceMs?: number): AutosaveManager {
  return new AutosaveManager(debounceMs)
}
