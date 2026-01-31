/**
 * StackPresetPicker Component
 * Provides a gallery UI for selecting and managing stack presets
 *
 * ISSUE 30: Шаблоны стопок (Stack Presets)
 *
 * Features:
 * - Gallery of preset thumbnails
 * - Search by name/tags
 * - Category filtering
 * - Apply preset to editor
 * - Save current stack as preset
 */
<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import type { CubeStackConfig } from '../types/stack'
import type { Color3 } from '../types/cube'
import {
  getAllStackPresets,
  searchStackPresets,
  getPresetsByCategory,
  applyPreset,
  saveStackAsPreset,
  deleteUserPreset,
  STACK_PRESET_CATEGORIES,
  type StackPreset,
  type StackPresetCategory,
} from '../lib/stack-presets'

/**
 * Props for StackPresetPicker component
 */
interface StackPresetPickerProps {
  /** Current stack configuration (for saving as preset) */
  currentStack?: CubeStackConfig | null
  /** Whether the picker is visible */
  isOpen?: boolean
  /** Custom class name */
  className?: string
}

const props = withDefaults(defineProps<StackPresetPickerProps>(), {
  currentStack: null,
  isOpen: true,
  className: '',
})

const emit = defineEmits<{
  applyPreset: [config: CubeStackConfig]
  close: []
}>()

/**
 * Convert RGB [0-1] to CSS color
 */
function rgbToCss(color: Color3 | undefined): string {
  if (!color) return '#808080'
  return `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`
}

/**
 * Generate a gradient preview based on stack layers
 */
function generateStackGradient(preset: StackPreset): string {
  const layers = preset.config.layers
  if (layers.length === 0) {
    return rgbToCss(preset.previewColor)
  }

  const colors = layers.map((layer) => rgbToCss(layer.cubeConfig.base.color))
  // Vertical gradient from bottom to top
  return `linear-gradient(to top, ${colors.join(', ')})`
}

// State
const searchQuery = ref('')
const selectedCategory = ref<StackPresetCategory | 'all'>('all')
const showSaveDialog = ref(false)
const savePresetName = ref('')
const savePresetDescription = ref('')
const savePresetTags = ref('')
const selectedPresetId = ref<string | null>(null)
const refreshKey = ref(0)
const presetNameInput = ref<HTMLInputElement | null>(null)

// Get filtered presets
const filteredPresets = computed(() => {
  let presets: StackPreset[]

  if (searchQuery.value.trim()) {
    presets = searchStackPresets(searchQuery.value)
  } else if (selectedCategory.value === 'all') {
    presets = getAllStackPresets()
  } else {
    presets = getPresetsByCategory(selectedCategory.value)
  }

  // Force refresh when refreshKey changes
  void refreshKey.value
  return presets
})

// Category counts
const categoryCounts = computed(() => {
  // Note: refreshKey is used to force recalculation when user presets change
  void refreshKey.value
  const allPresets = getAllStackPresets()
  const counts: Record<string, number> = { all: allPresets.length }

  for (const category of Object.keys(STACK_PRESET_CATEGORIES)) {
    counts[category] = allPresets.filter((p) => p.category === category).length
  }

  return counts
})

// Selected preset details
const selectedPreset = computed(() => {
  return selectedPresetId.value
    ? filteredPresets.value.find((p) => p.id === selectedPresetId.value) ?? null
    : null
})

// Handle preset selection
function handlePresetClick(preset: StackPreset) {
  selectedPresetId.value = preset.id
}

// Handle preset apply
function handleApplyPreset() {
  if (!selectedPresetId.value) return

  const preset = filteredPresets.value.find((p) => p.id === selectedPresetId.value)
  if (!preset) return

  const newConfig = applyPreset(preset)
  emit('applyPreset', newConfig)
  emit('close')
}

// Handle double-click to apply immediately
function handlePresetDoubleClick(preset: StackPreset) {
  const newConfig = applyPreset(preset)
  emit('applyPreset', newConfig)
  emit('close')
}

