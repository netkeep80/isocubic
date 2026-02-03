<!--
  MetamodeTreePanel Component (Vue 3 SFC)

  Displays the compiled MetaMode tree in a collapsible tree view.
  Used inside MetaMode (MetaModeWindow) to browse project metadata hierarchy.

  Features:
  - Collapsible/expandable tree nodes
  - Displays name, description, version, languages, tags
  - Shows file descriptors with tags and status
  - Supports expand all / collapse all
  - Multi-language support (Russian/English)
  - TASK 76: AI-optimized format preview mode
-->
<script setup lang="ts">
import { ref, computed, type CSSProperties } from 'vue'
import metamodeTree from 'virtual:metamode/tree'
import metamodeAI from 'virtual:metamode/ai'
import MetamodeTreeNode from './MetamodeTreeNode.vue'

// ============================================================================
// Props
// ============================================================================

const props = withDefaults(
  defineProps<{
    /** Whether the panel is initially expanded */
    initialExpanded?: boolean
    /** Custom styles for the panel container */
    style?: CSSProperties
    /** Position of the panel */
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
    /** Preferred language */
    language?: 'ru' | 'en'
  }>(),
  {
    initialExpanded: true,
    style: undefined,
    position: 'top-left',
    language: 'ru',
  }
)

// ============================================================================
// State
// ============================================================================

const expandedNodes = ref<Set<string>>(new Set(['root']))
const isExpandAll = ref(false)
/** TASK 76: Toggle between standard and AI-optimized format preview */
const showAIFormat = ref(false)

// ============================================================================
// Computed
// ============================================================================

const hasTree = computed(() => metamodeTree != null)
const hasAITree = computed(() => metamodeAI != null)

/** TASK 76: Compute the active tree based on format mode */
const activeTree = computed(() => {
  if (showAIFormat.value && hasAITree.value) {
    // Map AI format to standard format for display compatibility
    return {
      name: metamodeAI.name,
      description: metamodeAI.desc,
      version: metamodeAI.ver,
      languages: metamodeAI.lang,
      tags: metamodeAI.tags,
      files: metamodeAI.files
        ? Object.fromEntries(
            Object.entries(metamodeAI.files).map(([k, v]) => [
              k,
              {
                description: v.desc,
                tags: v.tags,
                phase: v.phase,
                status: v.status === 'exp' ? 'experimental' : v.status === 'dep' ? 'deprecated' : v.status,
                dependencies: v.deps,
              },
            ])
          )
        : undefined,
      children: metamodeAI.children
        ? Object.fromEntries(
            Object.entries(metamodeAI.children).map(([k, child]) => [
              k,
              {
                name: child.name,
                description: child.desc,
                version: child.ver,
                languages: child.lang,
                tags: child.tags,
                files: child.files
                  ? Object.fromEntries(
                      Object.entries(child.files).map(([fk, fv]) => [
                        fk,
                        {
                          description: fv.desc,
                          tags: fv.tags,
                          phase: fv.phase,
                          status: fv.status === 'exp' ? 'experimental' : fv.status === 'dep' ? 'deprecated' : fv.status,
                          dependencies: fv.deps,
                        },
                      ])
                    )
                  : undefined,
                children: child.children,
              },
            ])
          )
        : undefined,
    }
  }
  return metamodeTree
})

/** TASK 76: AI-optimized JSON preview for copying */
const aiJsonPreview = computed(() => {
  if (!hasAITree.value) return ''
  return JSON.stringify(metamodeAI, null, 2)
})

// ============================================================================
// Methods
// ============================================================================

function toggleNode(path: string) {
  const newSet = new Set(expandedNodes.value)
  if (newSet.has(path)) {
    newSet.delete(path)
  } else {
    newSet.add(path)
  }
  expandedNodes.value = newSet
}

function isExpanded(path: string): boolean {
  if (isExpandAll.value) return true
  return expandedNodes.value.has(path)
}

function toggleExpandAll() {
  isExpandAll.value = !isExpandAll.value
  if (!isExpandAll.value) {
    expandedNodes.value = new Set(['root'])
  }
}

/** TASK 76: Toggle AI format preview mode */
function toggleAIFormat() {
  showAIFormat.value = !showAIFormat.value
}

