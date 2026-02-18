/**
 * Tests for MetaMode DB Compiler (MetaMode v2.0, Phase 1)
 *
 * Tests cover:
 * - compileV2Database: scanning and compiling annotations
 * - MmRuntimeApi.findById: exact ID lookup
 * - MmRuntimeApi.findAll: filtering by status, tags, visibility, phase
 * - MmRuntimeApi.findByTag: tag-based lookup
 * - MmRuntimeApi.getDependencies: direct and recursive dependency resolution
 * - MmRuntimeApi.getDependents: reverse dependency lookup
 * - MmRuntimeApi.detectCycle: cycle detection for a single entity
 * - MmRuntimeApi.findAllCycles: full cycle detection
 * - MmRuntimeApi.validate: integrity validation
 * - MmRuntimeApi.exportForLLM: compact and full export for AI
 * - MmRuntimeApi.getGraph: dependency graph retrieval
 * - MmRuntimeApi.exportGraph: JSON and DOT format export
 * - MmRuntimeApi.stats: statistics aggregation
 * - MmRuntimeApi.buildInfo: build metadata
 * - Edge cases: empty database, missing deps, orphaned references
 */

import { describe, it, expect } from 'vitest'
import {
  MmRuntimeApi,
  createMmApi,
  type MmV2Database,
  type MmDbEntry,
} from '../../scripts/metamode-db-compiler'

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

/** Create a minimal MmV2Database */
function makeDb(entries: MmDbEntry[]): MmV2Database {
  const entriesRecord: Record<string, MmDbEntry> = {}
  for (const entry of entries) {
    entriesRecord[entry.id] = entry
  }

  // Build graph
  const graphNodes: MmV2Database['graph']['nodes'] = {}
  const graphEdges: MmV2Database['graph']['edges'] = []

  for (const entry of entries) {
    graphNodes[entry.id] = {
      id: entry.id,
      runtimeDeps: entry.deps?.runtime || [],
      buildDeps: entry.deps?.build || [],
      optionalDeps: entry.deps?.optional || [],
      dependents: [],
    }
  }

  // Fill dependents
  for (const entry of entries) {
    if (!entry.deps) continue
    const allDeps = [
      ...(entry.deps.runtime || []).map((d) => ({ dep: d, type: 'runtime' as const })),
      ...(entry.deps.build || []).map((d) => ({ dep: d, type: 'build' as const })),
      ...(entry.deps.optional || []).map((d) => ({ dep: d, type: 'optional' as const })),
    ]
    for (const { dep, type } of allDeps) {
      graphEdges.push({ from: entry.id, to: dep, type })
      if (graphNodes[dep]) {
        graphNodes[dep].dependents.push(entry.id)
      }
    }
  }

  // Stats
  const byStatus: Record<string, number> = {}
  const byVisibility: Record<string, number> = {}
  const byPhase: Record<number, number> = {}
  const byTag: Record<string, number> = {}

  for (const entry of entries) {
    const status = entry.status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1

    const vis = entry.visibility || 'public'
    byVisibility[vis] = (byVisibility[vis] || 0) + 1

    if (entry.phase !== undefined) {
      byPhase[entry.phase] = (byPhase[entry.phase] || 0) + 1
    }

    if (entry.tags) {
      for (const tag of entry.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1
      }
    }
  }

  const allIds = new Set(Object.keys(entriesRecord))
  const orphanedDependencies: string[] = []
  for (const edge of graphEdges) {
    if (!allIds.has(edge.to) && !orphanedDependencies.includes(edge.to)) {
      orphanedDependencies.push(edge.to)
    }
  }

  const dependentCounts: Record<string, number> = {}
  for (const [id, node] of Object.entries(graphNodes)) {
    dependentCounts[id] = node.dependents.length
  }
  const topDependencies = Object.entries(dependentCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, dependentCount]) => ({ id, dependentCount }))

  return {
    entries: entriesRecord,
    ids: Object.keys(entriesRecord),
    graph: { nodes: graphNodes, edges: graphEdges },
    stats: {
      totalAnnotations: entries.length,
      byStatus,
      byVisibility,
      byPhase,
      byTag,
      topDependencies,
      orphanedDependencies,
    },
    buildInfo: {
      timestamp: '2026-02-18T00:00:00.000Z',
      version: '2.0.0',
      sourceFiles: 3,
      format: 'metamode-v2',
    },
  }
}

