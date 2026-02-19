/**
 * MetaMode Semantic Validator (MetaMode v2.0)
 *
 * Validates the semantic integrity of MetaMode annotations.
 * This goes beyond JSON Schema validation to check:
 *
 * - `unique-id-per-scope`   — No duplicate IDs across all annotations
 * - `deps-must-exist`       — All declared dependencies exist in the index
 * - `no-circular-runtime-deps` — No circular runtime dependency chains
 * - `required-fields-present` — Required fields (id, name/desc) are present
 * - `visibility-consistency` — Internal entities don't reference public ones unexpectedly
 * - `schema-validates`      — Annotation fields conform to mm-annotation.schema.json (Phase 2)
 *
 * Usage (build-time via Vite plugin or CLI):
 * ```ts
 * const results = await validateAnnotations(parsedAnnotations, options)
 * if (results.errors.length > 0) {
 *   throw new Error('MetaMode semantic validation failed')
 * }
 * ```
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type {
  ParsedAnnotation,
  FileParseResult,
  MmDeps,
  MmAnnotation,
} from './metamode-annotation-parser'

// ============================================================================
// Types
// ============================================================================

/** Severity of a validation issue */
export type ValidationSeverity = 'error' | 'warning'

/** A single validation issue */
export interface ValidationIssue {
  /** Rule that generated this issue */
  rule: string
  /** Severity level */
  severity: ValidationSeverity
  /** Human-readable message */
  message: string
  /** ID of the annotation that caused the issue (if applicable) */
  annotationId?: string
  /** File path where the issue originates */
  filePath?: string
  /** Line number (1-based, if known) */
  line?: number
}

/** Result of running semantic validation */
export interface ValidationResult {
  /** All errors (build-breaking violations) */
  errors: ValidationIssue[]
  /** All warnings (non-breaking issues) */
  warnings: ValidationIssue[]
  /** Whether validation passed (no errors) */
  passed: boolean
}

/** Configuration for the semantic validator */
export interface ValidatorOptions {
  /**
   * Rules to enable. By default all rules are enabled.
   * Pass an explicit list to only run specific rules.
   */
  rules?: string[]
  /**
   * Rules to treat as warnings instead of errors.
   * Useful for gradual adoption.
   */
  warnOnly?: string[]
  /**
   * Fields required on every annotation.
   * @default ['id', 'desc']
   */
  requiredFields?: (keyof MmAnnotation)[]
  /**
   * If true, warnings are included in the result.
   * @default true
   */
  includeWarnings?: boolean
}

const DEFAULT_REQUIRED_FIELDS: (keyof MmAnnotation)[] = ['id', 'desc']

const ALL_RULES = [
  'unique-id-per-scope',
  'deps-must-exist',
  'no-circular-runtime-deps',
  'required-fields-present',
  'visibility-consistency',
  'schema-validates',
]

// ============================================================================
// Helper: flatten all annotations from file results
// ============================================================================

interface IndexedAnnotation {
  parsed: ParsedAnnotation
  filePath: string
  id: string
}

/**
 * Build a flat list of all annotations with their file context.
 * Only includes annotations that have an `id` field.
 */
function flattenAnnotations(results: FileParseResult[]): IndexedAnnotation[] {
  const all: IndexedAnnotation[] = []

  for (const result of results) {
    for (const parsed of result.annotations) {
      if (parsed.annotation.id) {
        all.push({
          parsed,
          filePath: result.filePath,
          id: parsed.annotation.id,
        })
      }
    }
  }

  return all
}

// ============================================================================
// Rule: unique-id-per-scope
// ============================================================================

/**
 * Check that all annotation IDs are unique within the project (or a given scope).
 */
