/**
 * MetaMode AI Optimizer
 *
 * Converts metamode.json files to AI-optimized compact format.
 * This utility generates a representation optimized for AI agents with:
 *
 * 1. Shortened field names to reduce token usage
 * 2. Auto-generated AI summaries for quick context
 * 3. Removal of redundant information
 * 4. Compact representation of directory references
 *
 * TASK 74: Optimization of metamode.json for AI (Phase 12)
 *
 * Usage:
 *   npx tsx scripts/metamode-ai-optimizer.ts [--output file.json] [--analyze]
 *
 * Options:
 *   --output [file]  Output file for AI-optimized format (default: metamode.ai.json)
 *   --analyze        Analyze token usage and show statistics
 *   --verbose        Show detailed conversion information
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// --- Types for current (verbose) format ---

interface FileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'experimental' | 'deprecated'
  dependencies?: string[]
}

interface DirectoryDescriptor {
  description: string
  metamode?: string
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

// --- Types for AI-optimized (compact) format ---

/**
 * AI-optimized file descriptor with shortened field names
 */
export interface AIFileDescriptor {
  /** Description (shortened from 'description') */
  desc: string
  /** Tags for categorization */
  tags?: string[]
  /** Development phase */
  phase?: number
  /** Status: stable, beta, exp (experimental), dep (deprecated) */
  status?: 'stable' | 'beta' | 'exp' | 'dep'
  /** Dependencies (shortened from 'dependencies') */
  deps?: string[]
  /** AI summary for quick context (max 100 chars) */
  ai?: string
}

/**
 * AI-optimized directory descriptor
 * Can be either a string (short form) or object (full form)
 */
export type AIDirectoryDescriptor =
  | string
  | {
      desc: string
      tags?: string[]
      ai?: string
    }

/**
 * AI-optimized metamode entry
 */
export interface AIMetamodeEntry {
  /** Name of the module/directory */
  name: string
  /** Semantic version (shortened from 'version') */
  ver?: string
  /** Description (shortened from 'description') */
  desc: string
  /** Programming languages (shortened from 'languages') */
  lang?: string[]
  /** Tags for categorization */
  tags?: string[]
  /** AI summary for quick context (max 200 chars) */
  ai?: string
  /** File descriptors */
  files?: Record<string, AIFileDescriptor>
  /** Directory descriptors (shortened from 'directories') */
  dirs?: Record<string, AIDirectoryDescriptor>
}

/**
 * AI-optimized tree node
 */
export interface AIMetamodeTreeNode {
  /** Name of the module/directory */
  name: string
  /** Description */
  desc: string
  /** Semantic version */
  ver?: string
  /** Programming languages */
  lang?: string[]
  /** Tags */
  tags?: string[]
  /** AI summary */
  ai?: string
  /** File descriptors */
  files?: Record<string, AIFileDescriptor>
  /** Child nodes */
  children?: Record<string, AIMetamodeTreeNode>
}

/**
 * Token analysis result
 */
export interface TokenAnalysis {
  originalSize: number
  optimizedSize: number
  savingsBytes: number
  savingsPercent: number
  fileCount: number
  directoryCount: number
  totalDescriptions: number
  averageDescriptionLength: number
}

// --- Status mapping ---

const STATUS_MAP: Record<string, 'stable' | 'beta' | 'exp' | 'dep'> = {
  stable: 'stable',
  beta: 'beta',
  experimental: 'exp',
  deprecated: 'dep',
}

const STATUS_REVERSE_MAP: Record<string, 'stable' | 'beta' | 'experimental' | 'deprecated'> = {
  stable: 'stable',
  beta: 'beta',
  exp: 'experimental',
  dep: 'deprecated',
}

// --- Utility functions ---

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
 * Generate an AI summary from a description
 * Truncates to max length and adds ellipsis if needed
 */
export function generateAISummary(description: string, maxLength: number = 100): string {
  // Remove common filler words and phrases for more compact summary
  let summary = description
    .replace(/^(The |A |An |This |It )/i, '')
    .replace(/ for the isocubic application/gi, '')
    .replace(/ for isocubic/gi, '')
    .replace(/ component$/gi, '')
    .replace(/ module$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  // Truncate if needed
  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3).trim() + '...'
  }

  return summary
}

/**
 * Convert a verbose file descriptor to AI-optimized format
 */
export function convertFileDescriptor(file: FileDescriptor): AIFileDescriptor {
  const result: AIFileDescriptor = {
    desc: file.description,
  }

  if (file.tags && file.tags.length > 0) {
    result.tags = file.tags
  }

  if (file.phase !== undefined) {
    result.phase = file.phase
  }

  if (file.status) {
    result.status = STATUS_MAP[file.status] || (file.status as 'stable' | 'beta' | 'exp' | 'dep')
  }

  if (file.dependencies && file.dependencies.length > 0) {
    result.deps = file.dependencies
  }

  // Generate AI summary if description is long enough
  if (file.description.length > 50) {
    result.ai = generateAISummary(file.description, 80)
  }

  return result
}

