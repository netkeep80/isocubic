/**
 * MetaMode v2.0 Usage Examples
 *
 * This file demonstrates how to use the MetaMode v2.0 system with `@mm:` inline annotations.
 * MetaMode v2.0 stores metadata directly in the source code, adjacent to the entities
 * it describes — eliminating drift between code and documentation.
 *
 * TASK 87: Documentation and Release (Phase 6 of MetaMode v2.0, Phase 13)
 *
 * See also:
 * - docs/metamode-v2-migration.md — migration guide from v1.x to v2.0
 * - metamode.md — full specification
 * - scripts/metamode-cli.ts — unified CLI tool
 */

// =============================================================================
// Example 1: Annotating a function with @mm: JSDoc annotations
// =============================================================================

/**
 * @mm:id=shader_utils
 * @mm:name=ShaderUtils
 * @mm:desc=GLSL shader utilities for parametric cube rendering
 * @mm:tags=shaders,lib,stable
 * @mm:visibility=public
 * @mm:phase=3
 * @mm:status=stable
 * @mm:ai=GPU shader helpers: noise, gradient, FFT reconstruction
 */
export function buildShaderMaterial(params: Record<string, unknown>) {
  // Implementation...
  return params
}

// =============================================================================
// Example 2: Internal helper (excluded from production bundle)
// =============================================================================

/**
 * @mm:id=shader_cache
 * @mm:desc=Internal LRU cache for compiled shader programs
 * @mm:tags=shaders,internal
 * @mm:visibility=internal
 * @mm:deps=runtime:shader_utils
 * @mm:status=stable
 */
export function getShaderFromCache(key: string): string | undefined {
  // Internal implementation — stripped in production build
  const cache = new Map<string, string>()
  return cache.get(key)
}

// =============================================================================
// Example 3: Module with typed dependency graph
// =============================================================================

/**
 * @mm:id=param_editor
 * @mm:name=ParametricEditor
 * @mm:desc=Visual editor for parametric cube properties with real-time preview
 * @mm:tags=ui,editor,stable
 * @mm:deps=runtime:shader_utils,build:types/cube,optional:lod_system
 * @mm:visibility=public
 * @mm:phase=5
 * @mm:status=stable
 * @mm:ai=Edits base color, gradients, noise params; integrates with 3D preview
 */
export class ParametricEditor {
  // Implementation...
}

// =============================================================================
// Example 4: Alternative format — __mm runtime property
// =============================================================================

export const LodSystem = {
  /**
   * Runtime property format — equivalent to @mm: JSDoc annotations.
   * Useful when the entity is an exported object (not a function/class).
   */
  __mm: {
    id: 'lod_system',
    name: 'LODSystem',
    desc: 'Level-of-Detail system for optimizing cube grid rendering',
    tags: ['rendering', 'performance', 'stable'],
    visibility: 'public' as const,
    phase: 3,
    status: 'stable' as const,
    refs: {
      cube_grid: 'src/components/CubeGrid.vue',
    },
  },

  computeLOD(distance: number): number {
    // LOD calculation...
    return Math.max(0, Math.floor(distance / 10))
  },
}

// =============================================================================
// Example 5: Querying the v2.0 runtime API
// =============================================================================

/**
 * How to query MetaMode v2.0 database at runtime via virtual module.
 *
 * ```typescript
 * import mm from 'virtual:metamode/v2/db'
 *
 * // Find by ID
 * const editor = mm.findById('param_editor')
 * console.log(editor?.desc) // 'Visual editor for parametric cube properties...'
 *
 * // Find with filters
 * const stableUI = mm.findAll({ tags: ['ui'], status: 'stable' })
 * const publicModules = mm.findByTag('lib', { visibility: 'public' })
 *
 * // Dependency graph
 * const deps = mm.getDependencies('param_editor', { type: 'runtime' })
 * const transitiveDeps = mm.getDependencies('param_editor', { type: 'all', recursive: true })
 * const dependents = mm.getDependents('shader_utils')
 *
 * // Cycle detection
 * const cycle = mm.detectCycle('param_editor') // null if no cycle
 * const allCycles = mm.findAllCycles()
 *
 * // Validation (dev mode only)
 * const { valid, errors, warnings } = mm.validate()
 *
 * // Export for AI/LLM agents
 * const context = mm.exportForLLM({
 *   scope: ['ui', 'lib'],
 *   format: 'compact',
 *   limit: 50,
 * })
 * console.log(context) // Compact JSON for LLM context window
 *
 * // Dependency graph export
 * const dotGraph = mm.exportGraph({ format: 'dot' })
 * const jsonGraph = mm.exportGraph({ format: 'json', edgeType: 'runtime' })
 *
 * // Statistics and build info
 * console.log(mm.stats.totalAnnotations)
 * console.log(mm.buildInfo.version) // '2.0.0'
 * ```
 */