function checkUniqueIds(annotations: IndexedAnnotation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const seenIds = new Map<string, IndexedAnnotation>()

  for (const ann of annotations) {
    const id = ann.id

    if (seenIds.has(id)) {
      const first = seenIds.get(id)!
      issues.push({
        rule: 'unique-id-per-scope',
        severity: 'error',
        message: `Duplicate @mm:id "${id}" found. First declared in ${path.basename(first.filePath)}:${first.parsed.line}, redeclared in ${path.basename(ann.filePath)}:${ann.parsed.line}.`,
        annotationId: id,
        filePath: ann.filePath,
        line: ann.parsed.line,
      })
    } else {
      seenIds.set(id, ann)
    }
  }

  return issues
}

// ============================================================================
// Rule: deps-must-exist
// ============================================================================

/**
 * Check that all declared dependencies reference existing annotation IDs.
 */
function checkDepsExist(annotations: IndexedAnnotation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const knownIds = new Set(annotations.map((a) => a.id))

  for (const ann of annotations) {
    const deps = ann.parsed.annotation.deps
    if (!deps) continue

    // Collect all dep targets
    const depTargets: string[] = []

    if (Array.isArray(deps)) {
      depTargets.push(...deps)
    } else {
      const depsObj = deps as MmDeps
      if (depsObj.runtime) depTargets.push(...depsObj.runtime)
      if (depsObj.build) depTargets.push(...depsObj.build)
      if (depsObj.optional) depTargets.push(...depsObj.optional)
    }

    for (const dep of depTargets) {
      // Dependencies may be full paths (e.g., "lib/params/schema") or IDs
      // We try matching by exact ID first, then by path basename
      const depId = dep.includes('/') ? path.basename(dep) : dep

      // Check exact ID match
      if (!knownIds.has(dep) && !knownIds.has(depId)) {
        // Only warn for path-style deps (common to reference non-annotated modules)
        const severity: ValidationSeverity = dep.includes('/') ? 'warning' : 'error'
        issues.push({
          rule: 'deps-must-exist',
          severity,
          message: `Dependency "${dep}" declared in ${ann.id} does not match any known @mm:id.`,
          annotationId: ann.id,
          filePath: ann.filePath,
          line: ann.parsed.line,
        })
      }
    }
  }

  return issues
}

// ============================================================================
// Rule: no-circular-runtime-deps
// ============================================================================

/**
 * Build a runtime dependency graph from annotations.
 * Returns a Map<id, Set<depId>> for runtime deps only.
 */
function buildRuntimeDepGraph(annotations: IndexedAnnotation[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>()

  for (const ann of annotations) {
    const id = ann.id
    if (!graph.has(id)) graph.set(id, new Set())

    const deps = ann.parsed.annotation.deps
    if (!deps) continue

    if (Array.isArray(deps)) {
      for (const dep of deps) {
        graph.get(id)!.add(dep)
      }
    } else {
      const depsObj = deps as MmDeps
      if (depsObj.runtime) {
        for (const dep of depsObj.runtime) {
          graph.get(id)!.add(dep)
        }
      }
    }
  }

  return graph
}

/**
 * Detect cycles in a directed graph using DFS.
 * Returns arrays of node IDs forming cycles.
 */
function detectCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const inStack = new Set<string>()
  const stack: string[] = []

  function dfs(node: string): boolean {
    if (inStack.has(node)) {
      // Found a cycle: extract it from the stack
      const cycleStart = stack.indexOf(node)
      if (cycleStart !== -1) {
        cycles.push([...stack.slice(cycleStart), node])
      }
      return true
    }

    if (visited.has(node)) return false

    visited.add(node)
    inStack.add(node)
    stack.push(node)

    const neighbors = graph.get(node) || new Set()
    for (const neighbor of neighbors) {
      dfs(neighbor)
    }

    stack.pop()
    inStack.delete(node)
    return false
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node)
    }
  }

  return cycles
}

/**
 * Check for circular runtime dependencies.
 */
function checkNoCircularDeps(annotations: IndexedAnnotation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const graph = buildRuntimeDepGraph(annotations)
  const cycles = detectCycles(graph)

  for (const cycle of cycles) {
    const cycleStr = cycle.join(' → ')
    issues.push({
      rule: 'no-circular-runtime-deps',
      severity: 'error',
      message: `Circular runtime dependency detected: ${cycleStr}`,
    })
  }

  return issues
}

