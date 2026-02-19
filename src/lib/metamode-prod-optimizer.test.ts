/**
 * Tests for MetaMode Production Optimizer (MetaMode v2.0, Phase 4)
 *
 * Tests cover:
 * - stripEntry: strips dev-only fields and returns null for internal entries
 * - rebuildGraph: prunes edges that reference removed internal entries
 * - computeProdStats: computes correct statistics from stripped entries
 * - serializeCompact: produces compact JSON without extra whitespace
 * - optimizeForProduction: end-to-end optimization of a full v2 database
 * - analyzeBundleSize: correctly reports dev/prod size comparison
 * - Edge cases: empty database, all-internal database, mixed entries
 * - AI field handling: objects collapsed to summary, strings passed through
 * - Dependency handling: cross-public deps preserved, internal refs pruned
 */

import { describe, it, expect } from 'vitest'
import {
  stripEntry,
  rebuildGraph,
  computeProdStats,
  serializeCompact,
  optimizeForProduction,
  analyzeBundleSize,
  type MmProdEntry,
  type MmProdDatabase,
} from '../../scripts/metamode-prod-optimizer'
import type { MmV2Database, MmDbEntry, MmGraph } from '../../scripts/metamode-db-compiler'

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a minimal MmDbEntry */
function makeEntry(id: string, overrides: Partial<MmDbEntry> = {}): MmDbEntry {
  return {
    id,
    desc: `Description of ${id}`,
    filePath: `src/${id}.ts`,
    line: 10,
    source: 'jsdoc',
    ...overrides,
  }
}

/** Build a minimal MmGraph from entries */
function buildTestGraph(entries: MmDbEntry[]): MmGraph {
  const nodes: MmGraph['nodes'] = {}
  const edges: MmGraph['edges'] = []

  for (const entry of entries) {
    nodes[entry.id] = {
      id: entry.id,
      runtimeDeps: entry.deps?.runtime || [],
      buildDeps: entry.deps?.build || [],
      optionalDeps: entry.deps?.optional || [],
      dependents: [],
    }
  }

  for (const entry of entries) {
    if (!entry.deps) continue
    const allDeps = [
      ...(entry.deps.runtime || []).map((d) => ({ dep: d, type: 'runtime' as const })),
      ...(entry.deps.build || []).map((d) => ({ dep: d, type: 'build' as const })),
      ...(entry.deps.optional || []).map((d) => ({ dep: d, type: 'optional' as const })),
    ]
    for (const { dep, type } of allDeps) {
      edges.push({ from: entry.id, to: dep, type })
      if (nodes[dep]) {
        nodes[dep].dependents.push(entry.id)
      }
    }
  }

  return { nodes, edges }
}

/** Build a minimal MmV2Database from entries */
function makeDb(entries: MmDbEntry[]): MmV2Database {
  const entriesRecord: Record<string, MmDbEntry> = {}
  for (const entry of entries) {
    entriesRecord[entry.id] = entry
  }

  const graph = buildTestGraph(entries)

  const byStatus: Record<string, number> = {}
  const byVisibility: Record<string, number> = {}
  const byPhase: Record<number, number> = {}
  const byTag: Record<string, number> = {}

  for (const entry of entries) {
    const status = entry.status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1
    const vis = entry.visibility || 'public'
    byVisibility[vis] = (byVisibility[vis] || 0) + 1
    if (entry.phase !== undefined) byPhase[entry.phase] = (byPhase[entry.phase] || 0) + 1
    if (entry.tags) {
      for (const tag of entry.tags) byTag[tag] = (byTag[tag] || 0) + 1
    }
  }

  return {
    entries: entriesRecord,
    ids: entries.map((e) => e.id),
    graph,
    stats: {
      totalAnnotations: entries.length,
      byStatus,
      byVisibility,
      byPhase,
      byTag,
      topDependencies: [],
      orphanedDependencies: [],
    },
    buildInfo: {
      timestamp: '2024-01-01T00:00:00.000Z',
      version: '2.0.0',
      sourceFiles: entries.length,
      format: 'metamode-v2',
    },
  }
}

