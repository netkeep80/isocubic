<!--
  NotificationPanelWindow.vue — Window wrapper for NotificationPanel component
  Phase 11, TASK 74: Window wrapper components
-->
<script setup lang="ts">
import NotificationPanel from '../NotificationPanel.vue'
import { NOTIFICATION_PANEL_META } from '../NotificationPanel.vue'
import ComponentInfo from '../ComponentInfo.vue'
</script>

<template>
  <ComponentInfo :meta="NOTIFICATION_PANEL_META">
    <NotificationPanel />
  </ComponentInfo>
</template>