/** TASK 76: Copy AI JSON to clipboard */
async function copyAIJson() {
  try {
    await navigator.clipboard.writeText(aiJsonPreview.value)
    // Brief visual feedback could be added here
  } catch (e) {
    console.warn('Failed to copy AI JSON:', e)
  }
}

function getStatusColor(status?: string): string {
  switch (status) {
    case 'stable':
      return '#22c55e'
    case 'beta':
      return '#f59e0b'
    case 'experimental':
      return '#3b82f6'
    case 'deprecated':
      return '#ef4444'
    default:
      return '#9ca3af'
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
    color: '#e5e7eb',
    height: '100%',
    overflow: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#c4b5fd',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  expandButton: {
    background: 'none',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '6px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px 10px',
    fontSize: '11px',
    transition: 'all 0.15s ease',
  },
  treeNode: {
    marginLeft: '0px',
  },
  treeNodeChild: {
    marginLeft: '16px',
  },
  nodeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background-color 0.15s ease',
    userSelect: 'none',
  },
  nodeArrow: {
    fontSize: '10px',
    color: '#6b7280',
    width: '14px',
    textAlign: 'center',
    flexShrink: 0,
    transition: 'transform 0.15s ease',
  },
  nodeArrowExpanded: {
    transform: 'rotate(90deg)',
  },
  nodeName: {
    fontWeight: 600,
    color: '#e5e7eb',
  },
  nodeDescription: {
    color: '#9ca3af',
    fontSize: '11px',
    marginLeft: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nodeContent: {
    marginLeft: '20px',
    padding: '4px 0',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 0',
    fontSize: '11px',
    color: '#9ca3af',
  },
  metaLabel: {
    color: '#6b7280',
    minWidth: '60px',
  },
  tag: {
    display: 'inline-block',
    padding: '1px 6px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: '3px',
    fontSize: '10px',
    color: '#c4b5fd',
    marginRight: '4px',
  },
  fileEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '2px 0 2px 8px',
    fontSize: '11px',
    borderLeft: '1px solid rgba(139, 92, 246, 0.15)',
    marginLeft: '4px',
  },
  fileName: {
    color: '#93c5fd',
    fontFamily: 'monospace',
    fontSize: '11px',
  },
  fileDescription: {
    color: '#6b7280',
    fontSize: '10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0px 5px',
    borderRadius: '3px',
    fontSize: '9px',
    fontWeight: 600,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#6b7280',
    textAlign: 'center',
    gap: '8px',
  },
  // TASK 76: AI format preview styles
  headerButtons: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  aiButton: {
    background: 'none',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '6px',
    color: '#60a5fa',
    cursor: 'pointer',
    padding: '4px 10px',
    fontSize: '11px',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  aiButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
    color: '#93c5fd',
  },
  aiBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#60a5fa',
    fontWeight: 600,
    marginLeft: '8px',
  },
  copyButton: {
    background: 'none',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    borderRadius: '6px',
    color: '#22c55e',
    cursor: 'pointer',
    padding: '4px 10px',
    fontSize: '11px',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
}
</script>

