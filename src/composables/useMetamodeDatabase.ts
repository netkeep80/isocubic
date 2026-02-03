/**
 * useMetamodeDatabase Composable
 *
 * Provides reactive access to the compiled MetaMode database.
 * Uses the virtual:metamode/db module compiled at build time.
 *
 * TASK 80: Компиляция MetaMode в единую БД (Phase 12)
 *
 * Usage:
 * ```vue
 * <script setup>
 * import { useMetamodeDatabase } from '@/composables/useMetamodeDatabase'
 *
 * const {
 *   database,
 *   client,
 *   search,
 *   getByPath,
 *   stats,
 *   allTags,
 *   allLanguages,
 * } = useMetamodeDatabase()
 * </script>
 * ```
 */

import { ref, computed, type Ref, type ComputedRef, shallowRef } from 'vue'
import metamodeDB from 'virtual:metamode/db'
import {
  MetamodeDatabaseClient,
  type MetamodeDatabase,
  type MetamodeFileEntry,
  type MetamodeDirEntry,
  type MetamodeSearchOptions,
  type MetamodeSearchResult,
  type MetamodeDatabaseStats,
  type MetamodeStatus,
} from '@/lib/metamode-database'

// Re-export types for convenience
export type {
  MetamodeDatabase,
  MetamodeFileEntry,
  MetamodeDirEntry,
  MetamodeSearchOptions,
  MetamodeSearchResult,
  MetamodeDatabaseStats,
  MetamodeStatus,
}

/**
 * Result interface for the composable
 */
export interface UseMetamodeDatabaseResult {
  /** The raw compiled database */
  database: MetamodeDatabase
  /** The database client for queries */
  client: MetamodeDatabaseClient
  /** Search the database */
  search: (query: string, options?: MetamodeSearchOptions) => MetamodeSearchResult[]
  /** Get an entry by path */
  getByPath: (path: string) => MetamodeFileEntry | MetamodeDirEntry | undefined
  /** Get a file by path */
  getFile: (path: string) => MetamodeFileEntry | undefined
  /** Get a directory by path */
  getDirectory: (path: string) => MetamodeDirEntry | undefined
  /** Database statistics (reactive) */
  stats: ComputedRef<MetamodeDatabaseStats>
  /** All unique tags (reactive) */
  allTags: ComputedRef<string[]>
  /** All programming languages (reactive) */
  allLanguages: ComputedRef<string[]>
  /** Build information */
  buildInfo: ComputedRef<{ timestamp: string; version: string }>
  /** Reactive search results (use with searchQuery ref) */
  searchQuery: Ref<string>
  /** Reactive search options */
  searchOptions: Ref<MetamodeSearchOptions>
  /** Reactive search results */
  searchResults: ComputedRef<MetamodeSearchResult[]>
  /** Get files by status */
  getFilesByStatus: (status: MetamodeStatus) => MetamodeSearchResult[]
  /** Get files by phase */
  getFilesByPhase: (phase: number) => MetamodeSearchResult[]
  /** Get files by tags */
  getFilesByTags: (tags: string[]) => MetamodeSearchResult[]
}

// Create a singleton client instance for performance
let clientInstance: MetamodeDatabaseClient | null = null

function getClient(): MetamodeDatabaseClient {
  if (!clientInstance) {
    // Cast the imported database to the expected type
    clientInstance = new MetamodeDatabaseClient(metamodeDB as unknown as MetamodeDatabase)
  }
  return clientInstance
}

/**
 * Composable for accessing the compiled MetaMode database
 */
export function useMetamodeDatabase(): UseMetamodeDatabaseResult {
  const client = getClient()

  // Reactive search state
  const searchQuery = ref('')
  const searchOptions = shallowRef<MetamodeSearchOptions>({})

  // Computed values
  const stats = computed(() => client.getStats())
  const allTags = computed(() => client.getAllTags())
  const allLanguages = computed(() => client.getAllLanguages())
  const buildInfo = computed(() => client.getBuildInfo())

  // Reactive search results
  const searchResults = computed(() => {
    if (!searchQuery.value && Object.keys(searchOptions.value).length === 0) {
      return []
    }
    return client.search(searchQuery.value, searchOptions.value)
  })

  // Methods
  const search = (query: string, options?: MetamodeSearchOptions) => {
    return client.search(query, options)
  }

  const getByPath = (path: string) => {
    return client.getByPath(path)
  }

  const getFile = (path: string) => {
    return client.getFile(path)
  }

  const getDirectory = (path: string) => {
    return client.getDirectory(path)
  }

  const getFilesByStatus = (status: MetamodeStatus) => {
    return client.getFilesByStatus(status)
  }

  const getFilesByPhase = (phase: number) => {
    return client.getFilesByPhase(phase)
  }

  const getFilesByTags = (tags: string[]) => {
    return client.getFilesByTags(tags)
  }

  return {
    database: metamodeDB as unknown as MetamodeDatabase,
    client,
    search,
    getByPath,
    getFile,
    getDirectory,
    stats,
    allTags,
    allLanguages,
    buildInfo,
    searchQuery,
    searchOptions,
    searchResults,
    getFilesByStatus,
    getFilesByPhase,
    getFilesByTags,
  }
}

export default useMetamodeDatabase