/**
 * Convert verbose metamode entry to AI-optimized format
 */
export function convertToAIFormat(metamode: MetamodeJson): AIMetamodeEntry {
  const result: AIMetamodeEntry = {
    name: metamode.name,
    desc: metamode.description,
  }

  if (metamode.version) {
    result.ver = metamode.version
  }

  if (metamode.languages && metamode.languages.length > 0) {
    result.lang = metamode.languages
  }

  if (metamode.tags && metamode.tags.length > 0) {
    result.tags = metamode.tags
  }

  // Generate AI summary for root description
  if (metamode.description.length > 30) {
    result.ai = generateAISummary(metamode.description, 150)
  }

  // Convert files
  if (metamode.files && Object.keys(metamode.files).length > 0) {
    result.files = {}
    for (const [filename, file] of Object.entries(metamode.files)) {
      result.files[filename] = convertFileDescriptor(file)
    }
  }

  // Convert directories to compact format
  if (metamode.directories && Object.keys(metamode.directories).length > 0) {
    result.dirs = {}
    for (const [dirname, dir] of Object.entries(metamode.directories)) {
      // Use short form if only description is present
      result.dirs[dirname] = dir.description
    }
  }

  return result
}

/**
 * Convert AI-optimized format back to verbose format
 */
export function convertFromAIFormat(ai: AIMetamodeEntry, schemaPath?: string): MetamodeJson {
  const result: MetamodeJson = {
    name: ai.name,
    description: ai.desc,
  }

  if (schemaPath) {
    result.$schema = schemaPath
  }

  if (ai.ver) {
    result.version = ai.ver
  }

  if (ai.lang && ai.lang.length > 0) {
    result.languages = ai.lang
  }

  if (ai.tags && ai.tags.length > 0) {
    result.tags = ai.tags
  }

  // Convert files
  if (ai.files && Object.keys(ai.files).length > 0) {
    result.files = {}
    for (const [filename, file] of Object.entries(ai.files)) {
      result.files[filename] = {
        description: file.desc,
      }
      if (file.tags) {
        result.files[filename].tags = file.tags
      }
      if (file.phase !== undefined) {
        result.files[filename].phase = file.phase
      }
      if (file.status) {
        result.files[filename].status = STATUS_REVERSE_MAP[file.status] || file.status
      }
      if (file.deps) {
        result.files[filename].dependencies = file.deps
      }
    }
  }

  // Convert directories
  if (ai.dirs && Object.keys(ai.dirs).length > 0) {
    result.directories = {}
    for (const [dirname, dir] of Object.entries(ai.dirs)) {
      if (typeof dir === 'string') {
        result.directories[dirname] = {
          description: dir,
          metamode: `${dirname}/metamode.json`,
        }
      } else {
        result.directories[dirname] = {
          description: dir.desc,
          metamode: `${dirname}/metamode.json`,
        }
      }
    }
  }

  return result
}

/**
 * Recursively collect and convert all metamode.json files to AI format
 */
export function collectAIOptimizedTree(rootMetamodePath: string): Record<string, AIMetamodeEntry> {
  const tree: Record<string, AIMetamodeEntry> = {}
  const visited = new Set<string>()

  function visit(metamodePath: string) {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return

    const metamode = loadJson<MetamodeJson>(resolvedPath)
    if (!metamode) return

    const relPath = path.relative(process.cwd(), resolvedPath)
    tree[relPath] = convertToAIFormat(metamode)

    // Recurse into subdirectories
    if (metamode.directories) {
      const dirPath = path.dirname(resolvedPath)
      for (const [dirName, dirDesc] of Object.entries(metamode.directories)) {
        // Auto-infer metamode path if not specified
        const metamodePath = dirDesc.metamode || `${dirName}/metamode.json`
        const subMetamodePath = path.join(dirPath, metamodePath)
        visit(subMetamodePath)
      }
    }
  }

  visit(rootMetamodePath)
  return tree
}

/**
 * Compile AI-optimized tree structure
 */
