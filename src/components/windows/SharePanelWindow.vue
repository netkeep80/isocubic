<!--
  SharePanelWindow.vue — Window wrapper for SharePanel component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import SharePanel from '../SharePanel.vue'
import { SHARE_PANEL_META } from '../SharePanel.vue'
import ComponentInfo from '../ComponentInfo.vue'
import type { CubeConfig } from '../../types/cube'

defineProps<{
  cube: CubeConfig | null
}>()
</script>

<template>
  <ComponentInfo :meta="SHARE_PANEL_META">
    <SharePanel :current-cube="cube" />
  </ComponentInfo>
</template>
