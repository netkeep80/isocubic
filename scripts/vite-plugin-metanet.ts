/**
 * Vite Plugin: MetaNet
 *
 * Compiles all metanet.json files into a single JSON artifact that gets
 * included in the production build, ensuring metanet data is available at runtime.
 *
 * The compiled metanet tree is accessible via:
 *   import metanet from 'virtual:metanet'
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plugin } from 'vite'

interface MetanetJson {
  $schema?: string
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<
    string,
    {
      description: string
      tags?: string[]
      phase?: number
      status?: string
      dependencies?: string[]
    }
  >
  directories?: Record<string, { description: string; metanet: string }>
}

const VIRTUAL_MODULE_ID = 'virtual:metanet'
const RESOLVED_VIRTUAL_MODULE_ID = '\0' + VIRTUAL_MODULE_ID

/**
 * Recursively collect all metanet.json data into a flat map
 */
function collectMetanetTree(rootDir: string): Record<string, MetanetJson> {
  const tree: Record<string, MetanetJson> = {}
  const visited = new Set<string>()

  function loadJson(filePath: string): MetanetJson | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content) as MetanetJson
    } catch {
      return null
    }
  }

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
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        const tree = collectMetanetTree(rootDir)
        return `export default ${JSON.stringify(tree, null, 0)};`
      }
    },
  }
}
