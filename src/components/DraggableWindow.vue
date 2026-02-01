<!--
  DraggableWindow.vue — Draggable, resizable window component
  Supports drag by title bar, resize by corner handle, minimize, close, z-order

  Phase 11: New user interface with window manager
-->
<script lang="ts">
// Component metadata for DevMode (exported from non-setup script block)
export const DRAGGABLE_WINDOW_META = {
  id: 'draggable-window',
  name: 'DraggableWindow',
  version: '1.0.0',
  summary: 'Draggable, resizable window component with minimize and close.',
  description:
    'DraggableWindow provides a desktop-style window container that can be dragged by its title bar, ' +
    'resized by the corner handle, minimized to the taskbar, collapsed to show only the title bar, ' +
    'and closed. Supports z-order management via focus events.',
  phase: 11,
  taskId: 'TASK 68',
  filePath: 'src/components/DraggableWindow.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-02-01T12:00:00Z',
      description: 'Initial implementation of draggable window component',
      taskId: 'TASK 68',
      type: 'created' as const,
    },
  ],
  features: [
    {
      id: 'drag',
      name: 'Window Dragging',
      description: 'Drag window by title bar',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'resize',
      name: 'Window Resizing',
      description: 'Resize window by corner handle',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'minimize',
      name: 'Window Minimize',
      description: 'Minimize window to taskbar',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'collapse',
      name: 'Window Collapse',
      description: 'Collapse to title bar only',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'z-order',
      name: 'Z-Order Management',
      description: 'Click to bring window to front',
      enabled: true,
      taskId: 'TASK 68',
    },
  ],
  dependencies: [],
  props: [
    { name: 'windowId', type: 'string', description: 'Unique window identifier' },
    { name: 'title', type: 'string', description: 'Window title' },
    { name: 'icon', type: 'string', description: 'Window icon emoji' },
    { name: 'x', type: 'number', description: 'Window X position' },
    { name: 'y', type: 'number', description: 'Window Y position' },
    { name: 'width', type: 'number', description: 'Window width' },
    { name: 'height', type: 'number', description: 'Window height' },
    { name: 'zIndex', type: 'number', description: 'Z-index for stacking order' },
  ],
  tags: ['window', 'draggable', 'resizable', 'ui'],
  status: 'stable' as const,
  lastUpdated: '2026-02-01T12:00:00Z',
}
</script>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    windowId: string
    title: string
    icon: string
    x: number
    y: number
    width: number
    height: number
    minWidth?: number
    minHeight?: number
    zIndex: number
  }>(),
  {
    minWidth: 200,
    minHeight: 150,
  }
)

const emit = defineEmits<{
  move: [id: string, x: number, y: number]
  resize: [id: string, width: number, height: number]
  minimize: [id: string]
  close: [id: string]
  focus: [id: string]
}>()

// Drag state
const isDragging = ref(false)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)

// Resize state
const isResizing = ref(false)
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartW = ref(0)
const resizeStartH = ref(0)

// Collapse state (content hidden but window still visible)
const isCollapsed = ref(false)

const windowStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`,
  width: `${props.width}px`,
  height: isCollapsed.value ? 'auto' : `${props.height}px`,
  zIndex: props.zIndex,
}))

// --- Drag handlers ---
function onDragStart(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('.dw__btn')) return
  isDragging.value = true
  dragOffsetX.value = e.clientX - props.x
  dragOffsetY.value = e.clientY - props.y
  emit('focus', props.windowId)
  e.preventDefault()
}

function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  const newX = e.clientX - dragOffsetX.value
  const newY = e.clientY - dragOffsetY.value
  emit('move', props.windowId, newX, newY)
}

function onDragEnd() {
  isDragging.value = false
}

// --- Resize handlers ---
function onResizeStart(e: MouseEvent) {
  isResizing.value = true
  resizeStartX.value = e.clientX
  resizeStartY.value = e.clientY
  resizeStartW.value = props.width
  resizeStartH.value = props.height
  emit('focus', props.windowId)
  e.preventDefault()
  e.stopPropagation()
}

function onResizeMove(e: MouseEvent) {
  if (!isResizing.value) return
  const dx = e.clientX - resizeStartX.value
  const dy = e.clientY - resizeStartY.value
  const newW = Math.max(props.minWidth, resizeStartW.value + dx)
  const newH = Math.max(props.minHeight, resizeStartH.value + dy)
  emit('resize', props.windowId, newW, newH)
}

function onResizeEnd() {
  isResizing.value = false
}

// --- Global mouse listeners ---
function onGlobalMouseMove(e: MouseEvent) {
  if (isDragging.value) onDragMove(e)
  if (isResizing.value) onResizeMove(e)
}

function onGlobalMouseUp() {
  if (isDragging.value) onDragEnd()
  if (isResizing.value) onResizeEnd()
}

onMounted(() => {
  document.addEventListener('mousemove', onGlobalMouseMove)
  document.addEventListener('mouseup', onGlobalMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onGlobalMouseMove)
  document.removeEventListener('mouseup', onGlobalMouseUp)
})

function onWindowClick() {
  emit('focus', props.windowId)
}

function onMinimize() {
  emit('minimize', props.windowId)
}

function onClose() {
  emit('close', props.windowId)
}

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}
</script>

<template>
  <div
    class="dw"
    :class="{ 'dw--dragging': isDragging, 'dw--resizing': isResizing }"
    :style="windowStyle"
    :data-window-id="windowId"
    @mousedown="onWindowClick"
  >
    <!-- Title bar -->
    <div class="dw__titlebar" @mousedown="onDragStart">
      <span class="dw__icon">{{ icon }}</span>
      <span class="dw__title">{{ title }}</span>
      <div class="dw__controls">
        <button
          class="dw__btn dw__btn--collapse"
          :aria-label="isCollapsed ? 'Expand' : 'Collapse'"
          :title="isCollapsed ? 'Expand' : 'Collapse'"
          @click.stop="toggleCollapse"
        >
          {{ isCollapsed ? '+' : '\u2013' }}
        </button>
        <button
          class="dw__btn dw__btn--minimize"
          aria-label="Minimize"
          title="Minimize"
          @click.stop="onMinimize"
        >
          _
        </button>
        <button
          class="dw__btn dw__btn--close"
          aria-label="Close"
          title="Close"
          @click.stop="onClose"
        >
          &times;
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-show="!isCollapsed" class="dw__content">
      <slot />
    </div>

    <!-- Resize handle -->
    <div v-show="!isCollapsed" class="dw__resize-handle" @mousedown="onResizeStart" />
  </div>
</template>

<style scoped>
.dw {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: #1e1e2e;
  border: 1px solid #3a3a5a;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  user-select: none;
}

.dw--dragging,
.dw--resizing {
  opacity: 0.9;
  transition: none;
}

.dw__titlebar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #2a2a3e;
  cursor: grab;
  flex-shrink: 0;
  border-bottom: 1px solid #3a3a5a;
}

.dw--dragging .dw__titlebar {
  cursor: grabbing;
}

.dw__icon {
  font-size: 14px;
  flex-shrink: 0;
}

.dw__title {
  font-size: 13px;
  font-weight: 600;
  color: #e0e0f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.dw__controls {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.dw__btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #aaa;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.dw__btn:hover {
  background: #444;
  color: #fff;
}

.dw__btn--close:hover {
  background: #e53935;
  color: #fff;
}

.dw__content {
  flex: 1;
  overflow: auto;
  padding: 8px;
  min-height: 0;
}

.dw__resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, #555 50%);
  border-radius: 0 0 8px 0;
  opacity: 0.6;
}

.dw__resize-handle:hover {
  opacity: 1;
}
</style>
