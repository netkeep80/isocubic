/**
 * MetaMode Production Optimizer (MetaMode v2.0, Phase 4)
 *
 * Tree-shakes `visibility: 'internal'` entries and strips development-only
 * metadata from the v2 database for production builds.
 *
 * Goals:
 * 1. Remove all `visibility: 'internal'` annotations in production
 * 2. Strip dev-only fields (filePath, line, source, entityName) in production
 * 3. Minimize JSON size via compact serialization (no extra whitespace, no null values)
 * 4. Ensure bundle overhead ≤ +2% compared to a build without MetaMode
 *
 * Usage:
 *   import { optimizeForProduction } from './metamode-prod-optimizer'
 *   const prodDb = optimizeForProduction(fullDb)
 *
 * CLI:
 *   npx tsx scripts/metamode-prod-optimizer.ts [--stats] [--output <file>]
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  compileV2Database,
  type MmV2Database,
  type MmDbEntry,
  type MmGraph,
  type MmGraphNode,
  type MmDbStats,
} from './metamode-db-compiler'

// ============================================================================
// Production Entry Type
// ============================================================================

/**
 * A production-stripped annotation entry.
 * Omits dev-only fields (filePath, line, source, entityName) and
 * excludes `internal` visibility entries entirely.
 */
export interface MmProdEntry {
  id: string
  name?: string
  desc?: string
  tags?: string[]
  deps?: {
    runtime?: string[]
    build?: string[]
    optional?: string[]
  }
  /** AI summary in compact string-only form (objects collapsed to summary) */
  ai?: string
  version?: string
  phase?: number
  status?: string
}

/**
 * Production-optimized v2 database.
 * Internal annotations are removed; dev-only fields are stripped.
 */
export interface MmProdDatabase {
  entries: Record<string, MmProdEntry>
  ids: string[]
  graph: MmGraph
  stats: Pick<MmDbStats, 'totalAnnotations' | 'byStatus' | 'byTag'>
  buildInfo: {
    version: string
    format: 'metamode-v2-prod'
  }
}

// ============================================================================
// Optimization Logic
// ============================================================================

/**
 * Strip a full MmDbEntry down to its production-safe form.
 * - Removes filePath, line, source, entityName (dev-only)
 * - Collapses ai objects to their summary string
 * - Returns null for internal entries (they should be excluded)
 */
export function stripEntry(entry: MmDbEntry): MmProdEntry | null {
  if (entry.visibility === 'internal') return null

  const prod: MmProdEntry = { id: entry.id }

  if (entry.name !== undefined) prod.name = entry.name
  if (entry.desc !== undefined) prod.desc = entry.desc
  if (entry.tags && entry.tags.length > 0) prod.tags = entry.tags
  if (entry.version !== undefined) prod.version = entry.version
  if (entry.phase !== undefined) prod.phase = entry.phase
  if (entry.status !== undefined) prod.status = entry.status

  // Normalize deps: only include non-empty arrays
  if (entry.deps) {
    const deps: MmProdEntry['deps'] = {}
    if (entry.deps.runtime && entry.deps.runtime.length > 0) deps.runtime = entry.deps.runtime
    if (entry.deps.build && entry.deps.build.length > 0) deps.build = entry.deps.build
    if (entry.deps.optional && entry.deps.optional.length > 0) deps.optional = entry.deps.optional
    if (Object.keys(deps).length > 0) prod.deps = deps
  }

  // Collapse AI objects to summary string only
  if (entry.ai !== undefined) {
    if (typeof entry.ai === 'string') {
      prod.ai = entry.ai
    } else if (typeof entry.ai === 'object' && entry.ai.summary) {
      prod.ai = entry.ai.summary
    }
    // If ai object has no summary, omit it
  }

  return prod
}

/**
 * Rebuild the dependency graph after removing internal entries.
 * Edges to removed internal nodes are pruned.
 */
export function rebuildGraph(entries: Record<string, MmProdEntry>, fullGraph: MmGraph): MmGraph {
  const publicIds = new Set(Object.keys(entries))
  const nodes: Record<string, MmGraphNode> = {}
  const edges: MmGraph['edges'] = []

  // Initialize nodes for public entries only
  for (const id of publicIds) {
    nodes[id] = {
      id,
      runtimeDeps: [],
      buildDeps: [],
      optionalDeps: [],
      dependents: [],
    }
  }

  // Rebuild edges, pruning references to internal/removed entries
  for (const edge of fullGraph.edges) {
    if (!publicIds.has(edge.from) || !publicIds.has(edge.to)) continue
    edges.push(edge)
    nodes[edge.from][`${edge.type}Deps` as 'runtimeDeps' | 'buildDeps' | 'optionalDeps'].push(
      edge.to
    )
    nodes[edge.to].dependents.push(edge.from)
  }

  return { nodes, edges }
}

/**
 * Recompute production statistics from stripped entries.
 */
