<!--
  LODConfigEditor Component
  Vue.js 3.0 SFC for editing LOD system settings

  Migrated from React (LODConfigEditor.tsx) to Vue.js SFC as part of Phase 10 (TASK 63)

  ISSUE 31: LOD Settings Editor
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  LODConfig,
  LODLevel,
  LODLevelSettings,
  LODThreshold,
  LODStatistics,
} from '../types/lod'
import { DEFAULT_LOD_CONFIG, DEFAULT_LOD_SETTINGS } from '../types/lod'

/**
 * Quick profile presets for LOD configuration
 */
export type LODProfile = 'performance' | 'balanced' | 'quality'

/**
 * Props for LODConfigEditor component
 */
export interface LODConfigEditorProps {
  config?: LODConfig
  onConfigChange?: (config: LODConfig) => void
  statistics?: LODStatistics
  className?: string
  showAdvanced?: boolean
}

const props = withDefaults(defineProps<LODConfigEditorProps>(), {
  config: () => DEFAULT_LOD_CONFIG,
  onConfigChange: undefined,
  statistics: undefined,
  className: '',
  showAdvanced: false,
})

const emit = defineEmits<{
  (e: 'update:config', config: LODConfig): void
}>()

/** Descriptions for LOD profiles */
const PROFILE_DESCRIPTIONS: Record<LODProfile, string> = {
  performance: 'Aggressive LOD switching for better FPS on low-end devices',
  balanced: 'Balanced settings for most devices',
  quality: 'Higher detail at distance, may impact performance',
}

/** Level descriptions for UI display */
const LOD_LEVEL_DESCRIPTIONS: Record<LODLevel, string> = {
  0: 'Full Detail (closest)',
  1: 'High Detail',
  2: 'Medium Detail',
  3: 'Low Detail',
  4: 'Minimal Detail (farthest)',
}

/** Creates a profile-based LOD configuration */
function createProfileConfig(profile: LODProfile): LODConfig {
  const baseConfig = { ...DEFAULT_LOD_CONFIG }

  switch (profile) {
    case 'performance':
      return {
        ...baseConfig,
        thresholds: [
          { level: 0, minDistance: 0, maxDistance: 3 },
          { level: 1, minDistance: 3, maxDistance: 8 },
          { level: 2, minDistance: 8, maxDistance: 15 },
          { level: 3, minDistance: 15, maxDistance: 25 },
          { level: 4, minDistance: 25, maxDistance: Infinity },
        ],
        levelSettings: {
          ...DEFAULT_LOD_SETTINGS,
          0: { ...DEFAULT_LOD_SETTINGS[0], noiseOctaves: 3 },
          1: { ...DEFAULT_LOD_SETTINGS[1], noiseOctaves: 2 },
          2: { ...DEFAULT_LOD_SETTINGS[2], noiseOctaves: 1, maxGradients: 2 },
          3: { ...DEFAULT_LOD_SETTINGS[3], noiseOctaves: 0, enableNoise: false },
          4: { ...DEFAULT_LOD_SETTINGS[4] },
        },
        screenSizeThreshold: 75,
        transitionDuration: 0.2,
      }
    case 'quality':
      return {
        ...baseConfig,
        thresholds: [
          { level: 0, minDistance: 0, maxDistance: 10 },
          { level: 1, minDistance: 10, maxDistance: 25 },
          { level: 2, minDistance: 25, maxDistance: 50 },
          { level: 3, minDistance: 50, maxDistance: 80 },
          { level: 4, minDistance: 80, maxDistance: Infinity },
        ],
        levelSettings: {
          ...DEFAULT_LOD_SETTINGS,
          0: { ...DEFAULT_LOD_SETTINGS[0], noiseOctaves: 6 },
          1: { ...DEFAULT_LOD_SETTINGS[1], noiseOctaves: 4 },
          2: { ...DEFAULT_LOD_SETTINGS[2], noiseOctaves: 3 },
          3: { ...DEFAULT_LOD_SETTINGS[3], noiseOctaves: 2, enableBoundaryStitching: true },
          4: { ...DEFAULT_LOD_SETTINGS[4], noiseOctaves: 1, enableNoise: true },
        },
        screenSizeThreshold: 30,
        transitionDuration: 0.5,
      }
    case 'balanced':
    default:
      return baseConfig
  }
}

/** Detects which profile matches the current configuration */
function detectProfile(config: LODConfig): LODProfile | null {
  const firstMaxDist = config.thresholds[0]?.maxDistance ?? 5
  if (firstMaxDist <= 3) return 'performance'
  if (firstMaxDist >= 10) return 'quality'
  if (firstMaxDist === 5) return 'balanced'
  return null
}

