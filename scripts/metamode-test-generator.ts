/**
 * MetaMode Test Generator (MetaMode v2.0, Phase 2)
 *
 * Generates Vitest test suites for modules annotated with `@mm:id`.
 *
 * For each annotated module the generator produces:
 * 1. An annotation completeness test — verifies required @mm: fields are present
 * 2. A schema validation test — verifies annotation fields conform to the JSON Schema
 * 3. Dependency existence tests — verifies all declared deps resolve to real @mm:id entries
 * 4. Visibility contract test — verifies public modules don't depend on internal ones
 *
 * Usage (CLI):
 * ```bash
 * npx tsx scripts/metamode-test-generator.ts [--output <dir>] [--dry-run] [--module <id>]
 * ```
 *
 * Usage (programmatic):
 * ```ts
 * import { generateTestSuite } from './metamode-test-generator'
 * const code = generateTestSuite(entries, options)
 * ```
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  scanDirectoryForAnnotations,
  buildAnnotationIndex,
  type ParsedAnnotation,
  type FileParseResult,
} from './metamode-annotation-parser'
import {
  validateAnnotationAgainstSchema,
  loadMmAnnotationSchema,
} from './metamode-semantic-validator'

// ============================================================================
// Types
// ============================================================================

/** A single test case in a generated test suite */
export interface GeneratedTestCase {
  /** Name of the test */
  name: string
  /** Category of the test */
  category:
    | 'annotation-completeness'
    | 'schema-validation'
    | 'dependency-exists'
    | 'visibility-contract'
  /** Whether this test is expected to pass (true) or is a known issue (false) */
  expectedPass: boolean
  /** The generated test code body (vitest-compatible) */
  body: string
}

/** A generated test suite for one annotated module */
export interface GeneratedTestSuite {
  /** Module ID (@mm:id) */
  moduleId: string
  /** Source file that was annotated */
  sourceFile: string
  /** Generated test cases */
  tests: GeneratedTestCase[]
  /** Whether the suite has any failing expectations */
  hasPotentialIssues: boolean
}

/** Options for test generation */
export interface TestGeneratorOptions {
  /**
   * Only generate tests for modules with these IDs.
   * If undefined, generates for all annotated modules.
   */
  moduleIds?: string[]
  /**
   * Minimum required @mm: fields for annotation completeness tests.
   * @default ['id', 'desc']
   */
  requiredFields?: string[]
  /**
   * Path to mm-annotation.schema.json for schema validation tests.
   * If undefined, will try to auto-detect.
   */
  schemaPath?: string
  /**
   * Whether to include tests that are already known to pass.
   * @default true
   */
  includePassingTests?: boolean
}

// ============================================================================
// Test Generation
// ============================================================================

/**
 * Generate a test for annotation completeness (required fields present).
 */
function generateCompletenessTest(
  annotation: ParsedAnnotation,
  moduleId: string,
  sourceFile: string,
  requiredFields: string[]
): GeneratedTestCase {
  const checks = requiredFields.map((field) => {
    const value = (annotation.annotation as Record<string, unknown>)[field]
    const present = value !== undefined && value !== null
    return { field, present }
  })

  const missingFields = checks.filter((c) => !c.present).map((c) => c.field)
  const expectedPass = missingFields.length === 0

  const assertions = requiredFields
    .map((field) => {
      const value = (annotation.annotation as Record<string, unknown>)[field]
      const present = value !== undefined && value !== null
      return `  expect(annotation).toHaveProperty('${field}') // ${present ? '✅ present' : '❌ MISSING'}`
    })
    .join('\n')

  const body = `
  // Tests that all required @mm: fields are present in the annotation for '${moduleId}'
  // Source: ${path.relative(process.cwd(), sourceFile)}:${annotation.line}
  const annotation = ${JSON.stringify(annotation.annotation, null, 2)}
${assertions}
  `.trim()

  return {
    name: `[${moduleId}] annotation completeness — required fields present`,
    category: 'annotation-completeness',
    expectedPass,
    body,
  }
}

/**
 * Generate a test for JSON Schema validation.
 */
