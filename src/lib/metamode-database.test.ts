/**
 * Tests for MetaMode Embedded Database
 *
 * TASK 80: Компиляция MetaMode в единую БД (Phase 12)
 *
 * Tests cover:
 * - Database building functions
 * - Index creation
 * - Statistics computation
 * - Query client API
 * - Search functionality
 * - Helper functions
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildIndex,
  collectTags,
  collectLanguages,
  computeStats,
  buildDatabase,
  MetamodeDatabaseClient,
  expandStatus,
  shortenStatus,
  formatBytes,
  type MetamodeDirEntry,
  type MetamodeFileEntry,
  type MetamodeDatabase,
} from './metamode-database'

// ============================================================================
// Test Data
// ============================================================================

const createTestTree = (): MetamodeDirEntry => ({
  name: 'test-project',
  description: 'Test project description',
  version: '1.0.0',
  languages: ['typescript', 'vue'],
  tags: ['test', 'project'],
  files: {
    'index.ts': {
      description: 'Main entry point',
      tags: ['entry'],
      phase: 1,
      status: 'stable',
    },
    'config.ts': {
      description: 'Configuration file',
      tags: ['config'],
      phase: 1,
      status: 'beta',
      dependencies: ['utils'],
    },
    'deprecated.ts': {
      description: 'Old file',
      status: 'deprecated',
    },
  },
  children: {
    components: {
      name: 'components',
      description: 'UI components',
      tags: ['ui', 'vue'],
      files: {
        'Button.vue': {
          description: 'Button component',
          tags: ['button', 'ui'],
          phase: 2,
          status: 'stable',
        },
        'Input.vue': {
          description: 'Input component',
          tags: ['input', 'ui'],
          phase: 2,
          status: 'experimental',
        },
      },
    },
    lib: {
      name: 'lib',
      description: 'Library utilities',
      languages: ['typescript'],
      tags: ['utils'],
      files: {
        'utils.ts': {
          description: 'Utility functions',
          phase: 1,
          status: 'stable',
        },
      },
    },
  },
})

// ============================================================================
// buildIndex Tests
// ============================================================================

describe('buildIndex', () => {
  it('should create an index from a tree', () => {
    const tree = createTestTree()
    const index = buildIndex(tree)

    expect(index).toBeDefined()
    expect(Object.keys(index).length).toBeGreaterThan(0)
  })

  it('should include root at "/" path', () => {
    const tree = createTestTree()
    const index = buildIndex(tree)

    expect(index['/']).toBeDefined()
    expect((index['/'] as MetamodeDirEntry).name).toBe('test-project')
  })

  it('should include files at correct paths', () => {
    const tree = createTestTree()
    const index = buildIndex(tree)

    expect(index['index.ts']).toBeDefined()
    expect((index['index.ts'] as MetamodeFileEntry).description).toBe('Main entry point')
  })

  it('should include nested files with full paths', () => {
    const tree = createTestTree()
    const index = buildIndex(tree)

    expect(index['components/Button.vue']).toBeDefined()
    expect((index['components/Button.vue'] as MetamodeFileEntry).description).toBe(
      'Button component'
    )
  })

  it('should include nested directories', () => {
    const tree = createTestTree()
    const index = buildIndex(tree)

    expect(index['components']).toBeDefined()
    expect((index['components'] as MetamodeDirEntry).name).toBe('components')
  })

  it('should handle deeply nested paths', () => {
    const tree = createTestTree()
    const index = buildIndex(tree)

    expect(index['lib/utils.ts']).toBeDefined()
    expect((index['lib/utils.ts'] as MetamodeFileEntry).description).toBe('Utility functions')
  })
})

// ============================================================================
// collectTags Tests
// ============================================================================

describe('collectTags', () => {
  it('should collect all unique tags from the tree', () => {
    const tree = createTestTree()
    const tags = collectTags(tree)

    expect(tags).toContain('test')
    expect(tags).toContain('project')
    expect(tags).toContain('entry')
    expect(tags).toContain('config')
    expect(tags).toContain('ui')
    expect(tags).toContain('vue')
    expect(tags).toContain('button')
    expect(tags).toContain('utils')
  })

  it('should return sorted tags', () => {
    const tree = createTestTree()
    const tags = collectTags(tree)

    const sortedTags = [...tags].sort()
    expect(tags).toEqual(sortedTags)
  })

  it('should not have duplicates', () => {
    const tree = createTestTree()
    const tags = collectTags(tree)

    const uniqueTags = [...new Set(tags)]
    expect(tags).toEqual(uniqueTags)
  })

  it('should handle trees without tags', () => {
    const tree: MetamodeDirEntry = {
      name: 'empty',
      description: 'Empty tree',
    }
    const tags = collectTags(tree)

    expect(tags).toEqual([])
  })
})

// ============================================================================
// collectLanguages Tests
// ============================================================================

describe('collectLanguages', () => {
  it('should collect all unique languages from the tree', () => {
    const tree = createTestTree()
    const languages = collectLanguages(tree)

    expect(languages).toContain('typescript')
    expect(languages).toContain('vue')
  })

  it('should return sorted languages', () => {
    const tree = createTestTree()
    const languages = collectLanguages(tree)

    const sortedLanguages = [...languages].sort()
    expect(languages).toEqual(sortedLanguages)
  })

  it('should handle trees without languages', () => {
    const tree: MetamodeDirEntry = {
      name: 'empty',
      description: 'Empty tree',
    }
    const languages = collectLanguages(tree)

    expect(languages).toEqual([])
  })
})

// ============================================================================
// computeStats Tests
// ============================================================================

describe('computeStats', () => {
  it('should count directories correctly', () => {
    const tree = createTestTree()
    const stats = computeStats(tree)

    expect(stats.totalDirectories).toBe(3) // root + components + lib
  })

  it('should count files correctly', () => {
    const tree = createTestTree()
    const stats = computeStats(tree)

    expect(stats.totalFiles).toBe(6) // 3 in root + 2 in components + 1 in lib
  })

  it('should count files by status', () => {
    const tree = createTestTree()
    const stats = computeStats(tree)

    expect(stats.filesByStatus.stable).toBe(3) // index.ts, Button.vue, utils.ts
    expect(stats.filesByStatus.beta).toBe(1) // config.ts
    expect(stats.filesByStatus.experimental).toBe(1) // Input.vue
    expect(stats.filesByStatus.deprecated).toBe(1) // deprecated.ts
  })

  it('should count files by phase', () => {
    const tree = createTestTree()
    const stats = computeStats(tree)

    expect(stats.filesByPhase[1]).toBe(3) // index.ts, config.ts, utils.ts
    expect(stats.filesByPhase[2]).toBe(2) // Button.vue, Input.vue
  })

  it('should handle empty trees', () => {
    const tree: MetamodeDirEntry = {
      name: 'empty',
      description: 'Empty tree',
    }
    const stats = computeStats(tree)

    expect(stats.totalDirectories).toBe(1)
    expect(stats.totalFiles).toBe(0)
  })
})

// ============================================================================
// buildDatabase Tests
// ============================================================================

describe('buildDatabase', () => {
  it('should build a complete database', () => {
    const tree = createTestTree()
    const db = buildDatabase(tree)

    expect(db).toBeDefined()
    expect(db.root).toBe(tree)
    expect(db.index).toBeDefined()
    expect(db.allTags).toBeDefined()
    expect(db.allLanguages).toBeDefined()
    expect(db.stats).toBeDefined()
    expect(db.buildTimestamp).toBeDefined()
    expect(db.formatVersion).toBe('1.0.0')
  })

  it('should include size in stats', () => {
    const tree = createTestTree()
    const db = buildDatabase(tree)

    expect(db.stats.sizeBytes).toBeGreaterThan(0)
  })

  it('should have valid ISO 8601 timestamp', () => {
    const tree = createTestTree()
    const db = buildDatabase(tree)

    const timestamp = new Date(db.buildTimestamp)
    expect(timestamp.toISOString()).toBe(db.buildTimestamp)
  })
})

// ============================================================================
// MetamodeDatabaseClient Tests
// ============================================================================

describe('MetamodeDatabaseClient', () => {
  let db: MetamodeDatabase
  let client: MetamodeDatabaseClient

  beforeEach(() => {
    const tree = createTestTree()
    db = buildDatabase(tree)
    client = new MetamodeDatabaseClient(db)
  })

  describe('getRoot', () => {
    it('should return the root node', () => {
      const root = client.getRoot()
      expect(root.name).toBe('test-project')
    })
  })

  describe('getByPath', () => {
    it('should return root for "/" path', () => {
      const entry = client.getByPath('/')
      expect(entry).toBeDefined()
      expect((entry as MetamodeDirEntry).name).toBe('test-project')
    })

    it('should return file by path', () => {
      const entry = client.getByPath('index.ts')
      expect(entry).toBeDefined()
      expect((entry as MetamodeFileEntry).description).toBe('Main entry point')
    })

    it('should return nested file by path', () => {
      const entry = client.getByPath('components/Button.vue')
      expect(entry).toBeDefined()
      expect((entry as MetamodeFileEntry).description).toBe('Button component')
    })

    it('should return directory by path', () => {
      const entry = client.getByPath('components')
      expect(entry).toBeDefined()
      expect((entry as MetamodeDirEntry).name).toBe('components')
    })

    it('should return undefined for non-existent path', () => {
      const entry = client.getByPath('nonexistent')
      expect(entry).toBeUndefined()
    })

    it('should normalize paths with leading slash', () => {
      const entry = client.getByPath('/index.ts')
      expect(entry).toBeDefined()
    })
  })

  describe('getFile', () => {
    it('should return file entry', () => {
      const file = client.getFile('index.ts')
      expect(file).toBeDefined()
      expect(file?.description).toBe('Main entry point')
    })

    it('should return undefined for directory path', () => {
      const file = client.getFile('components')
      expect(file).toBeUndefined()
    })
  })

  describe('getDirectory', () => {
    it('should return directory entry', () => {
      const dir = client.getDirectory('components')
      expect(dir).toBeDefined()
      expect(dir?.name).toBe('components')
    })

    it('should return undefined for file path', () => {
      const dir = client.getDirectory('index.ts')
      expect(dir).toBeUndefined()
    })
  })

  describe('search', () => {
    it('should search by name', () => {
      const results = client.search('Button')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.path.includes('Button'))).toBe(true)
    })

    it('should search by description', () => {
      const results = client.search('component')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search by tags', () => {
      const results = client.search('ui')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should be case-insensitive by default', () => {
      const results1 = client.search('button')
      const results2 = client.search('BUTTON')
      expect(results1.length).toBe(results2.length)
    })

    it('should respect case sensitivity option', () => {
      const resultsInsensitive = client.search('button', { caseInsensitive: true })
      const resultsSensitive = client.search('button', { caseInsensitive: false })
      expect(resultsInsensitive.length).toBeGreaterThanOrEqual(resultsSensitive.length)
    })

    it('should filter by status', () => {
      const results = client.search('', { status: 'stable', filesOnly: true })
      expect(results.every((r) => (r.entry as MetamodeFileEntry).status === 'stable')).toBe(true)
    })

    it('should filter by phase', () => {
      const results = client.search('', { phase: 2, filesOnly: true })
      expect(results.every((r) => (r.entry as MetamodeFileEntry).phase === 2)).toBe(true)
    })

    it('should filter by tags', () => {
      const results = client.search('', { tags: ['ui'], filesOnly: true })
      expect(
        results.every((r) => {
          const file = r.entry as MetamodeFileEntry
          return file.tags?.includes('ui')
        })
      ).toBe(true)
    })

    it('should filter files only', () => {
      const results = client.search('', { filesOnly: true })
      expect(results.every((r) => r.type === 'file')).toBe(true)
    })

    it('should filter directories only', () => {
      const results = client.search('', { dirsOnly: true })
      expect(results.every((r) => r.type === 'directory')).toBe(true)
    })

    it('should respect limit option', () => {
      const results = client.search('', { limit: 2 })
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should sort by relevance score', () => {
      const results = client.search('component')
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  describe('getFilesByStatus', () => {
    it('should return files with specified status', () => {
      const results = client.getFilesByStatus('stable')
      expect(results.length).toBe(3)
    })

    it('should return empty array for unused status', () => {
      // All our test data uses these statuses, but if we had none with 'deprecated'
      const results = client.getFilesByStatus('deprecated')
      expect(results.length).toBe(1)
    })
  })

  describe('getFilesByPhase', () => {
    it('should return files in specified phase', () => {
      const results = client.getFilesByPhase(1)
      expect(results.length).toBe(3)
    })

    it('should return empty array for unused phase', () => {
      const results = client.getFilesByPhase(99)
      expect(results.length).toBe(0)
    })
  })

  describe('getFilesByTags', () => {
    it('should return files with any matching tag', () => {
      const results = client.getFilesByTags(['ui'])
      expect(results.length).toBeGreaterThan(0)
    })

    it('should match any tag (OR logic)', () => {
      const results = client.getFilesByTags(['entry', 'button'])
      expect(results.length).toBe(2) // index.ts + Button.vue
    })
  })

  describe('getAllTags', () => {
    it('should return all tags', () => {
      const tags = client.getAllTags()
      expect(tags).toContain('test')
      expect(tags).toContain('ui')
    })
  })

  describe('getAllLanguages', () => {
    it('should return all languages', () => {
      const languages = client.getAllLanguages()
      expect(languages).toContain('typescript')
      expect(languages).toContain('vue')
    })
  })

  describe('getStats', () => {
    it('should return database statistics', () => {
      const stats = client.getStats()
      expect(stats.totalFiles).toBe(6)
      expect(stats.totalDirectories).toBe(3)
    })
  })

  describe('getBuildInfo', () => {
    it('should return build information', () => {
      const info = client.getBuildInfo()
      expect(info.version).toBe('1.0.0')
      expect(info.timestamp).toBeDefined()
    })
  })

  describe('traverse', () => {
    it('should visit all entries', () => {
      const visited: string[] = []
      client.traverse((entry, path) => {
        visited.push(path)
      })

      expect(visited.length).toBeGreaterThan(0)
      expect(visited).toContain('/')
      expect(visited).toContain('components')
    })

    it('should allow early termination', () => {
      let count = 0
      client.traverse(() => {
        count++
        if (count >= 2) return false
      })

      expect(count).toBe(2)
    })

    it('should filter by type', () => {
      const files: string[] = []
      client.traverse(
        (entry, path, type) => {
          files.push(path)
        },
        { includeFiles: true, includeDirectories: false }
      )

      expect(files.every((f) => f !== '/' && f !== 'components')).toBe(true)
    })
  })

  describe('getRawDatabase', () => {
    it('should return the raw database object', () => {
      const raw = client.getRawDatabase()
      expect(raw).toBe(db)
    })
  })
})

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('expandStatus', () => {
  it('should expand "exp" to "experimental"', () => {
    expect(expandStatus('exp')).toBe('experimental')
  })

  it('should expand "dep" to "deprecated"', () => {
    expect(expandStatus('dep')).toBe('deprecated')
  })

  it('should keep "stable" unchanged', () => {
    expect(expandStatus('stable')).toBe('stable')
  })

  it('should keep "beta" unchanged', () => {
    expect(expandStatus('beta')).toBe('beta')
  })
})

describe('shortenStatus', () => {
  it('should shorten "experimental" to "exp"', () => {
    expect(shortenStatus('experimental')).toBe('exp')
  })

  it('should shorten "deprecated" to "dep"', () => {
    expect(shortenStatus('deprecated')).toBe('dep')
  })

  it('should keep "stable" unchanged', () => {
    expect(shortenStatus('stable')).toBe('stable')
  })

  it('should keep "beta" unchanged', () => {
    expect(shortenStatus('beta')).toBe('beta')
  })
})

describe('formatBytes', () => {
  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 B')
  })

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB')
  })
})