// ============================================================================
// Rule: required-fields-present
// ============================================================================

/**
 * Check that all annotations have the required fields.
 */
function checkRequiredFields(
  results: FileParseResult[],
  requiredFields: (keyof MmAnnotation)[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const result of results) {
    for (const parsed of result.annotations) {
      for (const field of requiredFields) {
        if (parsed.annotation[field] === undefined || parsed.annotation[field] === null) {
          const entityRef = parsed.annotation.id
            ? `"${parsed.annotation.id}"`
            : parsed.entityName
              ? `"${parsed.entityName}"`
              : `at line ${parsed.line}`
          issues.push({
            rule: 'required-fields-present',
            severity: 'error',
            message: `Required field "@mm:${field}" is missing in annotation ${entityRef} in ${path.basename(result.filePath)}.`,
            annotationId: parsed.annotation.id,
            filePath: result.filePath,
            line: parsed.line,
          })
        }
      }
    }
  }

  return issues
}

// ============================================================================
// Rule: visibility-consistency
// ============================================================================

/**
 * Check that internal entities don't have public dependencies (unless explicitly allowed).
 * An `internal` entity should only depend on other `internal` entities.
 */
function checkVisibilityConsistency(annotations: IndexedAnnotation[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const visibilityMap = new Map<string, 'public' | 'internal'>()

  // Build visibility map
  for (const ann of annotations) {
    if (ann.parsed.annotation.visibility) {
      visibilityMap.set(ann.id, ann.parsed.annotation.visibility)
    }
  }

  // Check: public entity should not have undeclared internal deps
  // (internal entities can reference public ones freely — that's correct)
  // The rule as specified: "internal not referenced by public naоборот"
  // i.e., public entities should not reference internal ones
  for (const ann of annotations) {
    const visibility = ann.parsed.annotation.visibility || 'public'
    if (visibility !== 'public') continue // only check public entities

    const deps = ann.parsed.annotation.deps
    if (!deps) continue

    const depTargets: string[] = []
    if (Array.isArray(deps)) {
      depTargets.push(...deps)
    } else {
      const depsObj = deps as MmDeps
      if (depsObj.runtime) depTargets.push(...depsObj.runtime)
      if (depsObj.build) depTargets.push(...depsObj.build)
    }

    for (const dep of depTargets) {
      const depId = dep.includes('/') ? path.basename(dep) : dep
      const depVisibility = visibilityMap.get(dep) || visibilityMap.get(depId)

      if (depVisibility === 'internal') {
        issues.push({
          rule: 'visibility-consistency',
          severity: 'warning',
          message: `Public entity "${ann.id}" depends on internal entity "${dep}". Consider making "${dep}" public or making "${ann.id}" internal.`,
          annotationId: ann.id,
          filePath: ann.filePath,
          line: ann.parsed.line,
        })
      }
    }
  }

  return issues
}

// ============================================================================
// Rule: schema-validates (Phase 2)
// ============================================================================

/**
 * Parsed JSON Schema for @mm: annotations.
 * Loaded once and cached for performance.
 */
let _mmAnnotationSchema: Record<string, unknown> | null | undefined = undefined

/**
 * Load the mm-annotation.schema.json schema from disk.
 * Searches for it in common locations relative to this script.
 */
export function loadMmAnnotationSchema(): Record<string, unknown> | null {
  if (_mmAnnotationSchema !== undefined) return _mmAnnotationSchema

  // Try to find the schema relative to this file (scripts/ -> schemas/)
  const candidates = [
    path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '..',
      'schemas',
      'mm-annotation.schema.json'
    ),
    path.join(process.cwd(), 'schemas', 'mm-annotation.schema.json'),
  ]

  for (const candidate of candidates) {
    try {
      const content = fs.readFileSync(candidate, 'utf-8')
      _mmAnnotationSchema = JSON.parse(content) as Record<string, unknown>
      return _mmAnnotationSchema
    } catch {
      // Try next candidate
    }
  }

  _mmAnnotationSchema = null
  return null
}

