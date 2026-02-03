<!--
  MetaModeIndicator.vue — Fixed-position toggle button for MetaMode
  Shows current MetaMode state (ON/OFF) and allows toggling with a click.

  Phase 10: Migrated from React DevModeIndicator (ComponentInfo.tsx) to Vue 3 SFC
  Phase 12: Renamed from DevModeIndicator to MetaModeIndicator (TASK 72)
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useMetaModeStore } from '../lib/metamode-store'

const store = useMetaModeStore()

const isEnabled = computed(() => store.settings.enabled)

function toggle() {
  store.toggleMetaMode()
}
</script>

<template>
  <button
    type="button"
    class="metamode-indicator"
    :class="{ 'metamode-indicator--active': isEnabled }"
    :aria-label="isEnabled ? 'Disable MetaMode' : 'Enable MetaMode'"
    title="Toggle MetaMode (Ctrl+Shift+M)"
    @click="toggle"
  >
    <span class="metamode-indicator__icon">{{ isEnabled ? '🔧' : '👁️' }}</span>
    <span class="metamode-indicator__label">MetaMode {{ isEnabled ? 'ON' : 'OFF' }}</span>
  </button>
</template>

<style scoped>
.metamode-indicator {
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

.metamode-indicator--active {
  background-color: rgba(59, 130, 246, 0.9);
}

.metamode-indicator:hover {
  opacity: 0.9;
}
</style>
