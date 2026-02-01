<!--
  CubePreviewWindow.vue — Window wrapper for CubePreview component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import CubePreview from '../CubePreview.vue'
import { CUBE_PREVIEW_META } from '../CubePreview.vue'
import ComponentInfo from '../ComponentInfo.vue'
import type { CubeConfig } from '../../types/cube'

defineProps<{
  config: CubeConfig | null
}>()
</script>

<template>
  <ComponentInfo :meta="CUBE_PREVIEW_META">
    <div class="cube-preview-window">
      <CubePreview :config="config" data-testid="cube-preview" />
    </div>
  </ComponentInfo>
</template>

<style scoped>
.cube-preview-window {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
