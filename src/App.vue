<!--
  App.vue — Root component for isocubic
  Adaptive layout with desktop, tablet, and mobile support

  Phase 10, TASK 67: App.vue layout and adaptive design
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDeviceType } from './composables/useDeviceType'
import { useCubeEditor } from './composables/useCubeEditor'
import { useDevModeKeyboard } from './lib/devmode'
import { useAuthStore } from './lib/auth'
import Gallery from './components/Gallery.vue'
import ExportPanel from './components/ExportPanel.vue'
import CubePreview from './components/CubePreview.vue'
import UnifiedEditor from './components/UnifiedEditor.vue'
import ActionHistory from './components/ActionHistory.vue'
import PromptGenerator from './components/PromptGenerator.vue'
import GodModeWindow from './components/GodModeWindow.vue'
import ComponentInfo from './components/ComponentInfo.vue'
import DevModeIndicator from './components/DevModeIndicator.vue'
import './App.css'

// Device type detection
const { isTablet, isDesktop } = useDeviceType()

// Cube editor state
const { currentCube, updateCube, selectCube, loadCube } = useCubeEditor()

// DevMode keyboard shortcut (Ctrl+Shift+D)
useDevModeKeyboard()

// Auth store initialization
const authStore = useAuthStore()
onMounted(() => {
  authStore.initialize()
})

// Mobile tab navigation
type MobileTab = 'gallery' | 'preview' | 'editor' | 'tools'

const activeMobileTab = ref<MobileTab>('gallery')

const mobileTabs: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'gallery', icon: '🎨', label: 'Gallery' },
  { id: 'preview', icon: '👁', label: 'Preview' },
  { id: 'editor', icon: '✏️', label: 'Editor' },
  { id: 'tools', icon: '🔧', label: 'Tools' },
]

// Touch swipe navigation for mobile
const touchStartX = ref(0)
const touchEndX = ref(0)
const SWIPE_THRESHOLD = 50

function handleTouchStart(e: TouchEvent) {
  touchStartX.value = e.changedTouches[0].screenX
}

function handleTouchEnd(e: TouchEvent) {
  touchEndX.value = e.changedTouches[0].screenX
  handleSwipe()
}

function handleSwipe() {
  const diff = touchStartX.value - touchEndX.value
  if (Math.abs(diff) < SWIPE_THRESHOLD) return

  const tabIds = mobileTabs.map((t) => t.id)
  const currentIndex = tabIds.indexOf(activeMobileTab.value)

  if (diff > 0 && currentIndex < tabIds.length - 1) {
    // Swipe left → next tab
    activeMobileTab.value = tabIds[currentIndex + 1]
  } else if (diff < 0 && currentIndex > 0) {
    // Swipe right → previous tab
    activeMobileTab.value = tabIds[currentIndex - 1]
  }
}

// Component metadata for DevMode
const APP_META = {
  id: 'app',
  name: 'App',
  version: '2.0.0',
  summary: 'Root application component with adaptive layout.',
  description:
    'App is the root component of isocubic. It provides adaptive layout for desktop, tablet, and ' +
    'mobile devices, integrates all subsystems (Gallery, Editor, Preview, Export, GOD MODE), and ' +
    'manages the global cube editing state through the useCubeEditor composable.',
  phase: 10,
  taskId: 'TASK 67',
  filePath: 'src/App.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-01-29T18:00:00Z',
      description: 'Initial Vue.js 3.0 stub during TASK 60',
      taskId: 'TASK 60',
      type: 'created' as const,
    },
    {
      version: '2.0.0',
      date: '2026-01-31T18:00:00Z',
      description: 'Full adaptive layout with all component integrations',
      taskId: 'TASK 67',
      type: 'updated' as const,
    },
  ],
  features: [
    {
      id: 'adaptive-layout',
      name: 'Adaptive Layout',
      description: 'Desktop, tablet, and mobile layouts with automatic switching',
      enabled: true,
      taskId: 'TASK 67',
    },
    {
      id: 'mobile-swipe',
      name: 'Touch Swipe Navigation',
      description: 'Swipe between tabs on mobile devices',
      enabled: true,
      taskId: 'TASK 67',
    },
    {
      id: 'cube-state-management',
      name: 'Cube State Management',
      description: 'Centralized cube state with undo/redo and autosave',
      enabled: true,
      taskId: 'TASK 67',
    },
  ],
  dependencies: [
    {
      name: 'Gallery',
      type: 'component',
      path: 'components/Gallery.vue',
      purpose: 'Cube gallery with presets and user cubes',
    },
    {
      name: 'ExportPanel',
      type: 'component',
      path: 'components/ExportPanel.vue',
      purpose: 'Export/import and undo/redo controls',
    },
    {
      name: 'CubePreview',
      type: 'component',
      path: 'components/CubePreview.vue',
      purpose: '3D cube preview with TresJS',
    },
    {
      name: 'UnifiedEditor',
      type: 'component',
      path: 'components/UnifiedEditor.vue',
      purpose: 'Main tabbed parameter editor',
    },
    {
      name: 'PromptGenerator',
      type: 'component',
      path: 'components/PromptGenerator.vue',
      purpose: 'AI-based cube generation',
    },
    {
      name: 'GodModeWindow',
      type: 'component',
      path: 'components/GodModeWindow.vue',
      purpose: 'GOD MODE developer tools',
    },
    {
      name: 'useDeviceType',
      type: 'hook',
      path: 'composables/useDeviceType.ts',
      purpose: 'Reactive device type detection',
    },
    {
      name: 'useCubeEditor',
      type: 'hook',
      path: 'composables/useCubeEditor.ts',
      purpose: 'Centralized cube editing state',
    },
  ],
  relatedFiles: [
    { path: 'src/App.css', type: 'style', description: 'Styles for all layout variants' },
    {
      path: 'src/composables/useDeviceType.ts',
      type: 'util',
      description: 'Device type composable',
    },
    {
      path: 'src/composables/useCubeEditor.ts',
      type: 'util',
      description: 'Cube editor composable',
    },
  ],
  props: [],
  tags: ['app', 'layout', 'responsive', 'root'],
  status: 'stable' as const,
  lastUpdated: '2026-01-31T18:00:00Z',
}
</script>

