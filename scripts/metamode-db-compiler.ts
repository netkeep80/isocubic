/**
 * MetaMode DB Compiler (MetaMode v2.0, Phase 1)
 *
 * Compiles all `@mm:` annotations parsed by the annotation parser (Phase 0)
 * into a unified, queryable MetaMode v2.0 database.
 *
 * The compiled database is exposed as a virtual Vite module:
 *   import mm from 'virtual:metamode/v2/db'
 *
 * The `mm` object provides the full runtime API described in the MetaMode v2.0 spec:
 * - `mm.findById(id)` — find annotation by ID
 * - `mm.findAll({ type, tags, status, visibility })` — find all with filters
 * - `mm.findByTag(tag, options)` — find annotations with a specific tag
 * - `mm.getDependencies(id, { type })` — get dependencies of an entity
 * - `mm.getDependents(id)` — get all entities that depend on the given entity
 * - `mm.detectCycle(id)` — detect if the entity is part of a cycle
 * - `mm.findAllCycles()` — find all circular dependency chains
 * - `mm.validate()` — validate integrity (throws in dev mode)
 * - `mm.exportForLLM({ scope, fields, format })` — export compact AI context
 * - `mm.getGraph()` — get the full dependency graph
 * - `mm.exportGraph({ format })` — export graph as JSON or DOT format
 *
 * The database also includes:
 * - `mm.db` — raw compiled database
 * - `mm.stats` — database statistics
 * - `mm.buildInfo` — build timestamp and version
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  scanDirectoryForAnnotations,
  buildAnnotationIndex,
  type ParsedAnnotation,
  type FileParseResult,
  type MmDeps,
} from './metamode-annotation-parser'

// ============================================================================
// Types: Compiled Database
// ============================================================================

/**
 * A compiled annotation entry in the database.
 * Includes all parsed fields plus location context.
 */
export interface MmDbEntry {
  /** Unique annotation ID */
  id: string
  /** Human-readable name */
  name?: string
  /** Description */
  desc?: string
  /** Tags */
  tags?: string[]
  /** Dependencies (normalized to structured form) */
  deps?: MmDbDeps
  /** AI metadata */
  ai?: { summary?: string; usage?: string; examples?: string[] } | string
  /** Visibility */
  visibility?: 'public' | 'internal'
  /** Semantic version */
  version?: string
  /** Phase number */
  phase?: number
  /** Status */
  status?: string
  /** Source file path (relative to project root) */
  filePath: string
  /** Line number (1-based) */
  line: number
  /** Annotation source type */
  source: 'jsdoc' | 'runtime'
  /** Entity name if detected */
  entityName?: string
}

/** Structured dependency entry */
export interface MmDbDeps {
  runtime?: string[]
  build?: string[]
  optional?: string[]
}

/** Node in the dependency graph */
export interface MmGraphNode {
  id: string
  /** IDs of runtime dependencies */
  runtimeDeps: string[]
  /** IDs of build dependencies */
  buildDeps: string[]
  /** IDs of optional dependencies */
  optionalDeps: string[]
  /** IDs of entities that depend on this one */
  dependents: string[]
}

/** Full dependency graph */
export interface MmGraph {
  nodes: Record<string, MmGraphNode>
  edges: Array<{ from: string; to: string; type: 'runtime' | 'build' | 'optional' }>
}

/** Database statistics */
export interface MmDbStats {
  totalAnnotations: number
  byStatus: Record<string, number>
  byVisibility: Record<string, number>
  byPhase: Record<number, number>
  byTag: Record<string, number>
  topDependencies: Array<{ id: string; dependentCount: number }>
  orphanedDependencies: string[]
}

/** Build metadata */
export interface MmDbBuildInfo {
  timestamp: string
  version: string
  sourceFiles: number
  format: 'metamode-v2'
}

/** The full compiled v2 database */
export interface MmV2Database {
  /** All entries indexed by ID */
  entries: Record<string, MmDbEntry>
  /** All entry IDs as a flat array */
  ids: string[]
  /** Dependency graph */
  graph: MmGraph
  /** Statistics */
  stats: MmDbStats
  /** Build metadata */
  buildInfo: MmDbBuildInfo
}

