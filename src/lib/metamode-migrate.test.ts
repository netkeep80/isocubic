/**
 * Tests for MetaMode Migration Tool (MetaMode v2.0)
 *
 * Tests cover:
 * - generateDirectoryAnnotation: converts MetamodeJson to @mm: comment block
 * - generateFileAnnotation: converts FileDescriptor to @mm: comment block
 * - analyzeMigration: dry-run analysis of a v1.x project
 * - formatMigrationReport: human-readable output
 */

import { describe, it, expect } from 'vitest'
import {
  generateDirectoryAnnotation,
  generateFileAnnotation,
  analyzeMigration,
  formatMigrationReport,
} from '../../scripts/metamode-migrate'

// ============================================================================
// generateDirectoryAnnotation Tests
// ============================================================================

describe('generateDirectoryAnnotation', () => {
  it('should generate a basic @mm: block for a module', () => {
    const metamode = {
      name: 'isocubic',
      description: 'Main application',
    }

    const result = generateDirectoryAnnotation(metamode, 'src')

    expect(result).toContain('@mm:id=src')
    expect(result).toContain('@mm:name=isocubic')
    expect(result).toContain('@mm:desc=Main application')
  })

  it('should include version when present', () => {
    const metamode = {
      name: 'myModule',
      description: 'A module',
      version: '1.2.3',
    }

    const result = generateDirectoryAnnotation(metamode, 'my-module')

    expect(result).toContain('@mm:version=1.2.3')
  })

  it('should include tags as comma-separated list', () => {
    const metamode = {
      name: 'uiModule',
      description: 'UI components',
      tags: ['ui', 'vue', 'stable'],
    }

    const result = generateDirectoryAnnotation(metamode, 'components')

    expect(result).toContain('@mm:tags=ui,vue,stable')
  })

  it('should skip tags when not present', () => {
    const metamode = {
      name: 'simple',
      description: 'Simple module',
    }

    const result = generateDirectoryAnnotation(metamode, 'simple')

    expect(result).not.toContain('@mm:tags')
  })

  it('should be a valid JSDoc comment block', () => {
    const metamode = {
      name: 'test',
      description: 'Test module',
    }

    const result = generateDirectoryAnnotation(metamode, 'test')

    expect(result).toMatch(/^\/\*\*/)
    expect(result).toMatch(/\*\/$/)
  })

  it('should sanitize the directory name into a valid ID', () => {
    const metamode = {
      name: 'My Module',
      description: 'A module',
    }

    // Dashes, spaces, and special chars should become underscores
    const result = generateDirectoryAnnotation(metamode, 'my-module-dir')

    expect(result).toContain('@mm:id=my_module_dir')
  })

  it('should handle empty directory name gracefully', () => {
    const metamode = {
      name: 'Root',
      description: 'Root module',
    }

    const result = generateDirectoryAnnotation(metamode, '')

    // Should fallback to 'module'
    expect(result).toContain('@mm:id=module')
  })
})

// ============================================================================
// generateFileAnnotation Tests
// ============================================================================

describe('generateFileAnnotation', () => {
  it('should generate a basic @mm: block for a file', () => {
    const descriptor = {
      description: 'Entry point for the application',
    }

    const result = generateFileAnnotation('index.ts', descriptor)

    expect(result).toContain('@mm:id=index')
    expect(result).toContain('@mm:desc=Entry point for the application')
  })

  it('should include tags', () => {
    const descriptor = {
      description: 'Utility functions',
      tags: ['utils', 'pure'],
    }

    const result = generateFileAnnotation('utils.ts', descriptor)

    expect(result).toContain('@mm:tags=utils,pure')
  })

  it('should include status', () => {
    const descriptor = {
      description: 'Stable component',
      status: 'stable',
    }

    const result = generateFileAnnotation('Comp.vue', descriptor)

    expect(result).toContain('@mm:status=stable')
  })

  it('should include phase', () => {
    const descriptor = {
      description: 'Phase 5 component',
      phase: 5,
    }

    const result = generateFileAnnotation('comp.ts', descriptor)

    expect(result).toContain('@mm:phase=5')
  })

  it('should include dependencies', () => {
    const descriptor = {
      description: 'Component with deps',
      dependencies: ['lib/utils', 'lib/api'],
    }

    const result = generateFileAnnotation('comp.ts', descriptor)

    expect(result).toContain('@mm:deps=lib/utils,lib/api')
  })

  it('should skip optional fields when not present', () => {
    const descriptor = {
      description: 'Minimal file',
    }

    const result = generateFileAnnotation('minimal.ts', descriptor)

    expect(result).not.toContain('@mm:tags')
    expect(result).not.toContain('@mm:status')
    expect(result).not.toContain('@mm:phase')
    expect(result).not.toContain('@mm:deps')
  })

  it('should use the filename base (without extension) as ID', () => {
    const descriptor = {
      description: 'Test',
    }

    const result = generateFileAnnotation('MyComponent.vue', descriptor)

    expect(result).toContain('@mm:id=mycomponent')
  })

  it('should be a valid JSDoc comment block', () => {
    const descriptor = {
      description: 'File',
    }

    const result = generateFileAnnotation('file.ts', descriptor)

    expect(result).toMatch(/^\/\*\*/)
    expect(result).toMatch(/\*\/$/)
  })
})

