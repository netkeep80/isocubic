/**
 * Tests for MetaMode Semantic Validator (MetaMode v2.0)
 *
 * Tests cover:
 * - unique-id-per-scope rule
 * - deps-must-exist rule
 * - no-circular-runtime-deps rule
 * - required-fields-present rule
 * - visibility-consistency rule
 * - Validation options (rules selection, warnOnly, requiredFields)
 * - formatValidationReport output
 */

import { describe, it, expect } from 'vitest'
import {
  validateAnnotations,
  formatValidationReport,
  type ValidationResult,
} from '../../scripts/metamode-semantic-validator'
import type { FileParseResult } from '../../scripts/metamode-annotation-parser'

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
        annotation: { id, desc: `Description of ${id}`, ...extra },
        source: 'jsdoc' as const,
        line,
        raw: '',
        entityName: id,
      },
    ],
    warnings: [],
  }
}

// ============================================================================
// unique-id-per-scope
// ============================================================================

describe('validateAnnotations - unique-id-per-scope', () => {
  it('should pass when all IDs are unique', () => {
    const results = [
      makeResult('comp_a'),
      makeResult('comp_b', {}, '/src/b.ts'),
      makeResult('comp_c', {}, '/src/c.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['unique-id-per-scope'] })

    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should report error for duplicate IDs across files', () => {
    const results = [
      makeResult('shared_id', {}, '/src/a.ts'),
      makeResult('shared_id', {}, '/src/b.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['unique-id-per-scope'] })

    expect(result.passed).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].rule).toBe('unique-id-per-scope')
    expect(result.errors[0].message).toContain('shared_id')
    expect(result.errors[0].annotationId).toBe('shared_id')
  })

  it('should report multiple duplicate ID errors', () => {
    const results = [
      makeResult('dup_a', {}, '/src/a.ts'),
      makeResult('dup_a', {}, '/src/b.ts'),
      makeResult('dup_b', {}, '/src/c.ts'),
      makeResult('dup_b', {}, '/src/d.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['unique-id-per-scope'] })

    expect(result.errors.length).toBeGreaterThanOrEqual(2)
  })

  it('should not flag annotations without ID (no ID = not in scope)', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/test.ts',
        annotations: [
          {
            annotation: { desc: 'No ID annotation' },
            source: 'jsdoc',
            line: 1,
            raw: '',
          },
          {
            annotation: { desc: 'Another no ID annotation' },
            source: 'jsdoc',
            line: 10,
            raw: '',
          },
        ],
        warnings: [],
      },
    ]

    const result = validateAnnotations(results, { rules: ['unique-id-per-scope'] })

    expect(result.passed).toBe(true)
  })
})

// ============================================================================
// deps-must-exist
// ============================================================================

describe('validateAnnotations - deps-must-exist', () => {
  it('should pass when all deps reference existing IDs', () => {
    const results = [
      makeResult('comp_a'),
      makeResult('comp_b', { deps: { runtime: ['comp_a'] } }, '/src/b.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['deps-must-exist'] })

    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should report error for unknown dep ID (non-path)', () => {
    const results = [makeResult('comp_a', { deps: { runtime: ['nonexistent_dep'] } })]

    const result = validateAnnotations(results, { rules: ['deps-must-exist'] })

    expect(result.passed).toBe(false)
    expect(result.errors.some((e) => e.message.includes('nonexistent_dep'))).toBe(true)
  })

  it('should report warning (not error) for path-style deps that are not annotated', () => {
    const results = [makeResult('comp_a', { deps: { runtime: ['lib/utils/helpers'] } })]

    const result = validateAnnotations(results, { rules: ['deps-must-exist'] })

    // Path-style deps generate warnings (common to reference non-annotated modules)
    const warning = result.warnings.find((w) => w.message.includes('lib/utils/helpers'))
    expect(warning).toBeDefined()
    expect(warning?.severity).toBe('warning')
  })

  it('should handle array-style deps', () => {
    const results = [
      makeResult('known_dep'),
      makeResult('comp_a', { deps: ['known_dep'] }, '/src/b.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['deps-must-exist'] })

    expect(result.passed).toBe(true)
  })

  it('should validate build and optional deps too', () => {
    const results = [
      makeResult('comp_a', {
        deps: {
          runtime: [],
          build: ['nonexistent_build_dep'],
          optional: [],
        },
      }),
    ]

    const result = validateAnnotations(results, { rules: ['deps-must-exist'] })

    const issue = result.errors.find((e) => e.message.includes('nonexistent_build_dep'))
    expect(issue).toBeDefined()
  })
})

// ============================================================================
// no-circular-runtime-deps
// ============================================================================

describe('validateAnnotations - no-circular-runtime-deps', () => {
  it('should pass with no cycles', () => {
    const results = [
      makeResult('comp_a'),
      makeResult('comp_b', { deps: { runtime: ['comp_a'] } }, '/src/b.ts'),
      makeResult('comp_c', { deps: { runtime: ['comp_b'] } }, '/src/c.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['no-circular-runtime-deps'] })

    expect(result.passed).toBe(true)
  })

  it('should detect a direct cycle (A -> B -> A)', () => {
    const results = [
      makeResult('comp_a', { deps: { runtime: ['comp_b'] } }, '/src/a.ts'),
      makeResult('comp_b', { deps: { runtime: ['comp_a'] } }, '/src/b.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['no-circular-runtime-deps'] })

    expect(result.passed).toBe(false)
    expect(result.errors.some((e) => e.rule === 'no-circular-runtime-deps')).toBe(true)
    const cycleError = result.errors.find((e) => e.rule === 'no-circular-runtime-deps')
    expect(cycleError?.message).toContain('→')
  })

  it('should detect a longer cycle (A -> B -> C -> A)', () => {
    const results = [
      makeResult('a', { deps: { runtime: ['b'] } }, '/src/a.ts'),
      makeResult('b', { deps: { runtime: ['c'] } }, '/src/b.ts'),
      makeResult('c', { deps: { runtime: ['a'] } }, '/src/c.ts'),
    ]

    const result = validateAnnotations(results, { rules: ['no-circular-runtime-deps'] })

    expect(result.passed).toBe(false)
    expect(result.errors.some((e) => e.rule === 'no-circular-runtime-deps')).toBe(true)
  })

  it('should not flag build deps as circular (only runtime)', () => {
    const results = [
      makeResult('a', { deps: { build: ['b'] } }, '/src/a.ts'),
      makeResult('b', { deps: { build: ['a'] } }, '/src/b.ts'),
    ]

    // Only checking runtime cycles
    const result = validateAnnotations(results, { rules: ['no-circular-runtime-deps'] })

    // Build dep cycles don't trigger this rule
    expect(result.passed).toBe(true)
  })

  it('should handle self-referencing dep', () => {
    const results = [makeResult('self_ref', { deps: { runtime: ['self_ref'] } })]

    const result = validateAnnotations(results, { rules: ['no-circular-runtime-deps'] })

    expect(result.passed).toBe(false)
    expect(result.errors.some((e) => e.rule === 'no-circular-runtime-deps')).toBe(true)
  })
})

// ============================================================================
// required-fields-present
// ============================================================================

describe('validateAnnotations - required-fields-present', () => {
  it('should pass when required fields are present', () => {
    const results = [makeResult('comp_a')] // makeResult includes id and desc

    const result = validateAnnotations(results, {
      rules: ['required-fields-present'],
      requiredFields: ['id', 'desc'],
    })

    expect(result.passed).toBe(true)
  })

  it('should fail when id is missing', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/test.ts',
        annotations: [
          {
            annotation: { desc: 'Has desc but no id' },
            source: 'jsdoc',
            line: 1,
            raw: '',
          },
        ],
        warnings: [],
      },
    ]

    const result = validateAnnotations(results, {
      rules: ['required-fields-present'],
      requiredFields: ['id', 'desc'],
    })

    expect(result.passed).toBe(false)
    expect(result.errors.some((e) => e.message.includes('@mm:id'))).toBe(true)
  })

  it('should fail when desc is missing', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/test.ts',
        annotations: [
          {
            annotation: { id: 'my_comp' },
            source: 'jsdoc',
            line: 1,
            raw: '',
          },
        ],
        warnings: [],
      },
    ]

    const result = validateAnnotations(results, {
      rules: ['required-fields-present'],
      requiredFields: ['id', 'desc'],
    })

    expect(result.passed).toBe(false)
    expect(result.errors.some((e) => e.message.includes('@mm:desc'))).toBe(true)
  })

  it('should use default required fields (id and desc)', () => {
    const results: FileParseResult[] = [
      {
        filePath: '/src/test.ts',
        annotations: [
          {
            annotation: { name: 'only name' },
            source: 'jsdoc',
            line: 1,
            raw: '',
          },
        ],
        warnings: [],
      },
    ]

    const result = validateAnnotations(results, { rules: ['required-fields-present'] })

    expect(result.passed).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2) // missing id and desc
  })

  it('should allow custom required fields', () => {
    const results = [makeResult('comp', { name: 'MyComp' })]

    // Only require 'name'
    const result = validateAnnotations(results, {
      rules: ['required-fields-present'],
      requiredFields: ['name'],
    })

    expect(result.passed).toBe(true)
  })
})

// ============================================================================
// visibility-consistency
// ============================================================================

describe('validateAnnotations - visibility-consistency', () => {
  it('should pass when public entity depends on public entity', () => {
    const results = [
      makeResult('public_a', { visibility: 'public' }),
      makeResult(
        'public_b',
        { visibility: 'public', deps: { runtime: ['public_a'] } },
        '/src/b.ts'
      ),
    ]

    const result = validateAnnotations(results, { rules: ['visibility-consistency'] })

    expect(result.passed).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('should warn when public entity depends on internal entity', () => {
    const results = [
      makeResult('internal_util', { visibility: 'internal' }),
      makeResult(
        'public_comp',
        { visibility: 'public', deps: { runtime: ['internal_util'] } },
        '/src/b.ts'
      ),
    ]

    const result = validateAnnotations(results, { rules: ['visibility-consistency'] })

    // Should generate a warning (not error by default)
    const warn = result.warnings.find((w) => w.rule === 'visibility-consistency')
    expect(warn).toBeDefined()
    expect(warn?.message).toContain('internal_util')
  })

  it('should allow internal entity to depend on public entity', () => {
    const results = [
      makeResult('public_lib', { visibility: 'public' }),
      makeResult(
        'internal_impl',
        { visibility: 'internal', deps: { runtime: ['public_lib'] } },
        '/src/b.ts'
      ),
    ]

    const result = validateAnnotations(results, { rules: ['visibility-consistency'] })

    // Internal depending on public is fine
    expect(result.warnings.filter((w) => w.rule === 'visibility-consistency')).toHaveLength(0)
  })
})

// ============================================================================
// Validator Options
// ============================================================================

describe('validateAnnotations - options', () => {
  it('should only run specified rules', () => {
    const results = [
      makeResult('dup', {}, '/src/a.ts'),
      makeResult('dup', {}, '/src/b.ts'), // duplicate ID
    ]

    // Only run deps-must-exist (not unique-id-per-scope)
    const result = validateAnnotations(results, { rules: ['deps-must-exist'] })

    // Should not detect the duplicate since that rule is not enabled
    expect(result.errors.filter((e) => e.rule === 'unique-id-per-scope')).toHaveLength(0)
  })

  it('should convert errors to warnings using warnOnly', () => {
    const results = [makeResult('dup', {}, '/src/a.ts'), makeResult('dup', {}, '/src/b.ts')]

    const result = validateAnnotations(results, {
      rules: ['unique-id-per-scope'],
      warnOnly: ['unique-id-per-scope'],
    })

    expect(result.passed).toBe(true) // errors converted to warnings
    expect(result.errors).toHaveLength(0)
    expect(result.warnings.some((w) => w.rule === 'unique-id-per-scope')).toBe(true)
  })

  it('should suppress warnings when includeWarnings=false', () => {
    const results = [makeResult('comp', { deps: { runtime: ['lib/path/that/is/unknown'] } })]

    const result = validateAnnotations(results, {
      rules: ['deps-must-exist'],
      includeWarnings: false,
    })

    expect(result.warnings).toHaveLength(0)
  })
})

// ============================================================================
// All Rules Together
// ============================================================================

describe('validateAnnotations - all rules', () => {
  it('should pass a valid, well-annotated codebase', () => {
    const results = [
      makeResult('lib_utils', { visibility: 'public' }, '/src/lib/utils.ts'),
      makeResult(
        'comp_button',
        {
          visibility: 'public',
          deps: { runtime: ['lib_utils'] },
          tags: ['ui', 'stable'],
        },
        '/src/components/Button.ts'
      ),
      makeResult(
        'comp_input',
        {
          visibility: 'public',
          deps: { runtime: ['lib_utils'] },
          tags: ['ui'],
        },
        '/src/components/Input.ts'
      ),
    ]

    const result = validateAnnotations(results)

    expect(result.passed).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should catch multiple violations at once', () => {
    const results = [
      // Duplicate IDs
      makeResult('dup_id', {}, '/src/a.ts'),
      makeResult('dup_id', {}, '/src/b.ts'),
      // Missing required field (no desc)
      {
        filePath: '/src/c.ts',
        annotations: [
          {
            annotation: { id: 'no_desc_comp' },
            source: 'jsdoc' as const,
            line: 1,
            raw: '',
          },
        ],
        warnings: [],
      },
    ]

    const result = validateAnnotations(results)

    // Should have errors from multiple rules
    const ruleNames = new Set(result.errors.map((e) => e.rule))
    expect(ruleNames.size).toBeGreaterThan(1)
  })
})

// ============================================================================
// formatValidationReport
// ============================================================================

describe('formatValidationReport', () => {
  it('should say "passed" when no issues', () => {
    const result: ValidationResult = {
      errors: [],
      warnings: [],
      passed: true,
    }

    const report = formatValidationReport(result)

    expect(report).toContain('passed')
    expect(report).not.toContain('ERROR')
  })

  it('should include error details', () => {
    const result: ValidationResult = {
      errors: [
        {
          rule: 'unique-id-per-scope',
          severity: 'error',
          message: 'Duplicate ID "my_id"',
          annotationId: 'my_id',
          filePath: '/src/test.ts',
          line: 5,
        },
      ],
      warnings: [],
      passed: false,
    }

    const report = formatValidationReport(result)

    expect(report).toContain('ERROR')
    expect(report).toContain('unique-id-per-scope')
    expect(report).toContain('Duplicate ID "my_id"')
    expect(report).toContain('failed')
  })

  it('should include warning details', () => {
    const result: ValidationResult = {
      errors: [],
      warnings: [
        {
          rule: 'deps-must-exist',
          severity: 'warning',
          message: 'Dependency "lib/path" not found',
        },
      ],
      passed: true,
    }

    const report = formatValidationReport(result)

    expect(report).toContain('WARN')
    expect(report).toContain('lib/path')
  })

  it('should show passed with warnings message', () => {
    const result: ValidationResult = {
      errors: [],
      warnings: [
        {
          rule: 'deps-must-exist',
          severity: 'warning',
          message: 'Some warning',
        },
      ],
      passed: true,
    }

    const report = formatValidationReport(result)

    expect(report).toContain('passed')
  })
})