// Local state
const localConfig = ref<LODConfig>({ ...props.config })
const expandedLevels = ref<Set<LODLevel>>(new Set())
const isAdvancedOpen = ref(props.showAdvanced)

// Sync with props
watch(
  () => props.config,
  (newConfig) => {
    localConfig.value = { ...newConfig }
  }
)

// Computed
const currentProfile = computed(() => detectProfile(localConfig.value))

const LOD_LEVELS: LODLevel[] = [0, 1, 2, 3, 4]

// Methods
function updateConfig(updates: Partial<LODConfig>) {
  const newConfig = { ...localConfig.value, ...updates }
  localConfig.value = newConfig
  props.onConfigChange?.(newConfig)
  emit('update:config', newConfig)
}

function handleProfileChange(profile: LODProfile) {
  const newConfig = createProfileConfig(profile)
  newConfig.enabled = localConfig.value.enabled
  localConfig.value = newConfig
  props.onConfigChange?.(newConfig)
  emit('update:config', newConfig)
}

function updateThreshold(level: LODLevel, updates: Partial<LODThreshold>) {
  const newThresholds = localConfig.value.thresholds.map((t) =>
    t.level === level ? { ...t, ...updates } : t
  )
  updateConfig({ thresholds: newThresholds })
}

function updateLevelSettings(level: LODLevel, updates: Partial<LODLevelSettings>) {
  const newSettings = {
    ...localConfig.value.levelSettings,
    [level]: { ...localConfig.value.levelSettings[level], ...updates },
  }
  updateConfig({ levelSettings: newSettings })
}

function toggleLevel(level: LODLevel) {
  const next = new Set(expandedLevels.value)
  if (next.has(level)) {
    next.delete(level)
  } else {
    next.add(level)
  }
  expandedLevels.value = next
}

function handleReset() {
  const newConfig = { ...DEFAULT_LOD_CONFIG }
  localConfig.value = newConfig
  props.onConfigChange?.(newConfig)
  emit('update:config', newConfig)
}

function getThresholdForLevel(level: LODLevel) {
  return localConfig.value.thresholds.find((t) => t.level === level)
}
</script>

