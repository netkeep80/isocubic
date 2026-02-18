/**
 * Tests for MetaMode Annotation Parser (MetaMode v2.0, Phase 0)
 *
 * Tests cover:
 * - @mm: JSDoc annotation extraction
 * - __mm runtime property extraction
 * - Priority: __mm > @mm: (when same entity)
 * - Multi-value fields (tags, deps)
 * - Dependency type classification (runtime:, build:, optional:)
 * - Vue SFC support (extracts from <script> blocks)
 * - TypeScript / JavaScript file support
 * - Directory scanning
 * - Annotation index building
 * - Edge cases and error handling
 */

import { describe, it, expect } from 'vitest'
import {
  parseAnnotationsFromContent,
  buildAnnotationIndex,
  type FileParseResult,
} from '../../scripts/metamode-annotation-parser'

// ============================================================================
// @mm: JSDoc Annotation Tests
// ============================================================================

describe('parseAnnotationsFromContent - @mm: JSDoc', () => {
  it('should extract a basic @mm: annotation', () => {
    const content = `
/**
 * @mm:id=param_editor
 * @mm:name=ParametricEditor
 * @mm:desc=Editor for parametric shapes
 */
export function ParametricEditor() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(1)
    const ann = result.annotations[0]
    expect(ann.source).toBe('jsdoc')
    expect(ann.annotation.id).toBe('param_editor')
    expect(ann.annotation.name).toBe('ParametricEditor')
    expect(ann.annotation.desc).toBe('Editor for parametric shapes')
  })

  it('should parse tags as an array', () => {
    const content = `
/**
 * @mm:id=ui_comp
 * @mm:tags=ui,stable,editor
 */
export const UIComp = {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(1)
    expect(result.annotations[0].annotation.tags).toEqual(['ui', 'stable', 'editor'])
  })

  it('should parse deps with type prefixes', () => {
    const content = `
/**
 * @mm:id=param_editor
 * @mm:deps=runtime:lib/params,build:tools/voxel,optional:lib/undo
 */
export function ParametricEditor() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    const deps = result.annotations[0].annotation.deps
    expect(deps).toBeDefined()
    expect(typeof deps).toBe('object')
    // Type narrowing: deps is MmDeps object
    const depsObj = deps as { runtime?: string[]; build?: string[]; optional?: string[] }
    expect(depsObj.runtime).toEqual(['lib/params'])
    expect(depsObj.build).toEqual(['tools/voxel'])
    expect(depsObj.optional).toEqual(['lib/undo'])
  })

  it('should parse deps without type prefix as runtime', () => {
    const content = `
/**
 * @mm:id=my_comp
 * @mm:deps=lib/utils,lib/api
 */
export function MyComp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    const deps = result.annotations[0].annotation.deps
    expect(deps).toBeDefined()
    const depsObj = deps as { runtime?: string[] }
    expect(depsObj.runtime).toEqual(['lib/utils', 'lib/api'])
  })

  it('should parse visibility field', () => {
    const content = `
/**
 * @mm:id=internal_util
 * @mm:visibility=internal
 */
export function internalUtil() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].annotation.visibility).toBe('internal')
  })

  it('should parse status field', () => {
    const content = `
/**
 * @mm:id=stable_comp
 * @mm:status=stable
 */
export function StableComp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].annotation.status).toBe('stable')
  })

  it('should parse phase as a number', () => {
    const content = `
/**
 * @mm:id=phase5_comp
 * @mm:phase=5
 */
export function Phase5Comp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].annotation.phase).toBe(5)
  })

  it('should parse ai:summary field', () => {
    const content = `
/**
 * @mm:id=comp
 * @mm:ai=summary:A visual component for editing shapes
 */
export function Comp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    const ai = result.annotations[0].annotation.ai
    expect(ai).toBeDefined()
    expect(typeof ai).toBe('object')
    const aiObj = ai as { summary?: string }
    expect(aiObj.summary).toBe('A visual component for editing shapes')
  })

  it('should detect the entity name from the following declaration', () => {
    const content = `
/**
 * @mm:id=my_func
 * @mm:desc=Some function
 */
export function MyFunction() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].entityName).toBe('MyFunction')
  })

  it('should detect class entity name', () => {
    const content = `
/**
 * @mm:id=my_class
 * @mm:desc=Some class
 */
export class MyClass {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].entityName).toBe('MyClass')
  })

  it('should detect const entity name', () => {
    const content = `
/**
 * @mm:id=my_const
 * @mm:desc=Some constant
 */
export const myConst = {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].entityName).toBe('myConst')
  })

  it('should handle multiple @mm: annotations in one file', () => {
    const content = `
/**
 * @mm:id=component_a
 * @mm:desc=Component A
 */
export function ComponentA() {}

/**
 * @mm:id=component_b
 * @mm:desc=Component B
 */
export function ComponentB() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(2)
    expect(result.annotations[0].annotation.id).toBe('component_a')
    expect(result.annotations[1].annotation.id).toBe('component_b')
  })

  it('should ignore JSDoc blocks without @mm: prefix', () => {
    const content = `
/**
 * This is a regular JSDoc comment
 * @param x - The x value
 * @returns The result
 */
export function regularFunc(x: number) {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(0)
  })

  it('should include the line number', () => {
    const content = `
// line 2
// line 3
/**
 * @mm:id=line_test
 */
export function LineTest() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(1)
    expect(result.annotations[0].line).toBeGreaterThan(0)
  })

  it('should handle tags with bracket syntax', () => {
    const content = `
/**
 * @mm:id=comp
 * @mm:tags=[ui, stable, component]
 */
export const comp = {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].annotation.tags).toEqual(['ui', 'stable', 'component'])
  })
})

// ============================================================================
// __mm Runtime Property Tests
// ============================================================================

describe('parseAnnotationsFromContent - __mm runtime', () => {
  it('should extract a basic __mm object', () => {
    const content = `
export const ParametricEditor = {
  someMethod() {},

  __mm: {
    id: 'param_editor',
    version: '1.2.0',
    visibility: 'public'
  }
}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations.length).toBeGreaterThan(0)
    const found = result.annotations.find((a) => a.annotation.id === 'param_editor')
    expect(found).toBeDefined()
    expect(found?.annotation.version).toBe('1.2.0')
    expect(found?.annotation.visibility).toBe('public')
  })

  it('should mark source as "runtime" for __mm objects', () => {
    const content = `
export const MyComp = {
  __mm: {
    id: 'my_comp',
    desc: 'My component'
  }
}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    const found = result.annotations.find((a) => a.source === 'runtime')
    expect(found).toBeDefined()
  })

  it('should parse __mm with = assignment syntax', () => {
    const content = `
const metadata = {}
metadata.__mm = {
  id: 'meta_data',
  desc: 'Metadata object'
}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    const found = result.annotations.find((a) => a.annotation.id === 'meta_data')
    expect(found).toBeDefined()
  })
})

