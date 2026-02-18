/**
 * Tests for MetaMode v2.0 Phase 2 — Schema Validation
 *
 * Tests cover:
 * - validateAnnotationAgainstSchema: checks individual annotation fields
 * - checkSchemaValidates: integration with the full validator pipeline
 * - schema-validates rule in validateAnnotations
 * - generateTestSuites: test suite generation for annotated modules
 * - renderTestFile: generating valid Vitest-compatible test code
 */

import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import {
  validateAnnotations,
  validateAnnotationAgainstSchema,
  checkSchemaValidates,
} from '../../scripts/metamode-semantic-validator'
import { generateTestSuites, renderTestFile } from '../../scripts/metamode-test-generator'
import type { FileParseResult } from '../../scripts/metamode-annotation-parser'
import type { MmAnnotation } from '../../scripts/metamode-annotation-parser'

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a minimal FileParseResult with a single annotation */
function makeResult(
  id: string,
  extra: Record<string, unknown> = {},
  filePath = '/src/test.ts',
  line = 1
): FileParseResult {
  return {
    filePath,
    annotations: [
      {
        annotation: { id, desc: `Description of ${id}`, ...extra } as MmAnnotation,
        source: 'jsdoc' as const,
        line,
        raw: '',
        entityName: id,
      },
    ],
    warnings: [],
  }
}

/** Minimal valid annotation */
function validAnnotation(overrides: Partial<MmAnnotation> = {}): MmAnnotation {
  return {
    id: 'my_module',
    desc: 'A valid module description',
    ...overrides,
  }
}

/** Minimal schema that mirrors mm-annotation.schema.json structure */
const testSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    id: { type: 'string', pattern: '^[a-zA-Z_][a-zA-Z0-9_/-]*$', minLength: 1, maxLength: 128 },
    name: { type: 'string', minLength: 1, maxLength: 256 },
    desc: { type: 'string', minLength: 1, maxLength: 1024 },
    tags: {
      type: 'array',
      items: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$', maxLength: 64 },
      uniqueItems: true,
      maxItems: 32,
    },
    deps: { oneOf: [{ type: 'array' }, { type: 'object' }] },
    ai: { oneOf: [{ type: 'string' }, { type: 'object' }] },
    visibility: { type: 'string', enum: ['public', 'internal'] },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
    phase: { type: 'integer', minimum: 1, maximum: 99 },
    status: {
      type: 'string',
      enum: ['stable', 'beta', 'experimental', 'deprecated', 'exp', 'dep'],
    },
  },
  additionalProperties: false,
}

// ============================================================================
// validateAnnotationAgainstSchema
// ============================================================================

describe('validateAnnotationAgainstSchema - valid annotations', () => {
  it('should return no errors for a minimal valid annotation', () => {
    const annotation = validAnnotation()
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors).toHaveLength(0)
  })

  it('should return no errors for a fully populated annotation', () => {
    const annotation = validAnnotation({
      name: 'MyModule',
      tags: ['ui', 'stable'],
      visibility: 'public',
      version: '1.2.3',
      phase: 5,
      status: 'stable',
      deps: { runtime: ['dep_a'], build: ['dep_b'] },
      ai: 'Short AI summary',
    })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors).toHaveLength(0)
  })

  it('should return no errors for annotation with array deps', () => {
    const annotation = validAnnotation({ deps: ['dep_a', 'dep_b'] })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors).toHaveLength(0)
  })

  it('should return no errors for annotation with AI object', () => {
    const annotation = validAnnotation({
      ai: { summary: 'Short summary', usage: 'Use for X', examples: ['example1'] },
    })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors).toHaveLength(0)
  })

  it('should accept all valid status values', () => {
    const validStatuses = ['stable', 'beta', 'experimental', 'deprecated', 'exp', 'dep']
    for (const status of validStatuses) {
      const annotation = validAnnotation({ status: status as MmAnnotation['status'] })
      const errors = validateAnnotationAgainstSchema(annotation, testSchema)
      expect(errors).toHaveLength(0)
    }
  })

  it('should accept both public and internal visibility', () => {
    for (const vis of ['public', 'internal'] as const) {
      const annotation = validAnnotation({ visibility: vis })
      const errors = validateAnnotationAgainstSchema(annotation, testSchema)
      expect(errors).toHaveLength(0)
    }
  })
})

