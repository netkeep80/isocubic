/**
 * MetaMode Embedded Database
 *
 * Provides runtime API for accessing compiled MetaMode metadata.
 * The database is compiled at build time by the Vite plugin and embedded
 * in the application as a single JSON structure.
 *
 * TASK 80: Компиляция MetaMode в единую БД (Phase 12)
 *
 * Features:
 * - Type-safe query API for searching metadata
 * - Path-based lookup for individual files/directories
 * - Search by name, description, tags, status, phase
 * - Traversal utilities for the metadata tree
 * - Statistics and aggregation functions
 * - Optimized for minimal bundle size
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Status values for files and components
 */
export type MetamodeStatus = 'stable' | 'beta' | 'experimental' | 'deprecated'

/**
 * Shortened status for AI-optimized format
 */
export type MetamodeStatusShort = 'stable' | 'beta' | 'exp' | 'dep'

/**
 * File descriptor in the database
 */
export interface MetamodeFileEntry {
  /** File description */
  description: string
  /** Tags for categorization */
  tags?: string[]
  /** Development phase (1-12) */
  phase?: number
  /** Status of the file */
  status?: MetamodeStatus
  /** Dependencies */
  dependencies?: string[]
  /** AI-generated summary */
  ai?: string
}

/**
 * Directory/module entry in the database
 */
export interface MetamodeDirEntry {
  /** Module/directory name */
  name: string
  /** Description */
  description: string
  /** Semantic version (for root) */
  version?: string
  /** Programming languages */
  languages?: string[]
  /** Tags for categorization */
  tags?: string[]
  /** AI-generated summary */
  ai?: string
  /** Files in this directory */
  files?: Record<string, MetamodeFileEntry>
  /** Child directories */
  children?: Record<string, MetamodeDirEntry>
}

/**
 * The compiled database structure
 */
export interface MetamodeDatabase {
  /** Root of the metadata tree */
  root: MetamodeDirEntry
  /** Flat index for fast path-based lookups */
  index: Record<string, MetamodeFileEntry | MetamodeDirEntry>
  /** All tags used across the project */
  allTags: string[]
  /** All languages used */
  allLanguages: string[]
  /** Statistics */
  stats: MetamodeDatabaseStats
  /** Build timestamp */
  buildTimestamp: string
  /** Database format version */
  formatVersion: string
}

/**
 * Database statistics
 */
export interface MetamodeDatabaseStats {
  /** Total number of directories */
  totalDirectories: number
  /** Total number of files */
  totalFiles: number
  /** Files by status */
  filesByStatus: Record<MetamodeStatus | 'unknown', number>
  /** Files by phase */
  filesByPhase: Record<number, number>
  /** Total size of JSON in bytes */
  sizeBytes: number
}

/**
 * Search query options
 */
export interface MetamodeSearchOptions {
  /** Search in file/directory names */
  searchName?: boolean
  /** Search in descriptions */
  searchDescription?: boolean
  /** Search in tags */
  searchTags?: boolean
  /** Filter by status */
  status?: MetamodeStatus | MetamodeStatus[]
  /** Filter by phase */
  phase?: number | number[]
  /** Filter by tags (any match) */
  tags?: string[]
  /** Filter by language */
  languages?: string[]
  /** Case-insensitive search (default: true) */
  caseInsensitive?: boolean
  /** Maximum results to return */
  limit?: number
  /** Include only files */
  filesOnly?: boolean
  /** Include only directories */
  dirsOnly?: boolean
}

/**
 * Search result entry
 */
export interface MetamodeSearchResult {
  /** Full path to the entry */
  path: string
  /** Entry type */
  type: 'file' | 'directory'
  /** The matching entry */
  entry: MetamodeFileEntry | MetamodeDirEntry
  /** Relevance score (higher is more relevant) */
  score: number
  /** Parent directory path */
  parentPath?: string
}

// ============================================================================
// Database Builder (used at build time)
// ============================================================================

/**
 * Builds the flat index from a tree structure
 */
