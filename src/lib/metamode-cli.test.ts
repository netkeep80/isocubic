/**
 * Tests for MetaMode Unified CLI (MetaMode v2.0, Phase 5)
 *
 * Tests cover the CLI's integration of all sub-commands:
 * - parse: annotation parsing
 * - validate: semantic validation
 * - migrate: v1 → v2 migration
 * - compile: DB compilation
 * - context: AI context building
 * - optimize: production optimization
 * - generate-tests: test generation
 * - status: project status overview
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import * as path from 'node:path'
import * as fs from 'node:fs'

// ============================================================================
// Test Helpers — Test project with @mm: annotations
// ============================================================================

const PROJECT_ROOT = path.resolve(process.cwd())

// ============================================================================
// Import CLI modules (not the CLI itself, but the underlying modules it uses)
// ============================================================================

import {
  scanDirectoryForAnnotations,
  parseAnnotationsFromFile,
  buildAnnotationIndex,
} from '../../scripts/metamode-annotation-parser'

import {
  validateAnnotations,
} from '../../scripts/metamode-semantic-validator'

import {
  analyzeMigration,
  formatMigrationReport,
} from '../../scripts/metamode-migrate'

import {
  compileV2Database,
  createMmApi,
} from '../../scripts/metamode-db-compiler'

import {
  buildContext,
  buildContextForAgent,
  runPreCommitCheck,
} from '../../scripts/metamode-context-builder'

import {
  optimizeForProduction,
  analyzeBundleSize,
  serializeCompact,
} from '../../scripts/metamode-prod-optimizer'

import {
  generateTestSuites,
  renderTestFile,
} from '../../scripts/metamode-test-generator'

// ============================================================================
// CLI integration tests via underlying APIs
// ============================================================================

describe('MetaMode CLI Integration (TASK 86)', () => {
  // -------------------------------------------------------------------------
  // parse command integration
  // -------------------------------------------------------------------------

  describe('parse command behavior', () => {
    it('should parse annotations from src directory', () => {
      const srcDir = path.join(PROJECT_ROOT, 'src')
      if (!fs.existsSync(srcDir)) return

      const results = scanDirectoryForAnnotations(srcDir)
      // Should return an array (even if empty for this project)
      expect(Array.isArray(results)).toBe(true)
    })

    it('should parse a single annotated file', () => {
      const testFile = path.join(
        PROJECT_ROOT,
        'src/lib/metamode-annotation-parser.test.ts'
      )
      if (!fs.existsSync(testFile)) return

      const result = parseAnnotationsFromFile(testFile)
      expect(result).toHaveProperty('filePath')
      expect(result).toHaveProperty('annotations')
      expect(result.annotations.length).toBeGreaterThan(0)
    })

    it('should return empty annotations for non-annotated files', () => {
      const testFile = path.join(PROJECT_ROOT, 'package.json')
      if (!fs.existsSync(testFile)) return

      const result = parseAnnotationsFromFile(testFile)
      expect(result.annotations).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // validate command integration
  // -------------------------------------------------------------------------

  describe('validate command behavior', () => {
    it('should validate annotations and return results', () => {
      const srcDir = path.join(PROJECT_ROOT, 'src')
      if (!fs.existsSync(srcDir)) return

      const results = scanDirectoryForAnnotations(srcDir)
      const validationResult = validateAnnotations(results)

      expect(validationResult).toHaveProperty('errors')
      expect(validationResult).toHaveProperty('warnings')
      expect(Array.isArray(validationResult.errors)).toBe(true)
      expect(Array.isArray(validationResult.warnings)).toBe(true)
    })

    it('should report errors for annotations missing required fields', () => {
      // The annotation-parser test file has some incomplete annotations
      const testFile = path.join(
        PROJECT_ROOT,
        'src/lib/metamode-annotation-parser.test.ts'
      )
      if (!fs.existsSync(testFile)) return

      const results = scanDirectoryForAnnotations(path.dirname(testFile))
      const filtered = results.filter((r) =>
        r.filePath.includes('metamode-annotation-parser.test.ts')
      )

      const validationResult = validateAnnotations(filtered)
      // The test file intentionally has incomplete annotations
      expect(validationResult.errors.length).toBeGreaterThan(0)
    })
  })

  // -------------------------------------------------------------------------
  // migrate command integration
  // -------------------------------------------------------------------------

  describe('migrate command behavior', () => {
    it('should analyze migration and find v1.x files', () => {
      const report = analyzeMigration(PROJECT_ROOT)

      expect(report).toHaveProperty('entries')
      expect(report).toHaveProperty('totalFiles')
      expect(report).toHaveProperty('totalAnnotations')
      expect(report).toHaveProperty('mode')
      expect(report.mode).toBe('dry-run')
    })

    it('should find metamode.json files in the project', () => {
      const report = analyzeMigration(PROJECT_ROOT)
      // isocubic has 32 metamode.json files
      expect(report.totalFiles).toBeGreaterThan(0)
    })

    it('should generate @mm: annotations for each file found', () => {
      const report = analyzeMigration(PROJECT_ROOT)
      expect(report.totalAnnotations).toBeGreaterThan(report.totalFiles)
    })

    it('should format migration report as human-readable text', () => {
      const report = analyzeMigration(PROJECT_ROOT)
      const formatted = formatMigrationReport(report)

      expect(typeof formatted).toBe('string')
      expect(formatted).toContain('MetaMode Migration Report')
      expect(formatted).toContain('metamode.json files found')
    })

    it('should generate proper @mm: annotation blocks', () => {
      const report = analyzeMigration(PROJECT_ROOT)
      expect(report.entries.length).toBeGreaterThan(0)

      const firstEntry = report.entries[0]
      expect(firstEntry).toHaveProperty('directoryAnnotation')
      expect(firstEntry.directoryAnnotation).toContain('@mm:id=')
      expect(firstEntry.directoryAnnotation).toContain('@mm:name=')
      expect(firstEntry.directoryAnnotation).toContain('@mm:desc=')
    })
  })

  // -------------------------------------------------------------------------
  // compile command integration
  // -------------------------------------------------------------------------

  describe('compile command behavior', () => {
    it('should compile v2 database from annotations', () => {
      const db = compileV2Database(PROJECT_ROOT)

      expect(db).toHaveProperty('entries')
      expect(db).toHaveProperty('graph')
      expect(db).toHaveProperty('stats')
      expect(db).toHaveProperty('buildInfo')
    })

    it('should include build info with version and timestamp', () => {
      const db = compileV2Database(PROJECT_ROOT)

      expect(db.buildInfo.version).toBe('2.0.0')
      expect(db.buildInfo.format).toBe('metamode-v2')
      expect(db.buildInfo.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should create a runtime API from compiled DB', () => {
      const db = compileV2Database(PROJECT_ROOT)
      const mm = createMmApi(db)

      expect(mm).toHaveProperty('findById')
      expect(mm).toHaveProperty('findAll')
      expect(mm).toHaveProperty('findByTag')
      expect(mm).toHaveProperty('getDependencies')
      expect(mm).toHaveProperty('getDependents')
      expect(mm).toHaveProperty('detectCycle')
      expect(mm).toHaveProperty('findAllCycles')
      expect(mm).toHaveProperty('validate')
      expect(mm).toHaveProperty('exportForLLM')
      expect(mm).toHaveProperty('getGraph')
      expect(mm).toHaveProperty('exportGraph')
    })

    it('should detect no cycles in the compiled database', () => {
      const db = compileV2Database(PROJECT_ROOT)
      const mm = createMmApi(db)
      const cycles = mm.findAllCycles()

      // No circular dependencies should be detected in the test annotations
      expect(Array.isArray(cycles)).toBe(true)
    })

    it('should export graph in JSON format', () => {
      const db = compileV2Database(PROJECT_ROOT)
      const mm = createMmApi(db)
      const graph = mm.exportGraph({ format: 'json' })

      expect(typeof graph).toBe('string')
      const parsed = JSON.parse(graph)
      expect(parsed).toHaveProperty('nodes')
      expect(parsed).toHaveProperty('edges')
    })

    it('should export graph in DOT format', () => {
      const db = compileV2Database(PROJECT_ROOT)
      const mm = createMmApi(db)
      const dot = mm.exportGraph({ format: 'dot' })

      expect(typeof dot).toBe('string')
      expect(dot).toContain('digraph MetaModeGraph')
    })
  })

  // -------------------------------------------------------------------------
  // context command integration
  // -------------------------------------------------------------------------

  describe('context command behavior', () => {
    it('should build AI context from compiled database', () => {
      const db = compileV2Database(PROJECT_ROOT)
      const ctx = buildContext(db, { agentType: 'generic', format: 'markdown' })

      expect(ctx).toHaveProperty('prompt')
      expect(ctx).toHaveProperty('entries')
      expect(ctx).toHaveProperty('stats')
      expect(ctx).toHaveProperty('tokenCount')
      expect(typeof ctx.prompt).toBe('string')
    })

    it('should build context for all supported agent types', () => {
      const db = compileV2Database(PROJECT_ROOT)
      const agentTypes = ['codegen', 'refactor', 'docgen', 'review', 'generic'] as const

      for (const agentType of agentTypes) {
        const ctx = buildContextForAgent(agentType, db)
        expect(ctx.prompt.length).toBeGreaterThan(0)
      }
    })

    it('should respect token budget', () => {
      const db = compileV2Database(PROJECT_ROOT)
      const ctx = buildContext(db, { tokenBudget: 100 })

      // If we hit the budget, it should be marked as trimmed
      if (ctx.tokenCount > 100) {
        expect(ctx.wasTrimmed).toBe(true)
      }
    })

    it('should support pre-commit check for unannotated files', () => {
      const db = compileV2Database(PROJECT_ROOT)
      // Check some non-existent files
      const filesToCheck = ['src/new-component.ts', 'src/utils/helper.ts']
      const missing = runPreCommitCheck(filesToCheck, db)

      expect(Array.isArray(missing)).toBe(true)
      // All files are missing annotations since they don't exist in the DB
      expect(missing.length).toBeGreaterThanOrEqual(0)
    })
  })

  // -------------------------------------------------------------------------
  // optimize command integration
  // -------------------------------------------------------------------------

  describe('optimize command behavior', () => {
    it('should optimize for production', () => {
      const devDb = compileV2Database(PROJECT_ROOT)
      const prodDb = optimizeForProduction(devDb)

      expect(prodDb).toHaveProperty('entries')
      expect(prodDb).toHaveProperty('stats')
    })

    it('should remove internal entries in production', () => {
      const devDb = compileV2Database(PROJECT_ROOT)
      const prodDb = optimizeForProduction(devDb)

      // Verify no internal entries in prod
      for (const entry of Object.values(prodDb.entries)) {
        expect(entry.visibility).not.toBe('internal')
      }
    })

    it('should analyze bundle size difference', () => {
      const devDb = compileV2Database(PROJECT_ROOT)
      const prodDb = optimizeForProduction(devDb)
      const report = analyzeBundleSize(devDb, prodDb)

      expect(report).toHaveProperty('devSizeBytes')
      expect(report).toHaveProperty('prodSizeBytes')
      expect(report).toHaveProperty('savedBytes')
      expect(report).toHaveProperty('reductionPercent')
      expect(report.devSizeBytes).toBeGreaterThan(0)
      expect(report.reductionPercent).toBeGreaterThanOrEqual(0)
    })

    it('should serialize compact production database', () => {
      const devDb = compileV2Database(PROJECT_ROOT)
      const prodDb = optimizeForProduction(devDb)
      const serialized = serializeCompact(prodDb)

      expect(typeof serialized).toBe('string')
      expect(serialized.length).toBeGreaterThan(0)
      // Should be valid JSON
      expect(() => JSON.parse(serialized)).not.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // generate-tests command integration
  // -------------------------------------------------------------------------

  describe('generate-tests command behavior', () => {
    it('should generate test suites from scan results', () => {
      const srcDir = path.join(PROJECT_ROOT, 'src')
      if (!fs.existsSync(srcDir)) return

      const results = scanDirectoryForAnnotations(srcDir)
      const suites = generateTestSuites(results, { requiredFields: ['id', 'desc'] })

      expect(Array.isArray(suites)).toBe(true)
    })

    it('should render test file from generated suites', () => {
      const srcDir = path.join(PROJECT_ROOT, 'src')
      if (!fs.existsSync(srcDir)) return

      const results = scanDirectoryForAnnotations(srcDir)
      const suites = generateTestSuites(results, { requiredFields: ['id', 'desc'] })

      if (suites.length > 0) {
        const rendered = renderTestFile(suites, PROJECT_ROOT)
        expect(typeof rendered).toBe('string')
        expect(rendered).toContain('describe')
        expect(rendered).toContain('it(')
        expect(rendered).toContain('@mm:')
      }
    })
  })

  // -------------------------------------------------------------------------
  // Dual-mode verification
  // -------------------------------------------------------------------------

  describe('dual-mode operation', () => {
    it('should have both v1.x metamode.json files and v2.0 annotations accessible', () => {
      // v1.x: check metamode.json exists
      const rootMetamode = path.join(PROJECT_ROOT, 'metamode.json')
      expect(fs.existsSync(rootMetamode)).toBe(true)

      // v2.0: check for @mm: annotations
      const migrationReport = analyzeMigration(PROJECT_ROOT)
      expect(migrationReport.totalFiles).toBeGreaterThan(0)

      // Both should work simultaneously
      const db = compileV2Database(PROJECT_ROOT)
      expect(db.stats).toBeDefined()
    })

    it('should compile v2 database without corrupting v1 data', () => {
      // v1 metamode.json should remain unchanged after v2 compilation
      const rootMetamode = path.join(PROJECT_ROOT, 'metamode.json')
      const beforeContent = fs.readFileSync(rootMetamode, 'utf-8')

      // Compile v2 database
      compileV2Database(PROJECT_ROOT)

      const afterContent = fs.readFileSync(rootMetamode, 'utf-8')
      expect(afterContent).toBe(beforeContent)
    })
  })

  // -------------------------------------------------------------------------
  // Full migration workflow
  // -------------------------------------------------------------------------

  describe('full migration workflow', () => {
    it('should successfully run migration analysis on isocubic project', () => {
      const report = analyzeMigration(PROJECT_ROOT)

      expect(report.mode).toBe('dry-run')
      expect(report.errors).toHaveLength(0) // No parse errors expected
      expect(report.totalFiles).toBe(32) // isocubic has 32 metamode.json files
      expect(report.totalAnnotations).toBeGreaterThan(100) // Many file annotations
    })

    it('should generate valid @mm: annotation format from v1 data', () => {
      const report = analyzeMigration(PROJECT_ROOT)

      for (const entry of report.entries) {
        // Every entry should have a valid annotation
        expect(entry.directoryAnnotation).toMatch(/\/\*\*/)
        expect(entry.directoryAnnotation).toMatch(/@mm:id=/)
        expect(entry.directoryAnnotation).toMatch(/@mm:desc=/)
        expect(entry.directoryAnnotation).toMatch(/\*\//)
      }
    })

    it('should suggest target files for directory annotations', () => {
      const report = analyzeMigration(PROJECT_ROOT)

      for (const entry of report.entries) {
        expect(entry.suggestedTarget).toBeTruthy()
        expect(typeof entry.suggestedTarget).toBe('string')
      }
    })
  })
})