/**
 * Simple JSON Schema Draft-07 validator for @mm: annotation fields.
 * Validates a single annotation object against the mm-annotation.schema.json schema.
 *
 * Returns an array of validation error messages.
 * This is a lightweight validator focused on the specific schema structure
 * and avoids adding heavy external schema validation dependencies.
 */
export function validateAnnotationAgainstSchema(
  annotation: MmAnnotation,
  schema: Record<string, unknown>
): string[] {
  const errors: string[] = []
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined
  if (!properties) return errors

  const obj = annotation as Record<string, unknown>

  // Check additionalProperties: false
  if (schema.additionalProperties === false) {
    for (const key of Object.keys(obj)) {
      if (!(key in properties)) {
        errors.push(`Unknown property "@mm:${key}" is not allowed by the annotation schema.`)
      }
    }
  }

  for (const [propName, propSchema] of Object.entries(properties)) {
    const value = obj[propName]
    if (value === undefined || value === null) continue

    const pSchema = propSchema as Record<string, unknown>

    // Type check
    if (pSchema.type === 'string' && typeof value !== 'string') {
      errors.push(`"@mm:${propName}" must be a string, got ${typeof value}.`)
    } else if (pSchema.type === 'integer' && !Number.isInteger(value)) {
      errors.push(`"@mm:${propName}" must be an integer, got ${typeof value}.`)
    } else if (pSchema.type === 'array' && !Array.isArray(value)) {
      errors.push(`"@mm:${propName}" must be an array, got ${typeof value}.`)
    }

    // String constraints
    if (typeof value === 'string') {
      if (typeof pSchema.minLength === 'number' && value.length < pSchema.minLength) {
        errors.push(`"@mm:${propName}" must have at least ${pSchema.minLength} character(s).`)
      }
      if (typeof pSchema.maxLength === 'number' && value.length > pSchema.maxLength) {
        errors.push(
          `"@mm:${propName}" exceeds maximum length of ${pSchema.maxLength} characters (got ${value.length}).`
        )
      }
      if (typeof pSchema.pattern === 'string') {
        const re = new RegExp(pSchema.pattern)
        if (!re.test(value)) {
          errors.push(
            `"@mm:${propName}" value "${value}" does not match required pattern ${pSchema.pattern}.`
          )
        }
      }
      if (Array.isArray(pSchema.enum) && !(pSchema.enum as string[]).includes(value)) {
        errors.push(
          `"@mm:${propName}" must be one of [${(pSchema.enum as string[]).join(', ')}], got "${value}".`
        )
      }
    }

    // Number constraints
    if (typeof value === 'number') {
      if (typeof pSchema.minimum === 'number' && value < pSchema.minimum) {
        errors.push(`"@mm:${propName}" must be >= ${pSchema.minimum}, got ${value}.`)
      }
      if (typeof pSchema.maximum === 'number' && value > pSchema.maximum) {
        errors.push(`"@mm:${propName}" must be <= ${pSchema.maximum}, got ${value}.`)
      }
    }

    // Array constraints
    if (Array.isArray(value)) {
      if (typeof pSchema.maxItems === 'number' && value.length > pSchema.maxItems) {
        errors.push(
          `"@mm:${propName}" must have at most ${pSchema.maxItems} items, got ${value.length}.`
        )
      }
      if (pSchema.uniqueItems === true) {
        const seen = new Set<unknown>()
        for (const item of value) {
          const key = JSON.stringify(item)
          if (seen.has(key)) {
            errors.push(`"@mm:${propName}" must have unique items (duplicate found: "${item}").`)
            break
          }
          seen.add(key)
        }
      }
      // Items schema
      const itemsSchema = pSchema.items as Record<string, unknown> | undefined
      if (itemsSchema) {
        for (const item of value) {
          if (itemsSchema.type === 'string' && typeof item !== 'string') {
            errors.push(`"@mm:${propName}" items must be strings, got ${typeof item}.`)
          }
          if (typeof item === 'string' && typeof itemsSchema.pattern === 'string') {
            const re = new RegExp(itemsSchema.pattern as string)
            if (!re.test(item)) {
              errors.push(`"@mm:${propName}" item "${item}" does not match required pattern.`)
            }
          }
          if (
            typeof item === 'string' &&
            typeof itemsSchema.maxLength === 'number' &&
            item.length > itemsSchema.maxLength
          ) {
            errors.push(
              `"@mm:${propName}" item "${item}" exceeds max length of ${itemsSchema.maxLength}.`
            )
          }
        }
      }
    }

    // Handle oneOf for deps and ai (simplified: just check types match)
    if (Array.isArray(pSchema.oneOf)) {
      // For deps: allow array or object with optional runtime/build/optional
      if (propName === 'deps') {
        if (!Array.isArray(value) && typeof value !== 'object') {
          errors.push(
            `"@mm:deps" must be an array of IDs or an object with runtime/build/optional keys.`
          )
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          const depsObj = value as Record<string, unknown>
          const allowedKeys = new Set(['runtime', 'build', 'optional'])
          for (const key of Object.keys(depsObj)) {
            if (!allowedKeys.has(key)) {
              errors.push(
                `"@mm:deps" object has unknown key "${key}". Allowed: runtime, build, optional.`
              )
            }
          }
        }
      }
      // For ai: allow string or object with summary/usage/examples
      if (propName === 'ai') {
        if (typeof value === 'string') {
          if (value.length > 200) {
            errors.push(`"@mm:ai" string summary exceeds maximum length of 200 characters.`)
          }
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          const aiObj = value as Record<string, unknown>
          const allowedKeys = new Set(['summary', 'usage', 'examples'])
          for (const key of Object.keys(aiObj)) {
            if (!allowedKeys.has(key)) {
              errors.push(
                `"@mm:ai" object has unknown key "${key}". Allowed: summary, usage, examples.`
              )
            }
          }
          if (typeof aiObj.summary === 'string' && aiObj.summary.length > 200) {
            errors.push(`"@mm:ai.summary" exceeds maximum length of 200 characters.`)
          }
        } else {
          errors.push(`"@mm:ai" must be a string or an object with summary/usage/examples.`)
        }
      }
    }
  }

  return errors
}

