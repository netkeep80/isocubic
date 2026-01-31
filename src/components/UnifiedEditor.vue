<!--
  UnifiedEditor Component
  Vue.js 3.0 SFC combining all editors into a single adaptive interface with tabs

  Migrated from React (UnifiedEditor.tsx) to Vue.js SFC as part of Phase 10 (TASK 63)

  TASK 34: Unified Editor
  TASK 40: Developer Mode metadata support
-->
<script lang="ts">
import type { ComponentMeta } from '../types/component-meta'
import { registerComponentMeta } from '../types/component-meta'

/**
 * Component metadata for Developer Mode
 */
export const UNIFIED_EDITOR_META: ComponentMeta = {
  id: 'unified-editor',
  name: 'UnifiedEditor',
  version: '1.2.0',
  summary: 'Main editor component combining all sub-editors into a unified tabbed interface.',
  description:
    'UnifiedEditor is the primary editing interface for isocubic. It combines ParamEditor, ' +
    'FFTParamEditor, StackEditor, CollaborativeParamEditor, LODConfigEditor, and EnergyVisualizationEditor ' +
    'into a single adaptive component with tab-based navigation.',
  phase: 10,
  taskId: 'TASK 63',
  filePath: 'components/UnifiedEditor.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T19:00:00Z',
      description: 'Initial implementation of UnifiedEditor with tabbed interface',
      taskId: 'TASK 34',
      type: 'created',
    },
    {
      version: '1.1.0',
      date: '2026-01-29T21:00:00Z',
      description: 'Added Developer Mode metadata support',
      taskId: 'TASK 40',
      type: 'updated',
    },
    {
      version: '1.2.0',
      date: '2026-01-31T16:00:00Z',
      description: 'Migrated to Vue.js 3.0 SFC',
      taskId: 'TASK 63',
      type: 'updated',
    },
  ],
  features: [
    {
      id: 'tab-navigation',
      name: 'Tab Navigation',
      description: 'Tab-based navigation for organizing editor sections',
      enabled: true,
      taskId: 'TASK 34',
    },
    {
      id: 'mode-switching',
      name: 'Editor Mode Switching',
      description: 'Switch between Spectral, FFT, and Stack editing modes',
      enabled: true,
      taskId: 'TASK 34',
    },
    {
      id: 'quick-actions',
      name: 'Quick Actions',
      description: 'Panel with common operations (Reset, Duplicate, Randomize, Copy, Export)',
      enabled: true,
      taskId: 'TASK 34',
    },
    {
      id: 'keyboard-shortcuts',
      name: 'Keyboard Shortcuts',
      description: 'Keyboard shortcuts for quick actions',
      enabled: true,
      taskId: 'TASK 34',
    },
    {
      id: 'lazy-loading',
      name: 'Lazy Loading',
      description: 'Sub-editors are loaded on-demand for better initial load performance',
      enabled: true,
      taskId: 'TASK 34',
    },
  ],
  dependencies: [],
  relatedFiles: [],
  props: [],
  tags: ['editor', 'ui', 'tabs', 'spectral', 'fft', 'stack', 'collaboration', 'phase-10'],
  status: 'stable',
  lastUpdated: '2026-01-31T16:00:00Z',
}

registerComponentMeta(UNIFIED_EDITOR_META)
</script>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import type { SpectralCube, FFTCubeConfig } from '../types/cube'
import type { CubeStackConfig } from '../types/stack'
import type { LODConfig, LODStatistics } from '../types/lod'
import type { Participant, CollaborativeAction, ParticipantId } from '../types/collaboration'
import type { EnergyVisualizationEditorSettings } from '../lib/energy-visualization-defaults'
import { createDefaultCube, createDefaultFFTCube } from '../types/cube'
import { createCubeStack } from '../types/stack'
import { CollaborationManager } from '../lib/collaboration'
import { DEFAULT_EDITOR_SETTINGS } from '../lib/energy-visualization-defaults'