// ============================================================================
// Priority: __mm > @mm: for the same entity
// ============================================================================

describe('parseAnnotationsFromContent - priority', () => {
  it('should merge __mm over @mm: when same entity, __mm wins on conflicts', () => {
    const content = `
/**
 * @mm:id=param_editor
 * @mm:desc=JSDoc description
 * @mm:tags=jsdoc-tag
 */
export const ParametricEditor = {
  __mm: {
    id: 'param_editor',
    desc: 'Runtime description',
    version: '1.2.0'
  }
}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    // The merged annotation should have __mm winning for desc
    const found = result.annotations.find((a) => a.annotation.id === 'param_editor')
    expect(found).toBeDefined()
    expect(found?.annotation.desc).toBe('Runtime description')
    // version comes from __mm
    expect(found?.annotation.version).toBe('1.2.0')
    // The source should be 'runtime' since __mm took priority
    expect(found?.source).toBe('runtime')
  })
})

// ============================================================================
// Vue SFC Support
// ============================================================================

describe('parseAnnotationsFromContent - Vue SFC', () => {
  it('should extract @mm: annotations from <script> block', () => {
    const content = `
<template>
  <div>Hello</div>
</template>

<script lang="ts">
/**
 * @mm:id=my_component
 * @mm:desc=A Vue component
 * @mm:tags=vue,ui
 */
export default {
  name: 'MyComponent'
}
</script>
`
    const result = parseAnnotationsFromContent(content, 'MyComponent.vue')

    expect(result.annotations).toHaveLength(1)
    expect(result.annotations[0].annotation.id).toBe('my_component')
    expect(result.annotations[0].annotation.tags).toEqual(['vue', 'ui'])
  })

  it('should extract @mm: annotations from <script setup> block', () => {
    const content = `
<template>
  <div>{{ msg }}</div>
</template>

<script setup lang="ts">
/**
 * @mm:id=setup_component
 * @mm:desc=Uses script setup
 * @mm:status=stable
 */
const msg = 'Hello'
</script>
`
    const result = parseAnnotationsFromContent(content, 'SetupComp.vue')

    expect(result.annotations).toHaveLength(1)
    expect(result.annotations[0].annotation.id).toBe('setup_component')
    expect(result.annotations[0].annotation.status).toBe('stable')
  })

  it('should extract __mm from Vue component', () => {
    const content = `
<template>
  <div></div>
</template>

<script lang="ts">
export default {
  name: 'VueComp',
  __mm: {
    id: 'vue_comp',
    desc: 'A Vue component with __mm'
  }
}
</script>
`
    const result = parseAnnotationsFromContent(content, 'VueComp.vue')

    expect(result.annotations.length).toBeGreaterThan(0)
    const found = result.annotations.find((a) => a.annotation.id === 'vue_comp')
    expect(found).toBeDefined()
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('parseAnnotationsFromContent - edge cases', () => {
  it('should return empty annotations for file with no annotations', () => {
    const content = `
export function plainFunction() {
  return 42
}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should handle empty content', () => {
    const result = parseAnnotationsFromContent('', 'empty.ts')

    expect(result.annotations).toHaveLength(0)
  })

  it('should handle invalid phase value gracefully', () => {
    const content = `
/**
 * @mm:id=comp
 * @mm:phase=not-a-number
 */
export function Comp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(1)
    // phase should not be set if not parseable
    expect(result.annotations[0].annotation.phase).toBeUndefined()
  })

  it('should handle invalid visibility value gracefully', () => {
    const content = `
/**
 * @mm:id=comp
 * @mm:visibility=unknown-value
 */
export function Comp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(1)
    // visibility should not be set if not valid
    expect(result.annotations[0].annotation.visibility).toBeUndefined()
  })

  it('should handle annotations with only some fields set', () => {
    const content = `
/**
 * @mm:desc=Just a description, no id
 */
export function Comp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations).toHaveLength(1)
    expect(result.annotations[0].annotation.desc).toBe('Just a description, no id')
    expect(result.annotations[0].annotation.id).toBeUndefined()
  })

  it('should not include filePath in result for empty annotations', () => {
    const content = `// no annotations`
    const result = parseAnnotationsFromContent(content, 'noann.ts')

    expect(result.filePath).toBe('noann.ts')
    expect(result.annotations).toHaveLength(0)
  })

  it('should handle @mm: annotation with quoted values', () => {
    const content = `
/**
 * @mm:id=comp
 * @mm:desc="A description with spaces"
 */
export function Comp() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')

    expect(result.annotations[0].annotation.desc).toBe('A description with spaces')
  })
})

// ============================================================================
// buildAnnotationIndex Tests
// ============================================================================

describe('buildAnnotationIndex', () => {
  it('should build index keyed by annotation id', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/comp.ts',
        annotations: [
          {
            annotation: { id: 'my_comp', desc: 'My component' },
            source: 'jsdoc',
            line: 1,
            raw: '/** @mm:id=my_comp */',
          },
        ],
        warnings: [],
      },
    ]

    const index = buildAnnotationIndex(results)

    expect(index.has('my_comp')).toBe(true)
    expect(index.get('my_comp')?.annotation.desc).toBe('My component')
  })

  it('should use file:entityName as key when no id', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/utils.ts',
        annotations: [
          {
            annotation: { desc: 'A utility' },
            source: 'jsdoc',
            line: 5,
            raw: '/** @mm:desc=A utility */',
            entityName: 'utilFunc',
          },
        ],
        warnings: [],
      },
    ]

    const index = buildAnnotationIndex(results)

    expect(index.has('utils.ts:utilFunc')).toBe(true)
  })

  it('should handle multiple results and files', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/a.ts',
        annotations: [
          {
            annotation: { id: 'comp_a' },
            source: 'jsdoc',
            line: 1,
            raw: '',
          },
        ],
        warnings: [],
      },
      {
        filePath: '/src/b.ts',
        annotations: [
          {
            annotation: { id: 'comp_b' },
            source: 'jsdoc',
            line: 1,
            raw: '',
          },
        ],
        warnings: [],
      },
    ]

    const index = buildAnnotationIndex(results)

    expect(index.size).toBe(2)
    expect(index.has('comp_a')).toBe(true)
    expect(index.has('comp_b')).toBe(true)
  })
})

// ============================================================================
// Status Normalization
// ============================================================================

describe('parseAnnotationsFromContent - status values', () => {
  it('should accept "stable" status', () => {
    const content = `
/**
 * @mm:id=c
 * @mm:status=stable
 */
export function C() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')
    expect(result.annotations[0].annotation.status).toBe('stable')
  })

  it('should accept "beta" status', () => {
    const content = `
/**
 * @mm:id=c
 * @mm:status=beta
 */
export function C() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')
    expect(result.annotations[0].annotation.status).toBe('beta')
  })

  it('should accept "experimental" status', () => {
    const content = `
/**
 * @mm:id=c
 * @mm:status=experimental
 */
export function C() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')
    expect(result.annotations[0].annotation.status).toBe('experimental')
  })

  it('should accept "deprecated" status', () => {
    const content = `
/**
 * @mm:id=c
 * @mm:status=deprecated
 */
export function C() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')
    expect(result.annotations[0].annotation.status).toBe('deprecated')
  })

  it('should accept abbreviated "exp" status', () => {
    const content = `
/**
 * @mm:id=c
 * @mm:status=exp
 */
export function C() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')
    expect(result.annotations[0].annotation.status).toBe('exp')
  })

  it('should accept abbreviated "dep" status', () => {
    const content = `
/**
 * @mm:id=c
 * @mm:status=dep
 */
export function C() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')
    expect(result.annotations[0].annotation.status).toBe('dep')
  })
})

// ============================================================================
// Description alias support
// ============================================================================

describe('parseAnnotationsFromContent - description alias', () => {
  it('should accept @mm:description as alias for @mm:desc', () => {
    const content = `
/**
 * @mm:id=c
 * @mm:description=Full description here
 */
export function C() {}
`
    const result = parseAnnotationsFromContent(content, 'test.ts')
    expect(result.annotations[0].annotation.desc).toBe('Full description here')
  })
})

// ============================================================================
// Real-world patterns
// ============================================================================

describe('parseAnnotationsFromContent - real-world patterns', () => {
  it('should handle a fully-annotated TypeScript module', () => {
    const content = `
/**
 * @mm:id=param_editor
 * @mm:name=ParametricEditor
 * @mm:desc=Редактор параметров с поддержкой undo/redo
 * @mm:tags=ui,stable
 * @mm:deps=runtime:lib/params,build:tools/voxel
 * @mm:ai=summary:Компонент для визуального редактирования параметров
 * @mm:visibility=public
 */
export function ParametricEditor() {
  // implementation
}
`
    const result = parseAnnotationsFromContent(content, 'ParametricEditor.ts')

    expect(result.annotations).toHaveLength(1)
    const ann = result.annotations[0].annotation
    expect(ann.id).toBe('param_editor')
    expect(ann.name).toBe('ParametricEditor')
    expect(ann.desc).toBe('Редактор параметров с поддержкой undo/redo')
    expect(ann.tags).toEqual(['ui', 'stable'])
    expect(ann.visibility).toBe('public')

    const deps = ann.deps as { runtime?: string[]; build?: string[] }
    expect(deps.runtime).toEqual(['lib/params'])
    expect(deps.build).toEqual(['tools/voxel'])
  })

  it('should handle a __mm runtime property with refs', () => {
    const content = `
export const ParametricEditor = {
  __mm: {
    id: 'param_editor',
    version: '1.2.0',
    visibility: 'public'
  }
}
`
    const result = parseAnnotationsFromContent(content, 'ParametricEditor.ts')

    expect(result.annotations.length).toBeGreaterThan(0)
    const ann = result.annotations.find((a) => a.annotation.id === 'param_editor')
    expect(ann).toBeDefined()
    expect(ann?.annotation.version).toBe('1.2.0')
    expect(ann?.annotation.visibility).toBe('public')
  })
})
