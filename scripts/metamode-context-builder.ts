/**
 * MetaMode Context Builder (MetaMode v2.0, Phase 3)
 *
 * Builds rich, token-efficient AI context from the MetaMode v2.0 database.
 * Designed to provide AI agents (CodeGen, Refactor, DocGen) with the precise
 * codebase knowledge they need — no more, no less.
 *
 * Features:
 * - Agent-type-specific prompt templates (codegen, refactor, docgen, review, generic)
 * - Scope-aware context slicing (by tag, phase, file path, or explicit ID list)
 * - Dependency subgraph inclusion for complete context
 * - Multiple output formats: markdown, JSON, plain text
 * - Token budget enforcement (approximate token counting)
 * - Pre-commit hook support: auto-suggest @mm: annotations for new files
 *
 * Usage (CLI):
 * ```bash
 * npx tsx scripts/metamode-context-builder.ts --agent codegen --scope ui lib
 * npx tsx scripts/metamode-context-builder.ts --agent refactor --ids param_editor shader_utils
 * npx tsx scripts/metamode-context-builder.ts --format json --output context.json
 * npx tsx scripts/metamode-context-builder.ts --pre-commit src/new-file.ts
 * ```
 *
 * Usage (programmatic):
 * ```ts
 * import { buildContext, buildContextForAgent } from './metamode-context-builder'
 * const ctx = buildContextForAgent('codegen', db, { scope: ['ui'] })
 * console.log(ctx.prompt)
 * ```
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  compileV2Database,
  createMmApi,
  type MmDbEntry,
  type MmV2Database,
} from './metamode-db-compiler'

// ============================================================================
// Types
// ============================================================================

/** Supported AI agent types */
export type AgentType = 'codegen' | 'refactor' | 'docgen' | 'review' | 'generic'

/** Output format for the generated context */
export type ContextFormat = 'markdown' | 'json' | 'text'

/** Options for context building */
export interface ContextBuilderOptions {
  /**
   * AI agent type — determines which prompt template is used.
   * @default 'generic'
   */
  agentType?: AgentType
  /**
   * Only include entries with at least one of these tags.
   * If empty or undefined, all entries are included.
   */
  scope?: string[]
  /**
   * Only include these specific annotation IDs.
   * Takes precedence over `scope` when both are specified.
   */
  ids?: string[]
  /**
   * Only include entries from these source file paths (substring match).
   */
  filePaths?: string[]
  /**
   * Include all transitive runtime dependencies of selected entries.
   * @default true
   */
  includeDeps?: boolean
  /**
   * Output format.
   * @default 'markdown'
   */
  format?: ContextFormat
  /**
   * Maximum number of entries to include.
   * @default 100
   */
  maxEntries?: number
  /**
   * Approximate maximum token budget.
   * Context is trimmed if it exceeds this number.
   * @default 4000
   */
  tokenBudget?: number
  /**
   * Which annotation fields to include in the output.
   * If undefined, a sensible default set is used per agent type.
   */
  fields?: (keyof MmDbEntry)[]
}

/** A single entry in the built context */
export interface ContextEntry {
  id: string
  name?: string
  desc?: string
  tags?: string[]
  status?: string
  visibility?: 'public' | 'internal'
  phase?: number
  filePath: string
  line: number
  deps?: { runtime?: string[]; build?: string[]; optional?: string[] }
  ai?: { summary?: string; usage?: string; examples?: string[] } | string
  entityName?: string
}

/** The fully built AI context */
export interface BuiltContext {
  /** The agent type this context was built for */
  agentType: AgentType
  /** Selected entries (after filtering + dep expansion) */
  entries: ContextEntry[]
  /** Rendered prompt string (ready to pass to an LLM) */
  prompt: string
  /** Approximate token count of the prompt */
  tokenCount: number
  /** Whether the token budget was exceeded and content was trimmed */
  wasTrimmed: boolean
  /** Stats about the built context */
  stats: {
    totalSelected: number
    totalInDb: number
    depsAdded: number
  }
}

