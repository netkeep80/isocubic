# MetaMode v2.0 Migration Guide

This guide explains how to migrate from MetaMode v1.x (`metamode.json` files) to MetaMode v2.0 (`@mm:` inline annotations).

---

## Overview

MetaMode v2.0 introduces **inline annotations** — metadata that lives directly in your source code, adjacent to the entities it describes. This eliminates the drift problem where `metamode.json` files fall out of sync with the code.

### Why migrate?

| Aspect | v1.x (metamode.json) | v2.0 (@mm: annotations) |
|--------|---------------------|------------------------|
| Location | Parallel JSON files | Inline in source code |
| Sync risk | High (easy to forget) | Low (lives with code) |
| Granularity | File-level only | Function/class/component level |
| AI context | Directory-level | Entity-level (richer) |
| Dependency graph | Not supported | Full typed graph |
| Validation | JSON Schema only | Semantic + schema |

---

## Dual-Mode Operation

MetaMode supports **dual-mode**: both v1.x and v2.0 work simultaneously. You do not need to migrate everything at once.

- **v1.x**: Available via `virtual:metamode`, `virtual:metamode/tree`, `virtual:metamode/db`
- **v2.0**: Available via `virtual:metamode/v2/db`

Both virtual modules are compiled by the same Vite plugin and can be used in parallel.

---

## Quick Start

### 1. Check current status

```bash
npx tsx scripts/metamode-cli.ts status
```

This shows:
- How many v1.x `metamode.json` files exist
- How many v2.0 `@mm:` annotations exist
- Validation status
- Whether dual-mode is active

### 2. Preview the migration

```bash
npx tsx scripts/metamode-cli.ts migrate
# or
npm run metamode:migrate
```

This runs in **dry-run** mode and shows what `@mm:` annotations would be generated from your `metamode.json` files.

### 3. Apply the migration

```bash
npx tsx scripts/metamode-cli.ts migrate --apply
# or
npm run metamode:migrate:apply
```

This generates `@mm:` annotation stubs for all `metamode.json` entries.

### 4. Validate the result

```bash
npx tsx scripts/metamode-cli.ts validate
```

---

## Annotation Format

### v1.x (metamode.json)

```json
{
  "$schema": "./metamode.schema.json",
  "name": "components",
  "description": "Vue UI components",
  "tags": ["vue", "ui"],
  "files": {
    "ParamEditor.vue": {
      "description": "Parameter editor for cube properties",
      "status": "stable",
      "phase": 5,
      "tags": ["editor", "params", "ui"]
    }
  }
}
```

### v2.0 (@mm: JSDoc annotation)

```typescript
/**
 * @mm:id=param_editor
 * @mm:name=ParametricEditor
 * @mm:desc=Parameter editor for cube properties
 * @mm:status=stable
 * @mm:phase=5
 * @mm:tags=editor,params,ui
 * @mm:visibility=public
 * @mm:ai=Edits base color, gradients, noise for isocubic shapes
 */
export function ParamEditor() { ... }
```

### v2.0 (__mm runtime property)

```typescript
export const ParamEditor = {
  __mm: {
    id: 'param_editor',
    name: 'ParametricEditor',
    desc: 'Parameter editor for cube properties',
    status: 'stable',
    phase: 5,
    tags: ['editor', 'params', 'ui'],
    visibility: 'public',
  },
  // ... actual implementation
}
```

---

## Annotation Fields

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `@mm:id` | string | ✓ | Unique identifier within the project |
| `@mm:desc` | string | ✓ | Human-readable description |
| `@mm:name` | string | | Human-readable name (defaults to entity name) |
| `@mm:tags` | comma-list | | Tags for categorization: `ui,stable,vue` |
| `@mm:status` | enum | | `stable` \| `beta` \| `experimental` \| `deprecated` |
| `@mm:phase` | integer | | Development phase (1–12+) |
| `@mm:visibility` | enum | | `public` \| `internal` (default: `public`) |
| `@mm:version` | semver | | Semantic version: `1.2.0` |
| `@mm:deps` | string | | Dependencies: `runtime:lib/params,build:tools/voxel` |
| `@mm:ai` | string | | Short AI summary (max 100 chars) |

### Dependency syntax

```
@mm:deps=runtime:lib/params,build:tools/voxel,optional:server/api
```

| Prefix | Meaning |
|--------|---------|
| `runtime:` | Required at runtime |
| `build:` | Required at build time |
| `optional:` | Optional, may or may not be present |
| (no prefix) | Treated as `runtime:` |

---

## CLI Reference

All commands are available through the unified CLI:

```bash
npx tsx scripts/metamode-cli.ts [command] [options]
```

### Available Commands

| Command | Description |
|---------|-------------|
| `status` | Show overall MetaMode status for the project |
| `parse [path]` | Parse @mm: annotations from files or directories |
| `validate` | Validate @mm: annotations (semantic + schema) |
| `migrate [--apply]` | Migrate v1.x metamode.json → v2.0 @mm: |
| `compile [--stats]` | Compile v2.0 annotations into a database |
| `context [--agent ...]` | Build AI context from v2.0 database |
| `optimize [--stats]` | Production optimization (strip internal entries) |
| `generate-tests` | Generate test stubs for @mm: annotated modules |
| `help` | Show help message |

### npm script shortcuts

