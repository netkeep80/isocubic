/**
 * MetaMode Preprocessor
 *
 * Validates metamode.json files against the schema and checks that:
 * 1. All metamode.json files conform to metamode.schema.json
 * 2. Referenced files exist on disk
 * 3. Referenced subdirectory metamode.json files exist
 * 4. Files in directories are described (sync check, warnings only)
 *
 * Usage:
 *   npx tsx scripts/metamode-preprocessor.ts [--check] [--verbose] [--compile [output]]
 *
 * Options:
 *   --check            Exit with non-zero code if any errors found (for CI)
 *   --verbose          Print detailed information about each metamode.json
 *   --compile [output] Compile metamode tree to JSON file (default: metamode.compiled.json)
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
  metamode: string
}

interface MetamodeJson {
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
  'metamode.json',
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
 * Validate a single metamode.json file
 */
function validateMetamodeFile(
  metamodePath: string,
  metamode: MetamodeJson,
  schemaValidator: Ajv.ValidateFunction,
  verbose: boolean
): ValidationResult {
  const result: ValidationResult = { errors: [], warnings: [] }
  const dirPath = path.dirname(metamodePath)
  const relPath = path.relative(process.cwd(), metamodePath)

  if (verbose) {
    console.log(`\n  Checking: ${relPath}`)
  }

  // 1. Schema validation
  const valid = schemaValidator(metamode)
  if (!valid && schemaValidator.errors) {
    for (const err of schemaValidator.errors) {
      result.errors.push(`${relPath}: Schema error at ${err.instancePath}: ${err.message}`)
    }
  }

  // 2. Check that referenced files exist
  if (metamode.files) {
    for (const fileName of Object.keys(metamode.files)) {
      const filePath = path.join(dirPath, fileName)
      if (!fs.existsSync(filePath)) {
        result.errors.push(`${relPath}: Referenced file does not exist: ${fileName}`)
      }
    }
  }

  // 3. Check that referenced subdirectory metamode.json files exist
  if (metamode.directories) {
    for (const [dirName, dirDesc] of Object.entries(metamode.directories)) {
      const subDirPath = path.join(dirPath, dirName)
      if (!fs.existsSync(subDirPath)) {
        result.errors.push(`${relPath}: Referenced directory does not exist: ${dirName}`)
        continue
      }
      const subMetamodePath = path.join(dirPath, dirDesc.metamode)
      if (!fs.existsSync(subMetamodePath)) {
        result.errors.push(
          `${relPath}: Referenced metamode.json does not exist: ${dirDesc.metamode}`
        )
      }
    }
  }

  // 4. Sync check: find files on disk not described in metamode.json
  const actualFiles = getDirectoryFiles(dirPath)
  const describedFiles = new Set(Object.keys(metamode.files || {}))
  for (const file of actualFiles) {
    if (!describedFiles.has(file)) {
      result.warnings.push(`${relPath}: File not described in metamode.json: ${file}`)
    }
  }

  // 5. Sync check: find subdirectories not referenced in metamode.json
  const actualDirs = getSubdirectories(dirPath)
  const describedDirs = new Set(Object.keys(metamode.directories || {}))
  for (const dir of actualDirs) {
    if (!describedDirs.has(dir)) {
      result.warnings.push(`${relPath}: Directory not referenced in metamode.json: ${dir}`)
    }
  }

  return result
}

/**
 * Recursively find and validate all metamode.json files starting from root
 */
function walkAndValidate(
  rootMetamodePath: string,
  schemaValidator: Ajv.ValidateFunction,
  verbose: boolean
): ValidationResult {
  const totalResult: ValidationResult = { errors: [], warnings: [] }
  const visited = new Set<string>()

  function visit(metamodePath: string) {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) {
      totalResult.errors.push(`metamode.json not found: ${metamodePath}`)
      return
    }

    const metamode = loadJson<MetamodeJson>(resolvedPath)
    if (!metamode) {
      totalResult.errors.push(`Failed to parse: ${metamodePath}`)
      return
    }

    const result = validateMetamodeFile(resolvedPath, metamode, schemaValidator, verbose)
    totalResult.errors.push(...result.errors)
    totalResult.warnings.push(...result.warnings)

    // Recurse into subdirectories
    if (metamode.directories) {
      const dirPath = path.dirname(resolvedPath)
      for (const dirDesc of Object.values(metamode.directories)) {
        const subMetamodePath = path.join(dirPath, dirDesc.metamode)
        visit(subMetamodePath)
      }
    }
  }

  visit(rootMetamodePath)
  return totalResult
}