/** Prompt template for a specific agent type */
export interface PromptTemplate {
  /** Short name of the agent type */
  name: string
  /** System prompt preamble */
  preamble: string
  /** What fields are most relevant for this agent */
  relevantFields: (keyof MmDbEntry)[]
  /** Instruction appended after the context */
  instruction: string
}

// ============================================================================
// Prompt Templates
// ============================================================================

/**
 * Built-in prompt templates for each agent type.
 * These provide a concise system context that sets the agent's role
 * and tells it how to interpret the MetaMode annotations.
 */
export const PROMPT_TEMPLATES: Record<AgentType, PromptTemplate> = {
  codegen: {
    name: 'Code Generator',
    preamble: [
      'You are a code generation assistant. The following MetaMode annotations describe',
      'modules in this codebase — their IDs, descriptions, tags, dependencies, and AI hints.',
      'Use this context to generate code that integrates correctly with the existing architecture.',
    ].join(' '),
    relevantFields: ['id', 'name', 'desc', 'tags', 'deps', 'ai', 'filePath', 'status'],
    instruction: [
      'When generating code, reference existing module IDs in @mm:deps annotations.',
      'Follow the visibility rules: do not let public modules depend on internal ones.',
      'Add @mm: annotations to any new functions or modules you create.',
    ].join(' '),
  },

  refactor: {
    name: 'Refactoring Assistant',
    preamble: [
      'You are a refactoring assistant. The following MetaMode annotations describe the',
      'dependency graph and semantic roles of modules in this codebase.',
      'Use this context to plan safe refactors that preserve all declared dependencies.',
    ].join(' '),
    relevantFields: ['id', 'name', 'desc', 'tags', 'deps', 'visibility', 'status', 'filePath'],
    instruction: [
      'Identify all callers (dependents) before renaming or moving a module.',
      'Preserve @mm:id values across renames to avoid breaking dependency references.',
      'After refactoring, update @mm:deps to reflect any changed module IDs.',
    ].join(' '),
  },

  docgen: {
    name: 'Documentation Generator',
    preamble: [
      'You are a documentation generator. The following MetaMode annotations describe',
      'modules with their descriptions, tags, phases, and AI summaries.',
      'Use this context to generate accurate, concise documentation.',
    ].join(' '),
    relevantFields: ['id', 'name', 'desc', 'tags', 'phase', 'status', 'visibility', 'ai'],
    instruction: [
      'Generate documentation that matches the semantic level of the @mm:desc field.',
      'Include usage examples from @mm:ai.examples when available.',
      'Group related modules by their @mm:tags for better readability.',
    ].join(' '),
  },

  review: {
    name: 'Code Reviewer',
    preamble: [
      'You are a code reviewer. The following MetaMode annotations describe the intended',
      'architecture, visibility contracts, and dependency structure of this codebase.',
      'Use this context to identify violations of the declared architecture.',
    ].join(' '),
    relevantFields: [
      'id',
      'name',
      'desc',
      'tags',
      'deps',
      'visibility',
      'status',
      'filePath',
      'line',
    ],
    instruction: [
      'Flag any code that violates visibility contracts (@mm:visibility rules).',
      'Check that all @mm:deps references actually exist in the codebase.',
      'Warn if a module marked @mm:status=deprecated is still being depended on.',
    ].join(' '),
  },

  generic: {
    name: 'AI Assistant',
    preamble: [
      'The following MetaMode annotations describe modules in this codebase.',
      'Each entry has an ID, description, tags, dependencies, and optional AI hints.',
    ].join(' '),
    relevantFields: [
      'id',
      'name',
      'desc',
      'tags',
      'deps',
      'status',
      'visibility',
      'phase',
      'ai',
      'filePath',
    ],
    instruction: '',
  },
}

// ============================================================================
// Entry Selection
// ============================================================================

/**
 * Select entries from the database based on the given options.
 * Returns the matching entries plus any entries pulled in as dependencies.
 */
