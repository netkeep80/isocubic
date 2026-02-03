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