export function compileAIOptimizedTree(rootMetamodePath: string): AIMetamodeTreeNode | null {
  const visited = new Set<string>()

  function visit(metamodePath: string): AIMetamodeTreeNode | null {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return null
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return null

    const metamode = loadJson<MetamodeJson>(resolvedPath)
    if (!metamode) return null

    const aiEntry = convertToAIFormat(metamode)
    const node: AIMetamodeTreeNode = {
      name: aiEntry.name,
      desc: aiEntry.desc,
    }

    if (aiEntry.ver) node.ver = aiEntry.ver
    if (aiEntry.lang) node.lang = aiEntry.lang
    if (aiEntry.tags) node.tags = aiEntry.tags
    if (aiEntry.ai) node.ai = aiEntry.ai
    if (aiEntry.files) node.files = aiEntry.files

    // Recursively build children
    if (metamode.directories) {
      const dirPath = path.dirname(resolvedPath)
      const children: Record<string, AIMetamodeTreeNode> = {}

      for (const [dirName, dirDesc] of Object.entries(metamode.directories)) {
        // Auto-infer metamode path if not specified
        const metamodePath = dirDesc.metamode || `${dirName}/metamode.json`
        const subMetamodePath = path.join(dirPath, metamodePath)
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

/**
 * Analyze token usage between original and optimized formats
 */
export function analyzeTokenUsage(rootMetamodePath: string): TokenAnalysis {
  const visited = new Set<string>()
  let originalSize = 0
  let optimizedSize = 0
  let fileCount = 0
  let directoryCount = 0
  let totalDescriptions = 0
  let totalDescriptionLength = 0

  function visit(metamodePath: string) {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return

    const content = fs.readFileSync(resolvedPath, 'utf-8')
    originalSize += content.length

    const metamode = loadJson<MetamodeJson>(resolvedPath)
    if (!metamode) return

    // Count descriptions
    totalDescriptions++
    totalDescriptionLength += metamode.description.length

    if (metamode.files) {
      fileCount += Object.keys(metamode.files).length
      for (const file of Object.values(metamode.files)) {
        totalDescriptions++
        totalDescriptionLength += file.description.length
      }
    }

    if (metamode.directories) {
      directoryCount += Object.keys(metamode.directories).length
      for (const dir of Object.values(metamode.directories)) {
        totalDescriptions++
        totalDescriptionLength += dir.description.length
      }
    }

    // Calculate optimized size
    const aiEntry = convertToAIFormat(metamode)
    optimizedSize += JSON.stringify(aiEntry).length

    // Recurse into subdirectories
    if (metamode.directories) {
      const dirPath = path.dirname(resolvedPath)
      for (const [dirName, dirDesc] of Object.entries(metamode.directories)) {
        // Auto-infer metamode path if not specified
        const metamodePath = dirDesc.metamode || `${dirName}/metamode.json`
        const subMetamodePath = path.join(dirPath, metamodePath)
        visit(subMetamodePath)
      }
    }
  }

  visit(rootMetamodePath)

  const savingsBytes = originalSize - optimizedSize
  const savingsPercent = originalSize > 0 ? (savingsBytes / originalSize) * 100 : 0
  const averageDescriptionLength =
    totalDescriptions > 0 ? Math.round(totalDescriptionLength / totalDescriptions) : 0

  return {
    originalSize,
    optimizedSize,
    savingsBytes,
    savingsPercent,
    fileCount,
    directoryCount,
    totalDescriptions,
    averageDescriptionLength,
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// --- Main ---

function main() {
  const args = process.argv.slice(2)
  const analyzeMode = args.includes('--analyze')
  const verbose = args.includes('--verbose')

  const outputIndex = args.indexOf('--output')
  const outputPath =
    outputIndex !== -1 && args[outputIndex + 1] ? args[outputIndex + 1] : 'metamode.ai.json'

  const rootMetamodePath = path.resolve('metamode.json')

  console.log('MetaMode AI Optimizer')
  console.log('=====================')
  console.log('')

  // Analyze mode
  if (analyzeMode) {
    console.log('📊 Analyzing token usage...')
    console.log('')

    const analysis = analyzeTokenUsage(rootMetamodePath)

    console.log('Token Usage Analysis:')
    console.log('---------------------')
    console.log(`  Original size:      ${formatBytes(analysis.originalSize)}`)
    console.log(`  Optimized size:     ${formatBytes(analysis.optimizedSize)}`)
    console.log(
      `  Savings:            ${formatBytes(analysis.savingsBytes)} (${analysis.savingsPercent.toFixed(1)}%)`
    )
    console.log('')
    console.log('Content Statistics:')
    console.log('-------------------')
    console.log(`  Total files:        ${analysis.fileCount}`)
    console.log(`  Total directories:  ${analysis.directoryCount}`)
    console.log(`  Total descriptions: ${analysis.totalDescriptions}`)
    console.log(`  Avg desc length:    ${analysis.averageDescriptionLength} chars`)
    console.log('')

    return
  }

  // Compile mode (default)
  console.log(`📦 Compiling AI-optimized metamode...`)

  if (verbose) {
    console.log(`  Reading from: ${rootMetamodePath}`)
  }

  const tree = compileAIOptimizedTree(rootMetamodePath)
  if (!tree) {
    console.error('ERROR: Failed to compile AI-optimized tree')
    process.exit(1)
  }

  const output = JSON.stringify(tree, null, 2) + '\n'
  fs.writeFileSync(outputPath, output)

  console.log(`✅ AI-optimized metamode written to ${outputPath}`)

  // Show savings
  const analysis = analyzeTokenUsage(rootMetamodePath)
  console.log(
    `   Savings: ${analysis.savingsPercent.toFixed(1)}% (${formatBytes(analysis.savingsBytes)})`
  )
}

// Run if executed directly
if (process.argv[1]?.includes('metamode-ai-optimizer')) {
  main()
}