```bash
# Status overview
npx tsx scripts/metamode-cli.ts status

# Migration
npm run metamode:migrate          # Preview migration
npm run metamode:migrate:apply    # Apply migration

# Validation
npm run metamode:validate         # v1.x validation (metamode.json)
npm run metamode:validate:semantic  # v2.0 semantic validation

# DB compilation
npm run metamode:db:compile       # Compile with stats
npm run metamode:db:graph         # Show dependency graph

# Context building (AI)
npm run metamode:context          # Generic context
npm run metamode:ai:context       # CodeGen agent context

# Production optimization
npm run metamode:prod:optimize    # Analyze size reduction
npm run metamode:prod:analyze     # Detailed analysis

# Test generation
npm run metamode:generate-tests      # Generate test files
npm run metamode:generate-tests:dry  # Preview only
```

---

## Runtime API (v2.0)

After adding `@mm:` annotations, access them at runtime:

```typescript
import mm from 'virtual:metamode/v2/db'

// Find annotation by ID
const editor = mm.findById('param_editor')
console.log(editor?.desc)

// Search with filters
const stableUI = mm.findAll({
  tags: ['ui'],
  status: 'stable',
})

// Dependency graph
const deps = mm.getDependencies('param_editor', { type: 'runtime' })
const dependents = mm.getDependents('shader_utils')

// Detect cycles
const hasCycle = mm.detectCycle('param_editor')
const allCycles = mm.findAllCycles()

// Export AI context
const ctx = mm.exportForLLM({
  scope: ['ui', 'lib'],
  format: 'compact',
  limit: 50,
})

// Validate (dev only)
const { valid, errors, warnings } = mm.validate()

// Statistics
console.log(mm.stats.totalAnnotations)
console.log(mm.buildInfo.version) // '2.0.0'
```

### Production database

```typescript
// Always production-stripped (safe for any build mode):
import mmProd from 'virtual:metamode/v2/db/prod'
```

The production database has `visibility: 'internal'` entries removed and dev-only fields stripped.

---

## Validation

### Semantic validation rules

| Rule | Description |
|------|-------------|
| `unique-id-per-scope` | Each `@mm:id` must be unique across the project |
| `required-fields-present` | `@mm:id` and `@mm:desc` are required |
| `valid-status-value` | Status must be one of the allowed values |
| `valid-visibility` | Visibility must be `public` or `internal` |
| `no-self-dependency` | An entity cannot depend on itself |
| `deps-exist` | All referenced dependency IDs must exist |
| `schema-validates` | Annotation must conform to `schemas/mm-annotation.schema.json` |

### Running validation in CI

Add to your CI pipeline:

```bash
npm run metamode:validate:semantic
```

Or use the unified CLI with exit code checking:

```bash
npx tsx scripts/metamode-cli.ts validate
# Exits with code 1 if there are validation errors
```

---

## Step-by-Step Migration Example

### Before: Directory with metamode.json

```
src/components/
├── metamode.json         ← v1.x metadata
├── ParamEditor.vue
└── ColorPicker.vue
```

`src/components/metamode.json`:
```json
{
  "name": "components",
  "description": "Vue UI components for parameter editing",
  "tags": ["vue", "ui"],
  "files": {
    "ParamEditor.vue": {
      "description": "Parameter editor with undo/redo",
      "status": "stable",
      "phase": 5,
      "tags": ["editor", "params"]
    },
    "ColorPicker.vue": {
      "description": "Color picker for gradient editing",
      "status": "beta",
      "tags": ["color", "ui"]
    }
  }
}
```

### After: @mm: annotations inline in Vue components

`src/components/ParamEditor.vue`:
```vue
<script setup lang="ts">
/**
 * @mm:id=param_editor
 * @mm:name=ParamEditor
 * @mm:desc=Parameter editor with undo/redo
 * @mm:status=stable
 * @mm:phase=5
 * @mm:tags=editor,params,ui,vue
 * @mm:visibility=public
 * @mm:deps=runtime:lib/params,runtime:lib/history
 */

import { ref } from 'vue'
// ... component code
</script>
```

`src/components/ColorPicker.vue`:
```vue
<script setup lang="ts">
/**
 * @mm:id=color_picker
 * @mm:name=ColorPicker
 * @mm:desc=Color picker for gradient editing
 * @mm:status=beta
 * @mm:tags=color,ui,vue
 * @mm:visibility=public
 */

import { ref, computed } from 'vue'
// ... component code
</script>
```

---

## Troubleshooting

### "Duplicate @mm:id" error

Each annotation ID must be unique across the entire project. Use descriptive, namespaced IDs:

```
param_editor         ← Good
components_param_editor  ← More specific if needed
```

### "Required field @mm:desc is missing"

Every annotation must have both `@mm:id` and `@mm:desc`:

```typescript
/**
 * @mm:id=my_module
 * @mm:desc=Description of what this module does
 */
```

### Annotations in test files causing errors

Test files often use mock annotations with duplicate IDs for testing purposes. The semantic validator may report errors from these files. You can either:

1. Use unique IDs in test files
2. Exclude test files from the scan (the validator skips `node_modules`, `dist`, `.git`)

### Migration generates wrong ID for a directory

The ID is auto-generated from the directory name. If you get an ID like `gh_issue_solver_1771478505708` for the root, you can manually set a better ID in your annotations:

```typescript
/**
 * @mm:id=isocubic_root    ← Override the generated ID
 * @mm:name=isocubic
 * @mm:desc=3D voxel cube editor
 */
```

---

## Further Resources

- [MetaMode Specification](../metamode.md)
- [Phase 13 Development Log](phase-13.md)
- [MetaMode JSON Schema](../schemas/mm-annotation.schema.json)
- [Runtime API Types](../env.d.ts)

---

**Back to [README](../README.md)** | **Phase 13: [phase-13.md](phase-13.md)**
