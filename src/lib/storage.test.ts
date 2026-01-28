/**
 * Unit tests for storage module
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { SpectralCube } from '../types/cube'
import {
  saveCubeToStorage,
  loadCubeFromStorage,
  getAllConfigsFromStorage,
  getSavedCubesList,
  deleteCubeFromStorage,
  clearAllConfigs,
  saveCurrentCube,
  loadCurrentCube,
  clearCurrentCube,
  importCubeFromFile,
  importCubesFromFile,
  pushToHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  clearHistory,
  initializeHistory,
  getHistoryState,
  AutosaveManager,
  StorageError,
} from './storage'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Helper to create a mock File with working text() method
function createMockFile(content: string, name: string = 'test.json'): File {
  const blob = new Blob([content], { type: 'application/json' })
  // Create a File-like object with text() method that works in jsdom
  const file = Object.assign(blob, {
    name,
    lastModified: Date.now(),
    webkitRelativePath: '',
    text: () => Promise.resolve(content),
  }) as File
  return file
}

// Test cube fixture
const createTestCube = (id: string = 'test_cube_001'): SpectralCube => ({
  id,
  prompt: 'Test cube',
  base: {
    color: [0.5, 0.5, 0.5],
    roughness: 0.5,
    transparency: 1.0,
  },
  gradients: [
    {
      axis: 'y',
      factor: 0.3,
      color_shift: [0.1, 0.1, 0.1],
    },
  ],
  noise: {
    type: 'perlin',
    scale: 8.0,
    octaves: 4,
    persistence: 0.5,
  },
  physics: {
    material: 'stone',
    density: 2.5,
    break_pattern: 'crumble',
  },
  meta: {
    name: 'Test Cube',
    tags: ['test'],
    author: 'test',
    created: '2024-01-01T00:00:00.000Z',
  },
})

describe('Storage Module', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('LocalStorage functions', () => {
    describe('saveCubeToStorage', () => {
      it('should save a cube to localStorage', () => {
        const cube = createTestCube()
        saveCubeToStorage(cube)

        expect(localStorageMock.setItem).toHaveBeenCalled()
        const stored = loadCubeFromStorage(cube.id)
        expect(stored).not.toBeNull()
        expect(stored?.id).toBe(cube.id)
      })

      it('should update the modified timestamp', () => {
        const cube = createTestCube()
        saveCubeToStorage(cube)

        const stored = loadCubeFromStorage(cube.id)
        expect(stored?.meta?.modified).toBeDefined()
      })

      it('should overwrite existing cube with same id', () => {
        const cube1 = createTestCube()
        cube1.prompt = 'First version'
        saveCubeToStorage(cube1)

        const cube2 = createTestCube()
        cube2.prompt = 'Second version'
        saveCubeToStorage(cube2)

        const stored = loadCubeFromStorage(cube1.id)
        expect(stored?.prompt).toBe('Second version')
      })
    })

    describe('loadCubeFromStorage', () => {
      it('should return null for non-existent cube', () => {
        const result = loadCubeFromStorage('non_existent')
        expect(result).toBeNull()
      })

      it('should load saved cube correctly', () => {
        const cube = createTestCube()
        saveCubeToStorage(cube)

        const loaded = loadCubeFromStorage(cube.id)
        expect(loaded).not.toBeNull()
        expect(loaded?.id).toBe(cube.id)
        expect(loaded?.base.color).toEqual(cube.base.color)
      })
    })

    describe('getAllConfigsFromStorage', () => {
      it('should return empty object when no configs saved', () => {
        const configs = getAllConfigsFromStorage()
        expect(configs).toEqual({})
      })

      it('should return all saved configs', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')
        saveCubeToStorage(cube1)
        saveCubeToStorage(cube2)

        const configs = getAllConfigsFromStorage()
        expect(Object.keys(configs)).toHaveLength(2)
        expect(configs['cube_1']).toBeDefined()
        expect(configs['cube_2']).toBeDefined()
      })
    })

    describe('getSavedCubesList', () => {
      it('should return empty array when no configs saved', () => {
        const list = getSavedCubesList()
        expect(list).toEqual([])
      })

      it('should return list of saved cubes', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')

        saveCubeToStorage(cube1)
        saveCubeToStorage(cube2)

        const list = getSavedCubesList()
        expect(list).toHaveLength(2)
        // Both cubes should be in the list
        const ids = list.map((c) => c.cube.id)
        expect(ids).toContain('cube_1')
        expect(ids).toContain('cube_2')
      })
    })

    describe('deleteCubeFromStorage', () => {
      it('should return false for non-existent cube', () => {
        const result = deleteCubeFromStorage('non_existent')
        expect(result).toBe(false)
      })

      it('should delete existing cube and return true', () => {
        const cube = createTestCube()
        saveCubeToStorage(cube)

        const result = deleteCubeFromStorage(cube.id)
        expect(result).toBe(true)

        const loaded = loadCubeFromStorage(cube.id)
        expect(loaded).toBeNull()
      })
    })

    describe('clearAllConfigs', () => {
      it('should remove all saved configs', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')
        saveCubeToStorage(cube1)
        saveCubeToStorage(cube2)

        clearAllConfigs()

        const configs = getAllConfigsFromStorage()
        expect(configs).toEqual({})
      })
    })
  })

  describe('Current cube state functions', () => {
    describe('saveCurrentCube / loadCurrentCube', () => {
      it('should save and load current cube', () => {
        const cube = createTestCube()
        saveCurrentCube(cube)

        const loaded = loadCurrentCube()
        expect(loaded).not.toBeNull()
        expect(loaded?.id).toBe(cube.id)
      })

      it('should return null when no current cube saved', () => {
        const loaded = loadCurrentCube()
        expect(loaded).toBeNull()
      })
    })

    describe('clearCurrentCube', () => {
      it('should clear current cube', () => {
        const cube = createTestCube()
        saveCurrentCube(cube)
        clearCurrentCube()

        const loaded = loadCurrentCube()
        expect(loaded).toBeNull()
      })
    })
  })

  describe('Import functions', () => {
    describe('importCubeFromFile', () => {
      it('should import valid cube from file', async () => {
        const cube = createTestCube()
        const json = JSON.stringify(cube)
        const file = createMockFile(json)

        const result = await importCubeFromFile(file)
        expect(result.success).toBe(true)
        expect(result.cube?.id).toBe(cube.id)
      })

      it('should return error for invalid JSON', async () => {
        const file = createMockFile('not valid json')

        const result = await importCubeFromFile(file)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Failed to parse')
      })

      it('should return error for invalid cube schema', async () => {
        const invalidCube = { foo: 'bar' }
        const json = JSON.stringify(invalidCube)
        const file = createMockFile(json)

        const result = await importCubeFromFile(file)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Invalid cube configuration')
      })

      it('should handle array of cubes (return first)', async () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')
        const json = JSON.stringify([cube1, cube2])
        const file = createMockFile(json)

        const result = await importCubeFromFile(file)
        expect(result.success).toBe(true)
        expect(result.cube?.id).toBe('cube_1')
      })
    })

    describe('importCubesFromFile', () => {
      it('should import multiple valid cubes', async () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')
        const json = JSON.stringify([cube1, cube2])
        const file = createMockFile(json)

        const results = await importCubesFromFile(file)
        expect(results).toHaveLength(2)
        expect(results[0].success).toBe(true)
        expect(results[1].success).toBe(true)
      })

      it('should handle mixed valid and invalid cubes', async () => {
        const validCube = createTestCube('valid')
        const invalidCube = { id: 'invalid' } // missing base
        const json = JSON.stringify([validCube, invalidCube])
        const file = createMockFile(json)

        const results = await importCubesFromFile(file)
        expect(results).toHaveLength(2)
        expect(results[0].success).toBe(true)
        expect(results[1].success).toBe(false)
      })
    })
  })

  describe('History functions', () => {
    beforeEach(() => {
      clearHistory()
    })

    describe('pushToHistory', () => {
      it('should add cube to history', () => {
        const cube = createTestCube()
        pushToHistory(cube)

        const state = getHistoryState()
        expect(state.present).not.toBeNull()
        expect(state.present?.id).toBe(cube.id)
      })

      it('should move previous present to past', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')

        pushToHistory(cube1)
        pushToHistory(cube2)

        const state = getHistoryState()
        expect(state.past).toHaveLength(1)
        expect(state.past[0].id).toBe('cube_1')
        expect(state.present?.id).toBe('cube_2')
      })

      it('should clear future on new action', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')
        const cube3 = createTestCube('cube_3')

        pushToHistory(cube1)
        pushToHistory(cube2)
        undo() // Now cube1 is present, cube2 is in future

        pushToHistory(cube3) // Should clear future

        const state = getHistoryState()
        expect(state.future).toHaveLength(0)
      })
    })

    describe('undo', () => {
      it('should return null when no history', () => {
        const result = undo()
        expect(result).toBeNull()
      })

      it('should return previous state', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')

        pushToHistory(cube1)
        pushToHistory(cube2)

        const result = undo()
        expect(result).not.toBeNull()
        expect(result?.id).toBe('cube_1')
      })

      it('should move current to future', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')

        pushToHistory(cube1)
        pushToHistory(cube2)
        undo()

        const state = getHistoryState()
        expect(state.future).toHaveLength(1)
        expect(state.future[0].id).toBe('cube_2')
      })
    })

    describe('redo', () => {
      it('should return null when no future', () => {
        const result = redo()
        expect(result).toBeNull()
      })

      it('should return next state', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')

        pushToHistory(cube1)
        pushToHistory(cube2)
        undo()

        const result = redo()
        expect(result).not.toBeNull()
        expect(result?.id).toBe('cube_2')
      })
    })

    describe('canUndo / canRedo', () => {
      it('should return false when no history', () => {
        expect(canUndo()).toBe(false)
        expect(canRedo()).toBe(false)
      })

      it('should return correct values after operations', () => {
        const cube1 = createTestCube('cube_1')
        const cube2 = createTestCube('cube_2')

        pushToHistory(cube1)
        expect(canUndo()).toBe(false) // Only present, no past

        pushToHistory(cube2)
        expect(canUndo()).toBe(true) // cube1 in past

        undo()
        expect(canUndo()).toBe(false) // No more past
        expect(canRedo()).toBe(true) // cube2 in future
      })
    })

    describe('initializeHistory', () => {
      it('should set initial state with empty past and future', () => {
        const cube = createTestCube()
        initializeHistory(cube)

        const state = getHistoryState()
        expect(state.past).toHaveLength(0)
        expect(state.future).toHaveLength(0)
        expect(state.present?.id).toBe(cube.id)
      })
    })

    describe('clearHistory', () => {
      it('should clear all history', () => {
        const cube = createTestCube()
        pushToHistory(cube)
        clearHistory()

        const state = getHistoryState()
        expect(state.past).toHaveLength(0)
        expect(state.future).toHaveLength(0)
        expect(state.present).toBeNull()
      })
    })
  })

  describe('AutosaveManager', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      clearCurrentCube()
      clearHistory()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should debounce saves', () => {
      const manager = new AutosaveManager(100)
      const cube1 = createTestCube('cube_1')
      const cube2 = createTestCube('cube_2')

      manager.schedule(cube1, false)
      manager.schedule(cube2, false) // Should cancel first

      vi.advanceTimersByTime(50)
      expect(loadCurrentCube()).toBeNull() // Not saved yet

      vi.advanceTimersByTime(100)
      const saved = loadCurrentCube()
      expect(saved?.id).toBe('cube_2') // Only cube2 saved
    })

    it('should cancel pending save', () => {
      const manager = new AutosaveManager(100)
      const cube = createTestCube()

      manager.schedule(cube, false)
      manager.cancel()

      vi.advanceTimersByTime(200)
      expect(loadCurrentCube()).toBeNull()
    })

    it('should save immediately with saveNow', () => {
      const manager = new AutosaveManager(100)
      const cube = createTestCube()

      manager.saveNow(cube, false)

      // No need to advance timers
      const saved = loadCurrentCube()
      expect(saved?.id).toBe(cube.id)
    })

    it('should push to history when enabled', () => {
      const manager = new AutosaveManager(100)
      const cube = createTestCube()

      manager.saveNow(cube, true)

      const state = getHistoryState()
      expect(state.present?.id).toBe(cube.id)
    })
  })

  describe('StorageError', () => {
    it('should have correct properties', () => {
      const cause = new Error('Original error')
      const error = new StorageError('Test message', cause)

      expect(error.name).toBe('StorageError')
      expect(error.message).toBe('Test message')
      expect(error.cause).toBe(cause)
    })
  })
})