/** Options for findAll */
export interface MmFindAllOptions {
  tags?: string[]
  status?: string | string[]
  visibility?: 'public' | 'internal'
  phase?: number | number[]
}

/** Options for getDependencies */
export interface MmGetDepsOptions {
  type?: 'runtime' | 'build' | 'optional' | 'all'
  recursive?: boolean
}

/** Options for exportForLLM */
export interface MmExportLLMOptions {
  /** Only include entries with these tags */
  scope?: string[]
  /** Which fields to include (default: all) */
  fields?: (keyof MmDbEntry)[]
  /** Output format */
  format?: 'compact' | 'full'
  /** Maximum entries to include */
  limit?: number
}

/** Options for exportGraph */
export interface MmExportGraphOptions {
  format: 'json' | 'dot'
  /** Only include edges of this type */
  edgeType?: 'runtime' | 'build' | 'optional' | 'all'
}

// ============================================================================
// Database Compilation
// ============================================================================

/**
 * Normalize deps from the parser's mixed format to a structured MmDbDeps
 */
function normalizeDeps(deps: MmDeps | string[] | undefined): MmDbDeps | undefined {
  if (!deps) return undefined

  if (Array.isArray(deps)) {
    return deps.length > 0 ? { runtime: deps } : undefined
  }

  const result: MmDbDeps = {}
  if (deps.runtime && deps.runtime.length > 0) result.runtime = deps.runtime
  if (deps.build && deps.build.length > 0) result.build = deps.build
  if (deps.optional && deps.optional.length > 0) result.optional = deps.optional

  return Object.keys(result).length > 0 ? result : undefined
}

/**
 * Convert a ParsedAnnotation to an MmDbEntry.
 * Requires the annotation to have an `id`.
 */
function toDbEntry(parsed: ParsedAnnotation, filePath: string, projectRoot: string): MmDbEntry {
  const ann = parsed.annotation
  const relPath = path.relative(projectRoot, filePath)

  return {
    id: ann.id!,
    ...(ann.name !== undefined && { name: ann.name }),
    ...(ann.desc !== undefined && { desc: ann.desc }),
    ...(ann.tags !== undefined && { tags: ann.tags }),
    ...(ann.ai !== undefined && { ai: ann.ai }),
    ...(ann.visibility !== undefined && { visibility: ann.visibility }),
    ...(ann.version !== undefined && { version: ann.version }),
    ...(ann.phase !== undefined && { phase: ann.phase }),
    ...(ann.status !== undefined && { status: ann.status }),
    ...(normalizeDeps(ann.deps as MmDeps | string[] | undefined) !== undefined && {
      deps: normalizeDeps(ann.deps as MmDeps | string[] | undefined),
    }),
    filePath: relPath,
    line: parsed.line,
    source: parsed.source,
    ...(parsed.entityName !== undefined && { entityName: parsed.entityName }),
  }
}

/**
 * Build the dependency graph from all entries.
 */
function buildGraph(entries: Record<string, MmDbEntry>): MmGraph {
  const nodes: Record<string, MmGraphNode> = {}
  const edges: MmGraph['edges'] = []

  // Initialize all nodes
  for (const id of Object.keys(entries)) {
    nodes[id] = {
      id,
      runtimeDeps: [],
      buildDeps: [],
      optionalDeps: [],
      dependents: [],
    }
  }

  // Fill in dependencies
  for (const [id, entry] of Object.entries(entries)) {
    const deps = entry.deps
    if (!deps) continue

    if (deps.runtime) {
      for (const dep of deps.runtime) {
        nodes[id].runtimeDeps.push(dep)
        edges.push({ from: id, to: dep, type: 'runtime' })
        if (nodes[dep]) {
          nodes[dep].dependents.push(id)
        }
      }
    }

    if (deps.build) {
      for (const dep of deps.build) {
        nodes[id].buildDeps.push(dep)
        edges.push({ from: id, to: dep, type: 'build' })
        if (nodes[dep]) {
          nodes[dep].dependents.push(id)
        }
      }
    }

    if (deps.optional) {
      for (const dep of deps.optional) {
        nodes[id].optionalDeps.push(dep)
        edges.push({ from: id, to: dep, type: 'optional' })
        if (nodes[dep]) {
          nodes[dep].dependents.push(id)
        }
      }
    }
  }

  return { nodes, edges }
}

