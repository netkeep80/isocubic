/**
 * Vite Plugin: MetaMode
 *
 * Compiles all metamode.json files into artifacts available at runtime:
 *
 *   import metamode from 'virtual:metamode'         // flat map (Record<path, MetamodeEntry>)
 *   import metamodeTree from 'virtual:metamode/tree' // hierarchical tree (MetamodeTreeNode)
 *   import metamodeAI from 'virtual:metamode/ai'    // AI-optimized tree (TASK 74)
 *
 * The flat map provides backward-compatible access by file path.
 * The tree provides a hierarchical view where metadata structure is primary
 * and file references are secondary information.
 * The AI module provides a token-optimized format for AI agents (TASK 74).
 *
 * TASK 75: Added inline metamode extraction support
 * Inline metadata in Vue components has higher priority than file-based metamode.json
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plugin } from 'vite'
import {
  extractInlineMetamodeFromVue,
  normalizeInlineMetamode,
  type InlineMetamode,
} from './metamode-inline-extractor'

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
  directories?: Record<string, { description: string; metamode: string }>
}

interface MetamodeTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  children?: Record<string, MetamodeTreeNode>
}

// AI-optimized types (TASK 74)
interface AIFileDescriptor {
  desc: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'exp' | 'dep'
  deps?: string[]
  ai?: string
}

interface AIMetamodeTreeNode {
  name: string
  desc: string
  ver?: string
  lang?: string[]
  tags?: string[]
  ai?: string
  files?: Record<string, AIFileDescriptor>
  children?: Record<string, AIMetamodeTreeNode>
}

const VIRTUAL_MODULE_ID = 'virtual:metamode'
const VIRTUAL_TREE_MODULE_ID = 'virtual:metamode/tree'
const VIRTUAL_AI_MODULE_ID = 'virtual:metamode/ai'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID
const RESOLVED_VIRTUAL_TREE_MODULE_ID = '\0' + VIRTUAL_TREE_MODULE_ID
const RESOLVED_VIRTUAL_AI_MODULE_ID = '\0' + VIRTUAL_AI_MODULE_ID

function loadJson(filePath: string): MetamodeJson | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as MetamodeJson
  } catch {
    return null
  }
}

/**
 * Convert inline metamode format to file descriptor format (TASK 75)
 */
function inlineToFileDescriptor(inline: InlineMetamode): FileDescriptor {
  const result: FileDescriptor = {
    description: inline.desc || '',
  }

  if (inline.tags && inline.tags.length > 0) result.tags = inline.tags
  if (inline.phase !== undefined) result.phase = inline.phase
  if (inline.status) {
    // Map short status to full name for backward compatibility
    const statusMap: Record<string, string> = {
      exp: 'experimental',
      dep: 'deprecated',
      stable: 'stable',
      beta: 'beta',
    }
    result.status = statusMap[inline.status] || inline.status
  }
  if (inline.deps && inline.deps.length > 0) result.dependencies = inline.deps

  return result
}

/**
 * Scan directory for Vue files with inline metamode (TASK 75)
 * Returns a map of filename -> inline metadata
 */
function scanDirectoryForInlineMetamode(dirPath: string): Record<string, InlineMetamode> {
  const result: Record<string, InlineMetamode> = {}

  if (!fs.existsSync(dirPath)) {
    return result
  }

  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.vue')) {
        const fullPath = path.join(dirPath, entry.name)
        const extracted = extractInlineMetamodeFromVue(fullPath)
        if (extracted) {
          result[entry.name] = normalizeInlineMetamode(extracted.metadata)
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return result
}

/**
 * Merge file-based metamode with inline metadata (TASK 75)
 * Inline metadata has higher priority
 */
function mergeWithInlineMetamode(metamode: MetamodeJson, dirPath: string): MetamodeJson {
  const inlineMetadata = scanDirectoryForInlineMetamode(dirPath)

  if (Object.keys(inlineMetadata).length === 0) {
    return metamode
  }

  // Create a copy to avoid mutation
  const merged: MetamodeJson = { ...metamode }
  merged.files = { ...metamode.files }

  // Merge inline metadata (higher priority)
  for (const [filename, inline] of Object.entries(inlineMetadata)) {
    const fileDescriptor = inlineToFileDescriptor(inline)

    if (merged.files?.[filename]) {
      // Merge with existing: inline fields override file-based
      merged.files[filename] = {
        ...merged.files[filename],
        ...fileDescriptor,
      }
    } else {
      // Add new entry from inline
      if (!merged.files) merged.files = {}
      merged.files[filename] = fileDescriptor
    }
  }

  return merged
}

/**
 * Recursively collect all metamode.json data into a flat map
 * Includes inline metamode extraction (TASK 75)
 */
function collectMetamodeFlat(rootDir: string): Record<string, MetamodeJson> {
  const tree: Record<string, MetamodeJson> = {}
  const visited = new Set<string>()

  function visit(metamodePath: string) {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return

    const metamode = loadJson(resolvedPath)
    if (!metamode) return

    const dirPath = path.dirname(resolvedPath)
    const relPath = path.relative(rootDir, resolvedPath)

    // Merge with inline metadata (TASK 75)
    const merged = mergeWithInlineMetamode(metamode, dirPath)

    // Remove $schema from compiled output to save space
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema: _, ...data } = merged
    tree[relPath] = data as MetamodeJson

    if (metamode.directories) {
      for (const dirDesc of Object.values(metamode.directories)) {
        const subMetamodePath = path.join(dirPath, dirDesc.metamode)
        visit(subMetamodePath)
      }
    }
  }

  visit(path.join(rootDir, 'metamode.json'))
  return tree
}