export function selectEntries(
  db: MmV2Database,
  options: ContextBuilderOptions
): { entries: MmDbEntry[]; depsAdded: number } {
  const { scope, ids, filePaths, includeDeps = true, maxEntries = 100 } = options

  const allEntries = Object.values(db.entries)
  let selected: MmDbEntry[]

  if (ids && ids.length > 0) {
    // Explicit ID list takes precedence
    selected = ids.flatMap((id) => (db.entries[id] ? [db.entries[id]] : []))
  } else if (scope && scope.length > 0) {
    // Filter by tags (scope)
    selected = allEntries.filter((e) => {
      if (!e.tags) return false
      return scope.some((s) => e.tags!.includes(s))
    })
  } else if (filePaths && filePaths.length > 0) {
    // Filter by file path substring
    selected = allEntries.filter((e) => filePaths.some((fp) => e.filePath.includes(fp)))
  } else {
    // No filter — include all entries
    selected = allEntries
  }

  // Track which IDs are already selected
  const selectedIds = new Set(selected.map((e) => e.id))
  let depsAdded = 0

  if (includeDeps) {
    // Expand to include all transitive runtime dependencies
    const mm = createMmApi(db)
    const toVisit = [...selected.map((e) => e.id)]
    const visited = new Set<string>()

    while (toVisit.length > 0) {
      const id = toVisit.pop()!
      if (visited.has(id)) continue
      visited.add(id)

      const deps = mm.getDependencies(id, { type: 'runtime' })
      for (const dep of deps) {
        if (!selectedIds.has(dep) && db.entries[dep]) {
          selected.push(db.entries[dep])
          selectedIds.add(dep)
          depsAdded++
          toVisit.push(dep)
        }
      }
    }
  }

  // Apply maxEntries limit
  if (selected.length > maxEntries) {
    selected = selected.slice(0, maxEntries)
  }

  return { entries: selected, depsAdded }
}

// ============================================================================
// Context Rendering
// ============================================================================

/**
 * Approximate token count for a string.
 * Uses a simple heuristic: ~4 characters per token (common for English/code).
 */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Convert an MmDbEntry to a ContextEntry (selects relevant fields only).
 */
function toContextEntry(entry: MmDbEntry, fields: (keyof MmDbEntry)[]): ContextEntry {
  const result: ContextEntry = {
    id: entry.id,
    filePath: entry.filePath,
    line: entry.line,
  }

  for (const field of fields) {
    if (field === 'id' || field === 'filePath' || field === 'line') continue
    const value = entry[field]
    if (value !== undefined) {
      ;(result as Record<string, unknown>)[field] = value
    }
  }

  return result
}

/**
 * Render a single context entry as markdown.
 */
function renderEntryMarkdown(entry: ContextEntry): string {
  const lines: string[] = []

  const header = entry.name ? `### ${entry.id} — ${entry.name}` : `### ${entry.id}`
  lines.push(header)

  if (entry.desc) {
    lines.push(`> ${entry.desc}`)
  }

  const meta: string[] = []
  if (entry.tags && entry.tags.length > 0) meta.push(`tags: ${entry.tags.join(', ')}`)
  if (entry.status) meta.push(`status: ${entry.status}`)
  if (entry.visibility) meta.push(`visibility: ${entry.visibility}`)
  if (entry.phase !== undefined) meta.push(`phase: ${entry.phase}`)
  meta.push(`file: ${entry.filePath}:${entry.line}`)

  if (meta.length > 0) {
    lines.push(`*${meta.join(' | ')}*`)
  }

  // AI hints
  if (entry.ai) {
    if (typeof entry.ai === 'string') {
      lines.push(`**AI**: ${entry.ai}`)
    } else {
      if (entry.ai.summary) lines.push(`**AI Summary**: ${entry.ai.summary}`)
      if (entry.ai.usage) lines.push(`**Usage**: ${entry.ai.usage}`)
      if (entry.ai.examples && entry.ai.examples.length > 0) {
        lines.push(`**Examples**: ${entry.ai.examples.join('; ')}`)
      }
    }
  }

  // Dependencies
  if (entry.deps) {
    const depParts: string[] = []
    if (entry.deps.runtime && entry.deps.runtime.length > 0)
      depParts.push(`runtime: [${entry.deps.runtime.join(', ')}]`)
    if (entry.deps.build && entry.deps.build.length > 0)
      depParts.push(`build: [${entry.deps.build.join(', ')}]`)
    if (entry.deps.optional && entry.deps.optional.length > 0)
      depParts.push(`optional: [${entry.deps.optional.join(', ')}]`)
    if (depParts.length > 0) {
      lines.push(`**Deps**: ${depParts.join(' | ')}`)
    }
  }

  return lines.join('\n')
}