// Handle save current stack as preset
function handleSaveAsPreset() {
  if (!props.currentStack || !savePresetName.value.trim()) return

  const tags = savePresetTags.value
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  saveStackAsPreset(props.currentStack, savePresetName.value.trim(), savePresetDescription.value.trim(), tags)

  // Reset form and refresh
  savePresetName.value = ''
  savePresetDescription.value = ''
  savePresetTags.value = ''
  showSaveDialog.value = false
  refreshKey.value++
}

// Handle delete preset
function handleDeletePreset(presetId: string, event: MouseEvent) {
  event.stopPropagation()

  if (deleteUserPreset(presetId)) {
    if (selectedPresetId.value === presetId) {
      selectedPresetId.value = null
    }
    refreshKey.value++
  }
}

// Handle search input
function handleSearchChange(e: Event) {
  searchQuery.value = (e.target as HTMLInputElement).value
  selectedPresetId.value = null
}

// Handle category change
function handleCategoryChange(category: StackPresetCategory | 'all') {
  selectedCategory.value = category
  selectedPresetId.value = null
}

// Handle clearing search
function handleClearSearch() {
  searchQuery.value = ''
  selectedPresetId.value = null
}

// Handle opening save dialog
function handleOpenSaveDialog() {
  showSaveDialog.value = true
}

// Handle cancel save dialog
function handleCancelSaveDialog() {
  showSaveDialog.value = false
  savePresetName.value = ''
  savePresetDescription.value = ''
  savePresetTags.value = ''
}

// Handle preset keydown
function handlePresetKeyDown(e: KeyboardEvent, preset: StackPreset) {
  if (e.key === 'Enter') {
    handlePresetClick(preset)
  }
}

// autoFocus for preset name input
watch(showSaveDialog, async (newVal) => {
  if (newVal) {
    await nextTick()
    presetNameInput.value?.focus()
  }
})
</script>