<template>
  <div :class="['lod-config-editor', props.className]">
    <!-- Enable/Disable Toggle -->
    <div class="lod-config-editor__field">
      <label class="lod-config-editor__checkbox-label">
        <input
          type="checkbox"
          class="lod-config-editor__checkbox"
          :checked="localConfig.enabled"
          @change="updateConfig({ enabled: ($event.target as HTMLInputElement).checked })"
        />
        <span>Enable LOD System</span>
      </label>
      <p class="lod-config-editor__hint">
        Automatically reduces detail for distant objects to improve performance.
      </p>
    </div>

    <!-- Profile Quick Selection -->
    <div class="lod-config-editor__field">
      <label for="lod-profile" class="lod-config-editor__label"> Profile </label>
      <select
        id="lod-profile"
        class="lod-config-editor__select"
        :value="currentProfile || 'custom'"
        :disabled="!localConfig.enabled"
        @change="
          (e: Event) => {
            const value = (e.target as HTMLSelectElement).value
            if (value !== 'custom') {
              handleProfileChange(value as LODProfile)
            }
          }
        "
      >
        <option value="performance">Performance</option>
        <option value="balanced">Balanced (Recommended)</option>
        <option value="quality">Quality</option>
        <option v-if="currentProfile === null" value="custom">Custom</option>
      </select>
      <p class="lod-config-editor__description">
        {{ currentProfile ? PROFILE_DESCRIPTIONS[currentProfile] : 'Custom LOD settings' }}
      </p>
    </div>

    <!-- Statistics Display -->
    <div v-if="props.statistics" class="lod-config-editor__stats">
      <div class="lod-config-editor__stats-header">Live Statistics</div>
      <div class="lod-config-editor__stats-grid">
        <div class="lod-config-editor__stat-item">
          <span class="lod-config-editor__stat-label">Total Cubes</span>
          <span class="lod-config-editor__stat-value">{{ props.statistics.totalCubes }}</span>
        </div>
        <div class="lod-config-editor__stat-item">
          <span class="lod-config-editor__stat-label">Avg LOD</span>
          <span class="lod-config-editor__stat-value">
            {{ props.statistics.averageLODLevel.toFixed(1) }}
          </span>
        </div>
        <div class="lod-config-editor__stat-item">
          <span class="lod-config-editor__stat-label">Savings</span>
          <span class="lod-config-editor__stat-value">
            {{ props.statistics.performanceSavings.toFixed(0) }}%
          </span>
        </div>
        <div class="lod-config-editor__stat-item">
          <span class="lod-config-editor__stat-label">Transitioning</span>
          <span class="lod-config-editor__stat-value">{{
            props.statistics.transitioningCubes
          }}</span>
        </div>
      </div>
      <!-- Distribution bar -->
      <div class="lod-config-editor__distribution">
        <div class="lod-config-editor__distribution-label">Level Distribution</div>
        <div class="lod-config-editor__distribution-bar">
          <div
            v-for="level in LOD_LEVELS"
            :key="level"
            :class="[
              'lod-config-editor__distribution-segment',
              `lod-config-editor__distribution-segment--level-${level}`,
            ]"
            :style="{
              width: `${props.statistics!.totalCubes > 0 ? (props.statistics!.cubesPerLevel[level] / props.statistics!.totalCubes) * 100 : 0}%`,
            }"
            :title="`LOD ${level}: ${props.statistics!.cubesPerLevel[level]} cubes (${(props.statistics!.totalCubes > 0 ? (props.statistics!.cubesPerLevel[level] / props.statistics!.totalCubes) * 100 : 0).toFixed(1)}%)`"
          />
        </div>
        <div class="lod-config-editor__distribution-legend">
          <span
            v-for="level in LOD_LEVELS"
            :key="level"
            :class="[
              'lod-config-editor__legend-item',
              `lod-config-editor__legend-item--level-${level}`,
            ]"
          >
            L{{ level }}: {{ props.statistics!.cubesPerLevel[level] }}
          </span>
        </div>
      </div>
    </div>

    <!-- Advanced Settings Toggle -->
    <button
      type="button"
      class="lod-config-editor__advanced-toggle"
      :disabled="!localConfig.enabled"
      :aria-expanded="isAdvancedOpen"
      @click="isAdvancedOpen = !isAdvancedOpen"
    >
      <span>Advanced Settings</span>
      <span class="lod-config-editor__chevron">{{ isAdvancedOpen ? '▼' : '▶' }}</span>
    </button>

    <!-- Advanced Settings Content -->
    <div v-if="isAdvancedOpen && localConfig.enabled" class="lod-config-editor__advanced">
      <!-- Transition Duration -->
      <div class="lod-config-editor__field">
        <label for="lod-transition" class="lod-config-editor__label">
          Transition Duration
          <span class="lod-config-editor__value"
            >{{ localConfig.transitionDuration.toFixed(2) }}s</span
          >
        </label>
        <input
          id="lod-transition"
          type="range"
          class="lod-config-editor__slider"
          min="0"
          max="1"
          step="0.05"
          :value="localConfig.transitionDuration"
          @input="
            updateConfig({
              transitionDuration: parseFloat(($event.target as HTMLInputElement).value),
            })
          "
        />
        <div class="lod-config-editor__slider-labels">
          <span>Instant</span>
          <span>Smooth</span>
        </div>
      </div>

      <!-- Screen Size Threshold -->
      <div class="lod-config-editor__field">
        <label for="lod-screen-threshold" class="lod-config-editor__label">
          Screen Size Threshold
          <span class="lod-config-editor__value">{{ localConfig.screenSizeThreshold }}px</span>
        </label>
        <input
          id="lod-screen-threshold"
          type="range"
          class="lod-config-editor__slider"
          min="20"
          max="150"
          step="5"
          :value="localConfig.screenSizeThreshold"
          @input="
            updateConfig({
              screenSizeThreshold: parseInt(($event.target as HTMLInputElement).value, 10),
            })
          "
        />
        <p class="lod-config-editor__hint">
          Objects smaller than this threshold (in pixels) switch to lower LOD faster.
        </p>
      </div>

      <!-- Per-Level Settings -->
      <div class="lod-config-editor__levels">
        <div class="lod-config-editor__levels-header">Per-Level Settings</div>

        <div v-for="level in LOD_LEVELS" :key="level" class="lod-config-editor__level">
          <button
            type="button"
            :class="[
              'lod-config-editor__level-header',
              expandedLevels.has(level) ? 'lod-config-editor__level-header--expanded' : '',
            ]"
            :aria-expanded="expandedLevels.has(level)"
            @click="toggleLevel(level)"
          >
            <span class="lod-config-editor__level-title">
              LOD {{ level }}: {{ LOD_LEVEL_DESCRIPTIONS[level] }}
            </span>
            <span class="lod-config-editor__level-summary">
              {{ getThresholdForLevel(level)?.minDistance ?? 0 }}-{{
                getThresholdForLevel(level)?.maxDistance === Infinity
                  ? '∞'
                  : (getThresholdForLevel(level)?.maxDistance ?? 0)
              }}m
            </span>
            <span class="lod-config-editor__chevron">{{
              expandedLevels.has(level) ? '▼' : '▶'
            }}</span>
          </button>

          <div v-if="expandedLevels.has(level)" class="lod-config-editor__level-content">
            <!-- Distance Thresholds -->
            <div class="lod-config-editor__field-row">
              <div class="lod-config-editor__field lod-config-editor__field--half">
                <label class="lod-config-editor__label">Min Distance</label>
                <input
                  type="number"
                  class="lod-config-editor__number-input"
                  min="0"
                  max="100"
                  step="1"
                  :value="getThresholdForLevel(level)?.minDistance ?? 0"
                  @input="
                    updateThreshold(level, {
                      minDistance: parseFloat(($event.target as HTMLInputElement).value),
                    })
                  "
                />
              </div>
              <div class="lod-config-editor__field lod-config-editor__field--half">
                <label class="lod-config-editor__label">Max Distance</label>
                <input
                  type="number"
                  class="lod-config-editor__number-input"
                  min="0"
                  max="1000"
                  step="1"
                  :value="
                    getThresholdForLevel(level)?.maxDistance === Infinity
                      ? 999
                      : (getThresholdForLevel(level)?.maxDistance ?? 0)
                  "
                  @input="
                    (e: Event) => {
                      const val = parseFloat((e.target as HTMLInputElement).value)
                      updateThreshold(level, { maxDistance: val >= 999 ? Infinity : val })
                    }
                  "
                />
              </div>
            </div>

            <!-- Noise Octaves -->
            <div class="lod-config-editor__field">
              <label :for="`lod-noise-octaves-${level}`" class="lod-config-editor__label">
                Noise Octaves
                <span class="lod-config-editor__value">{{
                  localConfig.levelSettings[level].noiseOctaves
                }}</span>
              </label>
              <input
                :id="`lod-noise-octaves-${level}`"
                type="range"
                class="lod-config-editor__slider"
                min="0"
                max="8"
                step="1"
                :value="localConfig.levelSettings[level].noiseOctaves"
                @input="
                  updateLevelSettings(level, {
                    noiseOctaves: parseInt(($event.target as HTMLInputElement).value, 10),
                  })
                "
              />
            </div>

            <!-- Max Gradients -->
            <div class="lod-config-editor__field">
              <label class="lod-config-editor__label">
                Max Gradients
                <span class="lod-config-editor__value">{{
                  localConfig.levelSettings[level].maxGradients
                }}</span>
              </label>
              <input
                type="range"
                class="lod-config-editor__slider"
                min="0"
                max="4"
                step="1"
                :value="localConfig.levelSettings[level].maxGradients"
                @input="
                  updateLevelSettings(level, {
                    maxGradients: parseInt(($event.target as HTMLInputElement).value, 10),
                  })
                "
              />
            </div>

            <!-- FFT Coefficients -->
            <div class="lod-config-editor__field">
              <label class="lod-config-editor__label">
                FFT Coefficients
                <span class="lod-config-editor__value">{{
                  localConfig.levelSettings[level].fftCoefficients
                }}</span>
              </label>
              <input
                type="range"
                class="lod-config-editor__slider"
                min="1"
                max="16"
                step="1"
                :value="localConfig.levelSettings[level].fftCoefficients"
                @input="
                  updateLevelSettings(level, {
                    fftCoefficients: parseInt(($event.target as HTMLInputElement).value, 10),
                  })
                "
              />
            </div>

            <!-- Enable Noise Checkbox -->
            <div class="lod-config-editor__field">
              <label class="lod-config-editor__checkbox-label">
                <input
                  type="checkbox"
                  class="lod-config-editor__checkbox"
                  :checked="localConfig.levelSettings[level].enableNoise"
                  @change="
                    updateLevelSettings(level, {
                      enableNoise: ($event.target as HTMLInputElement).checked,
                    })
                  "
                />
                <span>Enable Noise</span>
              </label>
            </div>

            <!-- Enable Boundary Stitching Checkbox -->
            <div class="lod-config-editor__field">
              <label class="lod-config-editor__checkbox-label">
                <input
                  type="checkbox"
                  class="lod-config-editor__checkbox"
                  :checked="localConfig.levelSettings[level].enableBoundaryStitching"
                  @change="
                    updateLevelSettings(level, {
                      enableBoundaryStitching: ($event.target as HTMLInputElement).checked,
                    })
                  "
                />
                <span>Enable Boundary Stitching</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Reset Button -->
      <button type="button" class="lod-config-editor__reset-btn" @click="handleReset">
        Reset to Defaults
      </button>
    </div>
  </div>
</template>