/** Sample entries for most tests */
function sampleEntries(): MmDbEntry[] {
  return [
    makeEntry('param_editor', {
      name: 'ParametricEditor',
      tags: ['ui', 'stable'],
      status: 'stable',
      visibility: 'public',
      phase: 5,
      deps: { runtime: ['shader_utils', 'cube_params'], build: ['types_cube'] },
      ai: { summary: 'Visual editor for parametric cube properties' },
    }),
    makeEntry('shader_utils', {
      name: 'ShaderUtils',
      tags: ['utils', 'stable'],
      status: 'stable',
      visibility: 'public',
      phase: 1,
    }),
    makeEntry('cube_params', {
      name: 'CubeParams',
      tags: ['types', 'stable'],
      status: 'stable',
      visibility: 'internal',
      phase: 1,
    }),
    makeEntry('types_cube', {
      name: 'CubeTypes',
      tags: ['types'],
      status: 'beta',
      visibility: 'public',
      phase: 1,
    }),
    makeEntry('fft_engine', {
      name: 'FFTEngine',
      tags: ['utils', 'experimental'],
      status: 'experimental',
      visibility: 'internal',
      phase: 2,
      deps: { runtime: ['shader_utils'], optional: ['wasm_fft'] },
    }),
    makeEntry('wasm_fft', {
      name: 'WasmFFT',
      tags: ['wasm'],
      status: 'experimental',
      visibility: 'internal',
      phase: 2,
    }),
  ]
}

// ============================================================================
// createMmApi factory
// ============================================================================

describe('createMmApi', () => {
  it('should create an MmRuntimeApi instance', () => {
    const db = makeDb([makeEntry('test')])
    const mm = createMmApi(db)
    expect(mm).toBeInstanceOf(MmRuntimeApi)
  })

  it('should expose the db_ property', () => {
    const db = makeDb([makeEntry('test')])
    const mm = createMmApi(db)
    expect(mm.db_).toBe(db)
  })
})

// ============================================================================
// findById
// ============================================================================

describe('MmRuntimeApi.findById', () => {
  it('should return an entry by its ID', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const entry = mm.findById('param_editor')
    expect(entry).toBeDefined()
    expect(entry?.id).toBe('param_editor')
    expect(entry?.name).toBe('ParametricEditor')
  })

  it('should return undefined for an unknown ID', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.findById('nonexistent')).toBeUndefined()
  })

  it('should return undefined on empty database', () => {
    const mm = createMmApi(makeDb([]))
    expect(mm.findById('anything')).toBeUndefined()
  })

  it('should return the exact entry object', () => {
    const entries = sampleEntries()
    const mm = createMmApi(makeDb(entries))
    const entry = mm.findById('shader_utils')
    expect(entry?.tags).toContain('utils')
    expect(entry?.status).toBe('stable')
  })
})

// ============================================================================
// findAll
// ============================================================================

describe('MmRuntimeApi.findAll', () => {
  it('should return all entries with no options', () => {
    const entries = sampleEntries()
    const mm = createMmApi(makeDb(entries))
    expect(mm.findAll()).toHaveLength(entries.length)
  })

  it('should filter by single status', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const stable = mm.findAll({ status: 'stable' })
    expect(stable.length).toBeGreaterThan(0)
    for (const e of stable) {
      expect(e.status).toBe('stable')
    }
  })

  it('should filter by multiple statuses', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const results = mm.findAll({ status: ['stable', 'beta'] })
    for (const e of results) {
      expect(['stable', 'beta']).toContain(e.status)
    }
  })

  it('should filter by visibility', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const internal = mm.findAll({ visibility: 'internal' })
    for (const e of internal) {
      expect(e.visibility).toBe('internal')
    }
  })

  it('should filter by phase', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const phase1 = mm.findAll({ phase: 1 })
    for (const e of phase1) {
      expect(e.phase).toBe(1)
    }
  })

  it('should filter by multiple phases', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const results = mm.findAll({ phase: [1, 2] })
    for (const e of results) {
      expect([1, 2]).toContain(e.phase)
    }
  })

  it('should filter by tags (any match)', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const utils = mm.findAll({ tags: ['utils'] })
    for (const e of utils) {
      expect(e.tags).toContain('utils')
    }
  })

  it('should return empty array when no matches', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.findAll({ status: 'deprecated' })
    expect(result).toHaveLength(0)
  })

  it('should combine filters (tags + status)', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.findAll({ tags: ['stable'], status: 'stable' })
    for (const e of result) {
      expect(e.tags).toContain('stable')
      expect(e.status).toBe('stable')
    }
  })
})

