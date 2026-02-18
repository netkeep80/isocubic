/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface MetamodeFileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: string
  dependencies?: string[]
}

interface MetamodeDirectoryDescriptor {
  description: string
  metamode: string
}

interface MetamodeEntry {
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, MetamodeFileDescriptor>
  directories?: Record<string, MetamodeDirectoryDescriptor>
}

interface MetamodeTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, MetamodeFileDescriptor>
  children?: Record<string, MetamodeTreeNode>
}

declare module 'virtual:metamode' {
  const metamode: Record<string, MetamodeEntry>
  export default metamode
}

declare module 'virtual:metamode/tree' {
  const metamodeTree: MetamodeTreeNode
  export default metamodeTree
}

// AI-optimized types for token-efficient AI queries (TASK 74)
interface AIMetamodeFileDescriptor {
  /** Description (shortened field name) */
  desc: string
  /** Tags for categorization */
  tags?: string[]
  /** Development phase */
  phase?: number
  /** Status: stable, beta, exp (experimental), dep (deprecated) */
  status?: 'stable' | 'beta' | 'exp' | 'dep'
  /** Dependencies (shortened field name) */
  deps?: string[]
  /** AI summary for quick context (max 100 chars) */
  ai?: string
}

interface AIMetamodeTreeNode {
  /** Name of the module/directory */
  name: string
  /** Description (shortened field name) */
  desc: string
  /** Semantic version (shortened field name) */
  ver?: string
  /** Programming languages (shortened field name) */
  lang?: string[]
  /** Tags for categorization */
  tags?: string[]
  /** AI summary for quick context (max 200 chars) */
  ai?: string
  /** File descriptors */
  files?: Record<string, AIMetamodeFileDescriptor>
  /** Child nodes */
  children?: Record<string, AIMetamodeTreeNode>
}

declare module 'virtual:metamode/ai' {
  const metamodeAI: AIMetamodeTreeNode
  export default metamodeAI
}

// Database types for unified MetaMode database (TASK 80)
type MetamodeStatus = 'stable' | 'beta' | 'experimental' | 'deprecated'

interface MetamodeDatabaseStats {
  /** Total number of directories */
  totalDirectories: number
  /** Total number of files */
  totalFiles: number
  /** Files grouped by status */
  filesByStatus: Record<MetamodeStatus | 'unknown', number>
  /** Files grouped by development phase */
  filesByPhase: Record<number, number>
  /** Total size of the database in bytes */
  sizeBytes: number
}

interface MetamodeDatabase {
  /** Root of the metadata tree */
  root: MetamodeTreeNode
  /** Flat index for fast path-based lookups */
  index: Record<string, MetamodeFileDescriptor | MetamodeTreeNode>
  /** All unique tags used across the project */
  allTags: string[]
  /** All programming languages used */
  allLanguages: string[]
  /** Database statistics */
  stats: MetamodeDatabaseStats
  /** Build timestamp (ISO 8601) */
  buildTimestamp: string
  /** Database format version */
  formatVersion: string
}

declare module 'virtual:metamode/db' {
  const metamodeDB: MetamodeDatabase
  export default metamodeDB
}

// MetaMode v2.0 annotation-based database types (Phase 1)
interface MmDbDeps {
  runtime?: string[]
  build?: string[]
  optional?: string[]
}

interface MmDbEntry {
  id: string
  name?: string
  desc?: string
  tags?: string[]
  deps?: MmDbDeps
  ai?: { summary?: string; usage?: string; examples?: string[] } | string
  visibility?: 'public' | 'internal'
  version?: string
  phase?: number
  status?: string
  filePath: string
  line: number
  source: 'jsdoc' | 'runtime'
  entityName?: string
}

interface MmGraph {
  nodes: Record<
    string,
    {
      id: string
      runtimeDeps: string[]
      buildDeps: string[]
      optionalDeps: string[]
      dependents: string[]
    }
  >
  edges: Array<{ from: string; to: string; type: 'runtime' | 'build' | 'optional' }>
}

interface MmDbStats {
  totalAnnotations: number
  byStatus: Record<string, number>
  byVisibility: Record<string, number>
  byPhase: Record<number, number>
  byTag: Record<string, number>
  topDependencies: Array<{ id: string; dependentCount: number }>
  orphanedDependencies: string[]
}

interface MmFindAllOptions {
  tags?: string[]
  status?: string | string[]
  visibility?: 'public' | 'internal'
  phase?: number | number[]
}

interface MmRuntimeApiInterface {
  findById(id: string): MmDbEntry | undefined
  findAll(options?: MmFindAllOptions): MmDbEntry[]
  findByTag(tag: string, options?: Omit<MmFindAllOptions, 'tags'>): MmDbEntry[]
  getDependencies(
    id: string,
    options?: { type?: 'runtime' | 'build' | 'optional' | 'all'; recursive?: boolean }
  ): string[]
  getDependents(id: string): string[]
  detectCycle(id: string): string[] | null
  findAllCycles(): string[][]
  validate(): { valid: boolean; errors: string[]; warnings: string[] }
  exportForLLM(options?: {
    scope?: string[]
    fields?: (keyof MmDbEntry)[]
    format?: 'compact' | 'full'
    limit?: number
  }): object
  getGraph(): MmGraph
  exportGraph(options: {
    format: 'json' | 'dot'
    edgeType?: 'runtime' | 'build' | 'optional' | 'all'
  }): string
  readonly stats: MmDbStats
  readonly buildInfo: { timestamp: string; version: string; sourceFiles: number; format: string }
}

declare module 'virtual:metamode/v2/db' {
  const mm: MmRuntimeApiInterface
  export default mm
  export { mm }
}