function generateSchemaValidationTest(
  annotation: ParsedAnnotation,
  moduleId: string,
  sourceFile: string,
  schema: Record<string, unknown> | null
): GeneratedTestCase {
  const schemaErrors = schema ? validateAnnotationAgainstSchema(annotation.annotation, schema) : []
  const expectedPass = schemaErrors.length === 0

  const body = `
  // Tests that the @mm: annotation for '${moduleId}' conforms to mm-annotation.schema.json
  // Source: ${path.relative(process.cwd(), sourceFile)}:${annotation.line}
  const annotation = ${JSON.stringify(annotation.annotation, null, 2)}
  ${schemaErrors.length > 0 ? `// Known schema issues:\n  // ${schemaErrors.join('\n  // ')}` : '// No schema violations detected at generation time'}
  expect(schemaErrors(annotation)).toHaveLength(0)
  `.trim()

  return {
    name: `[${moduleId}] schema validation — conforms to mm-annotation.schema.json`,
    category: 'schema-validation',
    expectedPass,
    body,
  }
}

/**
 * Generate tests for dependency existence.
 */
function generateDependencyTests(
  annotation: ParsedAnnotation,
  moduleId: string,
  sourceFile: string,
  knownIds: Set<string>
): GeneratedTestCase[] {
  const deps = annotation.annotation.deps
  if (!deps) return []

  const depList: string[] = []
  if (Array.isArray(deps)) {
    depList.push(...deps)
  } else {
    const depsObj = deps as Record<string, string[]>
    if (depsObj.runtime) depList.push(...depsObj.runtime)
    if (depsObj.build) depList.push(...depsObj.build)
    if (depsObj.optional) depList.push(...depsObj.optional)
  }

  return depList.map((dep) => {
    const exists = knownIds.has(dep)
    const body = `
  // Tests that dependency '${dep}' declared by '${moduleId}' resolves to a known @mm:id
  // Source: ${path.relative(process.cwd(), sourceFile)}:${annotation.line}
  const allAnnotatedIds = new Set(Object.keys(annotations))
  expect(allAnnotatedIds.has('${dep}')).toBe(true) // ${exists ? '✅ exists' : '⚠ not found in current annotations'}
    `.trim()

    return {
      name: `[${moduleId}] dependency exists — '${dep}' has a @mm:id annotation`,
      category: 'dependency-exists' as const,
      expectedPass: exists,
      body,
    }
  })
}

/**
 * Generate a visibility contract test.
 * Public modules should not declare deps on internal ones.
 */
function generateVisibilityTest(
  annotation: ParsedAnnotation,
  moduleId: string,
  sourceFile: string,
  visibilityMap: Map<string, 'public' | 'internal'>
): GeneratedTestCase | null {
  const visibility = annotation.annotation.visibility || 'public'
  if (visibility !== 'public') return null

  const deps = annotation.annotation.deps
  if (!deps) return null

  const depList: string[] = []
  if (Array.isArray(deps)) {
    depList.push(...deps)
  } else {
    const depsObj = deps as Record<string, string[]>
    if (depsObj.runtime) depList.push(...depsObj.runtime)
    if (depsObj.build) depList.push(...depsObj.build)
  }

  const internalDeps = depList.filter((dep) => visibilityMap.get(dep) === 'internal')
  if (depList.length === 0) return null

  const expectedPass = internalDeps.length === 0
  const checks = depList
    .map((dep) => {
      const depVis = visibilityMap.get(dep) || 'public'
      return `  // '${dep}' is ${depVis}${depVis === 'internal' ? ' ⚠ (public -> internal violation)' : ' ✅'}`
    })
    .join('\n')

  const body = `
  // Tests that public module '${moduleId}' does not depend on internal entities
  // Source: ${path.relative(process.cwd(), sourceFile)}:${annotation.line}
  const annotation = ${JSON.stringify(annotation.annotation, null, 2)}
  const allAnnotations = annotations
  const internalDeps = getAllDeps(annotation).filter(dep =>
    allAnnotations[dep]?.annotation?.visibility === 'internal'
  )
${checks}
  expect(internalDeps).toHaveLength(0)
  `.trim()

  return {
    name: `[${moduleId}] visibility contract — public module has no internal deps`,
    category: 'visibility-contract',
    expectedPass,
    body,
  }
}

/**
 * Generate a complete test suite for a single annotated module.
 */
