<!--
  ExportPanelWindow.vue — Window wrapper for ExportPanel component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import ExportPanel from '../ExportPanel.vue'
import { EXPORT_PANEL_META } from '../ExportPanel.vue'
import ComponentInfo from '../ComponentInfo.vue'
import type { CubeConfig } from '../../types/cube'

defineProps<{
  currentCube?: CubeConfig | null
}>()

const emit = defineEmits<{
  cubeLoad: [cube: CubeConfig]
  cubeChange: [cube: CubeConfig]
}>()

function handleCubeLoad(cube: CubeConfig) {
  emit('cubeLoad', cube)
}

function handleCubeChange(cube: CubeConfig) {
  emit('cubeChange', cube)
}
</script>

<template>
  <ComponentInfo :meta="EXPORT_PANEL_META">
    <ExportPanel
      :current-cube="currentCube"
      @cube-load="handleCubeLoad"
      @cube-change="handleCubeChange"
    />
  </ComponentInfo>
</template>
