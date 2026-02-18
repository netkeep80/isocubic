/**
 * MetaMode Annotation Parser (MetaMode v2.0, Phase 0)
 *
 * Parses `@mm:` annotations from TypeScript, JavaScript, and Vue source files.
 * Also extracts `__mm` runtime property objects from source code.
 *
 * Supported annotation format:
 * ```ts
 * /**
 *  * @mm:id=param_editor
 *  * @mm:name=ParametricEditor
 *  * @mm:desc=Description of the component
 *  * @mm:tags=ui,stable
 *  * @mm:deps=runtime:lib/params,build:tools/voxel
 *  * @mm:visibility=public
 *  *\/
 * ```
 *
 * Supported runtime property format:
 * ```ts
 * export const ParametricEditor = {
 *   __mm: {
 *     id: 'param_editor',
 *     version: '1.2.0',
 *     visibility: 'public',
 *     refs: {
 *       params: 'lib/params/schema',
 *     }
 *   }
 * }
 * ```
 *
 * Priority: `__mm` runtime property > `@mm:` JSDoc comment
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ============================================================================
// Types
// ============================================================================

/** Dependency classification */
export interface MmDeps {
  /** Runtime dependencies (required at runtime) */
  runtime?: string[]
  /** Build-time dependencies (required at compile time) */
  build?: string[]
  /** Optional dependencies */
  optional?: string[]
}

/** AI-related metadata */
export interface MmAiMeta {
  /** Short summary for LLM context */
  summary?: string
  /** Usage hints for AI agents */
  usage?: string
  /** Code examples */
  examples?: string[]
}

/** Visibility of the entity */
export type MmVisibility = 'public' | 'internal'

/** Status of the entity */
export type MmStatus = 'stable' | 'beta' | 'experimental' | 'deprecated' | 'exp' | 'dep'

/**
 * Parsed MetaMode v2.0 annotation entry.
 * Represents a single `@mm:` annotated entity in the source code.
 */
export interface MmAnnotation {
  /** Unique identifier within the scope */
  id?: string
  /** Human-readable name */
  name?: string
  /** Description of the entity */
  desc?: string
  /** Tags for categorization and filtering */
  tags?: string[]
  /** Dependencies */
  deps?: MmDeps | string[]
  /** AI metadata */
  ai?: MmAiMeta | string
  /** Visibility */
  visibility?: MmVisibility
  /** Semantic version */
  version?: string
  /** Development phase */
  phase?: number
  /** Status */
  status?: MmStatus
}

/**
 * A parsed annotation with location information
 */
export interface ParsedAnnotation {
  /** The parsed annotation data */
  annotation: MmAnnotation
  /** Source of the annotation: 'jsdoc' | 'runtime' */
  source: 'jsdoc' | 'runtime'
  /** Line number where annotation starts (1-based) */
  line: number
  /** Raw source text */
  raw: string
  /** The identifier name of the annotated entity, if detectable */
  entityName?: string
}

/**
 * Result of parsing a single file
 */
export interface FileParseResult {
  /** Absolute path of the parsed file */
  filePath: string
  /** All annotations found in the file */
  annotations: ParsedAnnotation[]
  /** Parse errors (non-fatal) */
  warnings: string[]
}

// ============================================================================
// @mm: JSDoc Comment Parser
// ============================================================================

/**
 * Parse `@mm:key=value` lines from a JSDoc block.
 * Supports multi-line values via continuation lines (indented).
 */