// ============================================================================
// analyzeMigration Tests (uses temp files)
// ============================================================================

import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

function createTempProject(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-migrate-test-'))
  return tmpDir
}

function createMetamodeJson(dirPath: string, content: object) {
  const mmPath = path.join(dirPath, 'metamode.json')
  fs.writeFileSync(mmPath, JSON.stringify(content, null, 2))
  return mmPath
}

describe('analyzeMigration', () => {
  it('should find and analyze metamode.json in a temp project', () => {
    const tmpDir = createTempProject()

    createMetamodeJson(tmpDir, {
      name: 'test-project',
      description: 'A test project',
      version: '1.0.0',
    })

    const report = analyzeMigration(tmpDir)

    expect(report.totalFiles).toBe(1)
    expect(report.entries).toHaveLength(1)
    expect(report.mode).toBe('dry-run')
    expect(report.errors).toHaveLength(0)

    // Clean up
    fs.rmSync(tmpDir, { recursive: true })
  })

  it('should include file annotations from metamode.json', () => {
    const tmpDir = createTempProject()

    createMetamodeJson(tmpDir, {
      name: 'project',
      description: 'Project',
      files: {
        'index.ts': {
          description: 'Main entry point',
          status: 'stable',
        },
        'utils.ts': {
          description: 'Utility functions',
          tags: ['utils'],
        },
      },
    })

    const report = analyzeMigration(tmpDir)

    expect(report.entries[0].fileAnnotations).toHaveProperty('index.ts')
    expect(report.entries[0].fileAnnotations).toHaveProperty('utils.ts')
    expect(report.entries[0].fileAnnotations['index.ts']).toContain('@mm:status=stable')
    expect(report.entries[0].fileAnnotations['utils.ts']).toContain('@mm:tags=utils')

    fs.rmSync(tmpDir, { recursive: true })
  })

  it('should traverse subdirectories', () => {
    const tmpDir = createTempProject()
    const srcDir = path.join(tmpDir, 'src')
    fs.mkdirSync(srcDir)

    createMetamodeJson(tmpDir, {
      name: 'project',
      description: 'Root',
      directories: {
        src: { description: 'Source files' },
      },
    })

    createMetamodeJson(srcDir, {
      name: 'src',
      description: 'Source code',
    })

    const report = analyzeMigration(tmpDir)

    expect(report.totalFiles).toBe(2)

    fs.rmSync(tmpDir, { recursive: true })
  })

  it('should return empty report when no metamode.json found', () => {
    const tmpDir = createTempProject()

    const report = analyzeMigration(tmpDir)

    expect(report.totalFiles).toBe(0)
    expect(report.entries).toHaveLength(0)

    fs.rmSync(tmpDir, { recursive: true })
  })

  it('should count total annotations correctly', () => {
    const tmpDir = createTempProject()

    createMetamodeJson(tmpDir, {
      name: 'project',
      description: 'Root',
      files: {
        'a.ts': { description: 'File A' },
        'b.ts': { description: 'File B' },
      },
    })

    const report = analyzeMigration(tmpDir)

    // 1 directory annotation + 2 file annotations = 3
    expect(report.totalAnnotations).toBe(3)

    fs.rmSync(tmpDir, { recursive: true })
  })
})

// ============================================================================
// formatMigrationReport Tests
// ============================================================================

describe('formatMigrationReport', () => {
  it('should include report header', () => {
    const report = {
      entries: [],
      totalFiles: 0,
      totalAnnotations: 0,
      mode: 'dry-run' as const,
      errors: [],
    }

    const output = formatMigrationReport(report)

    expect(output).toContain('MetaMode Migration Report')
    expect(output).toContain('v1.x → v2.0')
  })

  it('should include statistics', () => {
    const report = {
      entries: [],
      totalFiles: 5,
      totalAnnotations: 12,
      mode: 'dry-run' as const,
      errors: [],
    }

    const output = formatMigrationReport(report)

    expect(output).toContain('5')
    expect(output).toContain('12')
  })

  it('should include dry-run hint', () => {
    const report = {
      entries: [],
      totalFiles: 3,
      totalAnnotations: 5,
      mode: 'dry-run' as const,
      errors: [],
    }

    const output = formatMigrationReport(report)

    expect(output).toContain('--apply')
  })

  it('should not include dry-run hint when mode is applied', () => {
    const report = {
      entries: [],
      totalFiles: 0,
      totalAnnotations: 0,
      mode: 'applied' as const,
      errors: [],
    }

    const output = formatMigrationReport(report)

    expect(output).not.toContain('--apply')
  })

  it('should include error messages', () => {
    const report = {
      entries: [],
      totalFiles: 0,
      totalAnnotations: 0,
      mode: 'dry-run' as const,
      errors: ['Failed to parse: /some/file.json'],
    }

    const output = formatMigrationReport(report)

    expect(output).toContain('Failed to parse')
    expect(output).toContain('/some/file.json')
  })
})
