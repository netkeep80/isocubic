<!--
  ActionHistoryWindow.vue — Window wrapper for ActionHistory component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import ActionHistory from '../ActionHistory.vue'
import type { Action } from '../../types/action'

defineProps<{
  actions: Action[]
}>()
</script>

<template>
  <ActionHistory :actions="actions" />
</template>