// Lazy load heavy editor components
const ParamEditor = defineAsyncComponent(() => import('./ParamEditor.vue'))
const FFTParamEditor = defineAsyncComponent(() => import('./FFTParamEditor.vue'))
const StackEditor = defineAsyncComponent(() => import('./StackEditor.vue'))
const LODConfigEditor = defineAsyncComponent(() => import('./LODConfigEditor.vue'))
const EnergyVisualizationEditor = defineAsyncComponent(
  () => import('./EnergyVisualizationEditor.vue')
)
const FFTChannelEditor = defineAsyncComponent(() => import('./FFTChannelEditor.vue'))
// TODO: CollaborativeParamEditor will be migrated in TASK 65

/** Editor mode determines which type of cube/object is being edited */
export type EditorMode = 'spectral' | 'fft' | 'stack'

/** Tab identifiers for the unified editor */
export type EditorTab =
  | 'general'
  | 'appearance'
  | 'physics'
  | 'energy'
  | 'stack'
  | 'lod'
  | 'collaboration'

/** Quick action types */
export type QuickActionType =
  | 'reset'
  | 'duplicate'
  | 'randomize'
  | 'save_preset'
  | 'load_preset'
  | 'export_json'
  | 'copy_config'

/** Quick action definition */
export interface QuickAction {
  type: QuickActionType
  label: string
  icon: string
  description: string
  enabled: boolean
  shortcut?: string
}

/** Props for UnifiedEditor */
export interface UnifiedEditorProps {
  currentCube?: SpectralCube | null
  currentFFTCube?: FFTCubeConfig | null
  currentStack?: CubeStackConfig | null
  initialMode?: EditorMode
  onCubeUpdate?: (cube: SpectralCube) => void
  onFFTCubeUpdate?: (cube: FFTCubeConfig) => void
  onStackUpdate?: (stack: CubeStackConfig) => void
  onModeChange?: (mode: EditorMode) => void
  lodConfig?: LODConfig
  onLODConfigChange?: (config: LODConfig) => void
  lodStatistics?: LODStatistics
  collaborationEnabled?: boolean
  collaborationManager?: CollaborationManager
  participants?: Map<ParticipantId, Participant>
  localParticipantId?: ParticipantId
  collaborativeActions?: CollaborativeAction[]
  onUndoAction?: (action: CollaborativeAction) => void
  isMobile?: boolean
  className?: string
}

/** Tab configuration */
interface TabConfig {
  id: EditorTab
  label: string
  icon: string
  availableInModes: EditorMode[]
  description: string
}

const TABS_CONFIG: TabConfig[] = [
  {
    id: 'general',
    label: 'General',
    icon: '📝',
    availableInModes: ['spectral', 'fft', 'stack'],
    description: 'Basic properties and metadata',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: '🎨',
    availableInModes: ['spectral', 'fft'],
    description: 'Colors, gradients, and visual effects',
  },
  {
    id: 'physics',
    label: 'Physics',
    icon: '⚙️',
    availableInModes: ['spectral', 'fft', 'stack'],
    description: 'Material and physical properties',
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: '⚡',
    availableInModes: ['fft'],
    description: 'FFT channels and energy settings',
  },
  {
    id: 'stack',
    label: 'Layers',
    icon: '📚',
    availableInModes: ['stack'],
    description: 'Stack layers and transitions',
  },
  {
    id: 'lod',
    label: 'LOD',
    icon: '🔍',
    availableInModes: ['spectral', 'fft', 'stack'],
    description: 'Level of detail settings',
  },
  {
    id: 'collaboration',
    label: 'Collab',
    icon: '👥',
    availableInModes: ['spectral', 'fft'],
    description: 'Collaboration and history',
  },
]