/**
 * Compute database statistics
 */
function computeStats(entries: Record<string, MmDbEntry>, graph: MmGraph): MmDbStats {
  const byStatus: Record<string, number> = {}
  const byVisibility: Record<string, number> = {}
  const byPhase: Record<number, number> = {}
  const byTag: Record<string, number> = {}
  const dependentCounts: Record<string, number> = {}

  for (const entry of Object.values(entries)) {
    // Status
    const status = entry.status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1

    // Visibility
    const vis = entry.visibility || 'public'
    byVisibility[vis] = (byVisibility[vis] || 0) + 1

    // Phase
    if (entry.phase !== undefined) {
      byPhase[entry.phase] = (byPhase[entry.phase] || 0) + 1
    }

    // Tags
    if (entry.tags) {
      for (const tag of entry.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1
      }
    }
  }

  // Top dependencies: most depended-upon nodes
  for (const [id, node] of Object.entries(graph.nodes)) {
    dependentCounts[id] = node.dependents.length
  }

  const topDependencies = Object.entries(dependentCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, dependentCount]) => ({ id, dependentCount }))

  // Orphaned: referenced in deps but not in the index
  const allIds = new Set(Object.keys(entries))
  const orphanedDependencies: string[] = []
  for (const edge of graph.edges) {
    if (!allIds.has(edge.to) && !orphanedDependencies.includes(edge.to)) {
      orphanedDependencies.push(edge.to)
    }
  }

  return {
    totalAnnotations: Object.keys(entries).length,
    byStatus,
    byVisibility,
    byPhase,
    byTag,
    topDependencies,
    orphanedDependencies,
  }
}

/**
 * Compile all @mm: annotations from a directory into a v2 database.
 */
export function compileV2Database(
  rootDir: string,
  options: { srcDir?: string } = {}
): MmV2Database {
  const srcDir = options.srcDir || path.join(rootDir, 'src')
  const scanDir = fs.existsSync(srcDir) ? srcDir : rootDir

  // Scan for annotations
  const results: FileParseResult[] = scanDirectoryForAnnotations(scanDir, {
    extensions: ['.ts', '.js', '.vue'],
    recursive: true,
    exclude: ['node_modules', 'dist', '.git', 'coverage'],
  })

  // Also scan scripts/ directory for annotated scripts
  const scriptsDir = path.join(rootDir, 'scripts')
  if (fs.existsSync(scriptsDir)) {
    const scriptResults = scanDirectoryForAnnotations(scriptsDir, {
      extensions: ['.ts', '.js'],
      recursive: false,
    })
    results.push(...scriptResults)
  }

  // Build annotation index
  const index = buildAnnotationIndex(results)

  // Build result map: file parse results indexed by filePath
  const fileResultMap = new Map<string, FileParseResult>()
  for (const result of results) {
    fileResultMap.set(result.filePath, result)
  }

  // Convert to MmDbEntry
  const entries: Record<string, MmDbEntry> = {}
  for (const [id, parsed] of index.entries()) {
    // Find which file this came from
    let filePath = '<unknown>'
    for (const result of results) {
      if (result.annotations.includes(parsed)) {
        filePath = result.filePath
        break
      }
    }

    // Only include annotations with an actual id field
    if (parsed.annotation.id) {
      entries[id] = toDbEntry(parsed, filePath, rootDir)
    }
  }

  const graph = buildGraph(entries)
  const stats = computeStats(entries, graph)

  const buildInfo: MmDbBuildInfo = {
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    sourceFiles: results.length,
    format: 'metamode-v2',
  }

  return {
    entries,
    ids: Object.keys(entries),
    graph,
    stats,
    buildInfo,
  }
}

// ============================================================================
// Runtime API (the `mm` object exposed via virtual:metamode/v2/db)
// ============================================================================

/**
 * MetaMode v2.0 Runtime API.
 *
 * This class provides the full query API over the compiled annotation database.
 * Instances are created by the `createMmApi()` factory and exposed via virtual modules.
 */