export function buildIndex(
  root: MetamodeDirEntry,
  index: Record<string, MetamodeFileEntry | MetamodeDirEntry> = {},
  currentPath: string = ''
): Record<string, MetamodeFileEntry | MetamodeDirEntry> {
  // Add current directory to index
  index[currentPath || '/'] = root

  // Add files to index
  if (root.files) {
    for (const [filename, file] of Object.entries(root.files)) {
      const filePath = currentPath ? `${currentPath}/${filename}` : filename
      index[filePath] = file
    }
  }

  // Recursively add children
  if (root.children) {
    for (const [dirName, child] of Object.entries(root.children)) {
      const childPath = currentPath ? `${currentPath}/${dirName}` : dirName
      buildIndex(child, index, childPath)
    }
  }

  return index
}

/**
 * Collects all unique tags from the tree
 */
export function collectTags(root: MetamodeDirEntry, tags: Set<string> = new Set()): string[] {
  // Add tags from this node
  if (root.tags) {
    root.tags.forEach((t) => tags.add(t))
  }

  // Add tags from files
  if (root.files) {
    for (const file of Object.values(root.files)) {
      if (file.tags) {
        file.tags.forEach((t) => tags.add(t))
      }
    }
  }

  // Recurse into children
  if (root.children) {
    for (const child of Object.values(root.children)) {
      collectTags(child, tags)
    }
  }

  return Array.from(tags).sort()
}

/**
 * Collects all unique languages from the tree
 */
export function collectLanguages(
  root: MetamodeDirEntry,
  languages: Set<string> = new Set()
): string[] {
  if (root.languages) {
    root.languages.forEach((l) => languages.add(l))
  }

  if (root.children) {
    for (const child of Object.values(root.children)) {
      collectLanguages(child, languages)
    }
  }

  return Array.from(languages).sort()
}

/**
 * Computes database statistics
 */
export function computeStats(root: MetamodeDirEntry): Omit<MetamodeDatabaseStats, 'sizeBytes'> {
  let totalDirectories = 0
  let totalFiles = 0
  const filesByStatus: Record<string, number> = {
    stable: 0,
    beta: 0,
    experimental: 0,
    deprecated: 0,
    unknown: 0,
  }
  const filesByPhase: Record<number, number> = {}

  function traverse(node: MetamodeDirEntry) {
    totalDirectories++

    if (node.files) {
      for (const file of Object.values(node.files)) {
        totalFiles++

        // Count by status
        const status = file.status || 'unknown'
        filesByStatus[status] = (filesByStatus[status] || 0) + 1

        // Count by phase
        if (file.phase !== undefined) {
          filesByPhase[file.phase] = (filesByPhase[file.phase] || 0) + 1
        }
      }
    }

    if (node.children) {
      for (const child of Object.values(node.children)) {
        traverse(child)
      }
    }
  }

  traverse(root)

  return {
    totalDirectories,
    totalFiles,
    filesByStatus: filesByStatus as Record<MetamodeStatus | 'unknown', number>,
    filesByPhase,
  }
}

/**
 * Builds a complete database from the tree root
 */
export function buildDatabase(root: MetamodeDirEntry): MetamodeDatabase {
  const index = buildIndex(root)
  const allTags = collectTags(root)
  const allLanguages = collectLanguages(root)
  const statsWithoutSize = computeStats(root)

  // Build the database without size first
  const dbWithoutSize: Omit<MetamodeDatabase, 'stats'> & {
    stats: Omit<MetamodeDatabaseStats, 'sizeBytes'>
  } = {
    root,
    index,
    allTags,
    allLanguages,
    stats: statsWithoutSize,
    buildTimestamp: new Date().toISOString(),
    formatVersion: '1.0.0',
  }

  // Calculate size
  const sizeBytes = JSON.stringify(dbWithoutSize).length

  return {
    ...dbWithoutSize,
    stats: {
      ...statsWithoutSize,
      sizeBytes,
    },
  }
}

// ============================================================================
// Runtime Query API
// ============================================================================

