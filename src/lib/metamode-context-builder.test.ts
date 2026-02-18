/**
 * Tests for MetaMode Context Builder (MetaMode v2.0, Phase 3)
 *
 * Tests cover:
 * - PROMPT_TEMPLATES: all agent types have correct templates
 * - selectEntries: filtering by scope, ids, filePaths, and dependency expansion
 * - approximateTokens: token counting heuristic
 * - buildContext: full context assembly with all options
 * - buildContextForAgent: convenience wrapper
 * - suggestAnnotation: annotation suggestion for new files
 * - runPreCommitCheck: pre-commit hook logic
 * - Output formats: markdown, json, text
 * - Token budget enforcement and trimming
 * - Edge cases: empty database, no matching entries
 */

import { describe, it, expect } from 'vitest'
import {
  PROMPT_TEMPLATES,
  selectEntries,
  approximateTokens,
  buildContext,
  buildContextForAgent,
  suggestAnnotation,
  runPreCommitCheck,
  type AgentType,
} from '../../scripts/metamode-context-builder'
import type { MmV2Database, MmDbEntry } from '../../scripts/metamode-db-compiler'

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a minimal MmDbEntry */
function makeEntry(id: string, overrides: Partial<MmDbEntry> = {}): MmDbEntry {
  return {
    id,
    desc: `Description of ${id}`,
    filePath: `src/${id}.ts`,
    line: 1,
    source: 'jsdoc',
    ...overrides,
  }
}

/** Build a minimal MmV2Database from entries */
function makeDb(entries: MmDbEntry[]): MmV2Database {
  const entriesRecord: Record<string, MmDbEntry> = {}
  for (const e of entries) {
    entriesRecord[e.id] = e
  }

  const nodes: Record<string, import('../../scripts/metamode-db-compiler').MmGraphNode> = {}
  for (const e of entries) {
    nodes[e.id] = {
      id: e.id,
      runtimeDeps: e.deps?.runtime ?? [],
      buildDeps: e.deps?.build ?? [],
      optionalDeps: e.deps?.optional ?? [],
      dependents: [],
    }
  }

  // Fill in dependents
  for (const e of entries) {
    if (e.deps?.runtime) {
      for (const dep of e.deps.runtime) {
        if (nodes[dep]) nodes[dep].dependents.push(e.id)
      }
    }
  }

  return {
    entries: entriesRecord,
    ids: entries.map((e) => e.id),
    graph: {
      nodes,
      edges: entries.flatMap((e) =>
        (e.deps?.runtime ?? []).map((dep) => ({ from: e.id, to: dep, type: 'runtime' as const }))
      ),
    },
    stats: {
      totalAnnotations: entries.length,
      byStatus: {},
      byVisibility: {},
      byPhase: {},
      byTag: {},
      topDependencies: [],
      orphanedDependencies: [],
    },
    buildInfo: {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      sourceFiles: 1,
      format: 'metamode-v2',
    },
  }
}

// ============================================================================
// PROMPT_TEMPLATES
// ============================================================================

describe('PROMPT_TEMPLATES', () => {
  const agentTypes: AgentType[] = ['codegen', 'refactor', 'docgen', 'review', 'generic']

  for (const agentType of agentTypes) {
    it(`should have a template for agent type: ${agentType}`, () => {
      const template = PROMPT_TEMPLATES[agentType]
      expect(template).toBeDefined()
      expect(template.name).toBeTruthy()
      expect(template.preamble).toBeTruthy()
      expect(Array.isArray(template.relevantFields)).toBe(true)
      expect(template.relevantFields.length).toBeGreaterThan(0)
      expect(typeof template.instruction).toBe('string')
    })
  }

  it('codegen template references code generation', () => {
    expect(PROMPT_TEMPLATES.codegen.preamble.toLowerCase()).toContain('code generation')
    expect(PROMPT_TEMPLATES.codegen.relevantFields).toContain('deps')
    expect(PROMPT_TEMPLATES.codegen.relevantFields).toContain('ai')
  })

  it('refactor template references refactoring', () => {
    expect(PROMPT_TEMPLATES.refactor.preamble.toLowerCase()).toContain('refactor')
    expect(PROMPT_TEMPLATES.refactor.relevantFields).toContain('deps')
    expect(PROMPT_TEMPLATES.refactor.relevantFields).toContain('visibility')
  })

  it('docgen template references documentation', () => {
    expect(PROMPT_TEMPLATES.docgen.preamble.toLowerCase()).toContain('documentation')
    expect(PROMPT_TEMPLATES.docgen.relevantFields).toContain('phase')
    expect(PROMPT_TEMPLATES.docgen.relevantFields).toContain('ai')
  })

  it('review template references code review', () => {
    expect(PROMPT_TEMPLATES.review.preamble.toLowerCase()).toContain('code reviewer')
    expect(PROMPT_TEMPLATES.review.relevantFields).toContain('visibility')
    expect(PROMPT_TEMPLATES.review.relevantFields).toContain('status')
  })

  it('generic template has minimal preamble', () => {
    expect(PROMPT_TEMPLATES.generic.preamble).toBeTruthy()
    expect(PROMPT_TEMPLATES.generic.instruction).toBe('')
  })
})