// ============================================================================
// findByTag
// ============================================================================

describe('MmRuntimeApi.findByTag', () => {
  it('should return entries with the given tag', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const results = mm.findByTag('ui')
    expect(results.length).toBeGreaterThan(0)
    for (const e of results) {
      expect(e.tags).toContain('ui')
    }
  })

  it('should return empty array for unknown tag', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.findByTag('nonexistent_tag')).toHaveLength(0)
  })

  it('should support additional filters', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const results = mm.findByTag('utils', { status: 'stable' })
    for (const e of results) {
      expect(e.tags).toContain('utils')
      expect(e.status).toBe('stable')
    }
  })

  it('should find entries with wasm tag', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const results = mm.findByTag('wasm')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('wasm_fft')
  })
})

// ============================================================================
// getDependencies
// ============================================================================

describe('MmRuntimeApi.getDependencies', () => {
  it('should return all dependencies by default (type=all)', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const deps = mm.getDependencies('param_editor')
    expect(deps).toContain('shader_utils')
    expect(deps).toContain('cube_params')
    expect(deps).toContain('types_cube')
  })

  it('should filter by type=runtime', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const deps = mm.getDependencies('param_editor', { type: 'runtime' })
    expect(deps).toContain('shader_utils')
    expect(deps).toContain('cube_params')
    expect(deps).not.toContain('types_cube') // types_cube is a build dep
  })

  it('should filter by type=build', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const deps = mm.getDependencies('param_editor', { type: 'build' })
    expect(deps).toContain('types_cube')
    expect(deps).not.toContain('shader_utils')
  })

  it('should filter by type=optional', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const optional = mm.getDependencies('fft_engine', { type: 'optional' })
    expect(optional).toContain('wasm_fft')
    expect(optional).not.toContain('shader_utils')
  })

  it('should return empty array for entry without deps', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.getDependencies('shader_utils')).toHaveLength(0)
  })

  it('should return empty array for unknown ID', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.getDependencies('nonexistent')).toHaveLength(0)
  })

  it('should return direct and transitive deps when recursive=true', () => {
    const entries = [
      makeEntry('a', { deps: { runtime: ['b'] } }),
      makeEntry('b', { deps: { runtime: ['c'] } }),
      makeEntry('c'),
    ]
    const mm = createMmApi(makeDb(entries))
    const deps = mm.getDependencies('a', { type: 'runtime', recursive: true })
    expect(deps).toContain('b')
    expect(deps).toContain('c')
  })

  it('should not loop forever on direct recursive deps', () => {
    // a -> b -> a (cycle)
    const entries = [
      makeEntry('a', { deps: { runtime: ['b'] } }),
      makeEntry('b', { deps: { runtime: ['a'] } }),
    ]
    const mm = createMmApi(makeDb(entries))
    // Should not throw and should return both in some order
    const deps = mm.getDependencies('a', { type: 'runtime', recursive: true })
    expect(deps).toBeDefined()
  })
})

// ============================================================================
// getDependents
// ============================================================================

describe('MmRuntimeApi.getDependents', () => {
  it('should return entities that depend on the given ID', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const dependents = mm.getDependents('shader_utils')
    expect(dependents).toContain('param_editor')
    expect(dependents).toContain('fft_engine')
  })

  it('should return empty array for entity with no dependents', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.getDependents('param_editor')).toHaveLength(0)
  })

  it('should return empty array for unknown ID', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.getDependents('nonexistent')).toHaveLength(0)
  })

  it('should return single dependent', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const dependents = mm.getDependents('wasm_fft')
    expect(dependents).toHaveLength(1)
    expect(dependents[0]).toBe('fft_engine')
  })
})