/**
 * Collect all metamode.json data into a flat map for compilation
 */
export function collectMetamodeTree(rootMetamodePath: string): Record<string, MetamodeJson> {
  const tree: Record<string, MetamodeJson> = {}
  const visited = new Set<string>()

  function visit(metamodePath: string) {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return

    const metamode = loadJson<MetamodeJson>(resolvedPath)
    if (!metamode) return

    const relPath = path.relative(process.cwd(), resolvedPath)
    tree[relPath] = metamode

    // Recurse into subdirectories
    if (metamode.directories) {
      const dirPath = path.dirname(resolvedPath)
      for (const dirDesc of Object.values(metamode.directories)) {
        const subMetamodePath = path.join(dirPath, dirDesc.metamode)
        visit(subMetamodePath)
      }
    }
  }

  visit(rootMetamodePath)
  return tree
}

// --- Tree compilation types ---

interface MetamodeTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  children?: Record<string, MetamodeTreeNode>
}

/**
 * Compile all metamode.json files into a hierarchical tree structure.
 *
 * Unlike collectMetamodeTree() which produces a flat map keyed by file paths,
 * this function builds a tree where metadata structure is primary
 * and file references are secondary. The tree mirrors the project hierarchy
 * and can be traversed without knowing file paths.
 */
export function compileMetamodeTree(rootMetamodePath: string): MetamodeTreeNode | null {
  const visited = new Set<string>()

  function visit(metamodePath: string): MetamodeTreeNode | null {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return null
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return null

    const metamode = loadJson<MetamodeJson>(resolvedPath)
    if (!metamode) return null

    const node: MetamodeTreeNode = {
      name: metamode.name,
      description: metamode.description,
    }

    if (metamode.version) node.version = metamode.version
    if (metamode.languages) node.languages = metamode.languages
    if (metamode.tags) node.tags = metamode.tags
    if (metamode.files) node.files = metamode.files

    // Recursively build children from directories
    if (metamode.directories) {
      const dirPath = path.dirname(resolvedPath)
      const children: Record<string, MetamodeTreeNode> = {}

      for (const [dirName, dirDesc] of Object.entries(metamode.directories)) {
        const subMetamodePath = path.join(dirPath, dirDesc.metamode)
        const childNode = visit(subMetamodePath)
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

  return visit(rootMetamodePath)
}

// --- Main ---

function main() {
  const args = process.argv.slice(2)
  const checkMode = args.includes('--check')
  const verbose = args.includes('--verbose')
  const compileMode = args.includes('--compile')

  const rootMetamodePath = path.resolve('metamode.json')

  // Compile mode: build tree and write to file
  if (compileMode) {
    const compileIndex = args.indexOf('--compile')
    const nextArg = args[compileIndex + 1]
    const hasOutput = nextArg && !nextArg.startsWith('--')
    const outputPath = hasOutput ? nextArg : 'metamode.compiled.json'

    console.log('MetaMode Compiler')
    console.log('=================')

    const tree = compileMetamodeTree(rootMetamodePath)
    if (!tree) {
      console.error('ERROR: Failed to compile metamode tree')
      process.exit(1)
    }

    fs.writeFileSync(outputPath, JSON.stringify(tree, null, 2) + '\n')
    console.log(`\n✅ Compiled metamode tree written to ${outputPath}`)
    return
  }

  console.log('MetaMode Preprocessor')
  console.log('=====================')

  // Load schema
  const schemaPath = path.resolve('metamode.schema.json')
  const schema = loadJson(schemaPath)
  if (!schema) {
    console.error('ERROR: Cannot load metamode.schema.json')
    process.exit(1)
  }

  // Create validator
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema as object)

  // Walk and validate
  const result = walkAndValidate(rootMetamodePath, validate, verbose)

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
    console.log('\n✅ All metamode.json files are valid!')
  } else {
    console.log(`\nSummary: ${result.errors.length} error(s), ${result.warnings.length} warning(s)`)
  }

  if (checkMode && result.errors.length > 0) {
    process.exit(1)
  }
}

main()