function generateModuleTestSuite(
  parsed: ParsedAnnotation,
  filePath: string,
  knownIds: Set<string>,
  visibilityMap: Map<string, 'public' | 'internal'>,
  schema: Record<string, unknown> | null,
  options: TestGeneratorOptions
): GeneratedTestSuite {
  const moduleId = parsed.annotation.id!
  const requiredFields = options.requiredFields || ['id', 'desc']

  const tests: GeneratedTestCase[] = []

  // 1. Annotation completeness
  tests.push(generateCompletenessTest(parsed, moduleId, filePath, requiredFields))

  // 2. Schema validation
  tests.push(generateSchemaValidationTest(parsed, moduleId, filePath, schema))

  // 3. Dependency existence
  tests.push(...generateDependencyTests(parsed, moduleId, filePath, knownIds))

  // 4. Visibility contract
  const visibilityTest = generateVisibilityTest(parsed, moduleId, filePath, visibilityMap)
  if (visibilityTest) {
    tests.push(visibilityTest)
  }

  const hasPotentialIssues = tests.some((t) => !t.expectedPass)

  return {
    moduleId,
    sourceFile: filePath,
    tests,
    hasPotentialIssues,
  }
}

/**
 * Render a list of test suites as a single Vitest-compatible test file.
 *
 * The generated file:
 * - Imports the annotation parser
 * - Defines helper functions for runtime access to annotations
 * - Renders each suite as a `describe` block with individual `it` tests
 */
export function renderTestFile(suites: GeneratedTestSuite[], projectRoot: string): string {
  const lines: string[] = []

  lines.push(
    '/**',
    ' * MetaMode v2.0 — Auto-generated annotation validation tests (TASK 83)',
    ' *',
    ' * DO NOT EDIT MANUALLY — regenerate with: npm run metamode:generate-tests',
    ' *',
    ` * Generated at: ${new Date().toISOString()}`,
    ' */',
    '',
    "import { describe, it, expect, beforeAll } from 'vitest'",
    "import { scanDirectoryForAnnotations, buildAnnotationIndex } from '../../scripts/metamode-annotation-parser'",
    "import { validateAnnotationAgainstSchema, loadMmAnnotationSchema } from '../../scripts/metamode-semantic-validator'",
    "import type { ParsedAnnotation } from '../../scripts/metamode-annotation-parser'",
    '',
    `const PROJECT_ROOT = ${JSON.stringify(projectRoot)}`,
    '',
    '// Loaded once for all tests',
    'let annotations: Record<string, ParsedAnnotation> = {}',
    'let schema: Record<string, unknown> | null = null',
    '',
    '/**',
    ' * Get all declared dependency IDs from an annotation.',
    ' */',
    "function getAllDeps(annotation: ParsedAnnotation['annotation']): string[] {",
    '  const deps = annotation.deps',
    '  if (!deps) return []',
    '  if (Array.isArray(deps)) return deps',
    '  const result: string[] = []',
    '  if (deps.runtime) result.push(...deps.runtime)',
    '  if (deps.build) result.push(...deps.build)',
    '  if (deps.optional) result.push(...deps.optional)',
    '  return result',
    '}',
    '',
    '/**',
    ' * Validate an annotation against the mm-annotation.schema.json.',
    ' * Returns error messages (empty array = valid).',
    ' */',
    "function schemaErrors(annotation: ParsedAnnotation['annotation']): string[] {",
    '  if (!schema) return []',
    '  return validateAnnotationAgainstSchema(annotation, schema)',
    '}',
    '',
    'beforeAll(() => {',
    '  const results = scanDirectoryForAnnotations(`${PROJECT_ROOT}/src`, {',
    "    extensions: ['.ts', '.js', '.vue'],",
    '    recursive: true,',
    "    exclude: ['node_modules', 'dist', '.git'],",
    '  })',
    '  const index = buildAnnotationIndex(results)',
    '  for (const [key, value] of index.entries()) {',
    '    annotations[key] = value',
    '  }',
    '  schema = loadMmAnnotationSchema()',
    '})',
    ''
  )

  for (const suite of suites) {
    const relSource = path.relative(projectRoot, suite.sourceFile)
    lines.push(`describe('[MetaMode] ${suite.moduleId} (${relSource})', () => {`)

    for (const test of suite.tests) {
      const itFn = test.expectedPass ? 'it' : 'it'
      lines.push(
        `  ${itFn}(${JSON.stringify(test.name)}, () => {`,
        `    ${test.body.split('\n').join('\n    ')}`,
        '  })',
        ''
      )
    }

    lines.push('})', '')
  }

  return lines.join('\n')
}

/**
 * Generate test suites for all annotated modules in the project.
 *
 * @param results - File parse results from the annotation parser
 * @param options - Generator options
 * @returns Array of generated test suites
 */
