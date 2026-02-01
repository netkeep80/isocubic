<!--
  WindowTaskbar.vue — Taskbar for minimized and closed windows
  Shows minimized windows as clickable chips, plus a menu for reopening closed windows

  Phase 11: New user interface with window manager
-->
<script lang="ts">
// Component metadata for DevMode (exported from non-setup script block)
export const WINDOW_TASKBAR_META = {
  id: 'window-taskbar',
  name: 'WindowTaskbar',
  version: '1.0.0',
  summary: 'Taskbar for managing minimized and closed windows.',
  description:
    'WindowTaskbar displays minimized windows as clickable chips at the bottom of the screen. ' +
    'It also provides access to closed windows for reopening and a reset layout button.',
  phase: 11,
  taskId: 'TASK 68',
  filePath: 'src/components/WindowTaskbar.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-02-01T12:00:00Z',
      description: 'Initial implementation of window taskbar',
      taskId: 'TASK 68',
      type: 'created' as const,
    },
  ],
  features: [
    {
      id: 'minimized-chips',
      name: 'Minimized Window Chips',
      description: 'Click to restore minimized windows',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'closed-menu',
      name: 'Closed Windows Menu',
      description: 'Reopen previously closed windows',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'reset-layout',
      name: 'Reset Layout',
      description: 'Reset all windows to default positions',
      enabled: true,
      taskId: 'TASK 68',
    },
  ],
  dependencies: [
    {
      name: 'useWindowManager',
      type: 'hook',
      path: 'composables/useWindowManager.ts',
      purpose: 'Window state management',
    },
  ],
  props: [
    {
      name: 'minimizedWindows',
      type: 'WindowState[]',
      description: 'Currently minimized windows',
    },
    {
      name: 'closedWindows',
      type: 'WindowState[]',
      description: 'Currently closed windows',
    },
  ],
  tags: ['taskbar', 'window-manager', 'ui'],
  status: 'stable' as const,
  lastUpdated: '2026-02-01T12:00:00Z',
}
</script>

<script setup lang="ts">
import type { WindowState } from '../composables/useWindowManager'

defineProps<{
  minimizedWindows: WindowState[]
  closedWindows: WindowState[]
}>()

const emit = defineEmits<{
  restore: [id: string]
  open: [id: string]
  resetLayout: []
}>()
</script>

<template>
  <div data-testid="window-taskbar" class="taskbar">
    <!-- Minimized windows -->
    <div class="taskbar__minimized">
      <button
        v-for="win in minimizedWindows"
        :key="win.id"
        class="taskbar__chip"
        :title="`Restore ${win.title}`"
        @click="emit('restore', win.id)"
      >
        <span class="taskbar__chip-icon">{{ win.icon }}</span>
        <span class="taskbar__chip-label">{{ win.title }}</span>
      </button>
    </div>

    <!-- Closed windows (reopenable) -->
    <div v-if="closedWindows.length > 0" class="taskbar__closed">
      <span class="taskbar__closed-label">Closed:</span>
      <button
        v-for="win in closedWindows"
        :key="win.id"
        class="taskbar__chip taskbar__chip--closed"
        :title="`Open ${win.title}`"
        @click="emit('open', win.id)"
      >
        <span class="taskbar__chip-icon">{{ win.icon }}</span>
        <span class="taskbar__chip-label">{{ win.title }}</span>
      </button>
    </div>

    <!-- Reset button -->
    <button class="taskbar__reset" title="Reset window layout" @click="emit('resetLayout')">
      Reset Layout
    </button>
  </div>
</template>

<style scoped>
.taskbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #1a1a2e;
  border-top: 1px solid #3a3a5a;
  min-height: 40px;
  flex-wrap: wrap;
}

.taskbar__minimized,
.taskbar__closed {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.taskbar__closed-label {
  font-size: 11px;
  color: #666;
  margin-right: 4px;
}

.taskbar__chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #2a2a3e;
  border: 1px solid #3a3a5a;
  border-radius: 6px;
  color: #ccc;
  font-size: 12px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.taskbar__chip:hover {
  background: #3a3a5a;
  border-color: #646cff;
}

.taskbar__chip--closed {
  opacity: 0.7;
}

.taskbar__chip--closed:hover {
  opacity: 1;
}

.taskbar__chip-icon {
  font-size: 14px;
}

.taskbar__chip-label {
  white-space: nowrap;
}

.taskbar__reset {
  margin-left: auto;
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #444;
  border-radius: 6px;
  color: #888;
  font-size: 11px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.taskbar__reset:hover {
  background: #333;
  color: #ccc;
}
</style>