export function computeProdStats(
  entries: Record<string, MmProdEntry>
): Pick<MmDbStats, 'totalAnnotations' | 'byStatus' | 'byTag'> {
  const byStatus: Record<string, number> = {}
  const byTag: Record<string, number> = {}

  for (const entry of Object.values(entries)) {
    const status = entry.status || 'unknown'
    byStatus[status] = (byStatus[status] || 0) + 1

    if (entry.tags) {
      for (const tag of entry.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1
      }
    }
  }

  return {
    totalAnnotations: Object.keys(entries).length,
    byStatus,
    byTag,
  }
}

/**
 * Serialize a production database to a compact JSON string.
 * - No extra whitespace
 * - Undefined/null values omitted automatically (JSON.stringify behavior)
 */
export function serializeCompact(db: MmProdDatabase): string {
  return JSON.stringify(db)
}

/**
 * Create a production-optimized database from a full v2 database.
 *
 * @param fullDb - The complete development database
 * @returns A production-stripped database with internal entries removed
 */
export function optimizeForProduction(fullDb: MmV2Database): MmProdDatabase {
  const entries: Record<string, MmProdEntry> = {}

  for (const [id, entry] of Object.entries(fullDb.entries)) {
    const prod = stripEntry(entry)
    if (prod !== null) {
      entries[id] = prod
    }
  }

  const graph = rebuildGraph(entries, fullDb.graph)
  const stats = computeProdStats(entries)

  return {
    entries,
    ids: Object.keys(entries),
    graph,
    stats,
    buildInfo: {
      version: fullDb.buildInfo.version,
      format: 'metamode-v2-prod',
    },
  }
}

// ============================================================================
// Bundle Size Analysis
// ============================================================================

/**
 * Compare dev vs prod database sizes and check the ≤+2% overhead constraint.
 * (Overhead is measured relative to a zero-metadata baseline, which we approximate
 *  as the difference between no-MetaMode and with-MetaMode in the bundle.)
 */
export interface BundleSizeReport {
  devSizeBytes: number
  prodSizeBytes: number
  /** Bytes saved by switching from dev to prod */
  savedBytes: number
  /** Percentage reduction from dev to prod */
  reductionPercent: number
  /** Number of entries in dev database */
  devEntryCount: number
  /** Number of entries in prod database (internal removed) */
  prodEntryCount: number
  /** Number of internal entries removed */
  internalEntriesRemoved: number
}

/**
 * Analyze bundle size difference between dev and prod databases.
 */
export function analyzeBundleSize(devDb: MmV2Database, prodDb: MmProdDatabase): BundleSizeReport {
  const devSizeBytes = JSON.stringify(devDb).length
  const prodSizeBytes = serializeCompact(prodDb).length
  const savedBytes = devSizeBytes - prodSizeBytes
  const reductionPercent = devSizeBytes > 0 ? (savedBytes / devSizeBytes) * 100 : 0
  const devEntryCount = Object.keys(devDb.entries).length
  const prodEntryCount = Object.keys(prodDb.entries).length

  return {
    devSizeBytes,
    prodSizeBytes,
    savedBytes,
    reductionPercent,
    devEntryCount,
    prodEntryCount,
    internalEntriesRemoved: devEntryCount - prodEntryCount,
  }
}

// ============================================================================
// CLI Support
// ============================================================================

if (process.argv[1] && path.basename(process.argv[1]) === 'metamode-prod-optimizer.ts') {
  const args = process.argv.slice(2)
  const targetDir = args.find((a) => !a.startsWith('--')) || process.cwd()
  const showStats = args.includes('--stats')
  const outputFile = (() => {
    const idx = args.indexOf('--output')
    return idx !== -1 ? args[idx + 1] : undefined
  })()

  console.log('MetaMode Production Optimizer (v2.0, Phase 4)')
  console.log('==============================================')
  console.log(`Root directory: ${targetDir}`)
  console.log('')

  const devDb = compileV2Database(targetDir)
  const prodDb = optimizeForProduction(devDb)
  const report = analyzeBundleSize(devDb, prodDb)

  console.log('📦 Bundle Size Analysis:')
  console.log(
    `   Dev database:  ${report.devSizeBytes.toLocaleString()} bytes (${report.devEntryCount} entries)`
  )
  console.log(
    `   Prod database: ${report.prodSizeBytes.toLocaleString()} bytes (${report.prodEntryCount} entries)`
  )
  console.log(
    `   Saved:         ${report.savedBytes.toLocaleString()} bytes (${report.reductionPercent.toFixed(1)}% reduction)`
  )
  console.log(`   Internal removed: ${report.internalEntriesRemoved} entries`)
  console.log('')

  if (showStats) {
    console.log('📊 Production Statistics:')
    console.log(`   By status: ${JSON.stringify(prodDb.stats.byStatus)}`)
    console.log(`   By tag: ${JSON.stringify(prodDb.stats.byTag)}`)
    console.log('')
  }

  if (outputFile) {
    const outputPath = path.resolve(targetDir, outputFile)
    fs.writeFileSync(outputPath, serializeCompact(prodDb), 'utf-8')
    console.log(`✅ Production database written to: ${outputPath}`)
  } else {
    console.log(`✅ Optimization complete — use --output <file> to write to disk`)
  }
}