export class MmRuntimeApi {
  private db: MmV2Database

  constructor(database: MmV2Database) {
    this.db = database
  }

  /**
   * Find an entry by its `@mm:id`.
   * Returns undefined if not found.
   *
   * @example
   * const entry = mm.findById('param_editor')
   */
  findById(id: string): MmDbEntry | undefined {
    return this.db.entries[id]
  }

  /**
   * Find all entries, with optional filtering.
   *
   * @example
   * const allComponents = mm.findAll({ tags: ['ui'] })
   * const stableEntries = mm.findAll({ status: 'stable' })
   */
  findAll(options: MmFindAllOptions = {}): MmDbEntry[] {
    const { tags, status, visibility, phase } = options

    const statusList = status ? (Array.isArray(status) ? status : [status]) : undefined
    const phaseList = phase ? (Array.isArray(phase) ? phase : [phase]) : undefined

    return Object.values(this.db.entries).filter((entry) => {
      if (statusList && !statusList.includes(entry.status || 'unknown')) return false
      if (visibility && entry.visibility !== visibility) return false
      if (phaseList && (entry.phase === undefined || !phaseList.includes(entry.phase))) return false
      if (tags && tags.length > 0) {
        const entryTags = entry.tags || []
        if (!tags.some((t) => entryTags.includes(t))) return false
      }
      return true
    })
  }

  /**
   * Find all entries that have a specific tag.
   *
   * @example
   * const stableUI = mm.findByTag('ui', { status: 'stable' })
   */
  findByTag(tag: string, options: Omit<MmFindAllOptions, 'tags'> = {}): MmDbEntry[] {
    return this.findAll({ ...options, tags: [tag] })
  }

  /**
   * Get the dependency IDs of an entry.
   *
   * @param id - The annotation ID to look up
   * @param options - Options including type filter and recursive flag
   * @returns Array of dependency IDs
   *
   * @example
   * const runtimeDeps = mm.getDependencies('param_editor', { type: 'runtime' })
   * const allDeps = mm.getDependencies('param_editor', { type: 'all', recursive: true })
   */
  getDependencies(id: string, options: MmGetDepsOptions = {}): string[] {
    const { type = 'all', recursive = false } = options
    const entry = this.db.entries[id]
    if (!entry || !entry.deps) return []

    const collectDirect = (entryId: string): string[] => {
      const e = this.db.entries[entryId]
      if (!e || !e.deps) return []

      const deps: string[] = []
      if (type === 'runtime' || type === 'all') {
        deps.push(...(e.deps.runtime || []))
      }
      if (type === 'build' || type === 'all') {
        deps.push(...(e.deps.build || []))
      }
      if (type === 'optional' || type === 'all') {
        deps.push(...(e.deps.optional || []))
      }
      return deps
    }

    if (!recursive) {
      return collectDirect(id)
    }

    // Recursive: BFS traversal
    const visited = new Set<string>()
    const queue: string[] = [id]
    const result: string[] = []

    while (queue.length > 0) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      if (current !== id) {
        result.push(current)
      }

      const direct = collectDirect(current)
      for (const dep of direct) {
        if (!visited.has(dep)) {
          queue.push(dep)
        }
      }
    }