// =============================================================================
// Example 6: Production-optimized API (always stripped)
// =============================================================================

/**
 * Using the always-stripped production module.
 *
 * ```typescript
 * // Use this in application code where you don't want internal metadata:
 * import mmProd from 'virtual:metamode/v2/db/prod'
 *
 * // Same API as virtual:metamode/v2/db but:
 * // - visibility:'internal' entries are excluded
 * // - dev-only fields (filePath, line, source) are stripped
 * // - AI objects are collapsed to strings
 *
 * const publicModules = mmProd.findAll({ visibility: 'public' })
 * ```
 */

// =============================================================================
// Example 7: Context Builder for AI agents
// =============================================================================

/**
 * Building AI context from the v2.0 database.
 *
 * ```typescript
 * import { buildContext, buildContextForAgent, suggestAnnotation } from './scripts/metamode-context-builder'
 * import { compileV2Database } from './scripts/metamode-db-compiler'
 *
 * const db = compileV2Database(process.cwd())
 *
 * // Build context for a codegen agent
 * const ctx = buildContext(db, {
 *   agentType: 'codegen',  // 'codegen' | 'refactor' | 'docgen' | 'review' | 'generic'
 *   scope: ['ui', 'lib'],  // filter by tags
 *   format: 'markdown',    // 'markdown' | 'json' | 'text'
 *   tokenBudget: 4000,     // auto-trim if exceeded
 *   includeDeps: true,     // expand runtime dependencies
 * })
 * console.log(ctx.prompt)  // ready-to-use LLM prompt
 *
 * // Convenience wrapper
 * const refactorCtx = buildContextForAgent('refactor', db, { ids: ['shader_utils'] })
 *
 * // Suggest annotation stub for a new file (for pre-commit hooks)
 * const suggestion = suggestAnnotation('/project/src/lib/new-module.ts', db)
 * console.log(suggestion)
 * // /**
 * //  * @mm:id new_module
 * //  * @mm:desc TODO: Add description
 * //  * @mm:tags lib
 * //  * @mm:status draft
 * //  * \/
 * ```
 */

// =============================================================================
// Example 8: CLI quick reference
// =============================================================================

/**
 * Common CLI commands for MetaMode v2.0:
 *
 * ```bash
 * # Check current MetaMode status
 * npm run metamode:status
 *
 * # Parse all @mm: annotations in project
 * npx tsx scripts/metamode-cli.ts parse
 *
 * # Validate annotations (semantic + schema)
 * npx tsx scripts/metamode-cli.ts validate
 *
 * # Preview migration from metamode.json → @mm:
 * npm run metamode:migrate
 *
 * # Apply migration
 * npm run metamode:migrate:apply
 *
 * # Compile v2.0 database with statistics
 * npm run metamode:db:compile
 *
 * # Export dependency graph (DOT format)
 * npm run metamode:db:graph
 *
 * # Generate tests for annotated modules
 * npm run metamode:generate-tests
 *
 * # Build AI context (all modules)
 * npm run metamode:context
 *
 * # Build AI context for codegen agent
 * npm run metamode:ai:context
 *
 * # Analyze production optimization
 * npm run metamode:prod:optimize
 * ```
 */

// =============================================================================
// Example 9: Dual-mode (v1.x and v2.0 in parallel)
// =============================================================================

/**
 * Both MetaMode versions work simultaneously.
 *
 * ```typescript
 * // ---- v1.x API (metamode.json files) ----
 *
 * // Flat map of all metamode entries
 * import metamode from 'virtual:metamode'
 * console.log(metamode['src/metamode.json'].desc)
 *
 * // Hierarchical tree
 * import metamodeTree from 'virtual:metamode/tree'
 * console.log(metamodeTree.children?.src?.desc)
 *
 * // v1 database with search
 * import metamodeDB from 'virtual:metamode/db'
 * // Uses useMetamodeDatabase() composable
 *
 * // ---- v2.0 API (@mm: annotations) ----
 *
 * // Full dev database
 * import mm from 'virtual:metamode/v2/db'
 * const editor = mm.findById('param_editor')
 *
 * // Always production-stripped
 * import mmProd from 'virtual:metamode/v2/db/prod'
 * const publicModules = mmProd.findAll({ visibility: 'public' })
 * ```
 */