const props = withDefaults(defineProps<UnifiedEditorProps>(), {
  currentCube: null,
  currentFFTCube: null,
  currentStack: null,
  initialMode: 'spectral',
  onCubeUpdate: undefined,
  onFFTCubeUpdate: undefined,
  onStackUpdate: undefined,
  onModeChange: undefined,
  lodConfig: undefined,
  onLODConfigChange: undefined,
  lodStatistics: undefined,
  collaborationEnabled: false,
  collaborationManager: undefined,
  participants: undefined,
  localParticipantId: undefined,
  collaborativeActions: undefined,
  onUndoAction: undefined,
  isMobile: false,
  className: '',
})

const emit = defineEmits<{
  (e: 'update:cube', cube: SpectralCube): void
  (e: 'update:fftCube', cube: FFTCubeConfig): void
  (e: 'update:stack', stack: CubeStackConfig): void
  (e: 'update:mode', mode: EditorMode): void
  (e: 'update:lodConfig', config: LODConfig): void
}>()

// State
const editorMode = ref<EditorMode>(props.initialMode)
const activeTab = ref<EditorTab>('general')
const showQuickActions = ref(!props.isMobile)
const localCube = ref<SpectralCube | null>(props.currentCube)
const localFFTCube = ref<FFTCubeConfig | null>(props.currentFFTCube)
const localStack = ref<CubeStackConfig | null>(props.currentStack)
const visualizationSettings = ref<EnergyVisualizationEditorSettings>(DEFAULT_EDITOR_SETTINGS)

// Sync local state with props
watch(
  () => props.currentCube,
  (v) => {
    localCube.value = v
  }
)
watch(
  () => props.currentFFTCube,
  (v) => {
    localFFTCube.value = v
  }
)
watch(
  () => props.currentStack,
  (v) => {
    localStack.value = v
  }
)

// Filter tabs based on mode
const availableTabs = computed(() => {
  let tabs = TABS_CONFIG.filter((tab) => tab.availableInModes.includes(editorMode.value))
  if (!props.collaborationEnabled) {
    tabs = tabs.filter((tab) => tab.id !== 'collaboration')
  }
  return tabs
})

// Ensure active tab is valid
watch(availableTabs, (tabs) => {
  if (!tabs.find((tab) => tab.id === activeTab.value)) {
    activeTab.value = tabs[0]?.id || 'general'
  }
})

// Handle mode change
function handleModeChange(newMode: EditorMode) {
  editorMode.value = newMode
  props.onModeChange?.(newMode)
  emit('update:mode', newMode)
  const firstTab = TABS_CONFIG.find((tab) => tab.availableInModes.includes(newMode))
  if (firstTab) {
    activeTab.value = firstTab.id
  }
}

// Handle updates
function handleCubeUpdate(cube: SpectralCube) {
  localCube.value = cube
  props.onCubeUpdate?.(cube)
  emit('update:cube', cube)
}

function handleFFTCubeUpdate(cube: FFTCubeConfig) {
  localFFTCube.value = cube
  props.onFFTCubeUpdate?.(cube)
  emit('update:fftCube', cube)
}

function handleStackUpdate(stack: CubeStackConfig) {
  localStack.value = stack
  props.onStackUpdate?.(stack)
  emit('update:stack', stack)
}

// Quick actions
const quickActions = computed<QuickAction[]>(() => {
  const hasContent = Boolean(
    (editorMode.value === 'spectral' && localCube.value) ||
    (editorMode.value === 'fft' && localFFTCube.value) ||
    (editorMode.value === 'stack' && localStack.value)
  )

  return [
    {
      type: 'reset',
      label: 'Reset',
      icon: '🔄',
      description: 'Reset to default values',
      enabled: hasContent,
      shortcut: 'Ctrl+R',
    },
    {
      type: 'duplicate',
      label: 'Duplicate',
      icon: '📋',
      description: 'Create a copy',
      enabled: hasContent,
      shortcut: 'Ctrl+D',
    },
    {
      type: 'randomize',
      label: 'Randomize',
      icon: '🎲',
      description: 'Generate random values',
      enabled: true,
      shortcut: 'Ctrl+Shift+R',
    },
    {
      type: 'copy_config',
      label: 'Copy',
      icon: '📄',
      description: 'Copy configuration to clipboard',
      enabled: hasContent,
      shortcut: 'Ctrl+C',
    },
    {
      type: 'export_json',
      label: 'Export',
      icon: '💾',
      description: 'Export as JSON file',
      enabled: hasContent,
      shortcut: 'Ctrl+S',
    },
  ]
})