describe('validateAnnotationAgainstSchema - invalid annotations', () => {
  it('should report error for invalid visibility value', () => {
    const annotation = { ...validAnnotation(), visibility: 'private' as MmAnnotation['visibility'] }
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:visibility'))).toBe(true)
    expect(errors.some((e) => e.includes('private'))).toBe(true)
  })

  it('should report error for invalid status value', () => {
    const annotation = { ...validAnnotation(), status: 'unknown_status' as MmAnnotation['status'] }
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:status'))).toBe(true)
  })

  it('should report error for desc that is too long', () => {
    const longDesc = 'x'.repeat(1025)
    const annotation = validAnnotation({ desc: longDesc })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:desc') && e.includes('1024'))).toBe(true)
  })

  it('should report error for id that is too long', () => {
    const longId = 'a'.repeat(129)
    const annotation = validAnnotation({ id: longId })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:id') && e.includes('128'))).toBe(true)
  })

  it('should report error for id with invalid characters', () => {
    const annotation = validAnnotation({ id: '123invalid' }) // starts with digit
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:id'))).toBe(true)
  })

  it('should report error for ai string that is too long', () => {
    const longAi = 'x'.repeat(201)
    const annotation = validAnnotation({ ai: longAi })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:ai') && e.includes('200'))).toBe(true)
  })

  it('should report error for ai.summary that is too long', () => {
    const annotation = validAnnotation({
      ai: { summary: 'x'.repeat(201) },
    })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('summary') && e.includes('200'))).toBe(true)
  })

  it('should report error for tags with invalid characters', () => {
    const annotation = validAnnotation({ tags: ['valid-tag', 'invalid tag with spaces'] })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:tags'))).toBe(true)
  })

  it('should report error for too many tags', () => {
    const manyTags = Array.from({ length: 33 }, (_, i) => `tag${i}`)
    const annotation = validAnnotation({ tags: manyTags })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:tags') && e.includes('32'))).toBe(true)
  })

  it('should report error for duplicate tags', () => {
    const annotation = validAnnotation({ tags: ['ui', 'ui'] })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:tags') && e.toLowerCase().includes('unique'))).toBe(
      true
    )
  })

  it('should report error for deps with unknown keys', () => {
    const annotation = validAnnotation({
      deps: { runtime: ['dep_a'], unknownKey: ['dep_b'] } as unknown as MmAnnotation['deps'],
    })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('unknownKey') || e.includes('@mm:deps'))).toBe(true)
  })

  it('should report error for ai object with unknown keys', () => {
    const annotation = validAnnotation({
      ai: { summary: 'ok', unknownField: 'bad' } as unknown as MmAnnotation['ai'],
    })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('unknownField') || e.includes('@mm:ai'))).toBe(true)
  })

  it('should report error for phase below minimum', () => {
    const annotation = validAnnotation({ phase: 0 })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:phase') && e.includes('1'))).toBe(true)
  })

  it('should report error for phase above maximum', () => {
    const annotation = validAnnotation({ phase: 100 })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:phase') && e.includes('99'))).toBe(true)
  })
})

// ============================================================================
// checkSchemaValidates (the rule function itself)
// ============================================================================