<template>
  <div v-if="props.isOpen" :class="`stack-preset-picker ${props.className}`">
    <div class="stack-preset-picker__header">
      <h2 class="stack-preset-picker__title">Stack Presets</h2>
      <button
        type="button"
        class="stack-preset-picker__close-btn"
        aria-label="Close preset picker"
        @click="emit('close')"
      >
        &times;
      </button>
    </div>

    <!-- Search Bar -->
    <div class="stack-preset-picker__search">
      <input
        type="text"
        class="stack-preset-picker__search-input"
        placeholder="Search presets by name or tags..."
        :value="searchQuery"
        aria-label="Search presets"
        @input="handleSearchChange"
      />
      <button
        v-if="searchQuery"
        type="button"
        class="stack-preset-picker__search-clear"
        aria-label="Clear search"
        @click="handleClearSearch"
      >
        &times;
      </button>
    </div>

    <!-- Category Filter -->
    <div class="stack-preset-picker__categories">
      <button
        type="button"
        :class="`stack-preset-picker__category ${selectedCategory === 'all' ? 'stack-preset-picker__category--active' : ''}`"
        @click="handleCategoryChange('all')"
      >
        All ({{ categoryCounts.all }})
      </button>
      <button
        v-for="category in (Object.keys(STACK_PRESET_CATEGORIES) as StackPresetCategory[])"
        :key="category"
        type="button"
        :class="`stack-preset-picker__category ${selectedCategory === category ? 'stack-preset-picker__category--active' : ''}`"
        :title="STACK_PRESET_CATEGORIES[category].description"
        @click="handleCategoryChange(category)"
      >
        {{ STACK_PRESET_CATEGORIES[category].name }} ({{ categoryCounts[category] || 0 }})
      </button>
    </div>

    <!-- Preset Grid -->
    <div class="stack-preset-picker__grid">
      <div v-if="filteredPresets.length === 0" class="stack-preset-picker__empty">
        <p>No presets found</p>
        <p v-if="searchQuery">Try a different search term</p>
      </div>
      <template v-else>
        <div
          v-for="preset in filteredPresets"
          :key="preset.id"
          :class="`stack-preset-picker__preset ${selectedPresetId === preset.id ? 'stack-preset-picker__preset--selected' : ''}`"
          role="button"
          :tabindex="0"
          :aria-selected="selectedPresetId === preset.id"
          @click="handlePresetClick(preset)"
          @dblclick="handlePresetDoubleClick(preset)"
          @keydown="handlePresetKeyDown($event, preset)"
        >
          <!-- Preview -->
          <div
            class="stack-preset-picker__preview"
            :style="{ background: generateStackGradient(preset) }"
          >
            <div class="stack-preset-picker__layers-count">
              {{ preset.config.layers.length }}
            </div>
          </div>

          <!-- Info -->
          <div class="stack-preset-picker__info">
            <h3 class="stack-preset-picker__preset-name">{{ preset.name }}</h3>
            <p class="stack-preset-picker__preset-desc">{{ preset.description }}</p>
            <div class="stack-preset-picker__tags">
              <span
                v-for="tag in preset.tags.slice(0, 3)"
                :key="tag"
                class="stack-preset-picker__tag"
              >
                {{ tag }}
              </span>
              <span
                v-if="preset.tags.length > 3"
                class="stack-preset-picker__tag stack-preset-picker__tag--more"
              >
                +{{ preset.tags.length - 3 }}
              </span>
            </div>
          </div>

          <!-- Delete button for user presets -->
          <button
            v-if="preset.isUserPreset"
            type="button"
            class="stack-preset-picker__delete-btn"
            :aria-label="`Delete ${preset.name}`"
            title="Delete preset"
            @click="handleDeletePreset(preset.id, $event)"
          >
            &times;
          </button>
        </div>
      </template>
    </div>

    <!-- Selected Preset Details -->
    <div v-if="selectedPreset" class="stack-preset-picker__details">
      <h3>{{ selectedPreset.name }}</h3>
      <p>{{ selectedPreset.description }}</p>
      <div class="stack-preset-picker__details-meta">
        <span>Layers: {{ selectedPreset.config.layers.length }}</span>
        <span>Height: {{ selectedPreset.config.totalHeight.toFixed(1) }}</span>
        <span>Category: {{ STACK_PRESET_CATEGORIES[selectedPreset.category].name }}</span>
      </div>
      <div class="stack-preset-picker__tags">
        <span
          v-for="tag in selectedPreset.tags"
          :key="tag"
          class="stack-preset-picker__tag"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="stack-preset-picker__actions">
      <button
        type="button"
        class="stack-preset-picker__apply-btn"
        :disabled="!selectedPresetId"
        @click="handleApplyPreset"
      >
        Apply Preset
      </button>

      <button
        v-if="currentStack"
        type="button"
        class="stack-preset-picker__save-btn"
        @click="handleOpenSaveDialog"
      >
        Save Current as Preset
      </button>
    </div>

    <!-- Save Preset Dialog -->
    <div v-if="showSaveDialog" class="stack-preset-picker__dialog-overlay">
      <div class="stack-preset-picker__dialog">
        <h3 class="stack-preset-picker__dialog-title">Save as Preset</h3>

        <div class="stack-preset-picker__dialog-field">
          <label for="preset-name">Name *</label>
          <input
            id="preset-name"
            ref="presetNameInput"
            type="text"
            :value="savePresetName"
            placeholder="My Custom Stack"
            @input="savePresetName = ($event.target as HTMLInputElement).value"
          />
        </div>

        <div class="stack-preset-picker__dialog-field">
          <label for="preset-description">Description</label>
          <textarea
            id="preset-description"
            :value="savePresetDescription"
            placeholder="Describe your stack preset..."
            :rows="3"
            @input="savePresetDescription = ($event.target as HTMLTextAreaElement).value"
          />
        </div>

        <div class="stack-preset-picker__dialog-field">
          <label for="preset-tags">Tags (comma-separated)</label>
          <input
            id="preset-tags"
            type="text"
            :value="savePresetTags"
            placeholder="stone, wall, medieval"
            @input="savePresetTags = ($event.target as HTMLInputElement).value"
          />
        </div>

        <div class="stack-preset-picker__dialog-actions">
          <button
            type="button"
            class="stack-preset-picker__dialog-cancel"
            @click="handleCancelSaveDialog"
          >
            Cancel
          </button>
          <button
            type="button"
            class="stack-preset-picker__dialog-save"
            :disabled="!savePresetName.trim()"
            @click="handleSaveAsPreset"
          >
            Save Preset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