function executeQuickAction(actionType: QuickActionType) {
  switch (actionType) {
    case 'reset': {
      if (editorMode.value === 'spectral') {
        const id = localCube.value?.id || `cube_${Date.now()}`
        handleCubeUpdate(createDefaultCube(id))
      } else if (editorMode.value === 'fft') {
        const id = localFFTCube.value?.id || `fft_cube_${Date.now()}`
        handleFFTCubeUpdate(createDefaultFFTCube(id))
      } else if (editorMode.value === 'stack') {
        const id = localStack.value?.id || `stack_${Date.now()}`
        handleStackUpdate(createCubeStack(id, []))
      }
      break
    }
    case 'duplicate': {
      if (editorMode.value === 'spectral' && localCube.value) {
        handleCubeUpdate({
          ...localCube.value,
          id: `${localCube.value.id}_copy_${Date.now()}`,
          meta: {
            ...localCube.value.meta,
            name: `${localCube.value.meta?.name || 'Cube'} (Copy)`,
            created: new Date().toISOString(),
          },
        })
      } else if (editorMode.value === 'fft' && localFFTCube.value) {
        handleFFTCubeUpdate({
          ...localFFTCube.value,
          id: `${localFFTCube.value.id}_copy_${Date.now()}`,
          meta: {
            ...localFFTCube.value.meta,
            name: `${localFFTCube.value.meta?.name || 'FFT Cube'} (Copy)`,
            created: new Date().toISOString(),
          },
        })
      } else if (editorMode.value === 'stack' && localStack.value) {
        handleStackUpdate({
          ...localStack.value,
          id: `${localStack.value.id}_copy_${Date.now()}`,
          meta: {
            ...localStack.value.meta,
            name: `${localStack.value.meta?.name || 'Stack'} (Copy)`,
            created: new Date().toISOString(),
          },
        })
      }
      break
    }
    case 'randomize': {
      if (editorMode.value === 'spectral') {
        const randomCube = createDefaultCube(`random_${Date.now()}`)
        randomCube.base.color = [Math.random(), Math.random(), Math.random()]
        randomCube.base.roughness = Math.random()
        randomCube.meta = { name: 'Random Cube', created: new Date().toISOString() }
        handleCubeUpdate(randomCube)
      } else if (editorMode.value === 'fft') {
        const randomCube = createDefaultFFTCube(`random_fft_${Date.now()}`)
        randomCube.energy_capacity = 50 + Math.random() * 100
        randomCube.current_energy = Math.random() * randomCube.energy_capacity
        randomCube.meta = { name: 'Random FFT Cube', created: new Date().toISOString() }
        handleFFTCubeUpdate(randomCube)
      }
      break
    }
    case 'copy_config': {
      let configString = ''
      if (editorMode.value === 'spectral' && localCube.value) {
        configString = JSON.stringify(localCube.value, null, 2)
      } else if (editorMode.value === 'fft' && localFFTCube.value) {
        configString = JSON.stringify(localFFTCube.value, null, 2)
      } else if (editorMode.value === 'stack' && localStack.value) {
        configString = JSON.stringify(localStack.value, null, 2)
      }
      if (configString) {
        navigator.clipboard.writeText(configString).catch(console.error)
      }
      break
    }
    case 'export_json': {
      let config: object | null = null
      let fileName = 'config.json'
      if (editorMode.value === 'spectral' && localCube.value) {
        config = localCube.value
        fileName = `${localCube.value.id}.json`
      } else if (editorMode.value === 'fft' && localFFTCube.value) {
        config = localFFTCube.value
        fileName = `${localFFTCube.value.id}.json`
      } else if (editorMode.value === 'stack' && localStack.value) {
        config = localStack.value
        fileName = `${localStack.value.id}.json`
      }
      if (config) {
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
      }
      break
    }
  }
}

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'r':
        if (e.shiftKey) {
          e.preventDefault()
          executeQuickAction('randomize')
        } else {
          e.preventDefault()
          executeQuickAction('reset')
        }
        break
      case 'd':
        e.preventDefault()
        executeQuickAction('duplicate')
        break
      case 's':
        e.preventDefault()
        executeQuickAction('export_json')
        break
      case 'c':
        if (!window.getSelection()?.toString()) {
          e.preventDefault()
          executeQuickAction('copy_config')
        }
        break
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <!-- Mobile layout -->
  <div v-if="props.isMobile" :class="['unified-editor', 'unified-editor--mobile', props.className]">
    <header class="unified-editor__header">
      <h2 class="unified-editor__title">Unified Editor</h2>
      <!-- Mode selector -->
      <div class="unified-editor__mode-selector">
        <button
          type="button"
          :class="[
            'unified-editor__mode-btn',
            editorMode === 'spectral' ? 'unified-editor__mode-btn--active' : '',
          ]"
          :aria-pressed="editorMode === 'spectral'"
          title="Edit standard parametric cubes"
          @click="handleModeChange('spectral')"
        >
          <span class="unified-editor__mode-icon" aria-hidden="true">🧊</span>
          <span class="unified-editor__mode-label">Spectral</span>
        </button>
        <button
          type="button"
          :class="[
            'unified-editor__mode-btn',
            editorMode === 'fft' ? 'unified-editor__mode-btn--active' : '',
          ]"
          :aria-pressed="editorMode === 'fft'"
          title="Edit magical/energy cubes with FFT"
          @click="handleModeChange('fft')"
        >
          <span class="unified-editor__mode-icon" aria-hidden="true">⚡</span>
          <span class="unified-editor__mode-label">FFT</span>
        </button>
        <button
          type="button"
          :class="[
            'unified-editor__mode-btn',
            editorMode === 'stack' ? 'unified-editor__mode-btn--active' : '',
          ]"
          :aria-pressed="editorMode === 'stack'"
          title="Edit cube stacks (vertical layers)"
          @click="handleModeChange('stack')"
        >
          <span class="unified-editor__mode-icon" aria-hidden="true">📚</span>
          <span class="unified-editor__mode-label">Stack</span>
        </button>
      </div>
    </header>

    <!-- Quick actions collapsible -->
    <div class="unified-editor__mobile-quick-actions">
      <button
        type="button"
        class="unified-editor__accordion-header"
        :aria-expanded="showQuickActions"
        @click="showQuickActions = !showQuickActions"
      >
        <span>Quick Actions</span>
        <span class="unified-editor__chevron">{{ showQuickActions ? '▼' : '▶' }}</span>
      </button>
      <div
        v-if="showQuickActions"
        :class="['unified-editor__quick-actions', 'unified-editor__quick-actions--visible']"
      >
        <div class="unified-editor__quick-actions-list">
          <button
            v-for="action in quickActions"
            :key="action.type"
            type="button"
            class="unified-editor__quick-action-btn"
            :disabled="!action.enabled"
            :title="`${action.description}${action.shortcut ? ` (${action.shortcut})` : ''}`"
            @click="executeQuickAction(action.type)"
          >
            <span class="unified-editor__quick-action-icon" aria-hidden="true">{{
              action.icon
            }}</span>
            <span class="unified-editor__quick-action-label">{{ action.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Tab selector for mobile -->
    <div class="unified-editor__mobile-tab-selector">
      <select
        :value="activeTab"
        class="unified-editor__tab-select"
        aria-label="Select editor section"
        @change="activeTab = ($event.target as HTMLSelectElement).value as EditorTab"
      >
        <option v-for="tab in availableTabs" :key="tab.id" :value="tab.id">
          {{ tab.icon }} {{ tab.label }}
        </option>
      </select>
    </div>

    <!-- Tab content -->
    <main
      :id="`tabpanel-${activeTab}`"
      class="unified-editor__content"
      role="tabpanel"
      :aria-labelledby="`tab-${activeTab}`"
    >
      <Suspense>
        <template #default>
          <!-- General tab -->
          <div v-if="activeTab === 'general'" class="unified-editor__tab-content">
            <ParamEditor
              v-if="editorMode === 'spectral' && localCube"
              :current-cube="localCube"
              :on-cube-update="handleCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <FFTParamEditor
              v-else-if="editorMode === 'fft' && localFFTCube"
              :current-cube="localFFTCube"
              :on-cube-update="handleFFTCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <StackEditor
              v-else-if="editorMode === 'stack' && localStack"
              :current-stack="localStack"
              :on-stack-update="handleStackUpdate"
              class="unified-editor__embedded-editor"
            />
            <div v-else class="unified-editor__empty">
              <p>No content selected</p>
              <p>Select a cube, FFT cube, or stack to edit</p>
            </div>
          </div>
          <!-- Appearance tab -->
          <div v-else-if="activeTab === 'appearance'" class="unified-editor__tab-content">
            <ParamEditor
              v-if="editorMode === 'spectral' && localCube"
              :current-cube="localCube"
              :on-cube-update="handleCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <EnergyVisualizationEditor
              v-else-if="editorMode === 'fft' && localFFTCube"
              :settings="visualizationSettings"
              :on-settings-change="
                (s: EnergyVisualizationEditorSettings) => {
                  visualizationSettings = s
                }
              "
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Physics tab -->
          <div v-else-if="activeTab === 'physics'" class="unified-editor__tab-content">
            <ParamEditor
              v-if="editorMode === 'spectral' && localCube"
              :current-cube="localCube"
              :on-cube-update="handleCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <FFTParamEditor
              v-else-if="editorMode === 'fft' && localFFTCube"
              :current-cube="localFFTCube"
              :on-cube-update="handleFFTCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <StackEditor
              v-else-if="editorMode === 'stack' && localStack"
              :current-stack="localStack"
              :on-stack-update="handleStackUpdate"
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Energy tab -->
          <div
            v-else-if="activeTab === 'energy' && editorMode === 'fft' && localFFTCube"
            class="unified-editor__tab-content"
          >
            <FFTChannelEditor
              :current-cube="localFFTCube"
              :on-cube-update="handleFFTCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <EnergyVisualizationEditor
              :settings="visualizationSettings"
              :on-settings-change="
                (s: EnergyVisualizationEditorSettings) => {
                  visualizationSettings = s
                }
              "
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Stack tab -->
          <div
            v-else-if="activeTab === 'stack' && editorMode === 'stack' && localStack"
            class="unified-editor__tab-content"
          >
            <StackEditor
              :current-stack="localStack"
              :on-stack-update="handleStackUpdate"
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- LOD tab -->
          <div v-else-if="activeTab === 'lod'" class="unified-editor__tab-content">
            <LODConfigEditor
              :config="props.lodConfig"
              :on-config-change="props.onLODConfigChange"
              :statistics="props.lodStatistics"
              :show-advanced="true"
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Collaboration tab -->
          <div v-else-if="activeTab === 'collaboration'" class="unified-editor__tab-content">
            <div v-if="!props.collaborationEnabled" />
            <!-- TODO: CollaborativeParamEditor will be migrated in TASK 65 -->
            <div v-else class="unified-editor__collaboration-info">
              <h3>Collaboration</h3>
              <p>Collaborative editing is available in Spectral mode</p>
              <button
                type="button"
                class="unified-editor__mode-switch-btn"
                @click="handleModeChange('spectral')"
              >
                Switch to Spectral Mode
              </button>
            </div>
          </div>
        </template>
        <template #fallback>
          <div class="unified-editor__loading">
            <span class="unified-editor__loading-spinner" aria-hidden="true">⏳</span>
            <span>Loading editor...</span>
          </div>
        </template>
      </Suspense>
    </main>
  </div>

  <!-- Desktop/tablet layout -->
  <div v-else :class="['unified-editor', 'unified-editor--desktop', props.className]">
    <header class="unified-editor__header">
      <h2 class="unified-editor__title">Unified Editor</h2>
      <!-- Mode selector -->
      <div class="unified-editor__mode-selector">
        <button
          type="button"
          :class="[
            'unified-editor__mode-btn',
            editorMode === 'spectral' ? 'unified-editor__mode-btn--active' : '',
          ]"
          :aria-pressed="editorMode === 'spectral'"
          title="Edit standard parametric cubes"
          @click="handleModeChange('spectral')"
        >
          <span class="unified-editor__mode-icon" aria-hidden="true">🧊</span>
          <span class="unified-editor__mode-label">Spectral</span>
        </button>
        <button
          type="button"
          :class="[
            'unified-editor__mode-btn',
            editorMode === 'fft' ? 'unified-editor__mode-btn--active' : '',
          ]"
          :aria-pressed="editorMode === 'fft'"
          title="Edit magical/energy cubes with FFT"
          @click="handleModeChange('fft')"
        >
          <span class="unified-editor__mode-icon" aria-hidden="true">⚡</span>
          <span class="unified-editor__mode-label">FFT</span>
        </button>
        <button
          type="button"
          :class="[
            'unified-editor__mode-btn',
            editorMode === 'stack' ? 'unified-editor__mode-btn--active' : '',
          ]"
          :aria-pressed="editorMode === 'stack'"
          title="Edit cube stacks (vertical layers)"
          @click="handleModeChange('stack')"
        >
          <span class="unified-editor__mode-icon" aria-hidden="true">📚</span>
          <span class="unified-editor__mode-label">Stack</span>
        </button>
      </div>
    </header>

    <!-- Quick actions sidebar -->
    <div
      :class="[
        'unified-editor__quick-actions',
        showQuickActions ? 'unified-editor__quick-actions--visible' : '',
      ]"
    >
      <div class="unified-editor__quick-actions-header">
        <h3 class="unified-editor__quick-actions-title">Quick Actions</h3>
      </div>
      <div class="unified-editor__quick-actions-list">
        <button
          v-for="action in quickActions"
          :key="action.type"
          type="button"
          class="unified-editor__quick-action-btn"
          :disabled="!action.enabled"
          :title="`${action.description}${action.shortcut ? ` (${action.shortcut})` : ''}`"
          @click="executeQuickAction(action.type)"
        >
          <span class="unified-editor__quick-action-icon" aria-hidden="true">{{
            action.icon
          }}</span>
          <span class="unified-editor__quick-action-label">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <!-- Tab navigation -->
    <nav class="unified-editor__tabs" role="tablist" aria-label="Editor sections">
      <button
        v-for="tab in availableTabs"
        :id="`tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`tabpanel-${tab.id}`"
        :class="['unified-editor__tab', activeTab === tab.id ? 'unified-editor__tab--active' : '']"
        :title="tab.description"
        @click="activeTab = tab.id"
      >
        <span class="unified-editor__tab-icon" aria-hidden="true">{{ tab.icon }}</span>
        <span class="unified-editor__tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Tab content -->
    <main
      :id="`tabpanel-${activeTab}`"
      class="unified-editor__content"
      role="tabpanel"
      :aria-labelledby="`tab-${activeTab}`"
    >
      <Suspense>
        <template #default>
          <!-- General tab -->
          <div v-if="activeTab === 'general'" class="unified-editor__tab-content">
            <ParamEditor
              v-if="editorMode === 'spectral' && localCube"
              :current-cube="localCube"
              :on-cube-update="handleCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <FFTParamEditor
              v-else-if="editorMode === 'fft' && localFFTCube"
              :current-cube="localFFTCube"
              :on-cube-update="handleFFTCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <StackEditor
              v-else-if="editorMode === 'stack' && localStack"
              :current-stack="localStack"
              :on-stack-update="handleStackUpdate"
              class="unified-editor__embedded-editor"
            />
            <div v-else class="unified-editor__empty">
              <p>No content selected</p>
              <p>Select a cube, FFT cube, or stack to edit</p>
            </div>
          </div>
          <!-- Appearance tab -->
          <div v-else-if="activeTab === 'appearance'" class="unified-editor__tab-content">
            <ParamEditor
              v-if="editorMode === 'spectral' && localCube"
              :current-cube="localCube"
              :on-cube-update="handleCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <EnergyVisualizationEditor
              v-else-if="editorMode === 'fft' && localFFTCube"
              :settings="visualizationSettings"
              :on-settings-change="
                (s: EnergyVisualizationEditorSettings) => {
                  visualizationSettings = s
                }
              "
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Physics tab -->
          <div v-else-if="activeTab === 'physics'" class="unified-editor__tab-content">
            <ParamEditor
              v-if="editorMode === 'spectral' && localCube"
              :current-cube="localCube"
              :on-cube-update="handleCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <FFTParamEditor
              v-else-if="editorMode === 'fft' && localFFTCube"
              :current-cube="localFFTCube"
              :on-cube-update="handleFFTCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <StackEditor
              v-else-if="editorMode === 'stack' && localStack"
              :current-stack="localStack"
              :on-stack-update="handleStackUpdate"
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Energy tab -->
          <div
            v-else-if="activeTab === 'energy' && editorMode === 'fft' && localFFTCube"
            class="unified-editor__tab-content"
          >
            <FFTChannelEditor
              :current-cube="localFFTCube"
              :on-cube-update="handleFFTCubeUpdate"
              class="unified-editor__embedded-editor"
            />
            <EnergyVisualizationEditor
              :settings="visualizationSettings"
              :on-settings-change="
                (s: EnergyVisualizationEditorSettings) => {
                  visualizationSettings = s
                }
              "
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Stack tab -->
          <div
            v-else-if="activeTab === 'stack' && editorMode === 'stack' && localStack"
            class="unified-editor__tab-content"
          >
            <StackEditor
              :current-stack="localStack"
              :on-stack-update="handleStackUpdate"
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- LOD tab -->
          <div v-else-if="activeTab === 'lod'" class="unified-editor__tab-content">
            <LODConfigEditor
              :config="props.lodConfig"
              :on-config-change="props.onLODConfigChange"
              :statistics="props.lodStatistics"
              :show-advanced="true"
              class="unified-editor__embedded-editor"
            />
          </div>
          <!-- Collaboration tab -->
          <div v-else-if="activeTab === 'collaboration'" class="unified-editor__tab-content">
            <div v-if="!props.collaborationEnabled" />
            <!-- TODO: CollaborativeParamEditor will be migrated in TASK 65 -->
            <div v-else class="unified-editor__collaboration-info">
              <h3>Collaboration</h3>
              <p>Collaborative editing is available in Spectral mode</p>
              <button
                type="button"
                class="unified-editor__mode-switch-btn"
                @click="handleModeChange('spectral')"
              >
                Switch to Spectral Mode
              </button>
            </div>
          </div>
        </template>
        <template #fallback>
          <div class="unified-editor__loading">
            <span class="unified-editor__loading-spinner" aria-hidden="true">⏳</span>
            <span>Loading editor...</span>
          </div>
        </template>
      </Suspense>
    </main>
  </div>
</template>
