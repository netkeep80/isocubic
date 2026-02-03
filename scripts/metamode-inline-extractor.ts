/**
 * MetaMode Inline Extractor (TASK 75)
 *
 * Extracts metamode metadata from Vue SFC files.
 * Supports two formats:
 *
 * 1. JSDoc @metamode comment block:
 *    /**
 *     * @metamode
 *     * desc: Description of the component
 *     * status: stable
 *     * phase: 5
 *     * tags: [editor, ui]
 *     * ai: Brief AI summary
 *     *\/
 *
 * 2. Object declaration:
 *    const metamode = {
 *      desc: 'Description',
 *      status: 'stable',
 *      phase: 5,
 *      tags: ['editor', 'ui'],
 *      ai: 'Brief AI summary'
 *    }
 *
 * Priority: JSDoc @metamode > const metamode > file-based metamode.json
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

// --- Types ---

export interface InlineMetamode {
  desc?: string
  description?: string // alias for desc (backward compat)
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'experimental' | 'deprecated' | 'exp' | 'dep'
  deps?: string[]
  dependencies?: string[] // alias for deps (backward compat)
  ai?: string
}

export interface ExtractedInlineMetamode {
  /** Normalized metadata (uses short field names) */
  metadata: InlineMetamode
  /** Source of extraction: 'jsdoc' | 'object' */
  source: 'jsdoc' | 'object'
  /** Original raw content for debugging */
  raw: string
}

// --- Extraction Functions ---

/**
 * Extract @metamode JSDoc block from script content
 */
function extractJSDocMetamode(scriptContent: string): ExtractedInlineMetamode | null {
  // Match /** @metamode ... */ pattern
  const jsdocPattern = /\/\*\*[\s\S]*?@metamode[\s\S]*?\*\//g
  const matches = scriptContent.match(jsdocPattern)

  if (!matches || matches.length === 0) {
    return null
  }

  // Use the first @metamode block found
  const raw = matches[0]
  const metadata = parseJSDocMetamode(raw)

  if (!metadata || Object.keys(metadata).length === 0) {
    return null
  }

  return {
    metadata,
    source: 'jsdoc',
    raw,
  }
}

/**
 * Parse JSDoc @metamode block into metadata object
 * Format: * key: value
 */
function parseJSDocMetamode(jsdocBlock: string): InlineMetamode {
  const result: InlineMetamode = {}

  // Remove comment markers and split into lines
  const lines = jsdocBlock
    .replace(/\/\*\*?/g, '')
    .replace(/\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .filter((line) => line.length > 0 && line !== '@metamode')

  for (const line of lines) {
    // Match "key: value" pattern
    const match = line.match(/^(\w+):\s*(.+)$/)
    if (!match) continue

    const [, key, value] = match
    parseMetamodeField(result, key, value)
  }

  return result
}

/**
 * Extract const metamode = {...} from script content
 * Uses balanced brace matching for robust extraction
 */
function extractObjectMetamode(scriptContent: string): ExtractedInlineMetamode | null {
  // Find the start of metamode declaration
  const startPattern = /(?:const|let|var)\s+metamode\s*=\s*\{/
  const startMatch = startPattern.exec(scriptContent)

  if (!startMatch) {
    return null
  }

  // Find the matching closing brace using balanced matching
  const startIndex = startMatch.index + startMatch[0].length - 1 // Position of opening {
  const raw = extractBalancedBraces(scriptContent, startIndex)

  if (!raw) {
    return null
  }

  const metadata = parseObjectMetamode(raw)

  if (!metadata || Object.keys(metadata).length === 0) {
    return null
  }

  return {
    metadata,
    source: 'object',
    raw,
  }
}

/**
 * Extract content within balanced braces starting at the opening brace position
 */
function extractBalancedBraces(content: string, startIndex: number): string | null {
  if (content[startIndex] !== '{') {
    return null
  }

  let depth = 0
  let inString: string | null = null
  let i = startIndex

  while (i < content.length) {
    const char = content[i]
    const prevChar = i > 0 ? content[i - 1] : ''

    // Handle string boundaries (skip escaped quotes)
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (inString === null) {
        inString = char
      } else if (inString === char) {
        inString = null
      }
    }

    // Track brace depth (only when not in string)
    if (inString === null) {
      if (char === '{') depth++
      if (char === '}') {
        depth--
        if (depth === 0) {
          // Found the matching closing brace
          return content.substring(startIndex, i + 1)
        }
      }
    }

    i++
  }

  // No matching closing brace found
  return null
}

/**
 * Parse object literal into metadata
 * Uses a simple parser to handle common cases
 */
function parseObjectMetamode(objectLiteral: string): InlineMetamode {
  const result: InlineMetamode = {}

  // Remove outer braces and split by commas (respecting nested arrays/objects)
  const content = objectLiteral
    .trim()
    .replace(/^\{|\}$/g, '')
    .trim()

  // Use a simple state machine to parse key-value pairs
  const pairs = splitObjectPairs(content)

  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':')
    if (colonIndex === -1) continue

    const key = pair
      .substring(0, colonIndex)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    const value = pair.substring(colonIndex + 1).trim()

    parseMetamodeField(result, key, value)
  }

  return result
}

