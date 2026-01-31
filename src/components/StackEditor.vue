/** * StackEditor Component (Vue 3.0 SFC) * Provides UI for editing vertical stacks of cubes
(CubeStackConfig) * * ISSUE 29: Редактор стопок кубиков (Stack Editor) * ISSUE 30: Шаблоны стопок
(Stack Presets) - Added preset picker integration * * Features: * - Visual representation of layers
(vertical list) * - Add/remove/reorder layers * - Drag-and-drop for changing layer order * - Layer
editing (name, height, cube config reference) * - Transition editing (type, blend height, easing) *
- Stack physics display (stability, weight, integrity) * - Load preset from gallery (ISSUE 30) * -
Save current stack as preset (ISSUE 30) */
<script setup lang="ts">
import { ref, computed, watch, shallowRef } from 'vue'
import type {
  CubeStackConfig,
  StackLayer,
  StackTransition,
  StackTransitionType,
  StackPhysics,
} from '../types/stack'
import {
  DEFAULT_STACK_TRANSITION,
  DEFAULT_STACK_PHYSICS,
  createStackLayer,
  createCubeStack,
} from '../types/stack'
import type { SpectralCube, Color3 } from '../types/cube'
import { createDefaultCube } from '../types/cube'
import StackPresetPicker from './StackPresetPicker.vue'

/**
 * Props for StackEditor component
 */
interface StackEditorProps {
  /** Current stack configuration */
  currentStack: CubeStackConfig | null
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<StackEditorProps>(), {
  className: '',
})

const emit = defineEmits<{
  'update:stack': [stack: CubeStackConfig]
  editLayerCube: [layerIndex: number, cubeConfig: SpectralCube]
}>()

/** Available transition types */
const TRANSITION_TYPES: StackTransitionType[] = ['blend', 'hard', 'gradient', 'noise']

/** Available easing functions */
const EASING_TYPES: Array<'linear' | 'smooth' | 'ease-in' | 'ease-out'> = [
  'linear',
  'smooth',
  'ease-in',
  'ease-out',
]

/** Transition type descriptions */
const TRANSITION_TYPE_DESCRIPTIONS: Record<StackTransitionType, string> = {
  blend: 'Smooth blending between layers',
  hard: 'Sharp boundary between layers',
  gradient: 'Color gradient transition',
  noise: 'Noisy/organic transition',
}

/** Easing descriptions */
const EASING_DESCRIPTIONS: Record<string, string> = {
  linear: 'Constant speed transition',
  smooth: 'Accelerate and decelerate',
  'ease-in': 'Start slow, end fast',
  'ease-out': 'Start fast, end slow',
}

/**
 * Generates a unique ID for new layers
 */
function generateLayerId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Converts RGB array [0-1] to hex color string
 */
