/**
 * MetaMode Shared Types and Utilities
 *
 * Common types and utility functions used across MetaMode scripts:
 * - vite-plugin-metamode.ts
 * - metamode-preprocessor.ts
 * - metamode-ai-optimizer.ts
 *
 * This module eliminates code duplication and provides a single source of truth
 * for MetaMode data structures and helper functions.
 */

import * as fs from 'node:fs'

// ============================================================================
// Standard Format Types (used in metamode.json files on disk)
// ============================================================================

export interface FileDescriptor {
  description: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'experimental' | 'deprecated'
  dependencies?: string[]
}

export interface DirectoryDescriptor {
  description: string
  /** Relative path to subdirectory's metamode.json (auto-inferred as {dirname}/metamode.json if omitted) */
  metamode?: string
}

export interface MetamodeJson {
  $schema?: string
  name: string
  version?: string
  description: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  directories?: Record<string, DirectoryDescriptor>
}

export interface MetamodeTreeNode {
  name: string
  description: string
  version?: string
  languages?: string[]
  tags?: string[]
  files?: Record<string, FileDescriptor>
  children?: Record<string, MetamodeTreeNode>
}

// ============================================================================
// Compact (AI-Optimized) Format Types
// ============================================================================

export interface AIFileDescriptor {
  desc: string
  tags?: string[]
  phase?: number
  status?: 'stable' | 'beta' | 'exp' | 'dep'
  deps?: string[]
  ai?: string
}

export interface AIMetamodeTreeNode {
  name: string
  desc: string
  ver?: string
  lang?: string[]
  tags?: string[]
  ai?: string
  files?: Record<string, AIFileDescriptor>
  children?: Record<string, AIMetamodeTreeNode>
}

// ============================================================================
// Status Mapping
// ============================================================================

/** Map from standard status to compact status abbreviation */
export const STATUS_MAP: Record<string, 'stable' | 'beta' | 'exp' | 'dep'> = {
  stable: 'stable',
  beta: 'beta',
  experimental: 'exp',
  deprecated: 'dep',
}

/** Map from compact status abbreviation back to standard status */
export const STATUS_REVERSE_MAP: Record<string, 'stable' | 'beta' | 'experimental' | 'deprecated'> =
  {
    stable: 'stable',
    beta: 'beta',
    exp: 'experimental',
    dep: 'deprecated',
  }

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Load and parse a JSON file. Returns null on any error.
 */
export function loadJson<T = MetamodeJson>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

/**
 * Infer the metamode.json path for a directory.
 * Uses the explicit `metamode` field if present, otherwise infers as `{dirname}/metamode.json`.
 */
export function inferMetamodePath(dirName: string, dirDesc: DirectoryDescriptor): string {
  return dirDesc.metamode || `${dirName}/metamode.json`
}

/**
 * Generate an AI summary from a description.
 * Removes common filler words and truncates to max length.
 */
export function generateAISummary(description: string, maxLength: number = 100): string {
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
 * Convert a standard file descriptor to AI-optimized format.
 */
export function convertFileToAI(file: FileDescriptor): AIFileDescriptor {
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
