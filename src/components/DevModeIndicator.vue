<!--
  DevModeIndicator.vue — Fixed-position toggle button for Developer Mode
  Shows current DevMode state (ON/OFF) and allows toggling with a click.

  Phase 10: Migrated from React DevModeIndicator (ComponentInfo.tsx) to Vue 3 SFC
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useDevModeStore } from '../lib/devmode'

const store = useDevModeStore()

const isEnabled = computed(() => store.settings.enabled)

function toggle() {
  store.toggleDevMode()
}
</script>

<template>
  <button
    type="button"
    class="devmode-indicator"
    :class="{ 'devmode-indicator--active': isEnabled }"
    :aria-label="isEnabled ? 'Disable Developer Mode' : 'Enable Developer Mode'"
    title="Toggle Developer Mode (Ctrl+Shift+D)"
    @click="toggle"
  >
    <span class="devmode-indicator__icon">{{ isEnabled ? '🔧' : '👁️' }}</span>
    <span class="devmode-indicator__label">DevMode {{ isEnabled ? 'ON' : 'OFF' }}</span>
  </button>
</template>

<style scoped>
.devmode-indicator {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 10000;
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background-color: rgba(75, 85, 99, 0.9);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: background-color 0.2s;
}

.devmode-indicator--active {
  background-color: rgba(59, 130, 246, 0.9);
}

.devmode-indicator:hover {
  opacity: 0.9;
}
</style>