// ============================================================================
// approximateTokens
// ============================================================================

describe('approximateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(approximateTokens('')).toBe(0)
  })

  it('estimates ~1 token per 4 chars', () => {
    expect(approximateTokens('abcd')).toBe(1)
    expect(approximateTokens('abcdefgh')).toBe(2)
  })

  it('rounds up', () => {
    expect(approximateTokens('abc')).toBe(1) // 3/4 = 0.75 -> ceil = 1
    expect(approximateTokens('abcde')).toBe(2) // 5/4 = 1.25 -> ceil = 2
  })

  it('handles longer text', () => {
    const text = 'a'.repeat(400)
    expect(approximateTokens(text)).toBe(100)
  })
})

// ============================================================================
// selectEntries
// ============================================================================

describe('selectEntries', () => {
  const entries = [
    makeEntry('ui_button', { tags: ['ui'], status: 'stable' }),
    makeEntry('ui_input', { tags: ['ui', 'form'], status: 'stable' }),
    makeEntry('lib_utils', { tags: ['lib'], status: 'stable' }),
    makeEntry('internal_helper', { tags: ['internal'], visibility: 'internal' }),
    makeEntry('dependent', {
      tags: ['ui'],
      deps: { runtime: ['ui_button'] },
    }),
  ]
  const db = makeDb(entries)

  it('returns all entries when no filter is specified', () => {
    const { entries: result } = selectEntries(db, {})
    expect(result.length).toBe(entries.length)
  })

  it('filters by explicit IDs', () => {
    const { entries: result } = selectEntries(db, { ids: ['lib_utils'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('lib_utils')
  })

  it('filters by scope (tags)', () => {
    const { entries: result } = selectEntries(db, { scope: ['lib'] })
    expect(result.every((e) => e.tags?.includes('lib'))).toBe(true)
    expect(result.map((e) => e.id)).toContain('lib_utils')
  })

  it('filters by multiple scope tags (OR logic)', () => {
    const { entries: result } = selectEntries(db, { scope: ['lib', 'internal'] })
    expect(result.some((e) => e.id === 'lib_utils')).toBe(true)
    expect(result.some((e) => e.id === 'internal_helper')).toBe(true)
    expect(result.some((e) => e.id === 'ui_button')).toBe(false)
  })

  it('filters by filePaths substring', () => {
    const { entries: result } = selectEntries(db, { filePaths: ['lib_utils'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('lib_utils')
  })

  it('IDs take precedence over scope', () => {
    const { entries: result } = selectEntries(db, { ids: ['lib_utils'], scope: ['ui'] })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('lib_utils')
  })

  it('expands runtime dependencies when includeDeps=true (default)', () => {
    const { entries: result, depsAdded } = selectEntries(db, {
      ids: ['dependent'],
      includeDeps: true,
    })
    const ids = result.map((e) => e.id)
    expect(ids).toContain('dependent')
    expect(ids).toContain('ui_button')
    expect(depsAdded).toBe(1)
  })

  it('does not expand dependencies when includeDeps=false', () => {
    const { entries: result, depsAdded } = selectEntries(db, {
      ids: ['dependent'],
      includeDeps: false,
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('dependent')
    expect(depsAdded).toBe(0)
  })

  it('respects maxEntries limit', () => {
    const { entries: result } = selectEntries(db, { maxEntries: 2 })
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('returns empty array for unknown IDs', () => {
    const { entries: result } = selectEntries(db, { ids: ['nonexistent_id'] })
    expect(result).toHaveLength(0)
  })

  it('does not duplicate entries from dep expansion', () => {
    // Both 'dependent' and 'ui_button' are in scope; ui_button is also a dep of dependent
    const { entries: result } = selectEntries(db, {
      scope: ['ui'],
      includeDeps: true,
    })
    const ids = result.map((e) => e.id)
    const uniqueIds = [...new Set(ids)]
    expect(ids.length).toBe(uniqueIds.length)
  })
})

// ============================================================================
// buildContext
// ============================================================================

describe('buildContext', () => {
  const entries = [
    makeEntry('comp_a', { tags: ['ui'], desc: 'Component A', status: 'stable' }),
    makeEntry('comp_b', { tags: ['ui'], desc: 'Component B', status: 'draft' }),
    makeEntry('util_x', {
      tags: ['lib'],
      desc: 'Utility X',
      ai: { summary: 'Useful utility', usage: 'Call X()', examples: ['X(1)', 'X(2)'] },
    }),
  ]
  const db = makeDb(entries)

  it('returns a BuiltContext with all expected fields', () => {
    const ctx = buildContext(db, { agentType: 'generic' })
    expect(ctx.agentType).toBe('generic')
    expect(Array.isArray(ctx.entries)).toBe(true)
    expect(typeof ctx.prompt).toBe('string')
    expect(typeof ctx.tokenCount).toBe('number')
    expect(typeof ctx.wasTrimmed).toBe('boolean')
    expect(ctx.stats).toBeDefined()
    expect(ctx.stats.totalInDb).toBe(entries.length)
  })

  it('generates markdown format by default', () => {
    const ctx = buildContext(db, { agentType: 'generic' })
    expect(ctx.prompt).toContain('###')
    expect(ctx.prompt).toContain('MetaMode Context')
  })

  it('generates JSON format when specified', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'json' })
    expect(ctx.prompt).toContain('```json')
    expect(ctx.prompt).toContain('"id"')
  })

  it('generates text format when specified', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'text' })
    expect(ctx.prompt).toContain('MetaMode Context:')
    // Should NOT contain markdown headers
    expect(ctx.prompt).not.toContain('###')
  })

  it('includes the preamble for the selected agent type', () => {
    const ctx = buildContext(db, { agentType: 'codegen' })
    expect(ctx.prompt).toContain(PROMPT_TEMPLATES.codegen.preamble)
  })

  it('includes the instruction for the selected agent type', () => {
    const ctx = buildContext(db, { agentType: 'refactor' })
    expect(ctx.prompt).toContain(PROMPT_TEMPLATES.refactor.instruction)
  })

  it('filters entries by scope', () => {
    const ctx = buildContext(db, { agentType: 'generic', scope: ['lib'] })
    expect(ctx.entries.every((e) => e.id === 'util_x')).toBe(true)
    expect(ctx.entries).toHaveLength(1)
  })

  it('filters entries by explicit IDs', () => {
    const ctx = buildContext(db, { agentType: 'generic', ids: ['comp_a'] })
    expect(ctx.entries).toHaveLength(1)
    expect(ctx.entries[0].id).toBe('comp_a')
  })

  it('includes entry description in markdown output', () => {
    const ctx = buildContext(db, { agentType: 'generic', ids: ['comp_a'] })
    expect(ctx.prompt).toContain('Component A')
  })

  it('includes AI hints in markdown output', () => {
    const ctx = buildContext(db, { agentType: 'generic', ids: ['util_x'] })
    expect(ctx.prompt).toContain('Useful utility')
  })

  it('respects token budget — trims when exceeded', () => {
    // Create many entries to exceed token budget
    const manyEntries = Array.from({ length: 50 }, (_, i) =>
      makeEntry(`entry_${i}`, { desc: 'A'.repeat(100) })
    )
    const bigDb = makeDb(manyEntries)
    const ctx = buildContext(bigDb, { agentType: 'generic', tokenBudget: 200 })
    expect(ctx.wasTrimmed).toBe(true)
    expect(ctx.tokenCount).toBeLessThanOrEqual(200 + 50) // small tolerance
  })

  it('does not trim when within token budget', () => {
    const ctx = buildContext(db, { agentType: 'generic', tokenBudget: 10000 })
    expect(ctx.wasTrimmed).toBe(false)
  })

  it('works with an empty database', () => {
    const emptyDb = makeDb([])
    const ctx = buildContext(emptyDb)
    expect(ctx.entries).toHaveLength(0)
    expect(ctx.tokenCount).toBeGreaterThan(0) // still has preamble
    expect(ctx.wasTrimmed).toBe(false)
  })

  it('stats.totalSelected matches the unfiltered count before trimming', () => {
    const ctx = buildContext(db, { agentType: 'generic' })
    expect(ctx.stats.totalSelected).toBe(entries.length)
  })

  it('stats.depsAdded reflects added dependencies', () => {
    const entriesWithDeps = [
      makeEntry('parent', { deps: { runtime: ['child'] } }),
      makeEntry('child'),
    ]
    const dbWithDeps = makeDb(entriesWithDeps)
    const ctx = buildContext(dbWithDeps, { ids: ['parent'], includeDeps: true })
    expect(ctx.stats.depsAdded).toBe(1)
  })
})

// ============================================================================
// buildContextForAgent
// ============================================================================

describe('buildContextForAgent', () => {
  const db = makeDb([makeEntry('module_a', { tags: ['ui'] })])

  it('is equivalent to buildContext with agentType set', () => {
    const ctx1 = buildContext(db, { agentType: 'codegen', scope: ['ui'] })
    const ctx2 = buildContextForAgent('codegen', db, { scope: ['ui'] })
    expect(ctx1.agentType).toBe(ctx2.agentType)
    expect(ctx1.entries.length).toBe(ctx2.entries.length)
  })

  it('sets the correct agentType in the result', () => {
    const ctx = buildContextForAgent('docgen', db)
    expect(ctx.agentType).toBe('docgen')
  })

  it('uses docgen template preamble', () => {
    const ctx = buildContextForAgent('docgen', db)
    expect(ctx.prompt).toContain(PROMPT_TEMPLATES.docgen.preamble)
  })
})

// ============================================================================
// suggestAnnotation
// ============================================================================

describe('suggestAnnotation', () => {
  const db = makeDb([makeEntry('existing_module', { filePath: 'src/lib/existing.ts' })])

  it('returns a JSDoc comment block', () => {
    const suggestion = suggestAnnotation('src/lib/my-util.ts', db)
    expect(suggestion).toMatch(/^\/\*\*/)
    expect(suggestion).toMatch(/\*\/$/)
  })

  it('includes @mm:id based on file name', () => {
    const suggestion = suggestAnnotation('src/lib/my_util.ts', db)
    expect(suggestion).toContain('@mm:id')
    expect(suggestion).toContain('my_util')
  })

  it('sanitizes special characters in ID', () => {
    const suggestion = suggestAnnotation('src/lib/my-awesome-util.ts', db)
    expect(suggestion).toContain('@mm:id my_awesome_util')
  })

  it('infers lib tag for files in lib/ directory', () => {
    const suggestion = suggestAnnotation('src/lib/new-module.ts', db)
    expect(suggestion).toContain('@mm:tags')
    expect(suggestion).toContain('lib')
  })

  it('infers ui tag for files in components/ directory', () => {
    const suggestion = suggestAnnotation('src/components/MyButton.ts', db)
    expect(suggestion).toContain('@mm:tags')
    expect(suggestion).toContain('ui')
  })

  it('infers scripts tag for files in scripts/ directory', () => {
    const suggestion = suggestAnnotation('scripts/my-tool.ts', db)
    expect(suggestion).toContain('@mm:tags')
    expect(suggestion).toContain('scripts')
  })

  it('includes @mm:desc with TODO placeholder', () => {
    const suggestion = suggestAnnotation('src/lib/test.ts', db)
    expect(suggestion).toContain('@mm:desc TODO')
  })

  it('includes @mm:status draft', () => {
    const suggestion = suggestAnnotation('src/lib/test.ts', db)
    expect(suggestion).toContain('@mm:status draft')
  })
})

// ============================================================================
// runPreCommitCheck
// ============================================================================

describe('runPreCommitCheck', () => {
  const entries = [
    makeEntry('existing_module', { filePath: 'src/lib/existing.ts' }),
    makeEntry('another_module', { filePath: 'src/ui/component.vue' }),
  ]
  const db = makeDb(entries)

  it('returns empty array when all files are annotated', () => {
    const result = runPreCommitCheck(['src/lib/existing.ts', 'src/ui/component.vue'], db)
    expect(result).toHaveLength(0)
  })

  it('returns missing files with suggestions', () => {
    const result = runPreCommitCheck(['src/lib/new-module.ts'], db)
    expect(result).toHaveLength(1)
    expect(result[0].filePath).toBe('src/lib/new-module.ts')
    expect(result[0].suggestion).toContain('@mm:id')
  })

  it('skips non-source files', () => {
    const result = runPreCommitCheck(
      ['docs/README.md', '.github/workflows/ci.yml', 'package.json'],
      db
    )
    expect(result).toHaveLength(0)
  })

  it('handles .vue files', () => {
    const result = runPreCommitCheck(['src/components/NewComponent.vue'], db)
    expect(result).toHaveLength(1)
    expect(result[0].suggestion).toContain('@mm:id')
  })

  it('handles .tsx files', () => {
    const result = runPreCommitCheck(['src/components/Widget.tsx'], db)
    expect(result).toHaveLength(1)
  })

  it('returns empty when no files are provided', () => {
    const result = runPreCommitCheck([], db)
    expect(result).toHaveLength(0)
  })

  it('suggestion includes tags inferred from path', () => {
    const result = runPreCommitCheck(['src/lib/new-util.ts'], db)
    expect(result).toHaveLength(1)
    const { suggestion } = result[0]
    expect(suggestion).toContain('lib')
  })
})

// ============================================================================
// Output format details
// ============================================================================

describe('context output format details', () => {
  const entries = [
    makeEntry('module_x', {
      name: 'Module X',
      tags: ['ui'],
      status: 'stable',
      visibility: 'public',
      phase: 3,
      deps: { runtime: ['dep_y'], build: ['dep_z'] },
      ai: 'short AI summary',
    }),
  ]
  const db = makeDb(entries)

  it('markdown: includes entity name in header', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'markdown' })
    expect(ctx.prompt).toContain('Module X')
    expect(ctx.prompt).toContain('###')
  })

  it('markdown: includes tags, status, visibility, phase, file', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'markdown' })
    expect(ctx.prompt).toContain('tags: ui')
    expect(ctx.prompt).toContain('status: stable')
    expect(ctx.prompt).toContain('visibility: public')
    expect(ctx.prompt).toContain('phase: 3')
  })

  it('markdown: includes dep types', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'markdown' })
    expect(ctx.prompt).toContain('runtime:')
    expect(ctx.prompt).toContain('dep_y')
  })

  it('markdown: includes AI string summary', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'markdown' })
    expect(ctx.prompt).toContain('short AI summary')
  })

  it('markdown: includes AI object fields', () => {
    const entriesWithAiObj = [
      makeEntry('module_z', {
        ai: { summary: 'Object summary', usage: 'Call like this', examples: ['ex1', 'ex2'] },
      }),
    ]
    const dbWithAi = makeDb(entriesWithAiObj)
    const ctx = buildContext(dbWithAi, { agentType: 'generic', format: 'markdown' })
    expect(ctx.prompt).toContain('Object summary')
    expect(ctx.prompt).toContain('Call like this')
    expect(ctx.prompt).toContain('ex1')
  })

  it('json: output is valid JSON inside a code block', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'json' })
    const jsonMatch = ctx.prompt.match(/```json\n([\s\S]*?)\n```/)
    expect(jsonMatch).not.toBeNull()
    expect(() => JSON.parse(jsonMatch![1])).not.toThrow()
  })

  it('text: one entry per line with id and desc', () => {
    const ctx = buildContext(db, { agentType: 'generic', format: 'text' })
    expect(ctx.prompt).toContain('[module_x]')
    expect(ctx.prompt).toContain('Description of module_x')
  })
})
