<!--
  CommunityGalleryWindow.vue — Window wrapper for CommunityGallery component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import CommunityGallery from '../CommunityGallery.vue'
import { COMMUNITY_GALLERY_META } from '../CommunityGallery.vue'
import ComponentInfo from '../ComponentInfo.vue'
import type { CubeConfig } from '../../types/cube'

const emit = defineEmits<{
  cubeSelect: [cube: CubeConfig]
}>()

function handleCubeSelect(cube: CubeConfig) {
  emit('cubeSelect', cube)
}
</script>

<template>
  <ComponentInfo :meta="COMMUNITY_GALLERY_META">
    <CommunityGallery @cube-select="handleCubeSelect" />
  </ComponentInfo>
</template>