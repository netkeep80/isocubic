/**
 * Tests for MetaMode inline extractor (TASK 75)
 *
 * Tests the extraction of inline metamode metadata from Vue SFC files.
 * Supports two formats:
 * 1. JSDoc @metamode comment blocks
 * 2. const metamode = {...} object declarations
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  extractInlineMetamodeFromContent,
  extractInlineMetamodeFromVue,
  normalizeInlineMetamode,
  extractInlineFromDirectory,
} from '../../scripts/metamode-inline-extractor'

describe('MetaMode Inline Extractor (TASK 75)', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'metamode-inline-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function writeVueFile(filename: string, content: string) {
    const fullPath = path.join(tmpDir, filename)
    fs.writeFileSync(fullPath, content)
    return fullPath
  }

  describe('JSDoc @metamode extraction', () => {
    it('should extract basic JSDoc @metamode block', () => {
      const content = `
<script setup lang="ts">
/**
 * @metamode
 * desc: Parameter editor for cube properties
 * status: stable
 */
import { ref } from 'vue'
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.source).toBe('jsdoc')
      expect(result?.metadata.desc).toBe('Parameter editor for cube properties')
      expect(result?.metadata.status).toBe('stable')
    })

    it('should extract JSDoc @metamode with all fields', () => {
      const content = `
<script setup lang="ts">
/**
 * @metamode
 * desc: Full-featured component with all metadata
 * status: experimental
 * phase: 12
 * tags: [editor, ui, metamode]
 * deps: [ParamType, CubeConfig]
 * ai: Edits cube parameters with live preview
 */
import { ref } from 'vue'
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('Full-featured component with all metadata')
      expect(result?.metadata.status).toBe('experimental')
      expect(result?.metadata.phase).toBe(12)
      expect(result?.metadata.tags).toEqual(['editor', 'ui', 'metamode'])
      expect(result?.metadata.deps).toEqual(['ParamType', 'CubeConfig'])
      expect(result?.metadata.ai).toBe('Edits cube parameters with live preview')
    })

    it('should handle JSDoc @metamode with description alias', () => {
      const content = `
<script setup>
/**
 * @metamode
 * description: Using long field name
 */
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      // 'description' is normalized to 'desc' in the output
      expect(result?.metadata.desc).toBe('Using long field name')
    })

    it('should handle JSDoc @metamode with dependencies alias', () => {
      const content = `
<script setup>
/**
 * @metamode
 * desc: Component with dependencies
 * dependencies: [TypeA, TypeB]
 */
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      // 'dependencies' is normalized to 'deps' in the output
      expect(result?.metadata.deps).toEqual(['TypeA', 'TypeB'])
    })

    it('should extract from multiple script blocks', () => {
      const content = `
<script>
// Regular script
const VERSION = '1.0.0'
</script>

<script setup lang="ts">
/**
 * @metamode
 * desc: Component with multiple scripts
 * status: beta
 */
import { ref } from 'vue'
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('Component with multiple scripts')
    })

    it('should ignore non-metamode JSDoc comments', () => {
      const content = `
<script setup lang="ts">
/**
 * Regular documentation comment
 * @param props - Component props
 */
import { ref } from 'vue'

/**
 * @metamode
 * desc: The actual metamode block
 */
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('The actual metamode block')
    })
  })

  describe('Object declaration extraction', () => {
    it('should extract const metamode = {...} declaration', () => {
      const content = `
<script setup lang="ts">
const metamode = {
  desc: 'Editor component',
  status: 'stable',
  phase: 5
}

import { ref } from 'vue'
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.source).toBe('object')
      expect(result?.metadata.desc).toBe('Editor component')
      expect(result?.metadata.status).toBe('stable')
      expect(result?.metadata.phase).toBe(5)
    })

    it('should extract with single-quoted strings', () => {
      const content = `
<script setup>
const metamode = {
  desc: 'Single quoted description',
  status: 'beta'
}
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('Single quoted description')
      expect(result?.metadata.status).toBe('beta')
    })

    it('should extract with double-quoted strings', () => {
      const content = `
<script setup>
const metamode = {
  desc: "Double quoted description",
  status: "stable"
}
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('Double quoted description')
    })

    it('should extract arrays in object declaration', () => {
      const content = `
<script setup>
const metamode = {
  desc: 'Component with arrays',
  tags: ['ui', 'editor', 'vue'],
  deps: ['TypeA', 'TypeB']
}
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.tags).toEqual(['ui', 'editor', 'vue'])
      expect(result?.metadata.deps).toEqual(['TypeA', 'TypeB'])
    })

    it('should handle let declaration', () => {
      const content = `
<script setup>
let metamode = {
  desc: 'Using let instead of const'
}
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('Using let instead of const')
    })

    it('should handle var declaration', () => {
      const content = `
<script>
var metamode = {
  desc: 'Using var declaration'
}
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('Using var declaration')
    })

    it('should handle multiline object declaration', () => {
      const content = `
<script setup lang="ts">
const metamode = {
  desc: 'Multiline component with complex config',
  status: 'stable',
  phase: 12,
  tags: [
    'editor',
    'ui',
    'metamode'
  ],
  ai: 'AI summary for the component'
}
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('Multiline component with complex config')
      expect(result?.metadata.tags).toEqual(['editor', 'ui', 'metamode'])
    })
  })

  describe('Priority: JSDoc over object', () => {
    it('should prefer JSDoc @metamode over const metamode', () => {
      const content = `
<script setup lang="ts">
/**
 * @metamode
 * desc: JSDoc description (higher priority)
 * status: stable
 */

const metamode = {
  desc: 'Object description (lower priority)',
  status: 'beta'
}
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.source).toBe('jsdoc')
      expect(result?.metadata.desc).toBe('JSDoc description (higher priority)')
      expect(result?.metadata.status).toBe('stable')
    })
  })

  describe('Edge cases', () => {
    it('should return null for components without metamode', () => {
      const content = `
<script setup lang="ts">
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <div>{{ count }}</div>
</template>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).toBeNull()
    })

    it('should return null for empty script blocks', () => {
      const content = `
<script setup>
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).toBeNull()
    })

    it('should return null for templates without scripts', () => {
      const content = `
<template>
  <div>Static content</div>
</template>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).toBeNull()
    })

    it('should handle malformed object declarations gracefully', () => {
      const content = `
<script setup>
const metamode = {
  // incomplete object
</script>
`
      // Should not throw, may return null or partial result
      const result = extractInlineMetamodeFromContent(content)
      // Either null or empty metadata is acceptable
      expect(result === null || Object.keys(result?.metadata || {}).length === 0).toBe(true)
    })

    it('should handle special characters in descriptions', () => {
      const content = `
<script setup>
/**
 * @metamode
 * desc: Component with special chars: <>&"'
 */
</script>
`
      const result = extractInlineMetamodeFromContent(content)
      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toContain('<>&')
    })
  })

  describe('Status normalization', () => {
    it('should normalize experimental to exp', () => {
      const inline = { status: 'experimental' as const }
      const normalized = normalizeInlineMetamode(inline)
      expect(normalized.status).toBe('exp')
    })

    it('should normalize deprecated to dep', () => {
      const inline = { status: 'deprecated' as const }
      const normalized = normalizeInlineMetamode(inline)
      expect(normalized.status).toBe('dep')
    })

    it('should keep stable as stable', () => {
      const inline = { status: 'stable' as const }
      const normalized = normalizeInlineMetamode(inline)
      expect(normalized.status).toBe('stable')
    })

    it('should keep beta as beta', () => {
      const inline = { status: 'beta' as const }
      const normalized = normalizeInlineMetamode(inline)
      expect(normalized.status).toBe('beta')
    })

    it('should normalize description to desc', () => {
      const inline = { description: 'Long field name' }
      const normalized = normalizeInlineMetamode(inline)
      expect(normalized.desc).toBe('Long field name')
      expect(normalized.description).toBeUndefined()
    })

    it('should normalize dependencies to deps', () => {
      const inline = { dependencies: ['A', 'B'] }
      const normalized = normalizeInlineMetamode(inline)
      expect(normalized.deps).toEqual(['A', 'B'])
      expect(normalized.dependencies).toBeUndefined()
    })
  })

  describe('File-based extraction', () => {
    it('should extract from Vue file on disk', () => {
      const content = `
<script setup>
/**
 * @metamode
 * desc: File-based test component
 * status: stable
 */
</script>
`
      const filePath = writeVueFile('TestComponent.vue', content)
      const result = extractInlineMetamodeFromVue(filePath)

      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('File-based test component')
    })

    it('should return null for non-existent file', () => {
      const result = extractInlineMetamodeFromVue('/non/existent/path.vue')
      expect(result).toBeNull()
    })
  })

  describe('Directory scanning', () => {
    it('should scan directory for Vue files with inline metamode', () => {
      writeVueFile(
        'ComponentA.vue',
        `
<script setup>
/**
 * @metamode
 * desc: Component A
 * status: stable
 */
</script>
`
      )

      writeVueFile(
        'ComponentB.vue',
        `
<script setup>
const metamode = {
  desc: 'Component B',
  status: 'beta'
}
</script>
`
      )

      // Component without metamode
      writeVueFile(
        'ComponentC.vue',
        `
<script setup>
const count = ref(0)
</script>
`
      )

      const result = extractInlineFromDirectory(tmpDir)

      expect(Object.keys(result)).toHaveLength(2)
      expect(result['ComponentA.vue']?.desc).toBe('Component A')
      expect(result['ComponentB.vue']?.desc).toBe('Component B')
      expect(result['ComponentC.vue']).toBeUndefined()
    })

    it('should return empty object for empty directory', () => {
      const emptyDir = path.join(tmpDir, 'empty')
      fs.mkdirSync(emptyDir)

      const result = extractInlineFromDirectory(emptyDir)
      expect(result).toEqual({})
    })

    it('should return empty object for non-existent directory', () => {
      const result = extractInlineFromDirectory('/non/existent/dir')
      expect(result).toEqual({})
    })

    it('should handle recursive scanning', () => {
      const subDir = path.join(tmpDir, 'subdir')
      fs.mkdirSync(subDir)

      writeVueFile(
        'RootComponent.vue',
        `
<script setup>
/**
 * @metamode
 * desc: Root component
 */
</script>
`
      )

      fs.writeFileSync(
        path.join(subDir, 'SubComponent.vue'),
        `
<script setup>
/**
 * @metamode
 * desc: Sub component
 */
</script>
`
      )

      const result = extractInlineFromDirectory(tmpDir, { recursive: true })

      expect(result['RootComponent.vue']?.desc).toBe('Root component')
      expect(result['subdir/SubComponent.vue']?.desc).toBe('Sub component')
    })
  })

  describe('Real-world patterns', () => {
    it('should handle typical Vue SFC with imports and props', () => {
      const content = `
<script setup lang="ts">
/**
 * @metamode
 * desc: Parameter editor for cube configurations
 * status: stable
 * phase: 5
 * tags: [editor, params, ui]
 * ai: Edits base color, gradients, noise settings
 */

import { ref, computed, watch } from 'vue'
import type { SpectralCube, CubeBase } from '../types/cube'
import { CUBE_DEFAULTS, createDefaultCube } from '../types/cube'

export interface ParamEditorProps {
  currentCube?: SpectralCube | null
  onCubeUpdate?: (cube: SpectralCube) => void
}

const props = withDefaults(defineProps<ParamEditorProps>(), {
  currentCube: null,
})

const emit = defineEmits<{
  'update:cube': [cube: SpectralCube]
}>()

// Component logic...
const localCube = ref<SpectralCube | null>(null)
</script>

<template>
  <div class="param-editor">
    <!-- Editor UI -->
  </div>
</template>

<style scoped>
.param-editor {
  padding: 1rem;
}
</style>
`
      const result = extractInlineMetamodeFromContent(content)

      expect(result).not.toBeNull()
      expect(result?.source).toBe('jsdoc')
      expect(result?.metadata.desc).toBe('Parameter editor for cube configurations')
      expect(result?.metadata.status).toBe('stable')
      expect(result?.metadata.phase).toBe(5)
      expect(result?.metadata.tags).toEqual(['editor', 'params', 'ui'])
      expect(result?.metadata.ai).toBe('Edits base color, gradients, noise settings')
    })

    it('should handle TypeScript strict mode component', () => {
      const content = `
<script setup lang="ts">
const metamode = {
  desc: 'TypeScript component with strict types',
  status: 'stable' as const,
  phase: 12,
  tags: ['typescript', 'strict'] as const,
}

import { defineComponent } from 'vue'
</script>
`
      const result = extractInlineMetamodeFromContent(content)

      expect(result).not.toBeNull()
      expect(result?.metadata.desc).toBe('TypeScript component with strict types')
    })
  })
})