// ============================================================================
// stripEntry Tests
// ============================================================================

describe('stripEntry', () => {
  it('returns null for internal entries', () => {
    const entry = makeEntry('internal_helper', { visibility: 'internal' })
    expect(stripEntry(entry)).toBeNull()
  })

  it('strips dev-only fields from public entries', () => {
    const entry = makeEntry('my_module', {
      visibility: 'public',
      filePath: 'src/lib/my-module.ts',
      line: 42,
      source: 'jsdoc',
      entityName: 'myModule',
    })
    const result = stripEntry(entry)
    expect(result).not.toBeNull()
    expect(result).not.toHaveProperty('filePath')
    expect(result).not.toHaveProperty('line')
    expect(result).not.toHaveProperty('source')
    expect(result).not.toHaveProperty('entityName')
    expect(result).not.toHaveProperty('visibility')
  })

  it('includes basic fields in stripped entry', () => {
    const entry = makeEntry('my_module', {
      name: 'MyModule',
      desc: 'A module description',
      tags: ['ui', 'stable'],
      status: 'stable',
      phase: 5,
      version: '1.0.0',
    })
    const result = stripEntry(entry)
    expect(result).toMatchObject({
      id: 'my_module',
      name: 'MyModule',
      desc: 'A module description',
      tags: ['ui', 'stable'],
      status: 'stable',
      phase: 5,
      version: '1.0.0',
    })
  })

  it('preserves runtime deps in stripped entry', () => {
    const entry = makeEntry('component', {
      deps: {
        runtime: ['utils', 'store'],
        build: ['types'],
        optional: ['plugin'],
      },
    })
    const result = stripEntry(entry)
    expect(result?.deps).toEqual({
      runtime: ['utils', 'store'],
      build: ['types'],
      optional: ['plugin'],
    })
  })

  it('omits empty dep arrays', () => {
    const entry = makeEntry('component', {
      deps: { runtime: [], build: [], optional: [] },
    })
    const result = stripEntry(entry)
    expect(result?.deps).toBeUndefined()
  })

  it('collapses AI object with summary to string', () => {
    const entry = makeEntry('comp', {
      ai: { summary: 'Short description', usage: 'Use for X', examples: ['foo'] },
    })
    const result = stripEntry(entry)
    expect(result?.ai).toBe('Short description')
  })

  it('passes through AI string as-is', () => {
    const entry = makeEntry('comp', { ai: 'Quick AI summary' })
    const result = stripEntry(entry)
    expect(result?.ai).toBe('Quick AI summary')
  })

  it('omits AI when object has no summary', () => {
    const entry = makeEntry('comp', {
      ai: { usage: 'Use for X', examples: ['foo'] } as Parameters<typeof makeEntry>[1]['ai'] &
        object,
    })
    const result = stripEntry(entry)
    expect(result?.ai).toBeUndefined()
  })

  it('includes entry with undefined visibility (treated as public)', () => {
    const entry = makeEntry('unspecified_vis')
    // No visibility field set — should be included
    const result = stripEntry(entry)
    expect(result).not.toBeNull()
    expect(result?.id).toBe('unspecified_vis')
  })

  it('returns entry without optional fields when they are undefined', () => {
    const entry = makeEntry('minimal')
    const result = stripEntry(entry)
    expect(result?.name).toBeUndefined()
    expect(result?.tags).toBeUndefined()
    expect(result?.status).toBeUndefined()
    expect(result?.phase).toBeUndefined()
    expect(result?.version).toBeUndefined()
    expect(result?.deps).toBeUndefined()
    expect(result?.ai).toBeUndefined()
  })
})

// ============================================================================
// rebuildGraph Tests
// ============================================================================