/**
 * MetaMode Database Query Client
 *
 * Provides a type-safe API for querying compiled metadata at runtime.
 */
export class MetamodeDatabaseClient {
  private db: MetamodeDatabase

  constructor(database: MetamodeDatabase) {
    this.db = database
  }

  /**
   * Get the root of the metadata tree
   */
  getRoot(): MetamodeDirEntry {
    return this.db.root
  }

  /**
   * Get an entry by path
   *
   * @param path - Path to the entry (e.g., "src/components/ParamEditor.vue")
   * @returns The entry or undefined if not found
   */
  getByPath(path: string): MetamodeFileEntry | MetamodeDirEntry | undefined {
    // Normalize path
    const normalizedPath = path.replace(/^\/+|\/+$/g, '')
    return this.db.index[normalizedPath] || this.db.index['/' + normalizedPath]
  }

  /**
   * Get a file entry by path
   */
  getFile(path: string): MetamodeFileEntry | undefined {
    const entry = this.getByPath(path)
    if (entry && 'description' in entry && !('children' in entry) && !('name' in entry)) {
      return entry as MetamodeFileEntry
    }
    return undefined
  }

  /**
   * Get a directory entry by path
   */
  getDirectory(path: string): MetamodeDirEntry | undefined {
    const entry = this.getByPath(path)
    if (entry && 'name' in entry) {
      return entry as MetamodeDirEntry
    }
    return undefined
  }

  /**
   * Search the database
   *
   * @param query - Search query string
   * @param options - Search options
   * @returns Array of matching results
   */
  search(query: string, options: MetamodeSearchOptions = {}): MetamodeSearchResult[] {
    const {
      searchName = true,
      searchDescription = true,
      searchTags = true,
      status,
      phase,
      tags,
      languages,
      caseInsensitive = true,
      limit,
      filesOnly = false,
      dirsOnly = false,
    } = options

    const results: MetamodeSearchResult[] = []
    const normalizedQuery = caseInsensitive ? query.toLowerCase() : query

    // Normalize filters
    const statusFilter = status ? (Array.isArray(status) ? status : [status]) : undefined
    const phaseFilter = phase ? (Array.isArray(phase) ? phase : [phase]) : undefined

    // Search through the index
    for (const [path, entry] of Object.entries(this.db.index)) {
      let score = 0
      const isDir = 'name' in entry
      const isFile = !isDir

      // Skip based on type filter
      if (filesOnly && !isFile) continue
      if (dirsOnly && !isDir) continue

      // Check text matches
      if (normalizedQuery) {
        const name = isDir
          ? (entry as MetamodeDirEntry).name
          : path.split('/').pop() || ''
        const description = entry.description || ''
        const entryTags = isDir
          ? ((entry as MetamodeDirEntry).tags || [])
          : ('tags' in entry && entry.tags) || []

        const normalizedName = caseInsensitive ? name.toLowerCase() : name
        const normalizedDesc = caseInsensitive ? description.toLowerCase() : description

        if (searchName && normalizedName.includes(normalizedQuery)) {
          score += 10
        }
        if (searchDescription && normalizedDesc.includes(normalizedQuery)) {
          score += 5
        }
        if (searchTags && entryTags.some((t) => {
          const normalizedTag = caseInsensitive ? t.toLowerCase() : t
          return normalizedTag.includes(normalizedQuery)
        })) {
          score += 8
        }

        if (score === 0) continue
      }

      // Apply filters for files
      if (isFile) {
        const fileEntry = entry as MetamodeFileEntry

        // Status filter
        if (statusFilter && !statusFilter.includes(fileEntry.status as MetamodeStatus)) {
          continue
        }

        // Phase filter
        if (phaseFilter && (fileEntry.phase === undefined || !phaseFilter.includes(fileEntry.phase))) {
          continue
        }

        // Tags filter (any match)
        if (tags && tags.length > 0) {
          const entryTags = fileEntry.tags || []
          if (!tags.some((t) => entryTags.includes(t))) {
            continue
          }
        }
      }

      // Apply filters for directories
      if (isDir) {
        const dirEntry = entry as MetamodeDirEntry

        // Languages filter
        if (languages && languages.length > 0) {
          const entryLangs = dirEntry.languages || []
          if (!languages.some((l) => entryLangs.includes(l))) {
            continue
          }
        }

        // Tags filter
        if (tags && tags.length > 0) {
          const entryTags = dirEntry.tags || []
          if (!tags.some((t) => entryTags.includes(t))) {
            continue
          }
        }
      }

      // If no query but has filters, include with base score
      if (!normalizedQuery) {
        score = 1
      }

      results.push({
        path,
        type: isDir ? 'directory' : 'file',
        entry,
        score,
        parentPath: path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : undefined,
      })
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score)

    // Apply limit
    if (limit && limit > 0) {
      return results.slice(0, limit)
    }

    return results
  }