/**
 * Compile all metamode.json files into a hierarchical tree.
 * The tree structure makes metadata primary and file paths secondary.
 * Includes inline metamode extraction (TASK 75)
 */
function compileMetamodeTree(rootDir: string): MetamodeTreeNode | null {
  const visited = new Set<string>()

  function visit(metamodePath: string): MetamodeTreeNode | null {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return null
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return null

    const metamode = loadJson(resolvedPath)
    if (!metamode) return null

    const dirPath = path.dirname(resolvedPath)

    // Merge with inline metadata (TASK 75)
    const merged = mergeWithInlineMetamode(metamode, dirPath)

    const node: MetamodeTreeNode = {
      name: merged.name,
      description: merged.description,
    }

    if (merged.version) node.version = merged.version
    if (merged.languages) node.languages = merged.languages
    if (merged.tags) node.tags = merged.tags
    if (merged.files) node.files = merged.files

    if (metamode.directories) {
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

  return visit(path.join(rootDir, 'metamode.json'))
}

// AI optimization utilities (TASK 74)
const STATUS_MAP: Record<string, 'stable' | 'beta' | 'exp' | 'dep'> = {
  stable: 'stable',
  beta: 'beta',
  experimental: 'exp',
  deprecated: 'dep',
}

/**
 * Generate an AI summary from a description (max 100 chars)
 */
function generateAISummary(description: string, maxLength: number = 100): string {
  let summary = description
    .replace(/^(The |A |An |This |It )/i, '')
    .replace(/ for the isocubic application/gi, '')
    .replace(/ for isocubic/gi, '')
    .replace(/ component$/gi, '')
    .replace(/ module$/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (summary.length > maxLength) {
    summary = summary.substring(0, maxLength - 3).trim() + '...'
  }

  return summary
}

/**
 * Convert a file descriptor to AI-optimized format
 */
function convertFileToAI(file: FileDescriptor): AIFileDescriptor {
  const result: AIFileDescriptor = {
    desc: file.description,
  }

  if (file.tags && file.tags.length > 0) result.tags = file.tags
  if (file.phase !== undefined) result.phase = file.phase
  if (file.status)
    result.status = STATUS_MAP[file.status] || (file.status as 'stable' | 'beta' | 'exp' | 'dep')
  if (file.dependencies && file.dependencies.length > 0) result.deps = file.dependencies
  if (file.description.length > 50) result.ai = generateAISummary(file.description, 80)

  return result
}

/**
 * Compile AI-optimized metamode tree for AI agents (TASK 74)
 * Uses shortened field names and auto-generated AI summaries
 * Includes inline metamode extraction (TASK 75)
 */
function compileAIMetamodeTree(rootDir: string): AIMetamodeTreeNode | null {
  const visited = new Set<string>()

  function visit(metamodePath: string): AIMetamodeTreeNode | null {
    const resolvedPath = path.resolve(metamodePath)
    if (visited.has(resolvedPath)) return null
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return null

    const metamode = loadJson(resolvedPath)
    if (!metamode) return null

    const dirPath = path.dirname(resolvedPath)

    // Merge with inline metadata (TASK 75)
    const merged = mergeWithInlineMetamode(metamode, dirPath)

    const node: AIMetamodeTreeNode = {
      name: merged.name,
      desc: merged.description,
    }

    if (merged.version) node.ver = merged.version
    if (merged.languages) node.lang = merged.languages
    if (merged.tags) node.tags = merged.tags
    if (merged.description.length > 30) node.ai = generateAISummary(merged.description, 150)

    // Convert files to AI format
    if (merged.files && Object.keys(merged.files).length > 0) {
      node.files = {}
      for (const [filename, file] of Object.entries(merged.files)) {
        node.files[filename] = convertFileToAI(file)
      }
    }

    // Recursively build children
    if (metamode.directories) {
      const children: Record<string, AIMetamodeTreeNode> = {}

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

  return visit(path.join(rootDir, 'metamode.json'))
}

/**
 * Vite plugin that provides metamode data at runtime
 */
export default function metamodePlugin(): Plugin {
  let rootDir: string

  return {
    name: 'vite-plugin-metamode',

    configResolved(config) {
      rootDir = config.root
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) {
        return RESOLVED_VIRTUAL_MODULE_ID
      }
      if (id === VIRTUAL_TREE_MODULE_ID) {
        return RESOLVED_VIRTUAL_TREE_MODULE_ID
      }
      if (id === VIRTUAL_AI_MODULE_ID) {
        return RESOLVED_VIRTUAL_AI_MODULE_ID
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const flat = collectMetamodeFlat(rootDir)
        return `export default ${JSON.stringify(flat, null, 0)};`
      }
      if (id === RESOLVED_VIRTUAL_TREE_MODULE_ID) {
        const tree = compileMetamodeTree(rootDir)
        return `export default ${JSON.stringify(tree, null, 0)};`
      }
      if (id === RESOLVED_VIRTUAL_AI_MODULE_ID) {
        const aiTree = compileAIMetamodeTree(rootDir)
        return `export default ${JSON.stringify(aiTree, null, 0)};`
      }
    },
  }
}
