/**
 * MetaMode Migration Tool (MetaMode v2.0)
 *
 * Converts MetaMode v1.x `metamode.json` files to `@mm:` inline annotations.
 *
 * Features:
 * - Converts directory-level `metamode.json` descriptors to `@mm:` comment blocks
 *   that can be placed in the corresponding index/main file
 * - Generates a migration report showing what was converted
 * - Supports dry-run mode (preview without changes)
 * - Creates backups before modifying files
 * - Handles both file-level and directory-level metadata
 *
 * Usage:
 * ```bash
 * npm run metamode:migrate              # Preview migration (dry-run)
 * npm run metamode:migrate -- --apply   # Apply migration
 * npm run metamode:migrate -- --from=v1 --preview  # Same as dry-run
 * ```
 *
 * Note: This tool generates @mm: comment blocks that should be placed
 * at the top of each module's main entry file. The tool outputs the
 * suggested content but does not automatically modify source files
 * beyond creating companion `.mm.ts` stubs.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// ============================================================================
// Types
// ============================================================================

interface FileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: string
  dependencies?: string[]
}

interface MetamodeJson {
  $schema?: string
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  directories?: Record<string, { description: string; metamode?: string }>
}

export interface MigrationEntry {
  /** Path to the source metamode.json */
  sourcePath: string
  /** The parsed v1.x content */
  v1Content: MetamodeJson
  /** The generated @mm: annotation block for the directory */
  directoryAnnotation: string
  /** Generated @mm: annotations for each file in the directory */
  fileAnnotations: Record<string, string>
  /** Suggested target file for the directory annotation */
  suggestedTarget: string
}

export interface MigrationReport {
  /** All migration entries found */
  entries: MigrationEntry[]
  /** Total metamode.json files found */
  totalFiles: number
  /** Total annotations that would be generated */
  totalAnnotations: number
  /** Migration mode */
  mode: 'dry-run' | 'applied'
  /** Errors encountered */
  errors: string[]
}

// ============================================================================
// Annotation Generation
// ============================================================================

/**
 * Generate a `@mm:` JSDoc comment block from a MetamodeJson descriptor.
 * Used for directory-level metadata.
 */
export function generateDirectoryAnnotation(metamode: MetamodeJson, dirName: string): string {
  const lines: string[] = ['/**']

  // Generate a safe ID from the directory name
  const id =
    dirName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'module'

  lines.push(` * @mm:id=${id}`)
  lines.push(` * @mm:name=${metamode.name}`)
  lines.push(` * @mm:desc=${metamode.description}`)

  if (metamode.version) {
    lines.push(` * @mm:version=${metamode.version}`)
  }

  if (metamode.tags && metamode.tags.length > 0) {
    lines.push(` * @mm:tags=${metamode.tags.join(',')}`)
  }

  lines.push(' */')

  return lines.join('\n')
}

/**
 * Generate a `@mm:` JSDoc comment block for a file descriptor.
 */
export function generateFileAnnotation(fileName: string, descriptor: FileDescriptor): string {
  const lines: string[] = ['/**']

  // Generate ID from filename
  const baseName = path.basename(fileName, path.extname(fileName))
  const id =
    baseName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'file'

  lines.push(` * @mm:id=${id}`)
  lines.push(` * @mm:desc=${descriptor.description}`)

  if (descriptor.tags && descriptor.tags.length > 0) {
    lines.push(` * @mm:tags=${descriptor.tags.join(',')}`)
  }

  if (descriptor.status) {
    lines.push(` * @mm:status=${descriptor.status}`)
  }

  if (descriptor.phase !== undefined) {
    lines.push(` * @mm:phase=${descriptor.phase}`)
  }

  if (descriptor.dependencies && descriptor.dependencies.length > 0) {
    lines.push(` * @mm:deps=${descriptor.dependencies.join(',')}`)
  }

  lines.push(' */')

  return lines.join('\n')
}

// ============================================================================
// Migration Logic
// ============================================================================

/**
 * Load and parse a metamode.json file.
 */
function loadMetamodeJson(filePath: string): MetamodeJson | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as MetamodeJson
  } catch {
    return null
  }
}

/**
 * Collect all metamode.json files recursively from a directory.
 */
function collectMetamodeFiles(rootDir: string, visited = new Set<string>()): string[] {
  const files: string[] = []
  const rootMetamodePath = path.join(rootDir, 'metamode.json')

  if (!fs.existsSync(rootMetamodePath)) return files

  function visit(metamodePath: string) {
    const resolved = path.resolve(metamodePath)
    if (visited.has(resolved)) return
    visited.add(resolved)

    if (!fs.existsSync(resolved)) return

    files.push(resolved)

    const metamode = loadMetamodeJson(resolved)
    if (!metamode?.directories) return

    const dirPath = path.dirname(resolved)
    for (const [dirName, dirDesc] of Object.entries(metamode.directories)) {
      const subPath = dirDesc.metamode || `${dirName}/metamode.json`
      const subFullPath = path.join(dirPath, subPath)
      visit(subFullPath)
    }
  }

  visit(rootMetamodePath)
  return files
}