  /**
   * Get all files with a specific status
   */
  getFilesByStatus(status: MetamodeStatus): MetamodeSearchResult[] {
    return this.search('', { status, filesOnly: true })
  }

  /**
   * Get all files in a specific phase
   */
  getFilesByPhase(phase: number): MetamodeSearchResult[] {
    return this.search('', { phase, filesOnly: true })
  }

  /**
   * Get all files with specific tags
   */
  getFilesByTags(tags: string[]): MetamodeSearchResult[] {
    return this.search('', { tags, filesOnly: true })
  }

  /**
   * Get all available tags
   */
  getAllTags(): string[] {
    return this.db.allTags
  }

  /**
   * Get all available languages
   */
  getAllLanguages(): string[] {
    return this.db.allLanguages
  }

  /**
   * Get database statistics
   */
  getStats(): MetamodeDatabaseStats {
    return this.db.stats
  }

  /**
   * Get build information
   */
  getBuildInfo(): { timestamp: string; version: string } {
    return {
      timestamp: this.db.buildTimestamp,
      version: this.db.formatVersion,
    }
  }

  /**
   * Traverse the tree depth-first
   *
   * @param callback - Function called for each node
   * @param options - Traversal options
   */
  traverse(
    callback: (entry: MetamodeDirEntry | MetamodeFileEntry, path: string, type: 'file' | 'directory') => void | boolean,
    options: { includeFiles?: boolean; includeDirectories?: boolean } = {}
  ): void {
    const { includeFiles = true, includeDirectories = true } = options

    function visit(node: MetamodeDirEntry, currentPath: string): boolean {
      // Visit directory
      if (includeDirectories) {
        const result = callback(node, currentPath || '/', 'directory')
        if (result === false) return false
      }

      // Visit files
      if (includeFiles && node.files) {
        for (const [filename, file] of Object.entries(node.files)) {
          const filePath = currentPath ? `${currentPath}/${filename}` : filename
          const result = callback(file, filePath, 'file')
          if (result === false) return false
        }
      }

      // Recurse into children
      if (node.children) {
        for (const [dirName, child] of Object.entries(node.children)) {
          const childPath = currentPath ? `${currentPath}/${dirName}` : dirName
          const result = visit(child, childPath)
          if (result === false) return false
        }
      }

      return true
    }

    visit(this.db.root, '')
  }

  /**
   * Get the raw database object
   */
  getRawDatabase(): MetamodeDatabase {
    return this.db
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert short status to full status
 */
export function expandStatus(status: MetamodeStatusShort): MetamodeStatus {
  switch (status) {
    case 'exp':
      return 'experimental'
    case 'dep':
      return 'deprecated'
    default:
      return status
  }
}

/**
 * Convert full status to short status
 */
export function shortenStatus(status: MetamodeStatus): MetamodeStatusShort {
  switch (status) {
    case 'experimental':
      return 'exp'
    case 'deprecated':
      return 'dep'
    default:
      return status
  }
}

/**
 * Format file size in human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ============================================================================
// Default Export
// ============================================================================

export default MetamodeDatabaseClient
