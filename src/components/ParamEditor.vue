<!--
  ParamEditor Component
  Vue.js 3.0 SFC for manual parameter editing of cube configurations
  Provides UI for editing base properties, gradients, noise, physics, and LOD settings

  Migrated from React (ParamEditor.tsx) to Vue.js SFC as part of Phase 10 (TASK 63)

  ISSUE 31: Added LOD Settings section to ParamEditor
-->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type {
  SpectralCube,
  CubeBase,
  CubeGradient,
  CubeNoise,
  CubePhysics,
  CubeBoundary,
  GradientAxis,
  NoiseType,
  MaterialType,
  BreakPattern,
  BoundaryMode,
  Color3,
  ColorShift3,
} from '../types/cube'
import { CUBE_DEFAULTS, createDefaultCube } from '../types/cube'
import type { LODConfig, LODStatistics } from '../types/lod'
import LODConfigEditor from './LODConfigEditor.vue'

/**
 * Props for ParamEditor component
 */
export interface ParamEditorProps {
  /** Current cube configuration */
  currentCube?: SpectralCube | null
  /** Callback when cube is updated */
  onCubeUpdate?: (cube: SpectralCube) => void
  /** Current LOD configuration (optional, for global LOD settings) */
  lodConfig?: LODConfig
  /** Callback when LOD configuration changes */
  onLODConfigChange?: (config: LODConfig) => void
  /** Current LOD statistics (optional, for display) */
  lodStatistics?: LODStatistics
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<ParamEditorProps>(), {
  currentCube: null,
  onCubeUpdate: undefined,
  lodConfig: undefined,
  onLODConfigChange: undefined,
  lodStatistics: undefined,
  className: '',
})

const emit = defineEmits<{
  'update:cube': [cube: SpectralCube]
}>()

/** Available gradient axes */
const GRADIENT_AXES: GradientAxis[] = ['x', 'y', 'z', 'radial']

/** Available noise types */
const NOISE_TYPES: NoiseType[] = ['perlin', 'worley', 'crackle']

/** Available material types */
const MATERIAL_TYPES: MaterialType[] = [
  'stone',
  'wood',
  'metal',
  'glass',
  'organic',
  'crystal',
  'liquid',
]

/** Available break patterns */
const BREAK_PATTERNS: BreakPattern[] = ['crumble', 'shatter', 'splinter', 'melt', 'dissolve']

/** Available boundary modes */
const BOUNDARY_MODES: BoundaryMode[] = ['none', 'smooth', 'hard']

/** Descriptions for boundary modes */
const BOUNDARY_MODE_DESCRIPTIONS: Record<BoundaryMode, string> = {
  none: 'No blending between cubes',
  smooth: 'Smooth interpolation at edges',
  hard: 'Sharp edges between cubes',
}

/** Common noise masks */
const NOISE_MASKS = [
  'none',
  'bottom_25%',
  'bottom_40%',
  'top_25%',
  'top_40%',
  'center_50%',
  'edges_30%',
]

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
 * Converts hex color string to RGB array [0-1]
 */
function hexToRgb(hex: string): Color3 {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result) {
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255,
    ]
  }
  return [0.5, 0.5, 0.5]
}

/**
 * Converts color shift array [-1 to 1] to hex for display
 */
function colorShiftToHex(shift: ColorShift3): string {
  // Convert [-1, 1] to [0, 1] for display
  const normalized: Color3 = [(shift[0] + 1) / 2, (shift[1] + 1) / 2, (shift[2] + 1) / 2]
  return rgbToHex(normalized)
}

/**
 * Converts hex to color shift array [-1 to 1]
 */
function hexToColorShift(hex: string): ColorShift3 {
  const rgb = hexToRgb(hex)
  // Convert [0, 1] to [-1, 1]
  return [rgb[0] * 2 - 1, rgb[1] * 2 - 1, rgb[2] * 2 - 1]
}

// Use local state for editing
const localCube = ref<SpectralCube | null>(props.currentCube)
const expandedSections = ref<Set<string>>(
  new Set(['base', 'gradients', 'noise', 'physics', 'boundary', 'lod'])
)