describe('rebuildGraph', () => {
  it('keeps edges between public entries', () => {
    const entries: Record<string, MmProdEntry> = {
      a: { id: 'a' },
      b: { id: 'b' },
    }
    const fullGraph: MmGraph = {
      nodes: {
        a: { id: 'a', runtimeDeps: ['b'], buildDeps: [], optionalDeps: [], dependents: [] },
        b: { id: 'b', runtimeDeps: [], buildDeps: [], optionalDeps: [], dependents: ['a'] },
      },
      edges: [{ from: 'a', to: 'b', type: 'runtime' }],
    }
    const graph = rebuildGraph(entries, fullGraph)
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toEqual({ from: 'a', to: 'b', type: 'runtime' })
  })

  it('prunes edges to removed internal nodes', () => {
    // Only 'a' is in prod entries; 'internal_b' was removed
    const entries: Record<string, MmProdEntry> = {
      a: { id: 'a' },
    }
    const fullGraph: MmGraph = {
      nodes: {
        a: {
          id: 'a',
          runtimeDeps: ['internal_b'],
          buildDeps: [],
          optionalDeps: [],
          dependents: [],
        },
        internal_b: {
          id: 'internal_b',
          runtimeDeps: [],
          buildDeps: [],
          optionalDeps: [],
          dependents: ['a'],
        },
      },
      edges: [{ from: 'a', to: 'internal_b', type: 'runtime' }],
    }
    const graph = rebuildGraph(entries, fullGraph)
    expect(graph.edges).toHaveLength(0)
  })

  it('prunes edges from removed nodes', () => {
    const entries: Record<string, MmProdEntry> = {
      b: { id: 'b' },
    }
    const fullGraph: MmGraph = {
      nodes: {
        internal_a: {
          id: 'internal_a',
          runtimeDeps: ['b'],
          buildDeps: [],
          optionalDeps: [],
          dependents: [],
        },
        b: {
          id: 'b',
          runtimeDeps: [],
          buildDeps: [],
          optionalDeps: [],
          dependents: ['internal_a'],
        },
      },
      edges: [{ from: 'internal_a', to: 'b', type: 'runtime' }],
    }
    const graph = rebuildGraph(entries, fullGraph)
    expect(graph.edges).toHaveLength(0)
    // 'b' node exists but has no dependents (internal_a was removed)
    expect(graph.nodes['b'].dependents).toHaveLength(0)
  })

  it('initializes nodes for all public entries', () => {
    const entries: Record<string, MmProdEntry> = {
      x: { id: 'x' },
      y: { id: 'y' },
    }
    const graph = rebuildGraph(entries, { nodes: {}, edges: [] })
    expect(graph.nodes).toHaveProperty('x')
    expect(graph.nodes).toHaveProperty('y')
  })

  it('handles empty entries', () => {
    const graph = rebuildGraph({}, { nodes: {}, edges: [{ from: 'a', to: 'b', type: 'runtime' }] })
    expect(graph.edges).toHaveLength(0)
    expect(Object.keys(graph.nodes)).toHaveLength(0)
  })
})

// ============================================================================
// computeProdStats Tests
// ============================================================================

describe('computeProdStats', () => {
  it('counts total annotations', () => {
    const entries: Record<string, MmProdEntry> = {
      a: { id: 'a', status: 'stable' },
      b: { id: 'b', status: 'beta' },
      c: { id: 'c' },
    }
    const stats = computeProdStats(entries)
    expect(stats.totalAnnotations).toBe(3)
  })

  it('groups by status', () => {
    const entries: Record<string, MmProdEntry> = {
      a: { id: 'a', status: 'stable' },
      b: { id: 'b', status: 'stable' },
      c: { id: 'c', status: 'beta' },
      d: { id: 'd' },
    }
    const stats = computeProdStats(entries)
    expect(stats.byStatus).toEqual({ stable: 2, beta: 1, unknown: 1 })
  })

  it('groups by tag', () => {
    const entries: Record<string, MmProdEntry> = {
      a: { id: 'a', tags: ['ui', 'editor'] },
      b: { id: 'b', tags: ['ui'] },
      c: { id: 'c' },
    }
    const stats = computeProdStats(entries)
    expect(stats.byTag).toEqual({ ui: 2, editor: 1 })
  })

  it('returns empty stats for empty database', () => {
    const stats = computeProdStats({})
    expect(stats.totalAnnotations).toBe(0)
    expect(stats.byStatus).toEqual({})
    expect(stats.byTag).toEqual({})
  })

  it('does NOT include byVisibility or byPhase (not in prod stats)', () => {
    const entries: Record<string, MmProdEntry> = {
      a: { id: 'a', phase: 5 },
    }
    const stats = computeProdStats(entries)
    expect(stats).not.toHaveProperty('byVisibility')
    expect(stats).not.toHaveProperty('byPhase')
  })
})