function parseMMJsDoc(jsdocBlock: string): MmAnnotation {
  const result: MmAnnotation = {}

  // Clean JSDoc markers and split into lines
  const lines = jsdocBlock
    .replace(/^\s*\/\*\*/, '')
    .replace(/\*\/\s*$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter((line) => line.length > 0)

  for (const line of lines) {
    // Match @mm:key=value
    const match = line.match(/^@mm:([a-zA-Z][a-zA-Z0-9_]*)=(.*)$/)
    if (!match) continue

    const [, key, value] = match
    applyMMField(result, key.toLowerCase(), value.trim())
  }

  return result
}

/**
 * Find all `@mm:` JSDoc blocks in source content.
 * Returns each block with its starting line number.
 */
function findMMJsDocBlocks(
  content: string
): Array<{ raw: string; line: number; entityName?: string }> {
  const results: Array<{ raw: string; line: number; entityName?: string }> = []
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Detect start of a JSDoc block
    if (/^\s*\/\*\*/.test(line)) {
      const blockStartLine = i + 1 // 1-based
      const blockLines: string[] = [line]

      // Collect the full JSDoc block
      let j = i + 1
      while (j < lines.length) {
        blockLines.push(lines[j])
        if (/\*\//.test(lines[j])) {
          break
        }
        j++
      }

      const raw = blockLines.join('\n')

      // Only include blocks that have @mm: annotations
      if (/@mm:/.test(raw)) {
        // Try to detect what entity follows the comment
        let entityName: string | undefined
        if (j + 1 < lines.length) {
          const nextLine = lines[j + 1] || ''
          const entityMatch = nextLine.match(
            /(?:export\s+)?(?:const|function|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
          )
          if (entityMatch) {
            entityName = entityMatch[1]
          }
        }

        results.push({ raw, line: blockStartLine, entityName })
      }

      i = j + 1
      continue
    }

    i++
  }

  return results
}

// ============================================================================
// __mm Runtime Property Parser
// ============================================================================

/**
 * Extract content within balanced braces starting at the opening brace position.
 */
function extractBalancedBraces(content: string, startIndex: number): string | null {
  if (content[startIndex] !== '{') return null

  let depth = 0
  let inString: string | null = null
  let i = startIndex

  while (i < content.length) {
    const char = content[i]
    const prevChar = i > 0 ? content[i - 1] : ''

    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (inString === null) {
        inString = char
      } else if (inString === char) {
        inString = null
      }
    }

    if (inString === null) {
      if (char === '{') depth++
      if (char === '}') {
        depth--
        if (depth === 0) {
          return content.substring(startIndex, i + 1)
        }
      }
    }

    i++
  }

  return null
}

/**
 * Simple key-value extractor from an object literal string.
 * Handles nested objects and arrays at one level.
 */
function extractSimpleObjectFields(objectLiteral: string): Record<string, string> {
  const result: Record<string, string> = {}

  // Remove outer braces
  const content = objectLiteral
    .trim()
    .replace(/^\{|\}$/g, '')
    .trim()

  // Split by top-level commas
  const pairs = splitTopLevel(content, ',')

  for (const pair of pairs) {
    const colonIdx = pair.indexOf(':')
    if (colonIdx === -1) continue

    const key = pair
      .substring(0, colonIdx)
      .trim()
      .replace(/^['"`]|['"`]$/g, '')
    const value = pair.substring(colonIdx + 1).trim()

    if (key) {
      result[key] = value
    }
  }

  return result
}

/**
 * Split a string by a delimiter, respecting brackets and strings
 */
function splitTopLevel(content: string, delimiter: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  let inString: string | null = null

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prevChar = i > 0 ? content[i - 1] : ''

    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (inString === null) {
        inString = char
      } else if (inString === char) {
        inString = null
      }
    }

    if (inString === null) {
      if (char === '[' || char === '{' || char === '(') depth++
      else if (char === ']' || char === '}' || char === ')') depth--
      else if (char === delimiter && depth === 0) {
        if (current.trim()) parts.push(current.trim())
        current = ''
        continue
      }
    }

    current += char
  }

  if (current.trim()) parts.push(current.trim())
  return parts
}

/**
 * Parse a `__mm` object literal into an MmAnnotation
 */
function parseMMRuntimeObject(objectLiteral: string): MmAnnotation {
  const result: MmAnnotation = {}
  const fields = extractSimpleObjectFields(objectLiteral)

  for (const [key, value] of Object.entries(fields)) {
    applyMMField(result, key.toLowerCase(), value)
  }

  return result
}

/**
 * Find all `__mm` property objects in source content.
 */
