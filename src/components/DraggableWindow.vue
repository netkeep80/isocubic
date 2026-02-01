<!--
  DraggableWindow.vue — Draggable, resizable window component
  Supports drag by title bar, resize by corner handle, minimize, close, z-order
  Touch-optimized for tablet/mobile devices (TASK 75)

  Phase 11: New user interface with window manager
-->
<script lang="ts">
// Component metadata for DevMode (exported from non-setup script block)
export const DRAGGABLE_WINDOW_META = {
  id: 'draggable-window',
  name: 'DraggableWindow',
  version: '1.1.0',
  summary: 'Draggable, resizable window component with minimize and close.',
  description:
    'DraggableWindow provides a desktop-style window container that can be dragged by its title bar, ' +
    'resized by the corner handle, minimized to the taskbar, collapsed to show only the title bar, ' +
    'and closed. Supports z-order management via focus events. Touch-optimized for tablet devices.',
  phase: 11,
  taskId: 'TASK 75',
  filePath: 'src/components/DraggableWindow.vue',
  history: [
    {
      version: '1.0.0',
      date: '2026-02-01T12:00:00Z',
      description: 'Initial implementation of draggable window component',
      taskId: 'TASK 68',
      type: 'created' as const,
    },
    {
      version: '1.1.0',
      date: '2026-02-01T18:00:00Z',
      description: 'Added touch support for tablet/mobile devices',
      taskId: 'TASK 75',
      type: 'updated' as const,
    },
  ],
  features: [
    {
      id: 'drag',
      name: 'Window Dragging',
      description: 'Drag window by title bar (mouse and touch)',
      enabled: true,
      taskId: 'TASK 68',
    },
    {
      id: 'resize',
      name: 'Window Resizing',
      description: 'Resize window by corner handle (mouse and touch)',
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
    {
      id: 'touch',
      name: 'Touch Support',
      description: 'Touch drag and resize for tablet/mobile',
      enabled: true,
      taskId: 'TASK 75',
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
  tags: ['window', 'draggable', 'resizable', 'ui', 'touch'],
  status: 'stable' as const,
  lastUpdated: '2026-02-01T18:00:00Z',
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

// --- Unified pointer helpers ---
function getClientXY(e: MouseEvent | TouchEvent): { clientX: number; clientY: number } {
  if ('touches' in e) {
    const touch = e.touches[0] || (e as TouchEvent).changedTouches[0]
    return { clientX: touch.clientX, clientY: touch.clientY }
  }
  return { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY }
}

/** Get scroll offset of the parent workspace container */
function getParentScroll(el: HTMLElement | null): { scrollLeft: number; scrollTop: number } {
  const parent = el?.parentElement
  if (parent) {
    return { scrollLeft: parent.scrollLeft, scrollTop: parent.scrollTop }
  }
  return { scrollLeft: 0, scrollTop: 0 }
}

// Reference to the window DOM element
const windowEl = ref<HTMLElement | null>(null)

// --- Drag handlers ---
function onDragStart(e: MouseEvent | TouchEvent) {
  if ((e.target as HTMLElement).closest('.dw__btn')) return
  isDragging.value = true
  const { clientX, clientY } = getClientXY(e)
  const scroll = getParentScroll(windowEl.value)
  dragOffsetX.value = clientX + scroll.scrollLeft - props.x
  dragOffsetY.value = clientY + scroll.scrollTop - props.y
  emit('focus', props.windowId)
  if ('preventDefault' in e && !('touches' in e)) e.preventDefault()
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  const { clientX, clientY } = getClientXY(e)
  const scroll = getParentScroll(windowEl.value)
  const newX = clientX + scroll.scrollLeft - dragOffsetX.value
  const newY = clientY + scroll.scrollTop - dragOffsetY.value
  emit('move', props.windowId, newX, newY)
}

function onDragEnd() {
  isDragging.value = false
}

// --- Resize handlers ---
function onResizeStart(e: MouseEvent | TouchEvent) {
  isResizing.value = true
  const { clientX, clientY } = getClientXY(e)
  resizeStartX.value = clientX
  resizeStartY.value = clientY
  resizeStartW.value = props.width
  resizeStartH.value = props.height
  emit('focus', props.windowId)
  if ('preventDefault' in e && !('touches' in e)) {
    e.preventDefault()
    e.stopPropagation()
  }
}

function onResizeMove(e: MouseEvent | TouchEvent) {
  if (!isResizing.value) return
  const { clientX, clientY } = getClientXY(e)
  const dx = clientX - resizeStartX.value
  const dy = clientY - resizeStartY.value
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

// --- Global touch listeners ---
function onGlobalTouchMove(e: TouchEvent) {
  if (isDragging.value) onDragMove(e)
  if (isResizing.value) onResizeMove(e)
}

function onGlobalTouchEnd() {
  if (isDragging.value) onDragEnd()
  if (isResizing.value) onResizeEnd()
}

onMounted(() => {
  document.addEventListener('mousemove', onGlobalMouseMove)
  document.addEventListener('mouseup', onGlobalMouseUp)
  document.addEventListener('touchmove', onGlobalTouchMove, { passive: true })
  document.addEventListener('touchend', onGlobalTouchEnd)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onGlobalMouseMove)
  document.removeEventListener('mouseup', onGlobalMouseUp)
  document.removeEventListener('touchmove', onGlobalTouchMove)
  document.removeEventListener('touchend', onGlobalTouchEnd)
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
    ref="windowEl"
    class="dw"
    :class="{ 'dw--dragging': isDragging, 'dw--resizing': isResizing }"
    :style="windowStyle"
    :data-window-id="windowId"
    @mousedown="onWindowClick"
    @touchstart.passive="onWindowClick"
  >
    <!-- Title bar -->
    <div class="dw__titlebar" @mousedown="onDragStart" @touchstart="onDragStart">
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
    <div
      v-show="!isCollapsed"
      class="dw__resize-handle"
      @mousedown="onResizeStart"
      @touchstart="onResizeStart"
    />
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
  touch-action: none;
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

/* Touch device optimizations */
@media (pointer: coarse) {
  .dw__titlebar {
    padding: 10px 12px;
  }

  .dw__btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .dw__controls {
    gap: 6px;
  }

  .dw__resize-handle {
    width: 28px;
    height: 28px;
  }
}
</style>
