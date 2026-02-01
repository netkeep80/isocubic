/**
 * MetaNet Preprocessor
 *
 * Validates metanet.json files against the schema and checks that:
 * 1. All metanet.json files conform to metanet.schema.json
 * 2. Referenced files exist on disk
 * 3. Referenced subdirectory metanet.json files exist
 * 4. Files in directories are described (sync check, warnings only)
 *
 * Usage:
 *   npx tsx scripts/metanet-preprocessor.ts [--check] [--verbose] [--compile [output]]
 *
 * Options:
 *   --check            Exit with non-zero code if any errors found (for CI)
 *   --verbose          Print detailed information about each metanet.json
 *   --compile [output] Compile metanet tree to JSON file (default: metanet.compiled.json)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import Ajv from 'ajv'

// --- Types ---

interface FileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'experimental' | 'deprecated'
  dependencies?: string[]
}

interface DirectoryDescriptor {
  description: string
  metanet: string
}

interface MetanetJson {
  $schema?: string
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  directories?: Record<string, DirectoryDescriptor>
}

interface ValidationResult {
  errors: string[]
  warnings: string[]
}

// --- Constants ---

const IGNORED_FILES = new Set([
  '.gitkeep',
  '.DS_Store',
  'Thumbs.db',
  'metanet.json',
  'package-lock.json',
])

const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'coverage', '.vite'])

// --- Core Functions ---

/**
 * Load and parse a JSON file
 */
function loadJson<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

/**
 * Get list of files in a directory (excluding ignored)
 */
function getDirectoryFiles(dirPath: string): string[] {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((name) => {
        if (IGNORED_FILES.has(name)) return false
        const fullPath = path.join(dirPath, name)
        return fs.statSync(fullPath).isFile()
      })
      .sort()
  } catch {
    return []
  }
}

/**
 * Get list of subdirectories in a directory (excluding ignored)
 */
function getSubdirectories(dirPath: string): string[] {
  try {
    return fs
      .readdirSync(dirPath)
      .filter((name) => {
        if (IGNORED_DIRS.has(name)) return false
        const fullPath = path.join(dirPath, name)
        return fs.statSync(fullPath).isDirectory()
      })
      .sort()
  } catch {
    return []
  }
}

/**
 * Validate a single metanet.json file
 */
function validateMetanetFile(
  metanetPath: string,
  metanet: MetanetJson,
  schemaValidator: Ajv.ValidateFunction,
  verbose: boolean
): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] }
  const dirPath = path.dirname(metanetPath)
  const relPath = path.relative(process.cwd(), metanetPath)

  if (verbose) {
    console.log(`\n  Checking: ${relPath}`)
  }

  // 1. Schema validation
  const valid = schemaValidator(metanet)
  if (!valid && schemaValidator.errors) {
    for (const err of schemaValidator.errors) {
      result.errors.push(`${relPath}: Schema error at ${err.instancePath}: ${err.message}`)
    }
  }

  // 2. Check that referenced files exist
  if (metanet.files) {
    for (const fileName of Object.keys(metanet.files)) {
      const filePath = path.join(dirPath, fileName)
      if (!fs.existsSync(filePath)) {
        result.errors.push(`${relPath}: Referenced file does not exist: ${fileName}`)
      }
    }
  }

  // 3. Check that referenced subdirectory metanet.json files exist
  if (metanet.directories) {
    for (const [dirName, dirDesc] of Object.entries(metanet.directories)) {
      const subDirPath = path.join(dirPath, dirName)
      if (!fs.existsSync(subDirPath)) {
        result.errors.push(`${relPath}: Referenced directory does not exist: ${dirName}`)
        continue
      }
      const subMetanetPath = path.join(dirPath, dirDesc.metanet)
      if (!fs.existsSync(subMetanetPath)) {
        result.errors.push(`${relPath}: Referenced metanet.json does not exist: ${dirDesc.metanet}`)
      }
    }
  }

  // 4. Sync check: find files on disk not described in metanet.json
  const actualFiles = getDirectoryFiles(dirPath)
  const describedFiles = new Set(Object.keys(metanet.files || {}))
  for (const file of actualFiles) {
    if (!describedFiles.has(file)) {
      result.warnings.push(`${relPath}: File not described in metanet.json: ${file}`)
    }
  }

  // 5. Sync check: find subdirectories not referenced in metanet.json
  const actualDirs = getSubdirectories(dirPath)
  const describedDirs = new Set(Object.keys(metanet.directories || {}))
  for (const dir of actualDirs) {
    if (!describedDirs.has(dir)) {
      result.warnings.push(`${relPath}: Directory not referenced in metanet.json: ${dir}`)
    }
  }

  return result
}

/**
 * Recursively find and validate all metanet.json files starting from root
 */