function rgbToHex(color: Color3): string {
  const r = Math.round(color[0] * 255)
  const g = Math.round(color[1] * 255)
  const b = Math.round(color[2] * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Drag state interface for tracking drag-and-drop operations
 */
interface DragState {
  isDragging: boolean
  draggedIndex: number | null
  dropTargetIndex: number | null
}

// Local state for editing
const localStack = ref<CubeStackConfig | null>(props.currentStack)
const expandedSections = ref<Set<string>>(new Set(['layers', 'physics']))
const expandedLayers = ref<Set<string>>(new Set())
const dragState = ref<DragState>({
  isDragging: false,
  draggedIndex: null,
  dropTargetIndex: null,
})
const showPresetPicker = ref(false)

// Ref for drag ghost element
const dragGhostRef = shallowRef<HTMLDivElement | null>(null)

// Sync local state with prop
watch(
  () => props.currentStack,
  (newVal) => {
    localStack.value = newVal
  }
)

// Toggle section expansion
function toggleSection(section: string) {
  const next = new Set(expandedSections.value)
  if (next.has(section)) {
    next.delete(section)
  } else {
    next.add(section)
  }
  expandedSections.value = next
}

// Toggle layer expansion
function toggleLayer(layerId: string) {
  const next = new Set(expandedLayers.value)
  if (next.has(layerId)) {
    next.delete(layerId)
  } else {
    next.add(layerId)
  }
  expandedLayers.value = next
}

// Update stack and notify parent
function updateStack(updates: Partial<CubeStackConfig>) {
  if (!localStack.value) return

  const updatedStack: CubeStackConfig = {
    ...localStack.value,
    ...updates,
    meta: {
      ...localStack.value.meta,
      ...updates.meta,
      modified: new Date().toISOString(),
    },
  }
  localStack.value = updatedStack
  emit('update:stack', updatedStack)
}

// Recalculate stack properties after layer changes
function recalculateStack(layers: StackLayer[]): Partial<CubeStackConfig> {
  // Update positions based on index
  const positionedLayers = layers.map((layer, index) => {
    let position: 'bottom' | 'middle' | 'top' | 'single'
    if (layers.length === 1) {
      position = 'single'
    } else if (index === 0) {
      position = 'bottom'
    } else if (index === layers.length - 1) {
      position = 'top'
    } else {
      position = 'middle'
    }

    return {
      ...layer,
      position,
      transitionToNext:
        position !== 'top' && position !== 'single'
          ? (layer.transitionToNext ?? DEFAULT_STACK_TRANSITION)
          : undefined,
    }
  })

  // Calculate total height
  const totalHeight = positionedLayers.reduce((sum, layer) => sum + (layer.height ?? 1), 0)

  // Calculate total weight
  const totalWeight = positionedLayers.reduce((sum, layer) => {
    const density = layer.cubeConfig.physics?.density ?? 2.5
    const height = layer.height ?? 1
    return sum + density * height
  }, 0)

  return {
    layers: positionedLayers,
    totalHeight,
    physics: {
      ...(localStack.value?.physics ?? DEFAULT_STACK_PHYSICS),
      totalWeight,
    },
  }
}

// Add a new layer
function addLayer() {
  if (!localStack.value) return

  const newLayerId = generateLayerId()
  const newCubeId = `cube-${newLayerId}`
  const newCube = createDefaultCube(newCubeId)

  // Add layer at the top (before the current top layer becomes middle)
  const newLayer = createStackLayer(newLayerId, newCube, 'top', 1)
  newLayer.name = `Layer ${localStack.value.layers.length + 1}`

  const newLayers = [...localStack.value.layers, newLayer]
  const updates = recalculateStack(newLayers)
  updateStack(updates)

  // Auto-expand the new layer
  expandedLayers.value = new Set([...expandedLayers.value, newLayerId])
}

// Remove a layer
function removeLayer(index: number) {
  if (!localStack.value || localStack.value.layers.length <= 1) return

  const newLayers = localStack.value.layers.filter((_, i) => i !== index)
  const updates = recalculateStack(newLayers)
  updateStack(updates)
}

// Update a specific layer
function updateLayer(index: number, updates: Partial<StackLayer>) {
  if (!localStack.value) return

  const newLayers = [...localStack.value.layers]
  newLayers[index] = { ...newLayers[index], ...updates }

  const stackUpdates = recalculateStack(newLayers)
  updateStack(stackUpdates)
}

// Update layer transition
function updateLayerTransition(index: number, updates: Partial<StackTransition>) {
  if (!localStack.value) return

  const layer = localStack.value.layers[index]
  if (!layer.transitionToNext) return

  updateLayer(index, {
    transitionToNext: {
      ...layer.transitionToNext,
      ...updates,
    },
  })
}

// Move layer up (toward top)
function moveLayerUp(index: number) {
  if (!localStack.value || index >= localStack.value.layers.length - 1) return

  const newLayers = [...localStack.value.layers]
  const temp = newLayers[index]
  newLayers[index] = newLayers[index + 1]
  newLayers[index + 1] = temp

  const updates = recalculateStack(newLayers)
  updateStack(updates)
}

// Move layer down (toward bottom)
function moveLayerDown(index: number) {
  if (!localStack.value || index <= 0) return

  const newLayers = [...localStack.value.layers]
  const temp = newLayers[index]
  newLayers[index] = newLayers[index - 1]
  newLayers[index - 1] = temp

  const updates = recalculateStack(newLayers)
  updateStack(updates)
}

// Drag-and-drop handlers
function handleDragStart(e: DragEvent, index: number) {
  if (!localStack.value) return

  dragState.value = {
    isDragging: true,
    draggedIndex: index,
    dropTargetIndex: null,
  }

  // Set drag data
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', String(index))

  // Create custom drag image
  const dragGhost = document.createElement('div')
  dragGhost.className = 'stack-editor__drag-ghost'
  dragGhost.textContent = localStack.value.layers[index].name || `Layer ${index + 1}`
  document.body.appendChild(dragGhost)
  dragGhostRef.value = dragGhost
  e.dataTransfer!.setDragImage(dragGhost, 0, 0)
}

function handleDragOver(e: DragEvent, targetIndex: number) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'

  if (dragState.value.draggedIndex !== null && dragState.value.draggedIndex !== targetIndex) {
    dragState.value = {
      ...dragState.value,
      dropTargetIndex: targetIndex,
    }
  }
}

function handleDragEnd() {
  // Cleanup drag ghost
  if (dragGhostRef.value) {
    document.body.removeChild(dragGhostRef.value)
    dragGhostRef.value = null
  }

  dragState.value = {
    isDragging: false,
    draggedIndex: null,
    dropTargetIndex: null,
  }
}

function handleDrop(e: DragEvent, targetIndex: number) {
  e.preventDefault()

  if (!localStack.value || dragState.value.draggedIndex === null) return

  const sourceIndex = dragState.value.draggedIndex
  if (sourceIndex === targetIndex) {
    handleDragEnd()
    return
  }

  // Reorder layers
  const newLayers = [...localStack.value.layers]
  const [draggedLayer] = newLayers.splice(sourceIndex, 1)
  newLayers.splice(targetIndex, 0, draggedLayer)

  const updates = recalculateStack(newLayers)
  updateStack(updates)
  handleDragEnd()
}

// Update stack physics
function updatePhysics(updates: Partial<StackPhysics>) {
  if (!localStack.value) return
  updateStack({
    physics: {
      ...localStack.value.physics,
      ...updates,
    },
  })
}

// Reset to default stack
function handleReset() {
  const defaultCube = createDefaultCube('default-layer-cube')
  const defaultLayer = createStackLayer('default-layer', defaultCube, 'single', 1)
  defaultLayer.name = 'Layer 1'

  const newStack = createCubeStack(localStack.value?.id || `stack-${Date.now()}`, [defaultLayer])
  localStack.value = newStack
  emit('update:stack', newStack)
}

// Handle name update
function handleNameUpdate(name: string) {
  if (!localStack.value) return
  updateStack({
    meta: {
      ...localStack.value.meta,
      name,
    },
  })
}

// Calculate structural integrity based on physics
const structuralIntegrity = computed(() => {
  if (!localStack.value?.physics) return 1.0
  return localStack.value.physics.structuralIntegrity ?? 1.0
})

// Calculate stability indicator
const stabilityStatus = computed(() => {
  if (!localStack.value?.physics) return { status: 'stable', color: '#22c55e' }

  const integrity = localStack.value.physics.structuralIntegrity ?? 1.0
  const isStable = localStack.value.physics.isStable ?? true

  if (!isStable || integrity < 0.3) {
    return { status: 'Unstable', color: '#ef4444' }
  }
  if (integrity < 0.6) {
    return { status: 'Warning', color: '#f59e0b' }
  }
  return { status: 'Stable', color: '#22c55e' }
})

// Handle applying a preset from the picker
function handleApplyPreset(presetConfig: CubeStackConfig) {
  localStack.value = presetConfig
  emit('update:stack', presetConfig)
  showPresetPicker.value = false
}

// Create new stack (when no stack is selected)
function handleCreateNewStack() {
  const defaultCube = createDefaultCube('new-layer-cube')
  const defaultLayer = createStackLayer('new-layer', defaultCube, 'single', 1)
  defaultLayer.name = 'Layer 1'
  const newStack = createCubeStack(`stack-${Date.now()}`, [defaultLayer])
  localStack.value = newStack
  emit('update:stack', newStack)
}

// Computed reversed layers for rendering (top to bottom)
const reversedLayers = computed(() => {
  if (!localStack.value) return []
  return [...localStack.value.layers].reverse().map((layer, reversedIndex) => {
    const index = localStack.value!.layers.length - 1 - reversedIndex
    return { layer, index }
  })
})
</script>

<template>
  <!-- If no stack is selected -->
  <div v-if="!localStack" :class="`stack-editor ${props.className}`">
    <div class="stack-editor__empty">
      <p>No stack selected</p>
      <p>Create a new stack or select one from the gallery</p>
      <button type="button" class="stack-editor__create-btn" @click="handleCreateNewStack">
        Create New Stack
      </button>
    </div>
  </div>

  <!-- Main editor -->
  <div v-else :class="`stack-editor ${props.className}`">
    <div class="stack-editor__header">
      <h2 class="stack-editor__title">Stack Editor</h2>
      <div class="stack-editor__header-actions">
        <button
          type="button"
          class="stack-editor__preset-btn"
          title="Load from preset gallery"
          @click="showPresetPicker = true"
        >
          Load Preset
        </button>
        <button
          type="button"
          class="stack-editor__reset-btn"
          title="Reset to default stack"
          @click="handleReset"
        >
          Reset
        </button>
      </div>
    </div>

    <!-- Stack Name -->
    <div class="stack-editor__name-field">
      <label for="stack-name" class="stack-editor__label"> Stack Name </label>
      <input
        id="stack-name"
        type="text"
        class="stack-editor__input"
        :value="localStack.meta?.name || ''"
        placeholder="Enter stack name..."
        @input="handleNameUpdate(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Stack Summary -->
    <div class="stack-editor__summary">
      <div class="stack-editor__summary-item">
        <span class="stack-editor__summary-label">Layers:</span>
        <span class="stack-editor__summary-value">{{ localStack.layers.length }}</span>
      </div>
      <div class="stack-editor__summary-item">
        <span class="stack-editor__summary-label">Total Height:</span>
        <span class="stack-editor__summary-value">{{ localStack.totalHeight.toFixed(1) }}</span>
      </div>
    </div>

    <!-- Layers Section -->
    <section class="stack-editor__section">
      <button
        type="button"
        :class="`stack-editor__section-header ${expandedSections.has('layers') ? 'stack-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('layers')"
        @click="toggleSection('layers')"
      >
        <span>Layers ({{ localStack.layers.length }})</span>
        <span class="stack-editor__chevron">
          {{ expandedSections.has('layers') ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="expandedSections.has('layers')" class="stack-editor__section-content">
        <!-- Layer list - rendered from top to bottom (reverse order) -->
        <div class="stack-editor__layers-container">
          <div class="stack-editor__layers-label">
            <span class="stack-editor__layers-top">Top</span>
            <span class="stack-editor__layers-bottom">Bottom</span>
          </div>

          <div class="stack-editor__layers-list">
            <div
              v-for="{ layer, index } in reversedLayers"
              :key="layer.id"
              :class="`stack-editor__layer ${dragState.isDragging && dragState.dropTargetIndex === index ? 'stack-editor__layer--drag-target' : ''} ${dragState.isDragging && dragState.draggedIndex === index ? 'stack-editor__layer--dragging' : ''}`"
              draggable="true"
              @dragstart="handleDragStart($event, index)"
              @dragover="handleDragOver($event, index)"
              @dragend="handleDragEnd"
              @drop="handleDrop($event, index)"
            >
              <!-- Layer Header -->
              <div class="stack-editor__layer-header">
                <div class="stack-editor__layer-drag-handle" title="Drag to reorder">
                  &#8942;&#8942;
                </div>
                <div
                  class="stack-editor__layer-color-preview"
                  :style="{ backgroundColor: rgbToHex(layer.cubeConfig.base.color) }"
                  :title="`Color: ${rgbToHex(layer.cubeConfig.base.color)}`"
                />
                <button
                  type="button"
                  class="stack-editor__layer-title"
                  :aria-expanded="expandedLayers.has(layer.id)"
                  @click="toggleLayer(layer.id)"
                >
                  <span>{{ layer.name || `Layer ${index + 1}` }}</span>
                  <span class="stack-editor__layer-position">({{ layer.position }})</span>
                </button>
                <div class="stack-editor__layer-actions">
                  <button
                    type="button"
                    class="stack-editor__layer-move-btn"
                    :disabled="index === localStack.layers.length - 1"
                    title="Move up (toward top)"
                    aria-label="Move layer up"
                    @click="moveLayerUp(index)"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    class="stack-editor__layer-move-btn"
                    :disabled="index === 0"
                    title="Move down (toward bottom)"
                    aria-label="Move layer down"
                    @click="moveLayerDown(index)"
                  >
                    &#9660;
                  </button>
                  <button
                    type="button"
                    class="stack-editor__layer-remove-btn"
                    :disabled="localStack.layers.length <= 1"
                    title="Remove layer"
                    aria-label="Remove layer"
                    @click="removeLayer(index)"
                  >
                    &#215;
                  </button>
                </div>
              </div>

              <!-- Layer Content (expanded) -->
              <div v-if="expandedLayers.has(layer.id)" class="stack-editor__layer-content">
                <!-- Layer Name -->
                <div class="stack-editor__field">
                  <label class="stack-editor__label">Name</label>
                  <input
                    type="text"
                    class="stack-editor__input"
                    :value="layer.name || ''"
                    placeholder="Layer name..."
                    @input="updateLayer(index, { name: ($event.target as HTMLInputElement).value })"
                  />
                </div>

                <!-- Layer Height -->
                <div class="stack-editor__field">
                  <label class="stack-editor__label">
                    Height
                    <span class="stack-editor__value">
                      {{ (layer.height ?? 1).toFixed(1) }}
                    </span>
                  </label>
                  <input
                    type="range"
                    class="stack-editor__slider"
                    min="0.5"
                    max="3"
                    step="0.1"
                    :value="layer.height ?? 1"
                    @input="
                      updateLayer(index, {
                        height: parseFloat(($event.target as HTMLInputElement).value),
                      })
                    "
                  />
                  <div class="stack-editor__slider-labels">
                    <span>Thin</span>
                    <span>Tall</span>
                  </div>
                </div>

                <!-- Edit Cube Config Button -->
                <button
                  type="button"
                  class="stack-editor__edit-cube-btn"
                  @click="emit('editLayerCube', index, layer.cubeConfig)"
                >
                  Edit Cube Parameters
                </button>

                <!-- Transition Settings (if not top layer) -->
                <div v-if="layer.transitionToNext" class="stack-editor__transition">
                  <h4 class="stack-editor__transition-title">Transition to Next Layer</h4>

                  <!-- Transition Type -->
                  <div class="stack-editor__field">
                    <label class="stack-editor__label">Type</label>
                    <select
                      class="stack-editor__select"
                      :value="layer.transitionToNext.type"
                      @change="
                        updateLayerTransition(index, {
                          type: ($event.target as HTMLSelectElement).value as StackTransitionType,
                        })
                      "
                    >
                      <option v-for="type in TRANSITION_TYPES" :key="type" :value="type">
                        {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                      </option>
                    </select>
                    <p class="stack-editor__description">
                      {{ TRANSITION_TYPE_DESCRIPTIONS[layer.transitionToNext.type] }}
                    </p>
                  </div>

                  <!-- Blend Height -->
                  <div class="stack-editor__field">
                    <label class="stack-editor__label">
                      Blend Height
                      <span class="stack-editor__value">
                        {{ (layer.transitionToNext.blendHeight ?? 0.2).toFixed(2) }}
                      </span>
                    </label>
                    <input
                      type="range"
                      class="stack-editor__slider"
                      min="0"
                      max="1"
                      step="0.05"
                      :value="layer.transitionToNext.blendHeight ?? 0.2"
                      @input="
                        updateLayerTransition(index, {
                          blendHeight: parseFloat(($event.target as HTMLInputElement).value),
                        })
                      "
                    />
                    <div class="stack-editor__slider-labels">
                      <span>Sharp</span>
                      <span>Gradual</span>
                    </div>
                  </div>

                  <!-- Easing -->
                  <div class="stack-editor__field">
                    <label class="stack-editor__label">Easing</label>
                    <select
                      class="stack-editor__select"
                      :value="layer.transitionToNext.easing ?? 'smooth'"
                      @change="
                        updateLayerTransition(index, {
                          easing: ($event.target as HTMLSelectElement).value as
                            | 'linear'
                            | 'smooth'
                            | 'ease-in'
                            | 'ease-out',
                        })
                      "
                    >
                      <option v-for="type in EASING_TYPES" :key="type" :value="type">
                        {{ type.charAt(0).toUpperCase() + type.slice(1) }}
                      </option>
                    </select>
                    <p class="stack-editor__description">
                      {{ EASING_DESCRIPTIONS[layer.transitionToNext.easing ?? 'smooth'] }}
                    </p>
                  </div>

                  <!-- Blend Options -->
                  <div class="stack-editor__field stack-editor__checkboxes">
                    <label class="stack-editor__checkbox-label">
                      <input
                        type="checkbox"
                        :checked="layer.transitionToNext.blendNoise ?? true"
                        @change="
                          updateLayerTransition(index, {
                            blendNoise: ($event.target as HTMLInputElement).checked,
                          })
                        "
                      />
                      <span>Blend Noise</span>
                    </label>
                    <label class="stack-editor__checkbox-label">
                      <input
                        type="checkbox"
                        :checked="layer.transitionToNext.blendGradients ?? true"
                        @change="
                          updateLayerTransition(index, {
                            blendGradients: ($event.target as HTMLInputElement).checked,
                          })
                        "
                      />
                      <span>Blend Gradients</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Layer Button -->
        <button type="button" class="stack-editor__add-btn" @click="addLayer">+ Add Layer</button>
      </div>
    </section>

    <!-- Stack Physics Section -->
    <section class="stack-editor__section">
      <button
        type="button"
        :class="`stack-editor__section-header ${expandedSections.has('physics') ? 'stack-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('physics')"
        @click="toggleSection('physics')"
      >
        <span>Stack Physics</span>
        <span class="stack-editor__chevron">
          {{ expandedSections.has('physics') ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="expandedSections.has('physics')" class="stack-editor__section-content">
        <!-- Stability Indicator -->
        <div class="stack-editor__physics-indicator">
          <span class="stack-editor__physics-label">Stability:</span>
          <span class="stack-editor__physics-status" :style="{ color: stabilityStatus.color }">
            {{ stabilityStatus.status }}
          </span>
        </div>

        <!-- Total Weight (read-only) -->
        <div class="stack-editor__physics-indicator">
          <span class="stack-editor__physics-label">Total Weight:</span>
          <span class="stack-editor__physics-value">
            {{ (localStack.physics?.totalWeight ?? 0).toFixed(1) }} units
          </span>
        </div>

        <!-- Structural Integrity (read-only visual) -->
        <div class="stack-editor__field">
          <label class="stack-editor__label">
            Structural Integrity
            <span class="stack-editor__value"> {{ (structuralIntegrity * 100).toFixed(0) }}% </span>
          </label>
          <div class="stack-editor__integrity-bar">
            <div
              class="stack-editor__integrity-fill"
              :style="{
                width: `${structuralIntegrity * 100}%`,
                backgroundColor: stabilityStatus.color,
              }"
            />
          </div>
        </div>

        <!-- Weight Distribution -->
        <div class="stack-editor__field">
          <label class="stack-editor__label">
            Weight Distribution
            <span class="stack-editor__value">
              {{ (localStack.physics?.weightDistribution ?? 0.5).toFixed(2) }}
            </span>
          </label>
          <input
            type="range"
            class="stack-editor__slider"
            min="0"
            max="1"
            step="0.05"
            :value="localStack.physics?.weightDistribution ?? 0.5"
            @input="
              updatePhysics({
                weightDistribution: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="stack-editor__slider-labels">
            <span>Even</span>
            <span>Bottom-heavy</span>
          </div>
        </div>

        <!-- Is Stable Checkbox -->
        <div class="stack-editor__field">
          <label class="stack-editor__checkbox-label">
            <input
              type="checkbox"
              :checked="localStack.physics?.isStable ?? true"
              @change="updatePhysics({ isStable: ($event.target as HTMLInputElement).checked })"
            />
            <span>Mark as Stable</span>
          </label>
          <p class="stack-editor__description">
            Manually override the stability status of this stack.
          </p>
        </div>
      </div>
    </section>

    <!-- Preset Picker Modal (ISSUE 30) -->
    <div v-if="showPresetPicker" class="stack-editor__preset-picker-overlay">
      <StackPresetPicker
        :current-stack="localStack"
        :is-open="showPresetPicker"
        class="stack-editor__preset-picker"
        @apply-preset="handleApplyPreset"
        @close="showPresetPicker = false"
      />
    </div>
  </div>
</template>