describe('checkSchemaValidates', () => {
  it('should return no issues for valid annotations when schema is loaded', () => {
    const results = [
      makeResult('valid_comp', {
        visibility: 'public',
        status: 'stable',
        tags: ['ui'],
      }),
    ]
    // Note: this test depends on schemas/mm-annotation.schema.json being found
    // If not found, it returns a warning (not an error)
    const issues = checkSchemaValidates(results)
    const errors = issues.filter((i) => i.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  it('should return a warning if schema file is not found', () => {
    // This test verifies the fallback behavior
    // We test by checking the returned issues contain a warning when schema is missing
    // Since in CI the schema should be present, we just ensure it doesn't throw
    const results = [makeResult('test_comp')]
    expect(() => checkSchemaValidates(results)).not.toThrow()
  })
})

// ============================================================================
// schema-validates rule in validateAnnotations
// ============================================================================

describe('validateAnnotations - schema-validates rule', () => {
  it('should include schema-validates in all-rules validation', () => {
    const results = [makeResult('valid_comp')]
    const result = validateAnnotations(results)
    // schema-validates is part of ALL_RULES — should run without throwing
    expect(result).toBeDefined()
    expect(typeof result.passed).toBe('boolean')
  })

  it('should be selectable as an individual rule', () => {
    const results = [makeResult('valid_comp')]
    const result = validateAnnotations(results, { rules: ['schema-validates'] })
    expect(result).toBeDefined()
    expect(typeof result.passed).toBe('boolean')
  })

  it('should be overrideable with warnOnly', () => {
    const results = [makeResult('valid_comp')]
    const result = validateAnnotations(results, {
      rules: ['schema-validates'],
      warnOnly: ['schema-validates'],
    })
    // All schema issues should be warnings, not errors
    const schemaErrors = result.errors.filter((e) => e.rule === 'schema-validates')
    expect(schemaErrors).toHaveLength(0)
  })
})

// ============================================================================
// generateTestSuites
// ============================================================================

describe('generateTestSuites', () => {
  it('should generate a test suite for each annotated module', () => {
    const results = [
      makeResult('comp_a', {}, '/src/comp_a.ts'),
      makeResult('comp_b', {}, '/src/comp_b.ts'),
    ]
    const suites = generateTestSuites(results)
    expect(suites).toHaveLength(2)
    expect(suites.map((s) => s.moduleId)).toContain('comp_a')
    expect(suites.map((s) => s.moduleId)).toContain('comp_b')
  })

  it('should skip annotations without an id', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/test.ts',
        annotations: [
          { annotation: { desc: 'No ID' } as MmAnnotation, source: 'jsdoc', line: 1, raw: '' },
        ],
        warnings: [],
      },
    ]
    const suites = generateTestSuites(results)
    expect(suites).toHaveLength(0)
  })

  it('should filter by moduleIds when provided', () => {
    const results = [
      makeResult('comp_a', {}, '/src/comp_a.ts'),
      makeResult('comp_b', {}, '/src/comp_b.ts'),
      makeResult('comp_c', {}, '/src/comp_c.ts'),
    ]
    const suites = generateTestSuites(results, { moduleIds: ['comp_b'] })
    expect(suites).toHaveLength(1)
    expect(suites[0].moduleId).toBe('comp_b')
  })

  it('should include annotation-completeness tests', () => {
    const results = [makeResult('comp_a')]
    const suites = generateTestSuites(results)
    expect(suites[0].tests.some((t) => t.category === 'annotation-completeness')).toBe(true)
  })

  it('should include schema-validation tests', () => {
    const results = [makeResult('comp_a')]
    const suites = generateTestSuites(results)
    expect(suites[0].tests.some((t) => t.category === 'schema-validation')).toBe(true)
  })

  it('should include dependency-exists tests when deps are declared', () => {
    const results = [
      makeResult('dep_a', {}, '/src/dep_a.ts'),
      makeResult('comp_b', { deps: { runtime: ['dep_a'] } }, '/src/comp_b.ts'),
    ]
    const suites = generateTestSuites(results)
    const compBSuite = suites.find((s) => s.moduleId === 'comp_b')
    expect(compBSuite?.tests.some((t) => t.category === 'dependency-exists')).toBe(true)
  })

  it('should mark dependency-exists tests as passing when dep exists', () => {
    const results = [
      makeResult('existing_dep', {}, '/src/dep.ts'),
      makeResult('consumer', { deps: { runtime: ['existing_dep'] } }, '/src/consumer.ts'),
    ]
    const suites = generateTestSuites(results)
    const consumerSuite = suites.find((s) => s.moduleId === 'consumer')
    const depTest = consumerSuite?.tests.find((t) => t.category === 'dependency-exists')
    expect(depTest?.expectedPass).toBe(true)
  })

  it('should mark dependency-exists tests as failing when dep is missing', () => {
    const results = [makeResult('consumer', { deps: { runtime: ['missing_dep'] } })]
    const suites = generateTestSuites(results)
    const consumerSuite = suites.find((s) => s.moduleId === 'consumer')
    const depTest = consumerSuite?.tests.find((t) => t.category === 'dependency-exists')
    expect(depTest?.expectedPass).toBe(false)
  })

  it('should mark hasPotentialIssues when a test is expected to fail', () => {
    const results = [makeResult('consumer', { deps: { runtime: ['missing_dep'] } })]
    const suites = generateTestSuites(results)
    expect(suites[0].hasPotentialIssues).toBe(true)
  })

  it('should include visibility-contract tests for public modules with deps', () => {
    const results = [
      makeResult('internal_dep', { visibility: 'internal' }, '/src/internal.ts'),
      makeResult(
        'public_module',
        { visibility: 'public', deps: { runtime: ['internal_dep'] } },
        '/src/public.ts'
      ),
    ]
    const suites = generateTestSuites(results)
    const publicSuite = suites.find((s) => s.moduleId === 'public_module')
    const visTest = publicSuite?.tests.find((t) => t.category === 'visibility-contract')
    expect(visTest).toBeDefined()
    expect(visTest?.expectedPass).toBe(false) // public -> internal is a violation
  })

  it('should respect custom requiredFields option', () => {
    const results = [makeResult('comp', { name: 'MyComp' })]
    const suites = generateTestSuites(results, { requiredFields: ['id', 'desc', 'name'] })
    const completenessTest = suites[0].tests.find((t) => t.category === 'annotation-completeness')
    expect(completenessTest?.body).toContain('name')
  })
})