/**
 * Split object content into key-value pairs, respecting nested brackets
 */
function splitObjectPairs(content: string): string[] {
  const pairs: string[] = []
  let current = ''
  let depth = 0
  let inString: string | null = null

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prevChar = i > 0 ? content[i - 1] : ''

    // Handle string boundaries
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (inString === null) {
        inString = char
      } else if (inString === char) {
        inString = null
      }
    }

    // Track bracket depth (only when not in string)
    if (inString === null) {
      if (char === '[' || char === '{') depth++
      if (char === ']' || char === '}') depth--

      // Split on comma at depth 0
      if (char === ',' && depth === 0) {
        if (current.trim()) {
          pairs.push(current.trim())
        }
        current = ''
        continue
      }
    }

    current += char
  }

  // Add the last pair
  if (current.trim()) {
    pairs.push(current.trim())
  }

  return pairs
}

/**
 * Parse a single metamode field and add to result
 */
function parseMetamodeField(result: InlineMetamode, key: string, value: string): void {
  const normalizedKey = key.toLowerCase()

  switch (normalizedKey) {
    case 'desc':
    case 'description':
      result.desc = parseStringValue(value)
      break

    case 'ai':
      result.ai = parseStringValue(value)
      break

    case 'phase': {
      const phaseNum = parseInt(parseStringValue(value), 10)
      if (!isNaN(phaseNum)) {
        result.phase = phaseNum
      }
      break
    }

    case 'status': {
      const status = parseStringValue(value)
      if (['stable', 'beta', 'experimental', 'deprecated', 'exp', 'dep'].includes(status)) {
        result.status = status as InlineMetamode['status']
      }
      break
    }

    case 'tags':
      result.tags = parseArrayValue(value)
      break

    case 'deps':
    case 'dependencies':
      result.deps = parseArrayValue(value)
      break
  }
}

/**
 * Parse a string value, removing quotes
 */