<template>
  <div :style="{ ...styles.container, ...props.style }">
    <!-- Header -->
    <div :style="styles.header">
      <div :style="styles.title">
        <span>&#127795;</span>
        <span>{{
          props.language === 'ru'
            ? '\u0414\u0435\u0440\u0435\u0432\u043E MetaMode'
            : 'MetaMode Tree'
        }}</span>
        <!-- TASK 76: AI format indicator -->
        <span v-if="showAIFormat" :style="styles.aiBadge">
          <span>&#129302;</span>
          <span>{{ props.language === 'ru' ? 'AI-\u0444\u043E\u0440\u043C\u0430\u0442' : 'AI Format' }}</span>
        </span>
      </div>
      <div :style="styles.headerButtons">
        <!-- TASK 76: AI format toggle button -->
        <button
          v-if="hasAITree"
          type="button"
          :style="{ ...styles.aiButton, ...(showAIFormat ? styles.aiButtonActive : {}) }"
          :title="
            props.language === 'ru'
              ? (showAIFormat ? '\u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442' : 'AI-\u043E\u043F\u0442\u0438\u043C\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442')
              : (showAIFormat ? 'Standard format' : 'AI-optimized format')
          "
          data-testid="metamode-ai-toggle"
          @click="toggleAIFormat"
        >
          <span>&#129302;</span>
          <span>{{ showAIFormat ? (props.language === 'ru' ? '\u041E\u0431\u044B\u0447\u043D\u044B\u0439' : 'Standard') : 'AI' }}</span>
        </button>
        <!-- TASK 76: Copy AI JSON button -->
        <button
          v-if="showAIFormat && hasAITree"
          type="button"
          :style="styles.copyButton"
          :title="props.language === 'ru' ? '\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C JSON' : 'Copy JSON'"
          data-testid="metamode-copy-ai-json"
          @click="copyAIJson"
        >
          <span>&#128203;</span>
          <span>{{ props.language === 'ru' ? '\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C' : 'Copy' }}</span>
        </button>
        <button type="button" :style="styles.expandButton" @click="toggleExpandAll">
          {{
            isExpandAll
              ? props.language === 'ru'
                ? '\u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0441\u0435'
                : 'Collapse all'
              : props.language === 'ru'
                ? '\u0420\u0430\u0437\u0432\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0441\u0435'
                : 'Expand all'
          }}
        </button>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!hasTree" :style="styles.emptyState">
      <span style="font-size: 24px">&#127795;</span>
      <span>{{
        props.language === 'ru'
          ? '\u0414\u0435\u0440\u0435\u0432\u043E MetaMode \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E'
          : 'MetaMode tree not loaded'
      }}</span>
    </div>

    <!-- Tree -->
    <template v-if="hasTree">
      <div :style="styles.treeNode">
        <!-- Root header -->
        <div
          :style="styles.nodeHeader"
          @click="toggleNode('root')"
          @mouseenter="
            ($event.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
          "
          @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
        >
          <span
            :style="{
              ...styles.nodeArrow,
              ...(isExpanded('root') ? styles.nodeArrowExpanded : {}),
            }"
            >&#9654;</span
          >
          <span :style="styles.nodeName">{{ activeTree.name }}</span>
          <span v-if="activeTree.version" :style="styles.tag">v{{ activeTree.version }}</span>
          <span :style="styles.nodeDescription">{{ activeTree.description }}</span>
        </div>

        <!-- Root content (expanded) -->
        <div v-if="isExpanded('root')" :style="styles.nodeContent">
          <!-- Languages -->
          <div v-if="activeTree.languages?.length" :style="styles.metaRow">
            <span :style="styles.metaLabel">{{
              props.language === 'ru' ? '\u042F\u0437\u044B\u043A\u0438:' : 'Languages:'
            }}</span>
            <span v-for="lang in activeTree.languages" :key="lang" :style="styles.tag">{{
              lang
            }}</span>
          </div>
          <!-- Tags -->
          <div v-if="activeTree.tags?.length" :style="styles.metaRow">
            <span :style="styles.metaLabel">{{
              props.language === 'ru' ? '\u0422\u0435\u0433\u0438:' : 'Tags:'
            }}</span>
            <span v-for="t in activeTree.tags" :key="t" :style="styles.tag">{{ t }}</span>
          </div>
          <!-- Files -->
          <template v-if="activeTree.files">
            <div :style="{ ...styles.metaRow, marginTop: '4px' }">
              <span :style="styles.metaLabel">{{
                props.language === 'ru' ? '\u0424\u0430\u0439\u043B\u044B:' : 'Files:'
              }}</span>
            </div>
            <div v-for="(fd, fname) in activeTree.files" :key="fname" :style="styles.fileEntry">
              <span :style="styles.fileName">{{ fname }}</span>
              <span
                v-if="fd.status"
                :style="{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(fd.status) + '22',
                  color: getStatusColor(fd.status),
                }"
                >{{ fd.status }}</span
              >
              <span :style="styles.fileDescription">{{ fd.description }}</span>
            </div>
          </template>

          <!-- Children (recursive) -->
          <template v-if="activeTree.children">
            <MetamodeTreeNode
              v-for="(child, key) in activeTree.children"
              :key="key"
              :node="child"
              :path="'root/' + key"
              :language="props.language"
              :is-expanded-fn="isExpanded"
              :toggle-node-fn="toggleNode"
              :get-status-color-fn="getStatusColor"
              :styles="styles"
            />
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