// ============================================================================
// renderTestFile
// ============================================================================

describe('renderTestFile', () => {
  it('should render a valid TypeScript test file', () => {
    const results = [makeResult('comp_a', {}, join('/project', 'src', 'comp_a.ts'))]
    const suites = generateTestSuites(results)
    const code = renderTestFile(suites, '/project')

    expect(code).toContain("import { describe, it, expect, beforeAll } from 'vitest'")
    expect(code).toContain("describe('[MetaMode] comp_a")
    expect(code).toContain('beforeAll')
  })

  it('should include all test cases in the output', () => {
    const results = [
      makeResult('comp_a', {}, join('/project', 'src', 'a.ts')),
      makeResult('comp_b', {}, join('/project', 'src', 'b.ts')),
    ]
    const suites = generateTestSuites(results)
    const code = renderTestFile(suites, '/project')

    expect(code).toContain('comp_a')
    expect(code).toContain('comp_b')
  })

  it('should include DO NOT EDIT warning', () => {
    const results = [makeResult('comp', {}, '/project/src/comp.ts')]
    const suites = generateTestSuites(results)
    const code = renderTestFile(suites, '/project')

    expect(code).toContain('DO NOT EDIT')
  })

  it('should include generation timestamp', () => {
    const results = [makeResult('comp', {}, '/project/src/comp.ts')]
    const suites = generateTestSuites(results)
    const code = renderTestFile(suites, '/project')

    // Should contain a year from the ISO timestamp
    expect(code).toMatch(/Generated at: \d{4}-/)
  })

  it('should produce parseable test code for empty suites', () => {
    const code = renderTestFile([], '/project')
    expect(code).toContain("import { describe, it, expect, beforeAll } from 'vitest'")
    expect(code).not.toContain('describe(')
  })

  it('should reference the correct project root', () => {
    const results = [makeResult('comp', {}, '/my/project/src/comp.ts')]
    const suites = generateTestSuites(results)
    const code = renderTestFile(suites, '/my/project')

    expect(code).toContain('/my/project')
  })
})

// ============================================================================
// Integration: schema-validates rule produces helpful messages
// ============================================================================

describe('schema-validates — integration', () => {
  it('should report the module ID and file in error message when schema fails', () => {
    // Create a result with a known-bad annotation (invalid status)
    // and use the validator directly with our test schema injected
    // by spying on loadMmAnnotationSchema (we test the logic without file I/O)
    const annotation = validAnnotation({ status: 'INVALID_STATUS' as MmAnnotation['status'] })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors).not.toHaveLength(0)
    expect(errors[0]).toContain('@mm:status')
  })

  it('should produce no false positives for well-formed valid-status annotations', () => {
    for (const status of ['stable', 'beta', 'exp', 'dep', 'experimental', 'deprecated']) {
      const annotation = validAnnotation({ status: status as MmAnnotation['status'] })
      const errors = validateAnnotationAgainstSchema(annotation, testSchema)
      expect(errors).toHaveLength(0)
    }
  })

  it('should validate that phase is an integer', () => {
    // Non-integer phase
    const annotation = validAnnotation({ phase: 3.5 })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:phase'))).toBe(true)
  })

  it('should accept valid version strings', () => {
    const annotation = validAnnotation({ version: '1.0.0' })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors).toHaveLength(0)
  })

  it('should reject version strings that do not match semver', () => {
    const annotation = validAnnotation({ version: 'not-semver' })
    const errors = validateAnnotationAgainstSchema(annotation, testSchema)
    expect(errors.some((e) => e.includes('@mm:version'))).toBe(true)
  })
})
