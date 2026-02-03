<!--
  MetamodeTreeNode Component (Vue 3 SFC)

  Recursive tree node component for displaying MetaMode hierarchy.
  Used by MetamodeTreePanel to render each node in the tree.
-->
<script setup lang="ts">
import type { CSSProperties } from 'vue'

defineOptions({ name: 'MetamodeTreeNode' })

interface FileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: string
  dependencies?: string[]
}

interface TreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  children?: Record<string, TreeNode>
}

const props = defineProps<{
  node: TreeNode
  path: string
  language: 'ru' | 'en'
  isExpandedFn: (path: string) => boolean
  toggleNodeFn: (path: string) => void
  getStatusColorFn: (status?: string) => string
  styles: Record<string, CSSProperties>
}>()

const hasChildren = props.node.children && Object.keys(props.node.children).length > 0
const hasFiles = props.node.files && Object.keys(props.node.files).length > 0
const hasContent =
  hasChildren ||
  hasFiles ||
  (props.node.languages?.length ?? 0) > 0 ||
  (props.node.tags?.length ?? 0) > 0
</script>

<template>
  <div :style="props.styles.treeNodeChild">
    <!-- Node header -->
    <div
      :style="props.styles.nodeHeader"
      @click="hasContent && props.toggleNodeFn(props.path)"
      @mouseenter="
        ($event.currentTarget as HTMLElement).style.backgroundColor = 'rgba(139, 92, 246, 0.1)'
      "
      @mouseleave="($event.currentTarget as HTMLElement).style.backgroundColor = 'transparent'"
    >
      <span
        v-if="hasContent"
        :style="{
          ...props.styles.nodeArrow,
          ...(props.isExpandedFn(props.path) ? props.styles.nodeArrowExpanded : {}),
        }"
        >&#9654;</span
      >
      <span v-else :style="{ ...props.styles.nodeArrow, color: 'transparent' }">&middot;</span>
      <span :style="props.styles.nodeName">{{ props.node.name }}</span>
      <span v-if="props.node.version" :style="props.styles.tag">v{{ props.node.version }}</span>
      <span :style="props.styles.nodeDescription">{{ props.node.description }}</span>
    </div>

    <!-- Node content (when expanded) -->
    <div v-if="props.isExpandedFn(props.path) && hasContent" :style="props.styles.nodeContent">
      <!-- Languages -->
      <div v-if="props.node.languages?.length" :style="props.styles.metaRow">
        <span :style="props.styles.metaLabel">{{
          props.language === 'ru' ? 'Языки:' : 'Languages:'
        }}</span>
        <span v-for="lang in props.node.languages" :key="lang" :style="props.styles.tag">{{
          lang
        }}</span>
      </div>
      <!-- Tags -->
      <div v-if="props.node.tags?.length" :style="props.styles.metaRow">
        <span :style="props.styles.metaLabel">{{
          props.language === 'ru' ? 'Теги:' : 'Tags:'
        }}</span>
        <span v-for="t in props.node.tags" :key="t" :style="props.styles.tag">{{ t }}</span>
      </div>
      <!-- Files -->
      <template v-if="hasFiles">
        <div :style="{ ...props.styles.metaRow, marginTop: '4px' }">
          <span :style="props.styles.metaLabel">{{
            props.language === 'ru' ? 'Файлы:' : 'Files:'
          }}</span>
        </div>
        <div v-for="(fd, fname) in props.node.files" :key="fname" :style="props.styles.fileEntry">
          <span :style="props.styles.fileName">{{ fname }}</span>
          <span
            v-if="fd.status"
            :style="{
              ...props.styles.statusBadge,
              backgroundColor: props.getStatusColorFn(fd.status) + '22',
              color: props.getStatusColorFn(fd.status),
            }"
            >{{ fd.status }}</span
          >
          <span :style="props.styles.fileDescription">{{ fd.description }}</span>
        </div>
      </template>

      <!-- Recursive children -->
      <template v-if="hasChildren">
        <MetamodeTreeNode
          v-for="(child, key) in props.node.children"
          :key="key"
          :node="child"
          :path="props.path + '/' + key"
          :language="props.language"
          :is-expanded-fn="props.isExpandedFn"
          :toggle-node-fn="props.toggleNodeFn"
          :get-status-color-fn="props.getStatusColorFn"
          :styles="props.styles"
        />
      </template>
    </div>
  </div>
</template>