function parseStringValue(value: string): string {
  return value
    .trim()
    .replace(/^['"`]|['"`]$/g, '')
    .trim()
}

/**
 * Parse an array value from string representation
 */
function parseArrayValue(value: string): string[] {
  const trimmed = value.trim()

  // Handle array syntax: [item1, item2] or [item1, item2]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1)
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

  // Handle single item or comma-separated without brackets
  return trimmed
    .split(',')
    .map((item) =>
      item
        .trim()
        .replace(/^['"`]|['"`]$/g, '')
        .trim()
    )
    .filter((item) => item.length > 0)
}

// --- Main Extraction ---

/**
 * Extract inline metamode from a Vue SFC file
 * Returns null if no inline metadata found
 *
 * Priority: JSDoc @metamode > const metamode
 */
export function extractInlineMetamodeFromVue(filePath: string): ExtractedInlineMetamode | null {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  return extractInlineMetamodeFromContent(content)
}

/**
 * Extract inline metamode from Vue SFC content string
 * Useful for testing and when content is already loaded
 */
export function extractInlineMetamodeFromContent(content: string): ExtractedInlineMetamode | null {
  // Extract script content from Vue SFC
  const scriptContent = extractScriptContent(content)
  if (!scriptContent) {
    return null
  }

  // Try JSDoc first (higher priority)
  const jsdocResult = extractJSDocMetamode(scriptContent)
  if (jsdocResult) {
    return jsdocResult
  }

  // Fall back to object declaration
  return extractObjectMetamode(scriptContent)
}

/**
 * Extract <script> or <script setup> content from Vue SFC
 */
function extractScriptContent(vueContent: string): string | null {
  // Match <script setup> or <script> blocks
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi
  const matches: string[] = []

  let match
  while ((match = scriptPattern.exec(vueContent)) !== null) {
    matches.push(match[1])
  }

  if (matches.length === 0) {
    return null
  }

  // Concatenate all script blocks (some components may have both setup and regular)
  return matches.join('\n')
}

/**
 * Normalize inline metadata to standard file descriptor format
 * Converts aliases to canonical field names
 */
export function normalizeInlineMetamode(inline: InlineMetamode): InlineMetamode {
  const result: InlineMetamode = {}

  // desc is the canonical field name
  if (inline.desc) {
    result.desc = inline.desc
  } else if (inline.description) {
    result.desc = inline.description
  }

  // Normalize status abbreviations
  if (inline.status) {
    const statusMap: Record<string, InlineMetamode['status']> = {
      experimental: 'exp',
      deprecated: 'dep',
      stable: 'stable',
      beta: 'beta',
      exp: 'exp',
      dep: 'dep',
    }
    result.status = statusMap[inline.status] || inline.status
  }

  // Copy other fields
  if (inline.tags && inline.tags.length > 0) result.tags = inline.tags
  if (inline.phase !== undefined) result.phase = inline.phase
  if (inline.deps && inline.deps.length > 0) result.deps = inline.deps
  if (inline.dependencies && inline.dependencies.length > 0 && !result.deps) {
    result.deps = inline.dependencies
  }
  if (inline.ai) result.ai = inline.ai

  return result
}

// --- Batch Extraction ---

/**
 * Scan a directory for Vue files and extract inline metamode
 * Returns a map of filename -> metadata
 */
export function extractInlineFromDirectory(
  dirPath: string,
  options: { recursive?: boolean } = {}
): Record<string, InlineMetamode> {
  const result: Record<string, InlineMetamode> = {}
  const { recursive = false } = options

  if (!fs.existsSync(dirPath)) {
    return result
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isFile() && entry.name.endsWith('.vue')) {
      const extracted = extractInlineMetamodeFromVue(fullPath)
      if (extracted) {
        result[entry.name] = normalizeInlineMetamode(extracted.metadata)
      }
    } else if (entry.isDirectory() && recursive) {
      const subResult = extractInlineFromDirectory(fullPath, options)
      for (const [subName, subMeta] of Object.entries(subResult)) {
        result[`${entry.name}/${subName}`] = subMeta
      }
    }
  }

  return result
}

// --- CLI support (for testing) ---

if (process.argv[1].endsWith('metamode-inline-extractor.ts')) {
  const args = process.argv.slice(2)
  const targetPath = args[0] || '.'

  console.log('MetaMode Inline Extractor (TASK 75)')
  console.log('===================================')

  if (fs.statSync(targetPath).isFile()) {
    // Extract from single file
    const extracted = extractInlineMetamodeFromVue(targetPath)
    if (extracted) {
      console.log(`\n✅ Found inline metamode in ${targetPath}`)
      console.log(`   Source: ${extracted.source}`)
      console.log('   Metadata:', JSON.stringify(extracted.metadata, null, 2))
    } else {
      console.log(`\n❌ No inline metamode found in ${targetPath}`)
    }
  } else {
    // Extract from directory
    console.log(`\nScanning directory: ${targetPath}`)
    const result = extractInlineFromDirectory(targetPath, { recursive: true })
    const count = Object.keys(result).length

    if (count > 0) {
      console.log(`\n✅ Found ${count} files with inline metamode:`)
      for (const [file, meta] of Object.entries(result)) {
        console.log(`\n   ${file}:`)
        console.log('   ', JSON.stringify(meta, null, 2).replace(/\n/g, '\n   '))
      }
    } else {
      console.log('\n❌ No inline metamode found')
    }
  }
}
