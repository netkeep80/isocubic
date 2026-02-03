/**
 * MetaMode Usage Examples
 *
 * This file demonstrates how to use the MetaMode system in Vue components.
 * MetaMode provides a unified system for displaying component metadata,
 * AI-assisted development, and project documentation.
 *
 * TASK 78: Documentation MetaMode (Phase 12)
 */

// =============================================================================
// Example 1: Basic MetaMode Store Usage
// =============================================================================

import { useMetaModeStore, useIsMetaModeEnabled, useMetaMode } from '@/lib/metamode-store'

/**
 * Basic usage of the MetaMode store in a Vue component
 */
function basicStoreUsage() {
  // Get the Pinia store directly
  const store = useMetaModeStore()

  // Toggle MetaMode on/off
  store.toggleMetaMode()

  // Check if MetaMode is enabled
  console.log('MetaMode enabled:', store.settings.enabled)

  // Update settings
  store.updateSettings({
    verbosity: 'verbose',
    showOutline: true,
    showHoverInfo: true,
  })

  // Update a specific category
  store.updateCategory('dependencies', true)

  // Reset to default settings
  store.resetSettings()
}

// =============================================================================
// Example 2: Using Composables
// =============================================================================

/**
 * Using the useMetaMode composable for API compatibility
 */
function composableUsage() {
  // useMetaMode returns a context-like API
  const metaMode = useMetaMode()

  // Check enabled state
  if (metaMode.isEnabled) {
    console.log('MetaMode is active!')
  }

  // Toggle MetaMode
  metaMode.toggleMetaMode()

  // Update settings
  metaMode.updateSettings({
    panelPosition: 'bottom-right',
  })

  // Access settings
  console.log('Current verbosity:', metaMode.settings.verbosity)
}

/**
 * Using the reactive enabled state
 */
function reactiveEnabledState() {
  // useIsMetaModeEnabled returns a ComputedRef<boolean>
  const isEnabled = useIsMetaModeEnabled()

  // Use in templates with v-if="isEnabled.value"
  // Or watch for changes
  console.log('MetaMode enabled:', isEnabled.value)
}

// =============================================================================
// Example 3: Keyboard Shortcut Setup
// =============================================================================

/**
 * Setting up the MetaMode keyboard shortcut (Ctrl+Shift+M)
 *
 * Call this in your App.vue or root layout component:
 *
 * ```vue
 * <script setup lang="ts">
 * import { useMetaModeKeyboard } from '@/lib/metamode-store'
 *
 * // This sets up the Ctrl+Shift+M keyboard shortcut
 * useMetaModeKeyboard()
 * </script>
 * ```
 */

// =============================================================================
// Example 4: Component with Inline MetaMode Metadata
// =============================================================================

/**
 * Example Vue component with inline metamode metadata
 *
 * The JSDoc @metamode block is automatically extracted during build:
 *
 * ```vue
 * <script setup lang="ts">
 * /**
 *  * @metamode
 *  * desc: Custom cube editor with advanced features
 *  * status: stable
 *  * phase: 5
 *  * tags: [editor, cube, advanced]
 *  * deps: [ParamEditor, CubePreview]
 *  * ai: Advanced editor with real-time preview and undo/redo
 *  *\/
 *
 * import { ref } from 'vue'
 * // Component implementation...
 * </script>
 * ```
 */

// =============================================================================
// Example 5: Alternative Inline Metadata Format
// =============================================================================

/**
 * Alternative: Using a const object for inline metadata
 *
 * ```vue
 * <script setup lang="ts">
 * const metamode = {
 *   desc: 'Custom cube editor with advanced features',
 *   status: 'stable',
 *   phase: 5,
 *   tags: ['editor', 'cube', 'advanced'],
 *   deps: ['ParamEditor', 'CubePreview'],
 *   ai: 'Advanced editor with real-time preview and undo/redo',
 * }
 *
 * import { ref } from 'vue'
 * // Component implementation...
 * </script>
 * ```
 */

// =============================================================================
// Example 6: metamode.json File Structure
// =============================================================================

/**
 * Example metamode.json for a components directory
 *
 * Note: Files in the repository use the standard schema (metamode.schema.json)
 * with full field names. The compact format (metamode-compact.schema.json)
 * is used for AI-optimized output generated during build.
 *
 * Standard format (used in repository files):
 * ```json
 * {
 *   "$schema": "../metamode.schema.json",
 *   "name": "components",
 *   "description": "Vue UI components for the application",
 *   "tags": ["vue", "ui", "components"],
 *   "files": {
 *     "ParamEditor.vue": {
 *       "description": "Parameter editor for cube properties",
 *       "status": "stable",
 *       "phase": 5,
 *       "tags": ["editor", "params"]
 *     },
 *     "CubePreview.vue": {
 *       "description": "3D preview of the current cube",
 *       "status": "stable",
 *       "dependencies": ["ParametricCube"]
 *     }
 *   },
 *   "directories": {
 *     "windows": {
 *       "description": "Window-wrapped components for floating panels",
 *       "metamode": "windows/metamode.json"
 *     }
 *   }
 * }
 * ```
 *
 * Compact format (AI-optimized, generated during build via `virtual:metamode/ai`):
 * ```json
 * {
 *   "name": "components",
 *   "desc": "Vue UI components for the application",
 *   "ai": "All Vue SFC components for editor, preview, and panels",
 *   "files": {
 *     "ParamEditor.vue": { "desc": "Parameter editor", "status": "stable" }
 *   },
 *   "dirs": { "windows": "Window-wrapped components" }
 * }
 * ```
 */

// =============================================================================
// Example 7: Accessing Compiled MetaMode Data
// =============================================================================

/**
 * Accessing compiled metamode data via virtual modules
 *
 * ```typescript
 * // Import the flat map of all metamode entries
 * import metamode from 'virtual:metamode'
 *
 * // Access a specific entry
 * console.log(metamode['src/metamode.json'].desc)
 *
 * // Import the tree structure
 * import metamodeTree from 'virtual:metamode/tree'
 *
 * // Navigate the tree
 * console.log(metamodeTree.children?.src?.desc)
 *
 * // Import AI-optimized format (compact field names)
 * import aiMetamode from 'virtual:metamode/ai'
 *
 * // AI format uses shorter field names for token efficiency
 * console.log(aiMetamode['src/metamode.json'].desc)
 * ```
 */

// =============================================================================
// Example 8: MetaMode Settings Interface
// =============================================================================

/**
 * Full MetaMode settings interface for reference
 */
interface MetaModeSettingsExample {
  /** Whether MetaMode is enabled */
  enabled: boolean

  /** Verbosity level: 'minimal' | 'normal' | 'verbose' */
  verbosity: 'minimal' | 'normal' | 'verbose'

  /** Categories to display */
  categories: {
    basic: boolean // Name, summary, status
    history: boolean // Component history
    features: boolean // Feature list
    dependencies: boolean // Dependencies
    relatedFiles: boolean // Related files
    props: boolean // Props documentation
    tips: boolean // Tips and known issues
  }

  /** Show component outline/highlight on hover */
  showOutline: boolean

  /** Show floating info panel on hover */
  showHoverInfo: boolean

  /** Position for info panels */
  panelPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export { basicStoreUsage, composableUsage, reactiveEnabledState, type MetaModeSettingsExample }