/**
 * Render a single context entry as plain text.
 */
function renderEntryText(entry: ContextEntry): string {
  const parts: string[] = [`[${entry.id}]`]
  if (entry.desc) parts.push(entry.desc)
  if (entry.tags && entry.tags.length > 0) parts.push(`(${entry.tags.join(', ')})`)
  if (entry.filePath) parts.push(`@ ${entry.filePath}:${entry.line}`)
  return parts.join(' ')
}

/**
 * Render the full prompt from entries + template.
 */
function renderPrompt(
  entries: ContextEntry[],
  template: PromptTemplate,
  format: ContextFormat
): string {
  const lines: string[] = []

  // Preamble
  if (template.preamble) {
    lines.push(template.preamble)
    lines.push('')
  }

  // Context section
  if (format === 'markdown') {
    lines.push('## MetaMode Context')
    lines.push('')
    for (const entry of entries) {
      lines.push(renderEntryMarkdown(entry))
      lines.push('')
    }
  } else if (format === 'json') {
    lines.push('## MetaMode Context (JSON)')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(entries, null, 2))
    lines.push('```')
    lines.push('')
  } else {
    // Plain text: one entry per line
    lines.push('MetaMode Context:')
    for (const entry of entries) {
      lines.push(renderEntryText(entry))
    }
    lines.push('')
  }

  // Instruction
  if (template.instruction) {
    lines.push('## Instructions')
    lines.push('')
    lines.push(template.instruction)
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Build an AI context from a compiled MetaMode v2.0 database.
 *
 * @param db - Compiled v2.0 database (from `compileV2Database`)
 * @param options - Context builder options
 * @returns The fully built context including the rendered prompt
 *
 * @example
 * const db = compileV2Database(process.cwd())
 * const ctx = buildContext(db, { agentType: 'codegen', scope: ['ui'] })
 * console.log(ctx.prompt)
 */
export function buildContext(db: MmV2Database, options: ContextBuilderOptions = {}): BuiltContext {
  const { agentType = 'generic', format = 'markdown', tokenBudget = 4000, fields } = options

  const template = PROMPT_TEMPLATES[agentType]
  const effectiveFields = fields || template.relevantFields

  // Select entries
  const { entries: rawEntries, depsAdded } = selectEntries(db, options)

  // Convert to context entries
  let contextEntries = rawEntries.map((e) => toContextEntry(e, effectiveFields))

  // Render prompt
  let prompt = renderPrompt(contextEntries, template, format)
  let wasTrimmed = false

  // Enforce token budget: trim entries from the end until we're under budget
  while (approximateTokens(prompt) > tokenBudget && contextEntries.length > 1) {
    contextEntries = contextEntries.slice(0, -1)
    prompt = renderPrompt(contextEntries, template, format)
    wasTrimmed = true
  }

  return {
    agentType,
    entries: contextEntries,
    prompt,
    tokenCount: approximateTokens(prompt),
    wasTrimmed,
    stats: {
      totalSelected: rawEntries.length,
      totalInDb: db.stats.totalAnnotations,
      depsAdded,
    },
  }
}

/**
 * Build an AI context for a specific agent type.
 * Convenience wrapper around `buildContext`.
 *
 * @example
 * const ctx = buildContextForAgent('refactor', db, { ids: ['param_editor'] })
 */
export function buildContextForAgent(
  agentType: AgentType,
  db: MmV2Database,
  options: Omit<ContextBuilderOptions, 'agentType'> = {}
): BuiltContext {
  return buildContext(db, { ...options, agentType })
}

// ============================================================================
// Pre-commit Hook Support
// ============================================================================

/**
 * Suggest @mm: annotations for a new or modified file.
 *
 * Analyzes the file path and any existing @mm: neighbors to produce
 * a suggested annotation stub that can be inserted into the file.
 *
 * @param filePath - Absolute path to the new/modified file
 * @param db - Compiled database for context
 * @returns A string with the suggested @mm: annotation comment block
 *
 * @example
 * const suggestion = suggestAnnotation('/project/src/lib/my-util.ts', db)
 * console.log(suggestion)
 * // /**
 * //  * @mm:id my_util
 * //  * @mm:desc TODO: Add description
 * //  * @mm:tags lib
 * //  * @mm:status draft
 * //  *\/
 */
export function suggestAnnotation(filePath: string, db: MmV2Database): string {
  const basename = path.basename(filePath)
  const withoutExt = basename.replace(/\.[^.]+$/, '')
  const suggestedId = withoutExt
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase()

  // Infer tags from directory structure
  const parts = filePath.replace(/\\/g, '/').split('/')
  const inferredTags: string[] = []
  if (parts.includes('lib')) inferredTags.push('lib')
  if (parts.includes('ui') || parts.includes('components')) inferredTags.push('ui')
  if (parts.includes('utils') || parts.includes('helpers')) inferredTags.push('utils')
  if (parts.includes('scripts')) inferredTags.push('scripts')

  // Check if a nearby sibling exists in the db for phase inference
  const siblingEntries = Object.values(db.entries).filter((e) =>
    e.filePath.includes(parts.slice(-2, -1)[0] || '')
  )
  const inferredPhase =
    siblingEntries.length > 0 && siblingEntries[0].phase !== undefined
      ? siblingEntries[0].phase
      : undefined

  const tagsLine = inferredTags.length > 0 ? `\n * @mm:tags ${inferredTags.join(', ')}` : ''
  const phaseLine = inferredPhase !== undefined ? `\n * @mm:phase ${inferredPhase}` : ''

  return [
    '/**',
    ` * @mm:id ${suggestedId}`,
    ' * @mm:desc TODO: Add description',
    tagsLine,
    phaseLine,
    ' * @mm:status draft',
    ' */',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

/**
 * Run as a pre-commit hook: for each staged file, check if it has @mm:id annotation.
 * If not, output a suggested annotation and exit with a warning (non-zero = warn only).
 *
 * @param stagedFiles - List of staged file paths
 * @param db - Compiled database
 * @returns Array of files that are missing annotations (with suggestions)
 */
export function runPreCommitCheck(
  stagedFiles: string[],
  db: MmV2Database
): Array<{ filePath: string; suggestion: string }> {
  const missing: Array<{ filePath: string; suggestion: string }> = []

  const annotatedPaths = new Set(Object.values(db.entries).map((e) => e.filePath))

  for (const file of stagedFiles) {
    // Only check TypeScript/Vue source files
    if (!/\.(ts|tsx|vue|js|jsx)$/.test(file)) continue

    // Check if this file already has an annotation in the db
    const rel = path.relative(process.cwd(), file)
    const isAnnotated = annotatedPaths.has(rel) || annotatedPaths.has(file)

    if (!isAnnotated) {
      missing.push({
        filePath: file,
        suggestion: suggestAnnotation(file, db),
      })
    }
  }

  return missing
}

// ============================================================================
// CLI Support
// ============================================================================

if (process.argv[1] && path.basename(process.argv[1]) === 'metamode-context-builder.ts') {
  const args = process.argv.slice(2)
  const targetDir = args.find((a) => !a.startsWith('--')) || process.cwd()

  // Parse flags
  const agentFlag = (() => {
    const idx = args.indexOf('--agent')
    return idx !== -1 ? (args[idx + 1] as AgentType) : 'generic'
  })()

  const scopeFlag = (() => {
    const idx = args.indexOf('--scope')
    if (idx === -1) return undefined
    const scope: string[] = []
    for (let i = idx + 1; i < args.length && !args[i].startsWith('--'); i++) {
      scope.push(args[i])
    }
    return scope.length > 0 ? scope : undefined
  })()

  const idsFlag = (() => {
    const idx = args.indexOf('--ids')
    if (idx === -1) return undefined
    const ids: string[] = []
    for (let i = idx + 1; i < args.length && !args[i].startsWith('--'); i++) {
      ids.push(args[i])
    }
    return ids.length > 0 ? ids : undefined
  })()

  const formatFlag: ContextFormat = args.includes('--json')
    ? 'json'
    : args.includes('--text')
      ? 'text'
      : 'markdown'

  const outputFlag = (() => {
    const idx = args.indexOf('--output')
    return idx !== -1 ? args[idx + 1] : undefined
  })()

  const tokenBudgetFlag = (() => {
    const idx = args.indexOf('--token-budget')
    return idx !== -1 ? parseInt(args[idx + 1], 10) : 4000
  })()

  const preCommitFlag = args.includes('--pre-commit')
  const preCommitFiles = (() => {
    const idx = args.indexOf('--pre-commit')
    if (idx === -1) return []
    const files: string[] = []
    for (let i = idx + 1; i < args.length && !args[i].startsWith('--'); i++) {
      files.push(args[i])
    }
    return files
  })()

  console.log('MetaMode Context Builder (v2.0, Phase 3)')
  console.log('==========================================')
  console.log(`Root directory: ${targetDir}`)
  console.log(`Agent type:     ${agentFlag}`)
  if (scopeFlag) console.log(`Scope (tags):   ${scopeFlag.join(', ')}`)
  if (idsFlag) console.log(`IDs:            ${idsFlag.join(', ')}`)
  console.log(`Format:         ${formatFlag}`)
  console.log(`Token budget:   ${tokenBudgetFlag}`)
  console.log('')

  const db = compileV2Database(targetDir)
  console.log(
    `✅ Compiled ${db.stats.totalAnnotations} annotation(s) from ${db.buildInfo.sourceFiles} file(s)`
  )
  console.log('')

  if (preCommitFlag) {
    // Pre-commit mode
    const filesToCheck =
      preCommitFiles.length > 0
        ? preCommitFiles
        : process.env.GIT_STAGED_FILES
          ? process.env.GIT_STAGED_FILES.split('\n').filter(Boolean)
          : []

    if (filesToCheck.length === 0) {
      console.log('Pre-commit check: no files to check. Pass file paths after --pre-commit.')
      process.exit(0)
    }

    console.log(`Pre-commit check for ${filesToCheck.length} file(s):`)
    const missing = runPreCommitCheck(filesToCheck, db)

    if (missing.length === 0) {
      console.log('✅ All staged files are annotated with @mm:id.')
    } else {
      console.log(`⚠  ${missing.length} file(s) are missing @mm: annotations:`)
      for (const { filePath, suggestion } of missing) {
        console.log(`\n  📄 ${filePath}`)
        console.log('  Suggested annotation:')
        console.log(
          suggestion
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n')
        )
      }
      console.log('')
      console.log('Tip: Add @mm: annotations to your source files to improve AI context quality.')
    }
    process.exit(0)
  }

  // Context building mode
  const ctx = buildContext(db, {
    agentType: agentFlag,
    scope: scopeFlag,
    ids: idsFlag,
    format: formatFlag,
    tokenBudget: tokenBudgetFlag,
  })

  console.log(`📊 Context stats:`)
  console.log(`   Selected: ${ctx.stats.totalSelected} entries`)
  console.log(`   Deps added: ${ctx.stats.depsAdded}`)
  console.log(`   Final entries: ${ctx.entries.length}`)
  console.log(`   Approx. tokens: ${ctx.tokenCount}`)
  if (ctx.wasTrimmed) console.log(`   ⚠ Context was trimmed to fit token budget`)
  console.log('')

  if (outputFlag) {
    const outputPath = path.resolve(outputFlag)
    if (formatFlag === 'json') {
      fs.writeFileSync(outputPath, JSON.stringify(ctx, null, 2), 'utf-8')
    } else {
      fs.writeFileSync(outputPath, ctx.prompt, 'utf-8')
    }
    console.log(`✅ Context written to: ${outputPath}`)
  } else {
    console.log('--- Generated Context ---')
    console.log(ctx.prompt)
  }
}