// ============================================================================
// serializeCompact Tests
// ============================================================================

describe('serializeCompact', () => {
  it('produces valid JSON', () => {
    const db: MmProdDatabase = {
      entries: { a: { id: 'a', desc: 'test' } },
      ids: ['a'],
      graph: {
        nodes: { a: { id: 'a', runtimeDeps: [], buildDeps: [], optionalDeps: [], dependents: [] } },
        edges: [],
      },
      stats: { totalAnnotations: 1, byStatus: {}, byTag: {} },
      buildInfo: { version: '2.0.0', format: 'metamode-v2-prod' },
    }
    const json = serializeCompact(db)
    expect(() => JSON.parse(json)).not.toThrow()
    const parsed = JSON.parse(json)
    expect(parsed.entries.a.id).toBe('a')
  })

  it('produces compact JSON (no extra whitespace)', () => {
    const db: MmProdDatabase = {
      entries: { a: { id: 'a' } },
      ids: ['a'],
      graph: { nodes: {}, edges: [] },
      stats: { totalAnnotations: 1, byStatus: {}, byTag: {} },
      buildInfo: { version: '2.0.0', format: 'metamode-v2-prod' },
    }
    const json = serializeCompact(db)
    // Compact JSON should not have newlines or extra spaces
    expect(json).not.toContain('\n')
    expect(json).not.toContain('  ')
  })
})

// ============================================================================
// optimizeForProduction Tests
// ============================================================================