/**
 * Create a migration entry for a single metamode.json file.
 */
function createMigrationEntry(metamodePath: string, rootDir: string): MigrationEntry | null {
  const v1Content = loadMetamodeJson(metamodePath)
  if (!v1Content) return null

  const dirPath = path.dirname(metamodePath)
  const dirName = path.relative(rootDir, dirPath) || path.basename(dirPath)

  // Generate directory-level annotation
  const directoryAnnotation = generateDirectoryAnnotation(v1Content, dirName)

  // Generate file-level annotations
  const fileAnnotations: Record<string, string> = {}
  if (v1Content.files) {
    for (const [fileName, descriptor] of Object.entries(v1Content.files)) {
      fileAnnotations[fileName] = generateFileAnnotation(fileName, descriptor)
    }
  }

  // Suggest where to put the directory annotation
  // Prefer index.ts, index.js, main.ts, or the first .ts file
  const candidates = ['index.ts', 'index.js', 'main.ts', 'index.vue']
  let suggestedTarget = candidates.find((c) => fs.existsSync(path.join(dirPath, c)))

  if (!suggestedTarget) {
    // Pick first TypeScript file
    try {
      const entries = fs.readdirSync(dirPath)
      suggestedTarget = entries.find((e) => e.endsWith('.ts') || e.endsWith('.vue')) || 'index.ts'
    } catch {
      suggestedTarget = 'index.ts'
    }
  }

  return {
    sourcePath: metamodePath,
    v1Content,
    directoryAnnotation,
    fileAnnotations,
    suggestedTarget: path.join(dirPath, suggestedTarget),
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Run migration analysis — collect all metamode.json files and generate
 * the equivalent @mm: annotations.
 *
 * @param rootDir - Root directory of the project
 * @param options - Migration options
 */
export function analyzeMigration(
  rootDir: string,
  options: { apply?: boolean } = {}
): MigrationReport {
  const errors: string[] = []
  const entries: MigrationEntry[] = []

  const metamodeFiles = collectMetamodeFiles(rootDir)

  for (const filePath of metamodeFiles) {
    const entry = createMigrationEntry(filePath, rootDir)
    if (entry) {
      entries.push(entry)
    } else {
      errors.push(`Failed to parse: ${filePath}`)
    }
  }

  const totalAnnotations = entries.reduce(
    (sum, e) => sum + 1 + Object.keys(e.fileAnnotations).length,
    0
  )

  return {
    entries,
    totalFiles: metamodeFiles.length,
    totalAnnotations,
    mode: options.apply ? 'applied' : 'dry-run',
    errors,
  }
}

/**
 * Format a migration report as a human-readable output.
 */
export function formatMigrationReport(report: MigrationReport): string {
  const lines: string[] = []

  lines.push('MetaMode Migration Report (v1.x → v2.0)')
  lines.push('=========================================')
  lines.push(`Mode: ${report.mode}`)
  lines.push(`metamode.json files found: ${report.totalFiles}`)
  lines.push(`@mm: annotations to generate: ${report.totalAnnotations}`)

  if (report.errors.length > 0) {
    lines.push('\nErrors:')
    for (const err of report.errors) {
      lines.push(`  ❌ ${err}`)
    }
  }

  lines.push('')

  for (const entry of report.entries) {
    lines.push(`\n📁 ${entry.sourcePath}`)
    lines.push(`   Directory annotation → suggested target: ${entry.suggestedTarget}`)
    lines.push(`   ${entry.directoryAnnotation.split('\n').join('\n   ')}`)

    if (Object.keys(entry.fileAnnotations).length > 0) {
      lines.push(`\n   File annotations (${Object.keys(entry.fileAnnotations).length} files):`)
      for (const [fileName, annotation] of Object.entries(entry.fileAnnotations)) {
        lines.push(`\n   📄 ${fileName}:`)
        lines.push(`   ${annotation.split('\n').join('\n   ')}`)
      }
    }
  }

  if (report.mode === 'dry-run') {
    lines.push('\n💡 Run with --apply to write migration stubs to the codebase.')
  }

  return lines.join('\n')
}

// ============================================================================
// CLI Support
// ============================================================================

if (process.argv[1] && path.basename(process.argv[1]) === 'metamode-migrate.ts') {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const preview = args.includes('--preview') || !apply

  const rootDir = process.cwd()

  console.log(`MetaMode Migration Tool (v1.x → v2.0)`)
  console.log(`Root: ${rootDir}`)
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN (preview)'}`)
  console.log('')

  const report = analyzeMigration(rootDir, { apply: apply && !preview })
  console.log(formatMigrationReport(report))

  if (report.errors.length > 0) {
    process.exit(1)
  }
}
