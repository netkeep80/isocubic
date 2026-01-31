/**
 * Cube Editor composable
 * Centralized state management for the cube editing workflow
 *
 * Manages the current cube, undo/redo history, and autosave.
 *
 * Phase 10, TASK 67: App.vue layout and adaptive design
 */

import { ref, computed, watch } from 'vue'
import type { SpectralCube } from '../types/cube'
import {
  loadCurrentCube,
  saveCurrentCube,
  pushToHistory,
  undo as storageUndo,
  redo as storageRedo,
  canUndo as storageCanUndo,
  canRedo as storageCanRedo,
} from '../lib/storage'

/** Default cube used when no saved state exists */
const DEFAULT_CUBE: SpectralCube = {
  id: 'stone_moss_001',
  prompt: 'каменная кладка с мхом',
  base: {
    color: [0.65, 0.55, 0.45],
    roughness: 0.8,
    transparency: 1.0,
  },
  gradients: [
    {
      axis: 'y',
      factor: 0.3,
      color_shift: [0.2, 0.35, 0.15],
    },
  ],
  noise: {
    type: 'perlin',
    scale: 8.0,
    octaves: 4,
    persistence: 0.6,
    mask: 'bottom_40%',
  },
  physics: {
    material: 'stone',
    density: 2.5,
    break_pattern: 'crumble',
  },
  meta: {
    name: 'Камень со мхом',
    tags: ['stone', 'moss', 'natural', 'outdoor'],
    author: 'isocubic',
  },
}

/**
 * Composable for managing the cube editing state
 * Provides the current cube, update/select functions, and undo/redo
 */
export function useCubeEditor() {
  const currentCube = ref<SpectralCube>(loadCurrentCube() ?? DEFAULT_CUBE)
  const undoAvailable = ref(storageCanUndo())
  const redoAvailable = ref(storageCanRedo())

  /** Refresh undo/redo availability flags */
  function refreshHistory() {
    undoAvailable.value = storageCanUndo()
    redoAvailable.value = storageCanRedo()
  }

  /** Update the current cube with new values and push to history */
  function updateCube(cube: SpectralCube) {
    pushToHistory(currentCube.value)
    currentCube.value = cube
    saveCurrentCube(cube)
    refreshHistory()
  }

  /** Select a cube (from gallery) without pushing to history */
  function selectCube(cube: SpectralCube) {
    pushToHistory(currentCube.value)
    currentCube.value = cube
    saveCurrentCube(cube)
    refreshHistory()
  }

  /** Load a cube from import (same as select) */
  function loadCube(cube: SpectralCube) {
    pushToHistory(currentCube.value)
    currentCube.value = cube
    saveCurrentCube(cube)
    refreshHistory()
  }

  /** Undo last change */
  function undo() {
    const prev = storageUndo()
    if (prev) {
      currentCube.value = prev
      saveCurrentCube(prev)
    }
    refreshHistory()
  }

  /** Redo last undone change */
  function redo() {
    const next = storageRedo()
    if (next) {
      currentCube.value = next
      saveCurrentCube(next)
    }
    refreshHistory()
  }

  // Autosave on changes
  watch(
    currentCube,
    (cube) => {
      saveCurrentCube(cube)
    },
    { deep: true }
  )

  return {
    currentCube: computed(() => currentCube.value),
    undoAvailable: computed(() => undoAvailable.value),
    redoAvailable: computed(() => redoAvailable.value),
    updateCube,
    selectCube,
    loadCube,
    undo,
    redo,
  }
}