// ============================================================================
// detectCycle
// ============================================================================

describe('MmRuntimeApi.detectCycle', () => {
  it('should return null when no cycle exists', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    // param_editor -> shader_utils (no cycle)
    expect(mm.detectCycle('param_editor')).toBeNull()
    expect(mm.detectCycle('shader_utils')).toBeNull()
  })

  it('should detect a direct cycle (a -> b -> a)', () => {
    const entries = [
      makeEntry('a', { deps: { runtime: ['b'] } }),
      makeEntry('b', { deps: { runtime: ['a'] } }),
    ]
    const mm = createMmApi(makeDb(entries))
    const cycle = mm.detectCycle('a')
    expect(cycle).not.toBeNull()
    expect(cycle).toContain('a')
  })

  it('should detect an indirect cycle (a -> b -> c -> a)', () => {
    const entries = [
      makeEntry('a', { deps: { runtime: ['b'] } }),
      makeEntry('b', { deps: { runtime: ['c'] } }),
      makeEntry('c', { deps: { runtime: ['a'] } }),
    ]
    const mm = createMmApi(makeDb(entries))
    const cycle = mm.detectCycle('a')
    expect(cycle).not.toBeNull()
    expect(cycle!.length).toBeGreaterThanOrEqual(3)
  })

  it('should return null for unknown ID', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.detectCycle('nonexistent')).toBeNull()
  })
})

// ============================================================================
// findAllCycles
// ============================================================================

describe('MmRuntimeApi.findAllCycles', () => {
  it('should return empty array when no cycles', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.findAllCycles()).toHaveLength(0)
  })

  it('should detect a single direct cycle', () => {
    const entries = [
      makeEntry('x', { deps: { runtime: ['y'] } }),
      makeEntry('y', { deps: { runtime: ['x'] } }),
      makeEntry('z'),
    ]
    const mm = createMmApi(makeDb(entries))
    const cycles = mm.findAllCycles()
    expect(cycles.length).toBeGreaterThanOrEqual(1)
  })

  it('should return cycles as arrays of IDs', () => {
    const entries = [
      makeEntry('a', { deps: { runtime: ['b'] } }),
      makeEntry('b', { deps: { runtime: ['a'] } }),
    ]
    const mm = createMmApi(makeDb(entries))
    const cycles = mm.findAllCycles()
    expect(cycles[0]).toBeInstanceOf(Array)
    expect(cycles[0].length).toBeGreaterThan(1)
  })

  it('should return empty array on empty database', () => {
    const mm = createMmApi(makeDb([]))
    expect(mm.findAllCycles()).toHaveLength(0)
  })
})

// ============================================================================
// validate
// ============================================================================

describe('MmRuntimeApi.validate', () => {
  it('should return valid=true for a clean database', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.validate()
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should report errors for circular dependencies', () => {
    const entries = [
      makeEntry('a', { deps: { runtime: ['b'] } }),
      makeEntry('b', { deps: { runtime: ['a'] } }),
    ]
    const mm = createMmApi(makeDb(entries))
    const result = mm.validate()
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('Circular')
  })

  it('should warn for orphaned dependencies', () => {
    const entries = [makeEntry('x', { deps: { runtime: ['missing_dep'] } })]
    const mm = createMmApi(makeDb(entries))
    const result = mm.validate()
    expect(result.warnings.some((w) => w.includes('missing_dep'))).toBe(true)
  })

  it('should warn for missing desc field', () => {
    const entries = [makeEntry('no_desc', { desc: undefined })]
    const mm = createMmApi(makeDb(entries))
    const result = mm.validate()
    expect(result.warnings.some((w) => w.includes('no_desc') && w.includes('desc'))).toBe(true)
  })

  it('should return valid on empty database', () => {
    const mm = createMmApi(makeDb([]))
    const result = mm.validate()
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// exportForLLM
// ============================================================================

describe('MmRuntimeApi.exportForLLM', () => {
  it('should return an array of entries', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.exportForLLM() as unknown[]
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('should use compact format by default', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.exportForLLM({ format: 'compact' }) as Array<Record<string, unknown>>
    // Compact entries should have id
    for (const item of result) {
      expect(item.id).toBeDefined()
    }
  })

  it('should filter by scope (tags)', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.exportForLLM({ scope: ['ui'] }) as Array<Record<string, unknown>>
    for (const item of result) {
      expect(item.id).toBeDefined()
    }
    expect(result.length).toBeGreaterThan(0)
    expect(result.length).toBeLessThan(sampleEntries().length)
  })

  it('should include AI summary when available', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.exportForLLM({ format: 'compact' }) as Array<Record<string, unknown>>
    const paramEditor = result.find((e) => e.id === 'param_editor')
    expect(paramEditor?.ai).toBe('Visual editor for parametric cube properties')
  })

  it('should apply limit', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.exportForLLM({ limit: 2 }) as unknown[]
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('should return full format when specified', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.exportForLLM({ format: 'full' }) as Array<Record<string, unknown>>
    expect(result.length).toBe(sampleEntries().length)
  })

  it('should include specific fields when fields option provided', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const result = mm.exportForLLM({
      format: 'full',
      fields: ['id', 'status'],
    }) as Array<Record<string, unknown>>
    for (const item of result) {
      expect(item.id).toBeDefined()
      // status may be undefined for some entries
    }
  })
})

