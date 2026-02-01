<!--
  CommandBar.vue — TinyLLM command bar for searching and opening windows
  Located at the top of the main window, allows quick access to components and actions

  Phase 11: New user interface with window manager
-->
<script lang="ts">
/** Command item for command bar results */
export interface CommandItem {
  id: string
  label: string
  icon: string
  description: string
  category: 'window' | 'action'
}

// Component metadata for DevMode (exported from non-setup script block)
export const COMMAND_BAR_META = {
  id: 'command-bar',
  name: 'CommandBar',
  version: '1.0.0',
  summary: 'TinyLLM command bar for searching and opening windows.',
  description:
    'CommandBar provides a command palette-style search bar at the top of the application. ' +
    'Users can search for and open component windows, execute actions like generating cubes or exporting, ' +
    'and quickly navigate the application. Activated by clicking or pressing Ctrl+K.',
  phase: 11,
  taskId: 'TASK 68',
  filePath: 'src/components/CommandBar.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-02-01T12:00:00Z',
      description: 'Initial implementation of command bar',
      taskId: 'TASK 68',
      type: 'created' as const,
    },
  ],
  features: [
    {
      id: 'search',
      name: 'Fuzzy Search',
      description: 'Filter commands by label, description, or id',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'keyboard',
      name: 'Keyboard Navigation',
      description: 'Arrow keys, Enter, Escape for navigation',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'hotkey',
      name: 'Ctrl+K Hotkey',
      description: 'Global keyboard shortcut to open command bar',
      enabled: true,
      taskId: 'TASK 68',
    },
  ],
  dependencies: [],
  props: [
    {
      name: 'commands',
      type: 'CommandItem[]',
      description: 'Available commands to search through',
    },
  ],
  tags: ['command-bar', 'search', 'tinyLLM', 'ui'],
  status: 'stable' as const,
  lastUpdated: '2026-02-01T12:00:00Z',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  commands: CommandItem[]
}>()

const emit = defineEmits<{
  execute: [commandId: string]
}>()

const query = ref('')
const isOpen = ref(false)
const selectedIndex = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const filteredCommands = computed(() => {
  if (!query.value.trim()) return props.commands
  const q = query.value.toLowerCase()
  return props.commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.id.toLowerCase().includes(q)
  )
})

function openBar() {
  isOpen.value = true
  selectedIndex.value = 0
  query.value = ''
  setTimeout(() => inputRef.value?.focus(), 50)
}

function closeBar() {
  isOpen.value = false
  query.value = ''
}

function executeCommand(id: string) {
  emit('execute', id)
  closeBar()
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, filteredCommands.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const cmd = filteredCommands.value[selectedIndex.value]
    if (cmd) executeCommand(cmd.id)
  } else if (e.key === 'Escape') {
    closeBar()
  }
}

function onGlobalKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    if (isOpen.value) {
      closeBar()
    } else {
      openBar()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
  <div class="cb">
    <!-- Trigger button (always visible) -->
    <button data-testid="command-bar-trigger" class="cb__trigger" @click="openBar">
      <span class="cb__trigger-icon">&#128269;</span>
      <span class="cb__trigger-text">Search or run a command...</span>
      <kbd class="cb__trigger-kbd">Ctrl+K</kbd>
    </button>

    <!-- Modal overlay -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        data-testid="command-bar-overlay"
        class="cb__overlay"
        @click.self="closeBar"
      >
        <div class="cb__modal">
          <div class="cb__input-row">
            <span class="cb__input-icon">&#128269;</span>
            <input
              ref="inputRef"
              v-model="query"
              data-testid="command-bar-input"
              class="cb__input"
              type="text"
              placeholder="Type a command or search..."
              @keydown="onKeyDown"
            />
          </div>

          <div data-testid="command-bar-results" class="cb__results">
            <div
              v-for="(cmd, index) in filteredCommands"
              :key="cmd.id"
              class="cb__item"
              :class="{ 'cb__item--selected': index === selectedIndex }"
              @click="executeCommand(cmd.id)"
              @mouseenter="selectedIndex = index"
            >
              <span class="cb__item-icon">{{ cmd.icon }}</span>
              <div class="cb__item-text">
                <span class="cb__item-label">{{ cmd.label }}</span>
                <span class="cb__item-desc">{{ cmd.description }}</span>
              </div>
              <span class="cb__item-category">{{ cmd.category }}</span>
            </div>

            <div v-if="filteredCommands.length === 0" class="cb__empty">No commands found</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cb__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 8px 16px;
  background: #2a2a3e;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.cb__trigger:hover {
  border-color: #646cff;
  background: #2e2e42;
}

.cb__trigger-icon {
  font-size: 16px;
}

.cb__trigger-text {
  flex: 1;
  text-align: left;
}

.cb__trigger-kbd {
  font-size: 11px;
  padding: 2px 6px;
  background: #1a1a2e;
  border: 1px solid #444;
  border-radius: 4px;
  color: #aaa;
}

.cb__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  z-index: 10000;
}

.cb__modal {
  width: 560px;
  max-height: 400px;
  background: #1e1e2e;
  border: 1px solid #3a3a5a;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cb__input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #3a3a5a;
}

.cb__input-icon {
  font-size: 18px;
  color: #888;
}

.cb__input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 16px;
  color: #e0e0f0;
}

.cb__input::placeholder {
  color: #666;
}

.cb__results {
  overflow-y: auto;
  max-height: 320px;
  padding: 4px 0;
}

.cb__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.1s;
}

.cb__item--selected {
  background: #2a2a4e;
}

.cb__item-icon {
  font-size: 18px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}

.cb__item-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.cb__item-label {
  font-size: 14px;
  color: #e0e0f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cb__item-desc {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cb__item-category {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  flex-shrink: 0;
}

.cb__empty {
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>