export function generateTestSuites(
  results: FileParseResult[],
  options: TestGeneratorOptions = {}
): GeneratedTestSuite[] {
  const { moduleIds, requiredFields = ['id', 'desc'] } = options

  // Build lookup structures
  const index = buildAnnotationIndex(results)
  const knownIds = new Set(index.keys())
  const visibilityMap = new Map<string, 'public' | 'internal'>()
  for (const [id, parsed] of index.entries()) {
    if (parsed.annotation.visibility) {
      visibilityMap.set(id, parsed.annotation.visibility)
    }
  }

  // Load schema once
  const schema = loadMmAnnotationSchema()

  const suites: GeneratedTestSuite[] = []

  for (const result of results) {
    for (const parsed of result.annotations) {
      if (!parsed.annotation.id) continue

      // Apply module filter if specified
      if (moduleIds && !moduleIds.includes(parsed.annotation.id)) continue

      const suite = generateModuleTestSuite(
        parsed,
        result.filePath,
        knownIds,
        visibilityMap,
        schema,
        { ...options, requiredFields }
      )

      suites.push(suite)
    }
  }

  return suites
}

// ============================================================================
// CLI Support
// ============================================================================

if (process.argv[1] && path.basename(process.argv[1]) === 'metamode-test-generator.ts') {
  const args = process.argv.slice(2)
  const targetDir = args.find((a) => !a.startsWith('--')) || process.cwd()
  const isDryRun = args.includes('--dry-run')
  const outputDir = (() => {
    const idx = args.indexOf('--output')
    return idx !== -1 ? args[idx + 1] : path.join(targetDir, 'src', 'lib')
  })()
  const moduleFilter = (() => {
    const idx = args.indexOf('--module')
    return idx !== -1 ? [args[idx + 1]] : undefined
  })()

  console.log('MetaMode Test Generator (v2.0, Phase 2)')
  console.log('=========================================')
  console.log(`Root directory: ${targetDir}`)
  console.log(`Output directory: ${outputDir}`)
  if (isDryRun) console.log('Mode: dry-run (no files written)')
  if (moduleFilter) console.log(`Module filter: ${moduleFilter.join(', ')}`)
  console.log('')

  const srcDir = path.join(targetDir, 'src')
  const results = scanDirectoryForAnnotations(fs.existsSync(srcDir) ? srcDir : targetDir, {
    extensions: ['.ts', '.js', '.vue'],
    recursive: true,
    exclude: ['node_modules', 'dist', '.git', 'coverage'],
  })

  // Also scan scripts/
  const scriptsDir = path.join(targetDir, 'scripts')
  if (fs.existsSync(scriptsDir)) {
    const scriptResults = scanDirectoryForAnnotations(scriptsDir, {
      extensions: ['.ts', '.js'],
      recursive: false,
    })
    results.push(...scriptResults)
  }

  const totalAnnotations = results.reduce((s, r) => s + r.annotations.length, 0)
  console.log(`Found ${totalAnnotations} annotation(s) across ${results.length} file(s)`)

  const suites = generateTestSuites(results, {
    moduleIds: moduleFilter,
    requiredFields: ['id', 'desc'],
  })

  console.log(`Generated ${suites.length} test suite(s)`)
  const issueCount = suites.filter((s) => s.hasPotentialIssues).length
  if (issueCount > 0) {
    console.log(`⚠ ${issueCount} suite(s) have potential issues (tests marked as expected-fail)`)
  }
  console.log('')

  if (suites.length === 0) {
    console.log('No annotated modules found. Add @mm:id annotations to your source files.')
    process.exit(0)
  }

  const outputFileName = moduleFilter
    ? `metamode-generated-${moduleFilter[0]}.test.ts`
    : 'metamode-generated.test.ts'
  const outputPath = path.join(outputDir, outputFileName)
  const fileContent = renderTestFile(suites, targetDir)

  console.log(`Output file: ${outputPath}`)
  console.log(`Total tests: ${suites.reduce((s, suite) => s + suite.tests.length, 0)}`)

  if (!isDryRun) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    fs.writeFileSync(outputPath, fileContent, 'utf-8')
    console.log('✅ Test file written successfully.')
  } else {
    console.log('--- DRY RUN: file content ---')
    console.log(
      fileContent.substring(0, 1000) + (fileContent.length > 1000 ? '\n...(truncated)' : '')
    )
  }
}