<template>
  <!-- Desktop Layout -->
  <div v-if="isDesktop" class="app app--desktop">
    <header class="app__header">
      <h1>isocubic</h1>
      <p>Web editor for parametric cubes</p>
    </header>

    <main class="app__main">
      <!-- Gallery sidebar -->
      <section class="app__section app__section--sidebar">
        <Gallery :current-cube="currentCube" @cube-select="selectCube" />
      </section>

      <!-- Main content: preview + editor -->
      <section class="app__section app__section--main">
        <div class="app__current-cube">
          <h3 class="app__section-title">Preview</h3>
          <div class="app__3d-preview app__3d-preview--desktop">
            <CubePreview :config="currentCube" data-testid="cube-preview" />
          </div>
        </div>

        <PromptGenerator
          @cube-generated="selectCube"
          @cubes-generated="(cubes) => cubes.length > 0 && selectCube(cubes[0])"
        />

        <UnifiedEditor :cube="currentCube" @update:cube="updateCube" />
      </section>

      <!-- Tools sidebar -->
      <section class="app__section app__section--sidebar">
        <ExportPanel :current-cube="currentCube" @cube-load="loadCube" @cube-change="updateCube" />

        <ActionHistory :actions="[]" />
      </section>
    </main>

    <GodModeWindow />
    <ComponentInfo :meta="APP_META" />
    <DevModeIndicator />
  </div>

  <!-- Tablet Layout -->
  <div v-else-if="isTablet" class="app app--tablet">
    <header class="app__header">
      <h1>isocubic</h1>
      <p>Web editor for parametric cubes</p>
    </header>

    <main class="app__main app__main--tablet">
      <!-- Preview on top -->
      <div class="app__preview-section">
        <div class="app__3d-preview app__3d-preview--tablet">
          <CubePreview :config="currentCube" data-testid="cube-preview" />
        </div>
      </div>

      <!-- Panels below -->
      <div class="app__tablet-panels">
        <section class="app__section">
          <Gallery :current-cube="currentCube" @cube-select="selectCube" />
        </section>

        <section class="app__section app__section--sidebar">
          <UnifiedEditor :cube="currentCube" @update:cube="updateCube" />

          <PromptGenerator
            @cube-generated="selectCube"
            @cubes-generated="(cubes) => cubes.length > 0 && selectCube(cubes[0])"
          />

          <ExportPanel
            :current-cube="currentCube"
            @cube-load="loadCube"
            @cube-change="updateCube"
          />
        </section>
      </div>
    </main>

    <GodModeWindow />
    <DevModeIndicator />
  </div>

  <!-- Mobile Layout -->
  <div v-else class="app app--mobile" @touchstart="handleTouchStart" @touchend="handleTouchEnd">
    <header class="app__header app__header--mobile">
      <h1>isocubic</h1>
    </header>

    <!-- Tab Navigation -->
    <nav class="app__mobile-nav">
      <button
        v-for="tab in mobileTabs"
        :key="tab.id"
        class="app__mobile-tab"
        :class="{ 'app__mobile-tab--active': activeMobileTab === tab.id }"
        :aria-label="tab.label"
        @click="activeMobileTab = tab.id"
      >
        <span class="app__mobile-tab-icon">{{ tab.icon }}</span>
        <span class="app__mobile-tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Mobile Content -->
    <div class="app__mobile-content">
      <!-- Gallery Tab -->
      <div v-if="activeMobileTab === 'gallery'" class="app__mobile-panel">
        <Gallery :current-cube="currentCube" @cube-select="selectCube" />
      </div>

      <!-- Preview Tab -->
      <div
        v-if="activeMobileTab === 'preview'"
        class="app__mobile-panel app__mobile-panel--preview"
      >
        <div class="app__current-cube app__current-cube--mobile">
          <div class="app__3d-preview app__3d-preview--mobile">
            <CubePreview :config="currentCube" data-testid="cube-preview" />
          </div>
          <div class="app__cube-info">
            <p>
              <strong>{{
                currentCube?.meta?.name || currentCube?.id || 'No cube selected'
              }}</strong>
            </p>
            <p v-if="currentCube?.prompt">{{ currentCube.prompt }}</p>
          </div>
        </div>
      </div>

      <!-- Editor Tab -->
      <div v-if="activeMobileTab === 'editor'" class="app__mobile-panel">
        <UnifiedEditor :cube="currentCube" @update:cube="updateCube" />

        <PromptGenerator
          @cube-generated="selectCube"
          @cubes-generated="(cubes) => cubes.length > 0 && selectCube(cubes[0])"
        />
      </div>

      <!-- Tools Tab -->
      <div v-if="activeMobileTab === 'tools'" class="app__mobile-panel">
        <ExportPanel :current-cube="currentCube" @cube-load="loadCube" @cube-change="updateCube" />

        <ActionHistory :actions="[]" />
      </div>
    </div>

    <!-- Swipe Indicator -->
    <div class="app__swipe-indicator">
      <span>Swipe to navigate</span>
    </div>

    <DevModeIndicator />
  </div>
</template>
