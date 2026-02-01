<!--
  GalleryWindow.vue — Window wrapper for Gallery component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import Gallery from '../Gallery.vue'
import { GALLERY_META } from '../Gallery.vue'
import ComponentInfo from '../ComponentInfo.vue'
import type { CubeConfig } from '../../types/cube'

defineProps<{
  currentCube?: CubeConfig | null
}>()

const emit = defineEmits<{
  cubeSelect: [cube: CubeConfig]
}>()

function handleCubeSelect(cube: CubeConfig) {
  emit('cubeSelect', cube)
}
</script>

<template>
  <ComponentInfo :meta="GALLERY_META">
    <Gallery :current-cube="currentCube" @cube-select="handleCubeSelect" />
  </ComponentInfo>
</template>