/**
 * Vite Plugin: MetaMode
 *
 * Compiles all metamode.json files into artifacts available at runtime:
 *
 *   import metamode from 'virtual:metamode'         // flat map (Record<path, MetamodeEntry>)
 *   import metamodeTree from 'virtual:metamode/tree' // hierarchical tree (MetamodeTreeNode)
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

const VIRTUAL_MODULE_ID = 'virtual:metamode'
const VIRTUAL_TREE_MODULE_ID = 'virtual:metamode/tree'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID
const RESOLVED_VIRTUAL_TREE_MODULE_ID = '\0' + VIRTUAL_TREE_MODULE_ID

function loadJson(filePath: string): MetamodeJson | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as MetamodeJson
  } catch {
    return null
  }
}

/**
 * Recursively collect all metamode.json data into a flat map
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

    const relPath = path.relative(rootDir, resolvedPath)
    // Remove $schema from compiled output to save space
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { $schema: _, ...data } = metamode
    tree[relPath] = data as MetamodeJson

    if (metamode.directories) {
      const dirPath = path.dirname(resolvedPath)
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

    const node: MetamodeTreeNode = {
      name: metamode.name,
      description: metamode.description,
    }

    if (metamode.version) node.version = metamode.version
    if (metamode.languages) node.languages = metamode.languages
    if (metamode.tags) node.tags = metamode.tags
    if (metamode.files) node.files = metamode.files

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
    },
  }
}