describe('optimizeForProduction', () => {
  it('removes all internal entries', () => {
    const entries = [
      makeEntry('public_a', { visibility: 'public' }),
      makeEntry('internal_b', { visibility: 'internal' }),
      makeEntry('public_c'),
    ]
    const db = makeDb(entries)
    const prodDb = optimizeForProduction(db)

    expect(Object.keys(prodDb.entries)).not.toContain('internal_b')
    expect(prodDb.ids).not.toContain('internal_b')
  })

  it('keeps all public entries', () => {
    const entries = [makeEntry('public_a', { visibility: 'public' }), makeEntry('public_b')]
    const db = makeDb(entries)
    const prodDb = optimizeForProduction(db)

    expect(prodDb.entries).toHaveProperty('public_a')
    expect(prodDb.entries).toHaveProperty('public_b')
  })

  it('strips dev-only fields from prod entries', () => {
    const entries = [makeEntry('comp', { entityName: 'MyComp', filePath: 'src/comp.ts', line: 10 })]
    const db = makeDb(entries)
    const prodDb = optimizeForProduction(db)

    const entry = prodDb.entries['comp']
    expect(entry).not.toHaveProperty('filePath')
    expect(entry).not.toHaveProperty('line')
    expect(entry).not.toHaveProperty('source')
    expect(entry).not.toHaveProperty('entityName')
  })

  it('sets format to metamode-v2-prod', () => {
    const db = makeDb([makeEntry('a')])
    const prodDb = optimizeForProduction(db)
    expect(prodDb.buildInfo.format).toBe('metamode-v2-prod')
  })

  it('preserves version in buildInfo', () => {
    const db = makeDb([makeEntry('a')])
    const prodDb = optimizeForProduction(db)
    expect(prodDb.buildInfo.version).toBe('2.0.0')
  })

  it('returns empty database for all-internal input', () => {
    const entries = [
      makeEntry('internal_a', { visibility: 'internal' }),
      makeEntry('internal_b', { visibility: 'internal' }),
    ]
    const db = makeDb(entries)
    const prodDb = optimizeForProduction(db)

    expect(Object.keys(prodDb.entries)).toHaveLength(0)
    expect(prodDb.ids).toHaveLength(0)
    expect(prodDb.stats.totalAnnotations).toBe(0)
  })

  it('prunes graph edges to removed internal nodes', () => {
    const entries = [
      makeEntry('public_a', {
        visibility: 'public',
        deps: { runtime: ['internal_helper'] },
      }),
      makeEntry('internal_helper', { visibility: 'internal' }),
    ]
    const db = makeDb(entries)
    const prodDb = optimizeForProduction(db)

    // Edge from public_a to internal_helper should be removed
    expect(prodDb.graph.edges).toHaveLength(0)
    // public_a node should have no runtime deps in its node entry
    expect(prodDb.graph.nodes['public_a']?.runtimeDeps).toHaveLength(0)
  })

  it('keeps graph edges between public entries', () => {
    const entries = [
      makeEntry('comp_a', {
        visibility: 'public',
        deps: { runtime: ['lib_b'] },
      }),
      makeEntry('lib_b', { visibility: 'public' }),
    ]
    const db = makeDb(entries)
    const prodDb = optimizeForProduction(db)

    expect(prodDb.graph.edges).toHaveLength(1)
    expect(prodDb.graph.edges[0]).toMatchObject({ from: 'comp_a', to: 'lib_b', type: 'runtime' })
  })

  it('updates ids array to match remaining entries', () => {
    const entries = [
      makeEntry('public_a', { visibility: 'public' }),
      makeEntry('internal_b', { visibility: 'internal' }),
    ]
    const db = makeDb(entries)
    const prodDb = optimizeForProduction(db)

    expect(prodDb.ids).toEqual(['public_a'])
  })

  it('does not include timestamp in buildInfo (prod format)', () => {
    const db = makeDb([makeEntry('a')])
    const prodDb = optimizeForProduction(db)
    // Production database does NOT include a timestamp to ensure reproducible builds
    expect(prodDb.buildInfo).not.toHaveProperty('timestamp')
  })
})

// ============================================================================
// analyzeBundleSize Tests
// ============================================================================