// ============================================================================
// getGraph
// ============================================================================

describe('MmRuntimeApi.getGraph', () => {
  it('should return the graph object', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const graph = mm.getGraph()
    expect(graph).toBeDefined()
    expect(graph.nodes).toBeDefined()
    expect(graph.edges).toBeDefined()
  })

  it('should have nodes for all entries', () => {
    const entries = sampleEntries()
    const mm = createMmApi(makeDb(entries))
    const graph = mm.getGraph()
    for (const entry of entries) {
      expect(graph.nodes[entry.id]).toBeDefined()
    }
  })

  it('should have edges for declared dependencies', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const graph = mm.getGraph()
    const edge = graph.edges.find(
      (e) => e.from === 'param_editor' && e.to === 'shader_utils' && e.type === 'runtime'
    )
    expect(edge).toBeDefined()
  })

  it('should be empty on empty database', () => {
    const mm = createMmApi(makeDb([]))
    const graph = mm.getGraph()
    expect(Object.keys(graph.nodes)).toHaveLength(0)
    expect(graph.edges).toHaveLength(0)
  })
})

// ============================================================================
// exportGraph
// ============================================================================

describe('MmRuntimeApi.exportGraph', () => {
  it('should export graph as JSON string', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const json = mm.exportGraph({ format: 'json' })
    const parsed = JSON.parse(json)
    expect(parsed.nodes).toBeDefined()
    expect(parsed.edges).toBeDefined()
    expect(Array.isArray(parsed.nodes)).toBe(true)
    expect(Array.isArray(parsed.edges)).toBe(true)
  })

  it('should export graph as DOT format', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const dot = mm.exportGraph({ format: 'dot' })
    expect(dot).toContain('digraph MetaModeGraph')
    expect(dot).toContain('rankdir=LR')
    expect(dot).toContain('}')
  })

  it('should include nodes in DOT output', () => {
    const entries = sampleEntries()
    const mm = createMmApi(makeDb(entries))
    const dot = mm.exportGraph({ format: 'dot' })
    // At least one entry should be in the DOT output
    expect(dot).toContain('param_editor')
  })

  it('should filter edges by type in JSON format', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const json = mm.exportGraph({ format: 'json', edgeType: 'runtime' })
    const parsed = JSON.parse(json)
    for (const edge of parsed.edges) {
      expect(edge.type).toBe('runtime')
    }
  })

  it('should include edge labels in DOT output', () => {
    const entries = [makeEntry('a', { deps: { runtime: ['b'] } }), makeEntry('b')]
    const mm = createMmApi(makeDb(entries))
    const dot = mm.exportGraph({ format: 'dot' })
    expect(dot).toContain('"a" -> "b"')
  })

  it('should use ellipse shape for internal nodes in DOT', () => {
    const entries = [makeEntry('internal_mod', { visibility: 'internal' })]
    const mm = createMmApi(makeDb(entries))
    const dot = mm.exportGraph({ format: 'dot' })
    expect(dot).toContain('ellipse')
  })
})