function walkAndValidate(
  rootMetanetPath: string,
  schemaValidator: Ajv.ValidateFunction,
  verbose: boolean
): ValidationResult {
  const totalResult: ValidationResult = { errors: [], warnings: [] }
  const visited = new Set<string>()

  function visit(metanetPath: string) {
    const resolvedPath = path.resolve(metanetPath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) {
      totalResult.errors.push(`metanet.json not found: ${metanetPath}`)
      return
    }

    const metanet = loadJson<MetanetJson>(resolvedPath)
    if (!metanet) {
      totalResult.errors.push(`Failed to parse: ${metanetPath}`)
      return
    }

    const result = validateMetanetFile(resolvedPath, metanet, schemaValidator, verbose)
    totalResult.errors.push(...result.errors)
    totalResult.warnings.push(...result.warnings)

    // Recurse into subdirectories
    if (metanet.directories) {
      const dirPath = path.dirname(resolvedPath)
      for (const dirDesc of Object.values(metanet.directories)) {
        const subMetanetPath = path.join(dirPath, dirDesc.metanet)
        visit(subMetanetPath)
      }
    }
  }

  visit(rootMetanetPath)
  return totalResult
}

/**
 * Collect all metanet.json data into a flat map for compilation
 */
export function collectMetanetTree(rootMetanetPath: string): Record<string, MetanetJson> {
  const tree: Record<string, MetanetJson> = {}
  const visited = new Set<string>()

  function visit(metanetPath: string) {
    const resolvedPath = path.resolve(metanetPath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return

    const metanet = loadJson<MetanetJson>(resolvedPath)
    if (!metanet) return

    const relPath = path.relative(process.cwd(), resolvedPath)
    tree[relPath] = metanet

    // Recurse into subdirectories
    if (metanet.directories) {
      const dirPath = path.dirname(resolvedPath)
      for (const dirDesc of Object.values(metanet.directories)) {
        const subMetanetPath = path.join(dirPath, dirDesc.metanet)
        visit(subMetanetPath)
      }
    }
  }

  visit(rootMetanetPath)
  return tree
}

// --- Tree compilation types ---

interface MetanetTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  children?: Record<string, MetanetTreeNode>
}

/**
 * Compile all metanet.json files into a hierarchical tree structure.
 *
 * Unlike collectMetanetTree() which produces a flat map keyed by file paths,
 * this function builds a tree where metadata structure is primary
 * and file references are secondary. The tree mirrors the project hierarchy
 * and can be traversed without knowing file paths.
 */
export function compileMetanetTree(rootMetanetPath: string): MetanetTreeNode | null {
  const visited = new Set<string>()

  function visit(metanetPath: string): MetanetTreeNode | null {
    const resolvedPath = path.resolve(metanetPath)
    if (visited.has(resolvedPath)) return null
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return null

    const metanet = loadJson<MetanetJson>(resolvedPath)
    if (!metanet) return null

    const node: MetanetTreeNode = {
      name: metanet.name,
      description: metanet.description,
    }

    if (metanet.version) node.version = metanet.version
    if (metanet.languages) node.languages = metanet.languages
    if (metanet.tags) node.tags = metanet.tags
    if (metanet.files) node.files = metanet.files

    // Recursively build children from directories
    if (metanet.directories) {
      const dirPath = path.dirname(resolvedPath)
      const children: Record<string, MetanetTreeNode> = {}

      for (const [dirName, dirDesc] of Object.entries(metanet.directories)) {
        const subMetanetPath = path.join(dirPath, dirDesc.metanet)
        const childNode = visit(subMetanetPath)
        if (childNode) {
          children[dirName] = childNode
        }
      }

      if (Object.keys(children).length > 0) {
        node.children = children
      }
    }

    return node
  }

  return visit(rootMetanetPath)
}

// --- Main ---

function main() {
  const args = process.argv.slice(2)
  const checkMode = args.includes('--check')
  const verbose = args.includes('--verbose')
  const compileMode = args.includes('--compile')

  const rootMetanetPath = path.resolve('metanet.json')

  // Compile mode: build tree and write to file
  if (compileMode) {
    const compileIndex = args.indexOf('--compile')
    const nextArg = args[compileIndex + 1]
    const hasOutput = nextArg && !nextArg.startsWith('--')
    const outputPath = hasOutput ? nextArg : 'metanet.compiled.json'

    console.log('MetaNet Compiler')
    console.log('================')

    const tree = compileMetanetTree(rootMetanetPath)
    if (!tree) {
      console.error('ERROR: Failed to compile metanet tree')
      process.exit(1)
    }

    fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2) + '\n')
    console.log(`\n✅ Compiled metanet tree written to ${outputPath}`)
    return
  }

  console.log('MetaNet Preprocessor')
  console.log('====================')

  // Load schema
  const schemaPath = path.resolve('metanet.schema.json')
  const schema = loadJson(schemaPath)
  if (!schema) {
    console.error('ERROR: Cannot load metanet.schema.json')
    process.exit(1)
  }

  // Create validator
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema as object)

  // Walk and validate
  const result = walkAndValidate(rootMetanetPath, validate, verbose)

  // Report results
  if (result.errors.length > 0) {
    console.log(`\n❌ Errors (${result.errors.length}):`)
    for (const err of result.errors) {
      console.log(`  ERROR: ${err}`)
    }
  }

  if (result.warnings.length > 0 && verbose) {
    console.log(`\n⚠️  Warnings (${result.warnings.length}):`)
    for (const warn of result.warnings) {
      console.log(`  WARN: ${warn}`)
    }
  }

  const total = result.errors.length + (verbose ? result.warnings.length : 0)
  if (total === 0) {
    console.log('\n✅ All metanet.json files are valid!')
  } else {
    console.log(`\nSummary: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`)
  }

  if (checkMode && result.errors.length > 0) {
    process.exit(1)
  }
}

main()