describe('analyzeBundleSize', () => {
  it('reports correct dev and prod sizes', () => {
    const entries = [
      makeEntry('public_a', { desc: 'Public module A with a longer description' }),
      makeEntry('internal_b', {
        visibility: 'internal',
        desc: 'Internal helper',
        entityName: 'helper',
      }),
    ]
    const devDb = makeDb(entries)
    const prodDb = optimizeForProduction(devDb)
    const report = analyzeBundleSize(devDb, prodDb)

    expect(report.devSizeBytes).toBeGreaterThan(0)
    expect(report.prodSizeBytes).toBeGreaterThan(0)
    expect(report.prodSizeBytes).toBeLessThan(report.devSizeBytes)
  })

  it('reports reduction when internal entries exist', () => {
    const entries = [makeEntry('public_a'), makeEntry('internal_b', { visibility: 'internal' })]
    const devDb = makeDb(entries)
    const prodDb = optimizeForProduction(devDb)
    const report = analyzeBundleSize(devDb, prodDb)

    expect(report.savedBytes).toBeGreaterThan(0)
    expect(report.reductionPercent).toBeGreaterThan(0)
    expect(report.internalEntriesRemoved).toBe(1)
  })

  it('reports correct entry counts', () => {
    const entries = [
      makeEntry('a', { visibility: 'public' }),
      makeEntry('b', { visibility: 'public' }),
      makeEntry('c', { visibility: 'internal' }),
      makeEntry('d', { visibility: 'internal' }),
    ]
    const devDb = makeDb(entries)
    const prodDb = optimizeForProduction(devDb)
    const report = analyzeBundleSize(devDb, prodDb)

    expect(report.devEntryCount).toBe(4)
    expect(report.prodEntryCount).toBe(2)
    expect(report.internalEntriesRemoved).toBe(2)
  })

  it('reports zero reduction when there are no internal entries', () => {
    const entries = [makeEntry('a', { visibility: 'public' }), makeEntry('b')]
    const devDb = makeDb(entries)
    const prodDb = optimizeForProduction(devDb)
    const report = analyzeBundleSize(devDb, prodDb)

    // With no internal entries, prod should still be slightly smaller due to
    // stripped dev-only fields (filePath, line, source, entityName)
    expect(report.internalEntriesRemoved).toBe(0)
    expect(report.devEntryCount).toBe(2)
    expect(report.prodEntryCount).toBe(2)
  })

  it('handles empty database', () => {
    const devDb = makeDb([])
    const prodDb = optimizeForProduction(devDb)
    const report = analyzeBundleSize(devDb, prodDb)

    expect(report.devEntryCount).toBe(0)
    expect(report.prodEntryCount).toBe(0)
    expect(report.internalEntriesRemoved).toBe(0)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('production optimization integration', () => {
  it('produces smaller output for a realistic mixed database', () => {
    const entries = [
      makeEntry('param_editor', {
        visibility: 'public',
        tags: ['ui', 'editor'],
        status: 'stable',
        phase: 5,
        desc: 'Visual editor for parametric cube properties',
        ai: { summary: 'Cube editor UI', usage: 'Edit base color, gradients, noise' },
        deps: { runtime: ['shader_utils', 'cube_types'] },
      }),
      makeEntry('shader_utils', {
        visibility: 'public',
        tags: ['lib', 'shader'],
        status: 'stable',
        phase: 3,
        desc: 'Utility functions for GLSL shader management',
      }),
      makeEntry('cube_types', {
        visibility: 'public',
        tags: ['types'],
        status: 'stable',
        desc: 'TypeScript types for parametric cube configuration',
      }),
      makeEntry('internal_helper', {
        visibility: 'internal',
        desc: 'Internal helper function',
        tags: ['internal'],
      }),
      makeEntry('debug_utils', {
        visibility: 'internal',
        desc: 'Debug utilities, dev-only',
        tags: ['debug', 'internal'],
      }),
    ]

    const devDb = makeDb(entries)
    const prodDb = optimizeForProduction(devDb)
    const report = analyzeBundleSize(devDb, prodDb)

    // Should remove 2 internal entries
    expect(report.internalEntriesRemoved).toBe(2)
    expect(report.prodEntryCount).toBe(3)

    // Production should be smaller
    expect(report.prodSizeBytes).toBeLessThan(report.devSizeBytes)
    expect(report.reductionPercent).toBeGreaterThan(0)

    // AI objects should be collapsed
    const editorEntry = prodDb.entries['param_editor']
    expect(typeof editorEntry.ai).toBe('string')
    expect(editorEntry.ai).toBe('Cube editor UI')

    // Graph: edge from param_editor to internal_helper should NOT exist
    const internalEdge = prodDb.graph.edges.find(
      (e) => e.to === 'internal_helper' || e.to === 'debug_utils'
    )
    expect(internalEdge).toBeUndefined()
  })

  it('serialized prod database parses back correctly', () => {
    const entries = [
      makeEntry('comp', {
        visibility: 'public',
        tags: ['ui'],
        status: 'stable',
        deps: { runtime: ['lib'] },
      }),
      makeEntry('lib', { visibility: 'public', status: 'stable' }),
    ]
    const devDb = makeDb(entries)
    const prodDb = optimizeForProduction(devDb)
    const json = serializeCompact(prodDb)
    const parsed = JSON.parse(json) as MmProdDatabase

    expect(Object.keys(parsed.entries)).toHaveLength(2)
    expect(parsed.buildInfo.format).toBe('metamode-v2-prod')
    expect(parsed.ids).toContain('comp')
    expect(parsed.ids).toContain('lib')
  })
})