    return result
  }

  /**
   * Get all entries that depend on the given entity.
   *
   * @example
   * const dependents = mm.getDependents('lib/params')
   */
  getDependents(id: string): string[] {
    const node = this.db.graph.nodes[id]
    if (!node) return []
    return [...node.dependents]
  }

  /**
   * Check if an entity is part of a circular dependency chain.
   * Returns the cycle path if detected, or null if no cycle.
   *
   * @example
   * const cycle = mm.detectCycle('param_editor')
   * if (cycle) console.log('Cycle:', cycle.join(' → '))
   */
  detectCycle(id: string): string[] | null {
    const allCycles = this.findAllCycles()
    for (const cycle of allCycles) {
      if (cycle.includes(id)) {
        return cycle
      }
    }
    return null
  }

  /**
   * Find all circular dependency chains in the dependency graph.
   * Only considers runtime dependencies.
   *
   * @returns Array of cycles, each represented as an array of IDs
   *
   * @example
   * const cycles = mm.findAllCycles()
   * for (const cycle of cycles) console.log(cycle.join(' → '))
   */
  findAllCycles(): string[][] {
    const graph = this.db.graph
    const cycles: string[][] = []
    const visited = new Set<string>()
    const inStack = new Set<string>()
    const stack: string[] = []

    const dfs = (nodeId: string) => {
      if (inStack.has(nodeId)) {
        const cycleStart = stack.indexOf(nodeId)
        if (cycleStart !== -1) {
          const cycle = [...stack.slice(cycleStart), nodeId]
          // Deduplicate cycles by canonical form
          const canonical = [...cycle].sort().join('|')
          const alreadyFound = cycles.some((c) => [...c].sort().join('|') === canonical)
          if (!alreadyFound) {
            cycles.push(cycle)
          }
        }
        return
      }

      if (visited.has(nodeId)) return

      visited.add(nodeId)
      inStack.add(nodeId)
      stack.push(nodeId)

      const node = graph.nodes[nodeId]
      if (node) {
        for (const dep of node.runtimeDeps) {
          dfs(dep)
        }
      }

      stack.pop()
      inStack.delete(nodeId)
    }

    for (const nodeId of Object.keys(graph.nodes)) {
      if (!visited.has(nodeId)) {
        dfs(nodeId)
      }
    }

    return cycles
  }

  /**
   * Validate integrity of the database.
   * Throws an error (in dev mode) if validation fails.
   * Returns a validation summary.
   *
   * @example
   * if (import.meta.env.DEV) mm.validate()
   */
  validate(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    const allIds = new Set(Object.keys(this.db.entries))

    // Check for orphaned dependencies
    for (const orphan of this.db.stats.orphanedDependencies) {
      warnings.push(`Dependency "${orphan}" is referenced but has no @mm:id annotation.`)
    }

    // Check for circular runtime deps
    const cycles = this.findAllCycles()
    for (const cycle of cycles) {
      errors.push(`Circular runtime dependency: ${cycle.join(' → ')}`)
    }

    // Check required fields (id + desc)
    for (const entry of Object.values(this.db.entries)) {
      if (!entry.desc) {
        warnings.push(`Entry "${entry.id}" is missing @mm:desc (${entry.filePath}:${entry.line})`)
      }
    }

    // Summarize known IDs for info
    void allIds

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Export a compact context for AI/LLM consumption.
   * Optimized to minimize token usage.
   *
   * @example
   * const ctx = mm.exportForLLM({ scope: ['ui', 'lib'], format: 'compact' })
   */
  exportForLLM(options: MmExportLLMOptions = {}): object {
    const { scope, fields, format = 'compact', limit } = options

    let entries = Object.values(this.db.entries)

    // Filter by scope (tags)
    if (scope && scope.length > 0) {
      entries = entries.filter((e) => {
        if (!e.tags) return false
        return scope.some((s) => e.tags!.includes(s))
      })
    }

    // Apply limit
    if (limit && limit > 0) {
      entries = entries.slice(0, limit)
    }

    if (format === 'compact') {
      // Minimal representation
      return entries.map((e) => {
        const record: Record<string, unknown> = { id: e.id }
        if (e.desc) record.desc = e.desc
        if (e.tags && e.tags.length > 0) record.tags = e.tags

        // AI summary if available
        if (e.ai) {
          if (typeof e.ai === 'object' && e.ai.summary) {
            record.ai = e.ai.summary
          } else if (typeof e.ai === 'string') {
            record.ai = e.ai
          }
        }

        // Include requested extra fields
        if (fields) {
          for (const f of fields) {
            if (f !== 'id' && f !== 'desc' && f !== 'tags' && f !== 'ai' && e[f] !== undefined) {
              record[f] = e[f]
            }
          }
        }

        return record
      })
    }

    // Full format
    if (fields && fields.length > 0) {
      return entries.map((e) => {
        const record: Record<string, unknown> = {}
        for (const f of fields) {
          if (e[f] !== undefined) {
            record[f] = e[f]
          }
        }
        return record
      })
    }

    return entries
  }

  /**
   * Get the full dependency graph.
   *
   * @example
   * const graph = mm.getGraph()
   * console.log(graph.edges.length + ' dependency edges')
   */
  getGraph(): MmGraph {
    return this.db.graph
  }

  /**
   * Export the dependency graph in JSON or DOT format.
   *
   * @example
   * const dot = mm.exportGraph({ format: 'dot' })
   * // Visualize with Graphviz: echo "$dot" | dot -Tpng > graph.png
   */
  exportGraph(options: MmExportGraphOptions = { format: 'json' }): string {
    const { format, edgeType = 'all' } = options
    const graph = this.db.graph

    const filteredEdges = graph.edges.filter((e) => edgeType === 'all' || e.type === edgeType)

    if (format === 'json') {
      return JSON.stringify({ nodes: Object.keys(graph.nodes), edges: filteredEdges }, null, 2)
    }

    // DOT format for Graphviz
    const lines: string[] = ['digraph MetaModeGraph {', '  rankdir=LR;', '  node [shape=box];']

    // Add nodes
    for (const id of Object.keys(graph.nodes)) {
      const entry = this.db.entries[id]
      const label = entry?.name || id
      const shape = entry?.visibility === 'internal' ? 'ellipse' : 'box'
      lines.push(`  "${id}" [label="${label}" shape=${shape}];`)
    }

    // Add edges with colors per type
    const edgeColors: Record<string, string> = {
      runtime: 'black',
      build: 'blue',
      optional: 'gray',
    }

    for (const edge of filteredEdges) {
      const color = edgeColors[edge.type] || 'black'
      lines.push(`  "${edge.from}" -> "${edge.to}" [color=${color} label="${edge.type}"];`)
    }

    lines.push('}')
    return lines.join('\n')
  }

  /**
   * Get the raw compiled database.
   */
  get db_(): MmV2Database {
    return this.db
  }

  /**
   * Get database statistics.
   */
  get stats(): MmDbStats {
    return this.db.stats
  }

  /**
   * Get build information.
   */
  get buildInfo(): MmDbBuildInfo {
    return this.db.buildInfo
  }
}