/**
 * Rule: schema-validates
 * Validate each annotation against the mm-annotation.schema.json JSON Schema.
 * Reports schema violations as errors (build-breaking).
 */
export function checkSchemaValidates(results: FileParseResult[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  const schema = loadMmAnnotationSchema()
  if (!schema) {
    // Schema not found — emit a single warning but don't break the build
    issues.push({
      rule: 'schema-validates',
      severity: 'warning',
      message:
        'mm-annotation.schema.json not found. Schema validation skipped. Expected at schemas/mm-annotation.schema.json.',
    })
    return issues
  }

  for (const result of results) {
    for (const parsed of result.annotations) {
      const schemaErrors = validateAnnotationAgainstSchema(parsed.annotation, schema)
      for (const msg of schemaErrors) {
        const entityRef = parsed.annotation.id
          ? `"${parsed.annotation.id}"`
          : parsed.entityName
            ? `"${parsed.entityName}"`
            : `at line ${parsed.line}`
        issues.push({
          rule: 'schema-validates',
          severity: 'error',
          message: `Annotation ${entityRef} in ${path.basename(result.filePath)} failed schema validation: ${msg}`,
          annotationId: parsed.annotation.id,
          filePath: result.filePath,
          line: parsed.line,
        })
      }
    }
  }

  return issues
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Run all semantic validation rules against the given parse results.
 *
 * @param results - Array of file parse results from the annotation parser
 * @param options - Validation configuration
 * @returns Validation result with errors and warnings
 */
export function validateAnnotations(
  results: FileParseResult[],
  options: ValidatorOptions = {}
): ValidationResult {
  const {
    rules = ALL_RULES,
    warnOnly = [],
    requiredFields = DEFAULT_REQUIRED_FIELDS,
    includeWarnings = true,
  } = options

  const rulesSet = new Set(rules)
  const warnOnlySet = new Set(warnOnly)

  const allAnnotations = flattenAnnotations(results)

  let allIssues: ValidationIssue[] = []

  if (rulesSet.has('unique-id-per-scope')) {
    allIssues.push(...checkUniqueIds(allAnnotations))
  }

  if (rulesSet.has('deps-must-exist')) {
    allIssues.push(...checkDepsExist(allAnnotations))
  }

  if (rulesSet.has('no-circular-runtime-deps')) {
    allIssues.push(...checkNoCircularDeps(allAnnotations))
  }

  if (rulesSet.has('required-fields-present')) {
    allIssues.push(...checkRequiredFields(results, requiredFields))
  }

  if (rulesSet.has('visibility-consistency')) {
    allIssues.push(...checkVisibilityConsistency(allAnnotations))
  }

  if (rulesSet.has('schema-validates')) {
    allIssues.push(...checkSchemaValidates(results))
  }

  // Apply warnOnly overrides
  if (warnOnlySet.size > 0) {
    allIssues = allIssues.map((issue) => {
      if (warnOnlySet.has(issue.rule)) {
        return { ...issue, severity: 'warning' as ValidationSeverity }
      }
      return issue
    })
  }

  const errors = allIssues.filter((i) => i.severity === 'error')
  const warnings = includeWarnings ? allIssues.filter((i) => i.severity === 'warning') : []

  return {
    errors,
    warnings,
    passed: errors.length === 0,
  }
}

// ============================================================================
// CLI Support
// ============================================================================

/**
 * Format validation results as a human-readable report.
 */
export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = []

  if (result.errors.length === 0 && result.warnings.length === 0) {
    lines.push('✅ MetaMode semantic validation passed — no issues found.')
    return lines.join('\n')
  }

  if (result.errors.length > 0) {
    lines.push(`\n❌ ${result.errors.length} error(s) found:\n`)
    for (const err of result.errors) {
      const location = [
        err.filePath ? path.basename(err.filePath) : null,
        err.line ? `line ${err.line}` : null,
      ]
        .filter(Boolean)
        .join(':')
      lines.push(`  [ERROR/${err.rule}]${location ? ` (${location})` : ''} ${err.message}`)
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\n⚠  ${result.warnings.length} warning(s):\n`)
    for (const warn of result.warnings) {
      const location = [
        warn.filePath ? path.basename(warn.filePath) : null,
        warn.line ? `line ${warn.line}` : null,
      ]
        .filter(Boolean)
        .join(':')
      lines.push(`  [WARN/${warn.rule}]${location ? ` (${location})` : ''} ${warn.message}`)
    }
  }

  lines.push(
    result.passed
      ? '\n✅ Validation passed (warnings present).'
      : '\n❌ Validation failed — fix errors above to proceed.'
  )

  return lines.join('\n')
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (process.argv[1] && path.basename(process.argv[1]) === 'metamode-semantic-validator.ts') {
  const { scanDirectoryForAnnotations } = await import('./metamode-annotation-parser.js')

  const args = process.argv.slice(2)
  const targetDir = args.find((a) => !a.startsWith('--')) || process.cwd()
  const failOnError = !args.includes('--warn-only')

  console.log('MetaMode Semantic Validator (v2.0)')
  console.log('====================================')
  console.log(`Scanning: ${targetDir}`)
  console.log('')

  const results = scanDirectoryForAnnotations(targetDir, {
    extensions: ['.ts', '.js', '.vue'],
    recursive: true,
  })

  const totalAnnotations = results.reduce((sum, r) => sum + r.annotations.length, 0)
  console.log(`Found ${totalAnnotations} annotation(s) in ${results.length} file(s)`)
  console.log('')

  const validationResult = validateAnnotations(results)
  console.log(formatValidationReport(validationResult))

  if (!validationResult.passed && failOnError) {
    process.exit(1)
  }
}