function findMMRuntimeObjects(
  content: string
): Array<{ raw: string; line: number; entityName?: string }> {
  const results: Array<{ raw: string; line: number; entityName?: string }> = []

  // Pattern: __mm: { ... } or __mm = { ... }
  const mmPattern = /__mm\s*[=:]\s*\{/g
  let match

  while ((match = mmPattern.exec(content)) !== null) {
    const braceStart = content.indexOf('{', match.index + match[0].length - 1)
    if (braceStart === -1) continue

    const objectContent = extractBalancedBraces(content, braceStart)
    if (!objectContent) continue

    // Calculate line number
    const lineNum = content.substring(0, match.index).split('\n').length

    // Try to find the parent entity name by looking backwards
    const preceding = content.substring(0, match.index)
    const precedingLines = preceding.split('\n')
    let entityName: string | undefined

    // Search last ~10 lines for entity declaration
    for (let i = precedingLines.length - 1; i >= Math.max(0, precedingLines.length - 10); i--) {
      const lineContent = precedingLines[i]
      const entityMatch = lineContent.match(
        /(?:export\s+)?(?:const|function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/
      )
      if (entityMatch) {
        entityName = entityMatch[1]
        break
      }
    }

    results.push({
      raw: objectContent,
      line: lineNum,
      entityName,
    })
  }

  // Deduplicate by line number
  const seen = new Set<number>()
  return results.filter((r) => {
    if (seen.has(r.line)) return false
    seen.add(r.line)
    return true
  })
}

// ============================================================================
// Field Parsing
// ============================================================================

/**
 * Apply a parsed key-value pair to an annotation object.
 * Handles all supported @mm: fields and their value formats.
 */
function applyMMField(result: MmAnnotation, key: string, value: string): void {
  const cleanValue = cleanStringValue(value)

  switch (key) {
    case 'id':
      result.id = cleanValue
      break

    case 'name':
      result.name = cleanValue
      break

    case 'desc':
    case 'description':
      result.desc = cleanValue
      break

    case 'version':
    case 'ver':
      result.version = cleanValue
      break

    case 'visibility':
      if (cleanValue === 'public' || cleanValue === 'internal') {
        result.visibility = cleanValue
      }
      break

    case 'status': {
      const status = cleanValue as MmStatus
      if (['stable', 'beta', 'experimental', 'deprecated', 'exp', 'dep'].includes(status)) {
        result.status = status
      }
      break
    }

    case 'phase': {
      const phase = parseInt(cleanValue, 10)
      if (!isNaN(phase)) result.phase = phase
      break
    }

    case 'tags':
      result.tags = parseCommaSeparatedArray(value)
      break

    case 'deps': {
      // Support both "runtime:id1,build:id2" and plain "id1,id2"
      const items = parseCommaSeparatedArray(value)
      const depsObj: MmDeps = {}

      for (const item of items) {
        const colonIdx = item.indexOf(':')
        if (colonIdx > 0) {
          const depType = item.substring(0, colonIdx) as keyof MmDeps
          const depTarget = item.substring(colonIdx + 1)
          if (depType === 'runtime' || depType === 'build' || depType === 'optional') {
            if (!depsObj[depType]) depsObj[depType] = []
            depsObj[depType]!.push(depTarget)
          } else {
            // Unknown type: treat as runtime
            if (!depsObj.runtime) depsObj.runtime = []
            depsObj.runtime.push(item)
          }
        } else {
          // No type prefix: treat as runtime
          if (!depsObj.runtime) depsObj.runtime = []
          depsObj.runtime.push(item)
        }
      }

      result.deps = Object.keys(depsObj).length > 0 ? depsObj : items
      break
    }

    case 'ai': {
      // Can be "summary:..." or just a plain string
      const summaryMatch = cleanValue.match(/^summary:(.+)$/)
      if (summaryMatch) {
        result.ai = { summary: summaryMatch[1].trim() }
      } else if (typeof result.ai !== 'object' || result.ai === null) {
        // Only overwrite if not already an object (preserve sub-fields set by ai:summary etc.)
        result.ai = cleanValue
      }
      break
    }

    case 'ai:summary':
    case 'ai.summary': {
      if (typeof result.ai === 'object' && result.ai !== null) {
        result.ai.summary = cleanValue
      } else {
        result.ai = { summary: cleanValue }
      }
      break
    }

    case 'ai:usage':
    case 'ai.usage': {
      if (typeof result.ai === 'object' && result.ai !== null) {
        result.ai.usage = cleanValue
      } else {
        result.ai = { usage: cleanValue }
      }
      break
    }
  }
}

/**
 * Clean a string value: remove surrounding quotes, trim whitespace
 */
function cleanStringValue(value: string): string {
  return value
    .trim()
    .replace(/^['"`]|['"`]$/g, '')
    .trim()
}

/**
 * Parse a comma-separated list, supporting [item1, item2] syntax
 */
function parseCommaSeparatedArray(value: string): string[] {
  const trimmed = value.trim()

  // Handle array brackets
  const inner = trimmed.startsWith('[') && trimmed.endsWith(']') ? trimmed.slice(1, -1) : trimmed

  return inner
    .split(',')
    .map((item) =>
      item
        .trim()
        .replace(/^['"`]|['"`]$/g, '')
        .trim()
    )
    .filter((item) => item.length > 0)
}

// ============================================================================
// File Parsing
// ============================================================================

/**
 * Parse a single source file for `@mm:` annotations and `__mm` objects.
 * Supports TypeScript (.ts), JavaScript (.js), and Vue SFCs (.vue).
 */
export function parseAnnotationsFromContent(
  content: string,
  filePath: string = '<unknown>'
): FileParseResult {
  const annotations: ParsedAnnotation[] = []
  const warnings: string[] = []

  // For Vue files, extract script blocks first
  const contentsToParse = filePath.endsWith('.vue') ? extractVueScriptContents(content) : [content]

  for (const scriptContent of contentsToParse) {
    // 1. Find all @mm: JSDoc blocks
    const jsdocBlocks = findMMJsDocBlocks(scriptContent)
    for (const block of jsdocBlocks) {
      const annotation = parseMMJsDoc(block.raw)
      if (Object.keys(annotation).length > 0) {
        annotations.push({
          annotation,
          source: 'jsdoc',
          line: block.line,
          raw: block.raw,
          entityName: block.entityName,
        })
      }
    }

    // 2. Find all __mm runtime objects
    const runtimeObjects = findMMRuntimeObjects(scriptContent)
    for (const obj of runtimeObjects) {
      const annotation = parseMMRuntimeObject(obj.raw)
      if (Object.keys(annotation).length > 0) {
        // Check if we already have a @mm: annotation for the same entity
        const existingIdx = annotations.findIndex(
          (a) => a.entityName && a.entityName === obj.entityName && a.source === 'jsdoc'
        )

        if (existingIdx >= 0) {
          // __mm takes priority: merge with existing, __mm wins on conflicts
          annotations[existingIdx] = {
            annotation: { ...annotations[existingIdx].annotation, ...annotation },
            source: 'runtime',
            line: obj.line,
            raw: obj.raw,
            entityName: obj.entityName,
          }
        } else {
          annotations.push({
            annotation,
            source: 'runtime',
            line: obj.line,
            raw: obj.raw,
            entityName: obj.entityName,
          })
        }
      }
    }
  }

  return { filePath, annotations, warnings }
}

/**
 * Parse annotations from a file on disk.
 */
export function parseAnnotationsFromFile(filePath: string): FileParseResult {
  const emptyResult: FileParseResult = { filePath, annotations: [], warnings: [] }

  if (!fs.existsSync(filePath)) {
    return { ...emptyResult, warnings: [`File not found: ${filePath}`] }
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return parseAnnotationsFromContent(content, filePath)
  } catch (err) {
    return {
      ...emptyResult,
      warnings: [`Failed to read file: ${filePath}: ${err}`],
    }
  }
}

/**
 * Extract script block contents from a Vue SFC.
 * Returns an array of script contents (may have multiple <script> blocks).
 */
function extractVueScriptContents(vueContent: string): string[] {
  const results: string[] = []
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi

  let match
  while ((match = scriptPattern.exec(vueContent)) !== null) {
    if (match[1].trim()) {
      results.push(match[1])
    }
  }

  return results.length > 0 ? results : [vueContent]
}

// ============================================================================
// Directory Scanning
// ============================================================================

/** Options for directory scanning */
export interface ScanOptions {
  /** File extensions to include (default: ['.ts', '.js', '.vue']) */
  extensions?: string[]
  /** Whether to scan recursively (default: true) */
  recursive?: boolean
  /** Glob patterns to exclude */
  exclude?: string[]
  /** Maximum depth to scan (default: unlimited) */
  maxDepth?: number
}

const DEFAULT_EXTENSIONS = ['.ts', '.js', '.vue']
const DEFAULT_EXCLUDE_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vite',
  'coverage',
  '__pycache__',
])

/**
 * Scan a directory for annotated source files.
 * Returns all parse results for files that have annotations.
 */
export function scanDirectoryForAnnotations(
  dirPath: string,
  options: ScanOptions = {}
): FileParseResult[] {
  const {
    extensions = DEFAULT_EXTENSIONS,
    recursive = true,
    exclude = [],
    maxDepth = Infinity,
  } = options

  const results: FileParseResult[] = []
  const excludeSet = new Set(exclude)

  function scan(currentDir: string, depth: number) {
    if (depth > maxDepth) return

    if (!fs.existsSync(currentDir)) return

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        if (DEFAULT_EXCLUDE_DIRS.has(entry.name) || excludeSet.has(entry.name)) continue
        if (recursive) {
          scan(fullPath, depth + 1)
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (!extensions.includes(ext)) continue
        if (excludeSet.has(entry.name)) continue

        const result = parseAnnotationsFromFile(fullPath)
        if (result.annotations.length > 0 || result.warnings.length > 0) {
          results.push(result)
        }
      }
    }
  }

  scan(dirPath, 0)
  return results
}

/**
 * Flatten all annotations from scan results into a single indexed map.
 * Key: annotation id (if present), or file:entityName
 */
export function buildAnnotationIndex(results: FileParseResult[]): Map<string, ParsedAnnotation> {
  const index = new Map<string, ParsedAnnotation>()

  for (const result of results) {
    for (const parsed of result.annotations) {
      const key =
        parsed.annotation.id ||
        (parsed.entityName
          ? `${path.basename(result.filePath)}:${parsed.entityName}`
          : `${path.basename(result.filePath)}:${parsed.line}`)

      index.set(key, parsed)
    }
  }

  return index
}

// ============================================================================
// CLI Support
// ============================================================================

if (process.argv[1] && path.basename(process.argv[1]) === 'metamode-annotation-parser.ts') {
  const args = process.argv.slice(2)
  const targetPath = args[0] || '.'

  console.log('MetaMode Annotation Parser (v2.0, Phase 0)')
  console.log('==========================================')

  const stat = fs.existsSync(targetPath) && fs.statSync(targetPath)

  if (stat && stat.isFile()) {
    const result = parseAnnotationsFromFile(targetPath)
    if (result.annotations.length > 0) {
      console.log(`\n✅ Found ${result.annotations.length} annotation(s) in ${targetPath}`)
      for (const a of result.annotations) {
        console.log(
          `\n  [Line ${a.line}] source: ${a.source}${a.entityName ? `, entity: ${a.entityName}` : ''}`
        )
        console.log('  Annotation:', JSON.stringify(a.annotation, null, 4))
      }
    } else {
      console.log(`\n❌ No @mm: annotations found in ${targetPath}`)
    }
    if (result.warnings.length > 0) {
      for (const w of result.warnings) {
        console.warn(`  ⚠ ${w}`)
      }
    }
  } else if (stat && stat.isDirectory()) {
    console.log(`\nScanning directory: ${targetPath}`)
    const results = scanDirectoryForAnnotations(targetPath)
    const totalAnnotations = results.reduce((sum, r) => sum + r.annotations.length, 0)

    if (totalAnnotations > 0) {
      console.log(`\n✅ Found ${totalAnnotations} annotation(s) in ${results.length} file(s)`)
      for (const result of results) {
        if (result.annotations.length > 0) {
          console.log(
            `\n  ${path.relative(targetPath, result.filePath)}: ${result.annotations.length} annotation(s)`
          )
          for (const a of result.annotations) {
            if (a.annotation.id) {
              console.log(
                `    - [${a.source}] ${a.annotation.id}: ${a.annotation.desc || a.annotation.name || ''}`
              )
            }
          }
        }
      }
    } else {
      console.log('\n❌ No @mm: annotations found')
    }
  } else {
    console.error(`\n❌ Path not found: ${targetPath}`)
    process.exit(1)
  }
}