/**
 * Create a MetaMode v2.0 runtime API instance from a compiled database.
 */
export function createMmApi(database: MmV2Database): MmRuntimeApi {
  return new MmRuntimeApi(database)
}

// ============================================================================
// CLI Support
// ============================================================================

if (process.argv[1] && path.basename(process.argv[1]) === 'metamode-db-compiler.ts') {
  const args = process.argv.slice(2)
  const targetDir = args.find((a) => !a.startsWith('--')) || process.cwd()
  const outputFormat = args.includes('--dot') ? 'dot' : 'json'
  const showStats = args.includes('--stats')
  const exportGraph = args.includes('--graph')

  console.log('MetaMode DB Compiler (v2.0, Phase 1)')
  console.log('======================================')
  console.log(`Root directory: ${targetDir}`)
  console.log('')

  const db = compileV2Database(targetDir)
  const mm = createMmApi(db)

  console.log(
    `✅ Compiled ${db.stats.totalAnnotations} annotations from ${db.buildInfo.sourceFiles} file(s)`
  )
  console.log(`   Build timestamp: ${db.buildInfo.timestamp}`)
  console.log('')

  if (showStats) {
    console.log('📊 Statistics:')
    console.log(`   By status: ${JSON.stringify(db.stats.byStatus)}`)
    console.log(`   By visibility: ${JSON.stringify(db.stats.byVisibility)}`)
    console.log(`   Graph edges: ${db.graph.edges.length}`)
    if (db.stats.orphanedDependencies.length > 0) {
      console.log(`   ⚠ Orphaned deps: ${db.stats.orphanedDependencies.join(', ')}`)
    }
    console.log('')
  }

  if (exportGraph) {
    console.log('📈 Dependency Graph:')
    console.log(mm.exportGraph({ format: outputFormat as 'json' | 'dot' }))
  }

  const cycles = mm.findAllCycles()
  if (cycles.length > 0) {
    console.log(`⚠ ${cycles.length} circular dependency chain(s) detected:`)
    for (const cycle of cycles) {
      console.log(`   ${cycle.join(' → ')}`)
    }
  } else {
    console.log('✅ No circular dependencies detected')
  }
}