// Sync local state with prop
watch(
  () => props.currentCube,
  (newVal) => {
    localCube.value = newVal
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

// Update cube and notify parent
function updateCube(updates: Partial<SpectralCube>) {
  if (!localCube.value) return

  const updatedCube: SpectralCube = {
    ...localCube.value,
    ...updates,
    meta: {
      ...localCube.value.meta,
      ...updates.meta,
      modified: new Date().toISOString(),
    },
  }
  localCube.value = updatedCube
  props.onCubeUpdate?.(updatedCube)
  emit('update:cube', updatedCube)
}

// Update base properties
function updateBase(updates: Partial<CubeBase>) {
  if (!localCube.value) return
  updateCube({
    base: {
      ...localCube.value.base,
      ...updates,
    },
  })
}

// Update noise properties
function updateNoise(updates: Partial<CubeNoise>) {
  if (!localCube.value) return
  updateCube({
    noise: {
      ...localCube.value.noise,
      ...updates,
    },
  })
}

// Update physics properties
function updatePhysics(updates: Partial<CubePhysics>) {
  if (!localCube.value) return
  updateCube({
    physics: {
      ...localCube.value.physics,
      ...updates,
    },
  })
}

// Update boundary properties
function updateBoundary(updates: Partial<CubeBoundary>) {
  if (!localCube.value) return
  updateCube({
    boundary: {
      ...localCube.value.boundary,
      ...updates,
    },
  })
}

// Add a new gradient
function addGradient() {
  if (!localCube.value) return
  const newGradient: CubeGradient = {
    axis: 'y',
    factor: 0.5,
    color_shift: [0, 0, 0.2],
  }
  updateCube({
    gradients: [...(localCube.value.gradients || []), newGradient],
  })
}

// Remove a gradient
function removeGradient(index: number) {
  if (!localCube.value?.gradients) return
  const newGradients = localCube.value.gradients.filter((_, i) => i !== index)
  updateCube({ gradients: newGradients })
}

// Update a specific gradient
function updateGradient(index: number, updates: Partial<CubeGradient>) {
  if (!localCube.value?.gradients) return
  const newGradients = [...localCube.value.gradients]
  newGradients[index] = { ...newGradients[index], ...updates }
  updateCube({ gradients: newGradients })
}

// Reset to default values
function handleReset() {
  const id = localCube.value?.id || `cube_${Date.now()}`
  const defaultCube = createDefaultCube(id)
  localCube.value = defaultCube
  props.onCubeUpdate?.(defaultCube)
  emit('update:cube', defaultCube)
}

// Handle name update
function handleNameUpdate(name: string) {
  if (!localCube.value) return
  updateCube({
    meta: {
      ...localCube.value.meta,
      name,
      modified: new Date().toISOString(),
    },
  })
}
</script>

<template>
  <!-- Empty state -->
  <div v-if="!localCube" :class="`param-editor ${className}`">
    <div class="param-editor__empty">
      <p>No cube selected</p>
      <p>Select a cube from the gallery or create a new one</p>
    </div>
  </div>

  <!-- Editor -->
  <div v-else :class="`param-editor ${className}`">
    <div class="param-editor__header">
      <h2 class="param-editor__title">Edit Parameters</h2>
      <button
        type="button"
        class="param-editor__reset-btn"
        title="Reset to default values"
        @click="handleReset"
      >
        Reset
      </button>
    </div>

    <!-- Name field -->
    <div class="param-editor__name-field">
      <label for="cube-name" class="param-editor__label"> Name </label>
      <input
        id="cube-name"
        type="text"
        class="param-editor__input"
        :value="localCube.meta?.name || ''"
        placeholder="Enter cube name..."
        @input="handleNameUpdate(($event.target as HTMLInputElement).value)"
      />
    </div>

    <!-- Base Properties Section -->
    <section class="param-editor__section">
      <button
        type="button"
        :class="`param-editor__section-header ${expandedSections.has('base') ? 'param-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('base')"
        @click="toggleSection('base')"
      >
        <span>Base Properties</span>
        <span class="param-editor__chevron">{{
          expandedSections.has('base') ? '\u25BC' : '\u25B6'
        }}</span>
      </button>

      <div v-if="expandedSections.has('base')" class="param-editor__section-content">
        <!-- Color picker -->
        <div class="param-editor__field">
          <label for="base-color" class="param-editor__label"> Base Color </label>
          <div class="param-editor__color-input-wrapper">
            <input
              id="base-color"
              type="color"
              class="param-editor__color-input"
              :value="rgbToHex(localCube.base.color)"
              @input="updateBase({ color: hexToRgb(($event.target as HTMLInputElement).value) })"
            />
            <span class="param-editor__color-value">{{ rgbToHex(localCube.base.color) }}</span>
          </div>
        </div>

        <!-- Roughness slider -->
        <div class="param-editor__field">
          <label for="base-roughness" class="param-editor__label">
            Roughness
            <span class="param-editor__value">
              {{ (localCube.base.roughness ?? CUBE_DEFAULTS.base.roughness).toFixed(2) }}
            </span>
          </label>
          <input
            id="base-roughness"
            type="range"
            class="param-editor__slider"
            min="0"
            max="1"
            step="0.01"
            :value="localCube.base.roughness ?? CUBE_DEFAULTS.base.roughness"
            @input="
              updateBase({ roughness: parseFloat(($event.target as HTMLInputElement).value) })
            "
          />
          <div class="param-editor__slider-labels">
            <span>Glossy</span>
            <span>Matte</span>
          </div>
        </div>

        <!-- Transparency slider -->
        <div class="param-editor__field">
          <label for="base-transparency" class="param-editor__label">
            Opacity
            <span class="param-editor__value">
              {{ (localCube.base.transparency ?? CUBE_DEFAULTS.base.transparency).toFixed(2) }}
            </span>
          </label>
          <input
            id="base-transparency"
            type="range"
            class="param-editor__slider"
            min="0"
            max="1"
            step="0.01"
            :value="localCube.base.transparency ?? CUBE_DEFAULTS.base.transparency"
            @input="
              updateBase({ transparency: parseFloat(($event.target as HTMLInputElement).value) })
            "
          />
          <div class="param-editor__slider-labels">
            <span>Transparent</span>
            <span>Opaque</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Gradients Section -->
    <section class="param-editor__section">
      <button
        type="button"
        :class="`param-editor__section-header ${expandedSections.has('gradients') ? 'param-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('gradients')"
        @click="toggleSection('gradients')"
      >
        <span>Gradients ({{ localCube.gradients?.length || 0 }})</span>
        <span class="param-editor__chevron">
          {{ expandedSections.has('gradients') ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="expandedSections.has('gradients')" class="param-editor__section-content">
        <!-- Gradient list -->
        <div
          v-for="(gradient, index) in localCube.gradients"
          :key="index"
          class="param-editor__gradient-item"
        >
          <div class="param-editor__gradient-header">
            <span class="param-editor__gradient-title">Gradient {{ index + 1 }}</span>
            <button
              type="button"
              class="param-editor__remove-btn"
              :aria-label="`Remove gradient ${index + 1}`"
              @click="removeGradient(index)"
            >
              &times;
            </button>
          </div>

          <!-- Axis selector -->
          <div class="param-editor__field">
            <label class="param-editor__label">Axis</label>
            <div class="param-editor__axis-buttons">
              <button
                v-for="axis in GRADIENT_AXES"
                :key="axis"
                type="button"
                :class="`param-editor__axis-btn ${gradient.axis === axis ? 'param-editor__axis-btn--active' : ''}`"
                @click="updateGradient(index, { axis })"
              >
                {{ axis.toUpperCase() }}
              </button>
            </div>
          </div>

          <!-- Factor slider -->
          <div class="param-editor__field">
            <label class="param-editor__label">
              Factor
              <span class="param-editor__value">{{ gradient.factor.toFixed(2) }}</span>
            </label>
            <input
              type="range"
              class="param-editor__slider"
              min="0"
              max="1"
              step="0.01"
              :value="gradient.factor"
              @input="
                updateGradient(index, {
                  factor: parseFloat(($event.target as HTMLInputElement).value),
                })
              "
            />
          </div>

          <!-- Color shift picker -->
          <div class="param-editor__field">
            <label class="param-editor__label">Color Shift</label>
            <div class="param-editor__color-input-wrapper">
              <input
                type="color"
                class="param-editor__color-input"
                :value="colorShiftToHex(gradient.color_shift)"
                @input="
                  updateGradient(index, {
                    color_shift: hexToColorShift(($event.target as HTMLInputElement).value),
                  })
                "
              />
              <span class="param-editor__color-value">
                {{ colorShiftToHex(gradient.color_shift) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Add gradient button -->
        <button type="button" class="param-editor__add-btn" @click="addGradient">
          + Add Gradient
        </button>
      </div>
    </section>

    <!-- Noise Section -->
    <section class="param-editor__section">
      <button
        type="button"
        :class="`param-editor__section-header ${expandedSections.has('noise') ? 'param-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('noise')"
        @click="toggleSection('noise')"
      >
        <span>Noise Settings</span>
        <span class="param-editor__chevron">{{
          expandedSections.has('noise') ? '\u25BC' : '\u25B6'
        }}</span>
      </button>

      <div v-if="expandedSections.has('noise')" class="param-editor__section-content">
        <!-- Noise type selector -->
        <div class="param-editor__field">
          <label for="noise-type" class="param-editor__label"> Type </label>
          <select
            id="noise-type"
            class="param-editor__select"
            :value="localCube.noise?.type ?? CUBE_DEFAULTS.noise.type"
            @change="updateNoise({ type: ($event.target as HTMLSelectElement).value as NoiseType })"
          >
            <option v-for="type in NOISE_TYPES" :key="type" :value="type">
              {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            </option>
          </select>
        </div>

        <!-- Scale slider -->
        <div class="param-editor__field">
          <label for="noise-scale" class="param-editor__label">
            Scale
            <span class="param-editor__value">
              {{ (localCube.noise?.scale ?? CUBE_DEFAULTS.noise.scale).toFixed(1) }}
            </span>
          </label>
          <input
            id="noise-scale"
            type="range"
            class="param-editor__slider"
            min="1"
            max="32"
            step="0.5"
            :value="localCube.noise?.scale ?? CUBE_DEFAULTS.noise.scale"
            @input="updateNoise({ scale: parseFloat(($event.target as HTMLInputElement).value) })"
          />
        </div>

        <!-- Octaves slider -->
        <div class="param-editor__field">
          <label for="noise-octaves" class="param-editor__label">
            Octaves
            <span class="param-editor__value">
              {{ localCube.noise?.octaves ?? CUBE_DEFAULTS.noise.octaves }}
            </span>
          </label>
          <input
            id="noise-octaves"
            type="range"
            class="param-editor__slider"
            min="1"
            max="8"
            step="1"
            :value="localCube.noise?.octaves ?? CUBE_DEFAULTS.noise.octaves"
            @input="
              updateNoise({ octaves: parseInt(($event.target as HTMLInputElement).value, 10) })
            "
          />
        </div>

        <!-- Persistence slider -->
        <div class="param-editor__field">
          <label for="noise-persistence" class="param-editor__label">
            Persistence
            <span class="param-editor__value">
              {{ (localCube.noise?.persistence ?? CUBE_DEFAULTS.noise.persistence).toFixed(2) }}
            </span>
          </label>
          <input
            id="noise-persistence"
            type="range"
            class="param-editor__slider"
            min="0.1"
            max="1"
            step="0.05"
            :value="localCube.noise?.persistence ?? CUBE_DEFAULTS.noise.persistence"
            @input="
              updateNoise({ persistence: parseFloat(($event.target as HTMLInputElement).value) })
            "
          />
        </div>

        <!-- Mask selector -->
        <div class="param-editor__field">
          <label for="noise-mask" class="param-editor__label"> Mask </label>
          <select
            id="noise-mask"
            class="param-editor__select"
            :value="localCube.noise?.mask || 'none'"
            @change="
              updateNoise({
                mask:
                  ($event.target as HTMLSelectElement).value === 'none'
                    ? undefined
                    : ($event.target as HTMLSelectElement).value,
              })
            "
          >
            <option v-for="mask in NOISE_MASKS" :key="mask" :value="mask">
              {{ mask === 'none' ? 'No Mask' : mask }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- Physics Section -->
    <section class="param-editor__section">
      <button
        type="button"
        :class="`param-editor__section-header ${expandedSections.has('physics') ? 'param-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('physics')"
        @click="toggleSection('physics')"
      >
        <span>Physics Properties</span>
        <span class="param-editor__chevron">
          {{ expandedSections.has('physics') ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="expandedSections.has('physics')" class="param-editor__section-content">
        <!-- Material type selector -->
        <div class="param-editor__field">
          <label for="physics-material" class="param-editor__label"> Material </label>
          <select
            id="physics-material"
            class="param-editor__select"
            :value="localCube.physics?.material ?? CUBE_DEFAULTS.physics.material"
            @change="
              updatePhysics({
                material: ($event.target as HTMLSelectElement).value as MaterialType,
              })
            "
          >
            <option v-for="type in MATERIAL_TYPES" :key="type" :value="type">
              {{ type.charAt(0).toUpperCase() + type.slice(1) }}
            </option>
          </select>
        </div>

        <!-- Density slider -->
        <div class="param-editor__field">
          <label for="physics-density" class="param-editor__label">
            Density (g/cm&#179;)
            <span class="param-editor__value">
              {{ (localCube.physics?.density ?? CUBE_DEFAULTS.physics.density).toFixed(2) }}
            </span>
          </label>
          <input
            id="physics-density"
            type="range"
            class="param-editor__slider"
            min="0.1"
            max="10"
            step="0.1"
            :value="localCube.physics?.density ?? CUBE_DEFAULTS.physics.density"
            @input="
              updatePhysics({ density: parseFloat(($event.target as HTMLInputElement).value) })
            "
          />
        </div>

        <!-- Break pattern selector -->
        <div class="param-editor__field">
          <label for="physics-break-pattern" class="param-editor__label"> Break Pattern </label>
          <select
            id="physics-break-pattern"
            class="param-editor__select"
            :value="localCube.physics?.break_pattern ?? CUBE_DEFAULTS.physics.break_pattern"
            @change="
              updatePhysics({
                break_pattern: ($event.target as HTMLSelectElement).value as BreakPattern,
              })
            "
          >
            <option v-for="pattern in BREAK_PATTERNS" :key="pattern" :value="pattern">
              {{ pattern.charAt(0).toUpperCase() + pattern.slice(1) }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- Boundary Settings Section -->
    <section class="param-editor__section">
      <button
        type="button"
        :class="`param-editor__section-header ${expandedSections.has('boundary') ? 'param-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('boundary')"
        @click="toggleSection('boundary')"
      >
        <span>Boundary Settings</span>
        <span class="param-editor__chevron">
          {{ expandedSections.has('boundary') ? '\u25BC' : '\u25B6' }}
        </span>
      </button>

      <div v-if="expandedSections.has('boundary')" class="param-editor__section-content">
        <!-- Info about boundary settings -->
        <p class="param-editor__hint">
          Controls how this cube blends with neighboring cubes in a grid.
        </p>

        <!-- Boundary mode selector -->
        <div class="param-editor__field">
          <label for="boundary-mode" class="param-editor__label"> Mode </label>
          <select
            id="boundary-mode"
            class="param-editor__select"
            :value="localCube.boundary?.mode ?? CUBE_DEFAULTS.boundary.mode"
            @change="
              updateBoundary({ mode: ($event.target as HTMLSelectElement).value as BoundaryMode })
            "
          >
            <option v-for="mode in BOUNDARY_MODES" :key="mode" :value="mode">
              {{ mode.charAt(0).toUpperCase() + mode.slice(1) }}
            </option>
          </select>
          <p class="param-editor__description">
            {{
              BOUNDARY_MODE_DESCRIPTIONS[localCube.boundary?.mode ?? CUBE_DEFAULTS.boundary.mode]
            }}
          </p>
        </div>

        <!-- Neighbor influence slider -->
        <div class="param-editor__field">
          <label for="boundary-neighbor-influence" class="param-editor__label">
            Neighbor Influence
            <span class="param-editor__value">
              {{
                (
                  localCube.boundary?.neighbor_influence ??
                  CUBE_DEFAULTS.boundary.neighbor_influence
                ).toFixed(2)
              }}
            </span>
          </label>
          <input
            id="boundary-neighbor-influence"
            type="range"
            class="param-editor__slider"
            min="0"
            max="1"
            step="0.01"
            :value="
              localCube.boundary?.neighbor_influence ?? CUBE_DEFAULTS.boundary.neighbor_influence
            "
            @input="
              updateBoundary({
                neighbor_influence: parseFloat(($event.target as HTMLInputElement).value),
              })
            "
          />
          <div class="param-editor__slider-labels">
            <span>None</span>
            <span>Full</span>
          </div>
          <p class="param-editor__description">
            How much neighboring cubes affect the color and gradient blending at edges.
          </p>
        </div>
      </div>
    </section>

    <!-- LOD Settings Section - ISSUE 31 -->
    <section class="param-editor__section">
      <button
        type="button"
        :class="`param-editor__section-header ${expandedSections.has('lod') ? 'param-editor__section-header--expanded' : ''}`"
        :aria-expanded="expandedSections.has('lod')"
        @click="toggleSection('lod')"
      >
        <span>LOD Settings</span>
        <span class="param-editor__chevron">{{
          expandedSections.has('lod') ? '\u25BC' : '\u25B6'
        }}</span>
      </button>

      <div v-if="expandedSections.has('lod')" class="param-editor__section-content">
        <!-- Info about LOD settings -->
        <p class="param-editor__hint">
          Level of Detail settings for performance optimization. Distant objects use fewer resources
          to maintain high frame rates.
        </p>

        <!-- LOD Config Editor -->
        <LODConfigEditor
          :config="lodConfig"
          :on-config-change="onLODConfigChange"
          :statistics="lodStatistics"
          :show-advanced="false"
        />
      </div>
    </section>
  </div>
</template>
