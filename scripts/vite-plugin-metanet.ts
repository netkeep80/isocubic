/**
 * Vite Plugin: MetaNet
 *
 * Compiles all metanet.json files into artifacts available at runtime:
 *
 *   import metanet from 'virtual:metanet'         // flat map (Record<path, MetanetEntry>)
 *   import metanetTree from 'virtual:metanet/tree' // hierarchical tree (MetanetTreeNode)
 *
 * The flat map provides backward-compatible access by file path.
 * The tree provides a hierarchical view where metadata structure is primary
 * and file references are secondary information.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plugin } from 'vite'

interface FileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: string
  dependencies?: string[]
}

interface MetanetJson {
  $schema?: string
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  directories?: Record<string, { description: string; metanet: string }>
}

interface MetanetTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  children?: Record<string, MetanetTreeNode>
}

const VIRTUAL_MODULE_ID = 'virtual:metanet'
const VIRTUAL_TREE_MODULE_ID = 'virtual:metanet/tree'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID
const RESOLVED_VIRTUAL_TREE_MODULE_ID = '\0' + VIRTUAL_TREE_MODULE_ID

function loadJson(filePath: string): MetanetJson | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as MetanetJson
  } catch {
    return null
  }
}

/**
 * Recursively collect all metanet.json data into a flat map
 */
function collectMetanetFlat(rootDir: string): Record<string, MetanetJson> {
  const tree: Record<string, MetanetJson> = {}
  const visited = new Set<string>()

  function visit(metanetPath: string) {
    const resolvedPath = path.resolve(metanetPath)
    if (visited.has(resolvedPath)) return
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return

    const metanet = loadJson(resolvedPath)
    if (!metanet) return

    const relPath = path.relative(rootDir, resolvedPath)
    // Remove $schema from compiled output to save space
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema: _, ...data } = metanet
    tree[relPath] = data as MetanetJson

    if (metanet.directories) {
      const dirPath = path.dirname(resolvedPath)
      for (const dirDesc of Object.values(metanet.directories)) {
        const subMetanetPath = path.join(dirPath, dirDesc.metanet)
        visit(subMetanetPath)
      }
    }
  }

  visit(path.join(rootDir, 'metanet.json'))
  return tree
}

/**
 * Compile all metanet.json files into a hierarchical tree.
 * The tree structure makes metadata primary and file paths secondary.
 */
function compileMetanetTree(rootDir: string): MetanetTreeNode | null {
  const visited = new Set<string>()

  function visit(metanetPath: string): MetanetTreeNode | null {
    const resolvedPath = path.resolve(metanetPath)
    if (visited.has(resolvedPath)) return null
    visited.add(resolvedPath)

    if (!fs.existsSync(resolvedPath)) return null

    const metanet = loadJson(resolvedPath)
    if (!metanet) return null

    const node: MetanetTreeNode = {
      name: metanet.name,
      description: metanet.description,
    }

    if (metanet.version) node.version = metanet.version
    if (metanet.languages) node.languages = metanet.languages
    if (metanet.tags) node.tags = metanet.tags
    if (metanet.files) node.files = metanet.files

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

  return visit(path.join(rootDir, 'metanet.json'))
}

/**
 * Vite plugin that provides metanet data at runtime
 */
export default function metanetPlugin(): Plugin {
  let rootDir: string

  return {
    name: 'vite-plugin-metanet',

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
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const flat = collectMetanetFlat(rootDir)
        return `export default ${JSON.stringify(flat, null, 0)};`
      }
      if (id === RESOLVED_VIRTUAL_TREE_MODULE_ID) {
        const tree = compileMetanetTree(rootDir)
        return `export default ${JSON.stringify(tree, null, 0)};`
      }
    },
  }
}
