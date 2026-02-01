<!--
  UnifiedEditorWindow.vue — Window wrapper for UnifiedEditor component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import UnifiedEditor from '../UnifiedEditor.vue'
import { UNIFIED_EDITOR_META } from '../UnifiedEditor.vue'
import ComponentInfo from '../ComponentInfo.vue'
import type { CubeConfig } from '../../types/cube'

defineProps<{
  cube: CubeConfig | null
}>()

const emit = defineEmits<{
  'update:cube': [cube: CubeConfig]
}>()

function handleCubeUpdate(cube: CubeConfig) {
  emit('update:cube', cube)
}
</script>

<template>
  <ComponentInfo :meta="UNIFIED_EDITOR_META">
    <UnifiedEditor :cube="cube" @update:cube="handleCubeUpdate" />
  </ComponentInfo>
</template>