// ============================================================================
// stats and buildInfo
// ============================================================================

describe('MmRuntimeApi.stats', () => {
  it('should return the correct total annotation count', () => {
    const entries = sampleEntries()
    const mm = createMmApi(makeDb(entries))
    expect(mm.stats.totalAnnotations).toBe(entries.length)
  })

  it('should group by status', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.stats.byStatus['stable']).toBeGreaterThan(0)
  })

  it('should group by visibility', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.stats.byVisibility['public']).toBeGreaterThan(0)
    expect(mm.stats.byVisibility['internal']).toBeGreaterThan(0)
  })

  it('should group by phase', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.stats.byPhase[1]).toBeGreaterThan(0)
  })

  it('should group by tag', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.stats.byTag['stable']).toBeGreaterThan(0)
  })

  it('should list top dependencies', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    // shader_utils is used by param_editor and fft_engine
    const top = mm.stats.topDependencies
    const shaderInTop = top.find((t) => t.id === 'shader_utils')
    expect(shaderInTop).toBeDefined()
    expect(shaderInTop!.dependentCount).toBeGreaterThanOrEqual(2)
  })

  it('should list orphaned dependencies', () => {
    const entries = [makeEntry('x', { deps: { runtime: ['orphan_dep'] } })]
    const mm = createMmApi(makeDb(entries))
    expect(mm.stats.orphanedDependencies).toContain('orphan_dep')
  })

  it('should have zero orphans in clean database', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    expect(mm.stats.orphanedDependencies).toHaveLength(0)
  })
})

describe('MmRuntimeApi.buildInfo', () => {
  it('should return build metadata', () => {
    const mm = createMmApi(makeDb(sampleEntries()))
    const info = mm.buildInfo
    expect(info.version).toBe('2.0.0')
    expect(info.format).toBe('metamode-v2')
    expect(info.timestamp).toBeTruthy()
    expect(typeof info.sourceFiles).toBe('number')
  })
})

// ============================================================================
// Edge cases
// ============================================================================

describe('Edge cases', () => {
  it('should handle entry with string ai field', () => {
    const entries = [makeEntry('x', { ai: 'plain string summary' })]
    const mm = createMmApi(makeDb(entries))
    const result = mm.exportForLLM({ format: 'compact' }) as Array<Record<string, unknown>>
    const entry = result.find((e) => e.id === 'x')
    expect(entry?.ai).toBe('plain string summary')
  })

  it('should handle entry with no deps', () => {
    const mm = createMmApi(makeDb([makeEntry('standalone')]))
    expect(mm.getDependencies('standalone')).toHaveLength(0)
    expect(mm.getDependents('standalone')).toHaveLength(0)
  })

  it('should handle entry with only optional deps', () => {
    const entries = [makeEntry('a', { deps: { optional: ['b'] } }), makeEntry('b')]
    const mm = createMmApi(makeDb(entries))
    const allDeps = mm.getDependencies('a', { type: 'all' })
    expect(allDeps).toContain('b')
    const runtimeDeps = mm.getDependencies('a', { type: 'runtime' })
    expect(runtimeDeps).not.toContain('b')
  })

  it('should handle multiple entries in the same file', () => {
    const entries = [
      makeEntry('a', { filePath: 'src/shared.ts', line: 1 }),
      makeEntry('b', { filePath: 'src/shared.ts', line: 20 }),
    ]
    const mm = createMmApi(makeDb(entries))
    expect(mm.findAll()).toHaveLength(2)
  })

  it('should return deduplicated cycles', () => {
    const entries = [
      makeEntry('a', { deps: { runtime: ['b'] } }),
      makeEntry('b', { deps: { runtime: ['a'] } }),
    ]
    const mm = createMmApi(makeDb(entries))
    const cycles = mm.findAllCycles()
    // Should not have duplicate cycles
    const canonical = cycles.map((c) => [...c].sort().join('|'))
    const unique = new Set(canonical)
    expect(unique.size).toBe(canonical.length)
  })
})
