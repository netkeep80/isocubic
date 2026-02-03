/**
 * @isocubic/metamode
 *
 * MetaMode — Unified floating development window with AI conversation,
 * GitHub issue generation, screen capture & annotations for Vue.js 3.0 apps.
 *
 * TASK 72: Unified DevMode + GodMode → MetaMode (Phase 12)
 *
 * ## Quick Start
 *
 * ```vue
 * <script setup lang="ts">
 * import { provideMetaMode, useMetaMode } from '@isocubic/metamode'
 *
 * // In root component (App.vue)
 * provideMetaMode({
 *   github: { owner: 'my-org', repo: 'my-repo' },
 *   preferredLanguage: 'en',
 *   storageKeyPrefix: 'my_app_metamode',
 * })
 *
 * // In any child component
 * const { toggleWindow, isVisible } = useMetaMode()
 * </script>
 * ```
 */

// =============================================================================
// Types — Common
// =============================================================================
export type { QueryLanguage, ComponentMeta, ComponentRegistry } from './types/common'
export { detectLanguage, DEFAULT_COMPONENT_REGISTRY } from './types/common'

// =============================================================================
// Types — MetaMode window, tabs, conversation
// =============================================================================
export type {
  MetaModeTab,
  MetaModeTabInfo,
  WindowAnchor,
  WindowPosition,
  WindowSize,
  WindowState,
  KeyboardShortcuts,
  MetaModeConfig,
  MetaModeWindowState,
  DragState,
  ResizeState,
  MetaModeContextValue,
  ConversationRole,
  ConversationMessageContext,
  ConversationMessage,
  ConversationSession,
  ConversationPanelSettings,
  ConversationSuggestion,
} from './types/metamode'

export {
  METAMODE_TABS,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_WINDOW_POSITION,
  DEFAULT_KEYBOARD_SHORTCUTS,
  DEFAULT_METAMODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  DEFAULT_CONVERSATION_SETTINGS,
  CONVERSATION_SUGGESTIONS,
  getStorageKey,
  loadMetaModeState,
  saveMetaModeState,
  isValidTab,
  getTabInfo,
  getAvailableTabs,
  clamp,
  constrainPosition,
  constrainSize,
  parseShortcut,
  matchesShortcut,
  getConversationStorageKey,
  generateMessageId,
  generateSessionId,
  createMessage,
  createSession,
  loadConversationSession,
  saveConversationSession,
  clearConversationSession,
} from './types/metamode'

// =============================================================================
// Types — Issue Generator
// =============================================================================
export type {
  IssueType,
  IssuePriority,
  IssueAnnotationType,
  IssueAnnotation,
  IssueScreenshot,
  IssueDraft,
  IssueTemplate,
  IssueTemplatePlaceholder,
  IssueDraftSettings,
} from './types/issue-generator'

export {
  DEFAULT_ISSUE_DRAFT_SETTINGS,
  BUILTIN_ISSUE_TEMPLATES,
  LABEL_COLORS,
  PRIORITY_LABELS,
  TYPE_LABELS,
  getDefaultLabels,
  validateIssueDraft,
  generateDraftId,
  createIssueDraft,
  getIssueDraftStorageKey,
  MAX_DRAFTS_COUNT,
  DRAFT_AUTO_SAVE_INTERVAL,
} from './types/issue-generator'

// =============================================================================
// Components — MetaModeProvider (Vue provide/inject)
// =============================================================================
export {
  provideMetaMode,
  useMetaMode,
  METAMODE_KEY,
  // Backward compatibility aliases (deprecated)
  provideGodMode,
  useGodMode,
  GOD_MODE_KEY,
} from './components/MetaModeProvider'
export type { MetaModeProviderProps, GodModeProviderProps } from './components/MetaModeProvider'

// =============================================================================
// Backward Compatibility — Type Aliases (deprecated)
// =============================================================================
// These aliases are provided for backward compatibility and will be removed in future versions

/** @deprecated Use MetaModeTab instead */
export type { MetaModeTab as GodModeTab } from './types/metamode'

/** @deprecated Use MetaModeTabInfo instead */
export type { MetaModeTabInfo as GodModeTabInfo } from './types/metamode'

/** @deprecated Use MetaModeConfig instead */
export type { MetaModeConfig as GodModeConfig } from './types/metamode'

/** @deprecated Use MetaModeWindowState instead */
export type { MetaModeWindowState as GodModeWindowState } from './types/metamode'

/** @deprecated Use MetaModeContextValue instead */
export type { MetaModeContextValue as GodModeContextValue } from './types/metamode'

/** @deprecated Use METAMODE_TABS instead */
export { METAMODE_TABS as GOD_MODE_TABS } from './types/metamode'

/** @deprecated Use DEFAULT_METAMODE_CONFIG instead */
export { DEFAULT_METAMODE_CONFIG as DEFAULT_GOD_MODE_CONFIG } from './types/metamode'

/** @deprecated Use loadMetaModeState instead */
export { loadMetaModeState as loadGodModeState } from './types/metamode'

/** @deprecated Use saveMetaModeState instead */
export { saveMetaModeState as saveGodModeState } from './types/metamode'
