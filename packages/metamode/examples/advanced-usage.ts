/**
 * Advanced TypeScript Usage Patterns for @isocubic/metamode
 *
 * Demonstrates advanced usage patterns including:
 * - Custom component registry integration
 * - Issue draft manipulation
 * - Conversation session management
 * - Keyboard shortcut handling
 *
 * TASK 79: Advanced usage example (Phase 12)
 */

import type {
  MetaModeConfig,
  MetaModeTab,
  ComponentRegistry,
  ComponentMeta,
  ConversationSession,
  ConversationMessage,
  IssueDraft,
  IssueType,
  IssuePriority,
  WindowPosition,
  WindowSize,
} from '../src'

import {
  DEFAULT_METAMODE_CONFIG,
  DEFAULT_WINDOW_STATE,
  createMessage,
  createSession,
  createIssueDraft,
  validateIssueDraft,
  getDefaultLabels,
  detectLanguage,
  matchesShortcut,
  parseShortcut,
  loadMetaModeState,
  saveMetaModeState,
  loadConversationSession,
  saveConversationSession,
  clearConversationSession,
  clamp,
  constrainPosition,
  constrainSize,
  isValidTab,
  getTabInfo,
  getAvailableTabs,
  METAMODE_TABS,
  BUILTIN_ISSUE_TEMPLATES,
  LABEL_COLORS,
} from '../src'

// ============================================================================
// Example 1: Custom Component Registry
// ============================================================================

/**
 * Create a component registry from application metadata.
 * This connects your app's component system with MetaMode's AI features.
 */
function createCustomRegistry(components: ComponentMeta[]): ComponentRegistry {
  return {
    getAllComponents: () => components,
    searchComponents: (query: string) => {
      const lower = query.toLowerCase()
      return components.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.description.toLowerCase().includes(lower) ||
          c.tags?.some((t) => t.toLowerCase().includes(lower)) ||
          c.category?.toLowerCase().includes(lower)
      )
    },
  }
}

// Example usage:
const appComponents: ComponentMeta[] = [
  {
    id: 'cube-editor',
    name: 'CubeEditor',
    description: 'Main editor component for parametric cubes',
    category: 'editors',
    path: 'src/components/CubeEditor.vue',
    tags: ['editor', '3d', 'cube', 'parametric'],
    version: '1.2.0',
    status: 'stable',
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'Gallery grid for displaying saved cubes',
    category: 'display',
    path: 'src/components/Gallery.vue',
    tags: ['gallery', 'grid', 'preview'],
    version: '1.0.0',
    status: 'stable',
  },
  {
    id: 'fft-visualizer',
    name: 'FFTVisualizer',
    description: 'Real-time FFT audio visualization',
    category: 'visualization',
    path: 'src/components/FFTVisualizer.vue',
    tags: ['fft', 'audio', 'visualization', 'wasm'],
    version: '0.9.0',
    status: 'beta',
  },
]

const myRegistry = createCustomRegistry(appComponents)
console.log('All components:', myRegistry.getAllComponents())
console.log('Search "editor":', myRegistry.searchComponents('editor'))

// ============================================================================
// Example 2: Custom MetaMode Configuration
// ============================================================================

/**
 * Create a fully customized MetaMode configuration.
 */
function createCustomConfig(overrides: Partial<MetaModeConfig> = {}): MetaModeConfig {
  return {
    ...DEFAULT_METAMODE_CONFIG,
    github: {
      owner: 'my-organization',
      repo: 'my-application',
      defaultLabels: ['from-metamode', 'needs-review'],
    },
    position: {
      x: 50,
      y: 100,
      anchor: 'top-right',
    },
    size: {
      width: 600,
      height: 700,
      minWidth: 400,
      minHeight: 300,
    },
    tabs: ['conversation', 'issues', 'tree', 'search'] as MetaModeTab[],
    shortcuts: {
      toggleWindow: 'Ctrl+Shift+M',
    },
    preferredLanguage: 'en',
    persistState: true,
    storageKeyPrefix: 'my_app_metamode',
    ...overrides,
  }
}

const customConfig = createCustomConfig()
console.log('Custom config:', customConfig)

// ============================================================================
// Example 3: Conversation Management
// ============================================================================

/**
 * Demonstrates conversation session management.
 */
function conversationExample(): void {
  // Create a new session
  const session: ConversationSession = createSession('en')
  console.log('New session:', session)

  // Add messages to the session
  const userMessage: ConversationMessage = createMessage(
    'user',
    'How can I improve the performance of the cube rendering?',
    { componentId: 'cube-editor', timestamp: Date.now() }
  )

  const assistantMessage: ConversationMessage = createMessage(
    'assistant',
    'You can optimize cube rendering by: 1) Using LOD levels, 2) Implementing frustum culling, 3) Batching draw calls for similar cubes.'
  )

  session.messages.push(userMessage, assistantMessage)
  console.log('Session with messages:', session)

  // Save and load session
  saveConversationSession(session, 'my_app')
  const loadedSession = loadConversationSession('my_app')
  console.log('Loaded session:', loadedSession)

  // Clear session when done (demonstrates cleanup)
  clearConversationSession('my_app')
  console.log('Session cleared')
}

// ============================================================================
// Example 4: Issue Draft Creation
// ============================================================================

/**
 * Demonstrates issue draft creation and validation.
 */
function issueDraftExample(): void {
  // Create a bug report draft
  const bugDraft: IssueDraft = createIssueDraft({
    type: 'bug',
    priority: 'high',
    title: 'Cube rendering fails on Safari',
    description: 'When opening the editor on Safari 14+, cubes render as black boxes.',
    stepsToReproduce: [
      'Open Safari 14+',
      'Navigate to cube editor',
      'Create a new cube',
      'Observe black rendering',
    ],
    expectedBehavior: 'Cubes should render with correct colors and shading',
    actualBehavior: 'Cubes appear as solid black boxes',
    environment: {
      browser: 'Safari 14.1',
      os: 'macOS 11.4',
      device: 'MacBook Pro 2020',
    },
  })

  // Validate the draft
  const validation = validateIssueDraft(bugDraft)
  console.log('Bug draft valid:', validation.valid)
  if (!validation.valid) {
    console.log('Validation errors:', validation.errors)
  }

  // Get default labels for the issue
  const labels = getDefaultLabels('bug' as IssueType, 'high' as IssuePriority)
  console.log('Issue labels:', labels)
  console.log('Bug draft:', bugDraft)

  // Create a feature request
  const featureDraft: IssueDraft = createIssueDraft({
    type: 'feature',
    priority: 'medium',
    title: 'Add WebGPU rendering support',
    description: 'Implement WebGPU backend for improved performance on supported browsers.',
  })
  console.log('Feature draft:', featureDraft)
}

// ============================================================================
// Example 5: Window State Management
// ============================================================================

/**
 * Demonstrates window state persistence and manipulation.
 */
function windowStateExample(): void {
  const storagePrefix = 'my_app'

  // Load persisted state (or get defaults)
  const state = loadMetaModeState(storagePrefix)
  console.log('Loaded state:', state)

  // Modify state
  const newPosition: WindowPosition = { x: 100, y: 150, anchor: 'top-left' }
  const newSize: WindowSize = { width: 700, height: 800, minWidth: 400, minHeight: 300 }

  // Constrain position and size to valid values
  const constrainedPosition = constrainPosition(newPosition, newSize)
  const constrainedSize = constrainSize(newSize)

  console.log('Constrained position:', constrainedPosition)
  console.log('Constrained size:', constrainedSize)

  // Update and save state
  const updatedState = {
    ...state,
    position: constrainedPosition,
    size: constrainedSize,
    activeTab: 'conversation' as MetaModeTab,
  }
  saveMetaModeState(updatedState, storagePrefix)
  console.log('Saved state:', updatedState)
}

// ============================================================================
// Example 6: Keyboard Shortcut Handling
// ============================================================================

/**
 * Demonstrates keyboard shortcut parsing and matching.
 */
function keyboardShortcutExample(): void {
  // Parse a shortcut string
  const parsed = parseShortcut('Ctrl+Shift+M')
  console.log('Parsed shortcut:', parsed)
  // Output: { ctrl: true, shift: true, alt: false, key: 'm' }

  // Create a mock keyboard event
  const mockEvent = {
    ctrlKey: true,
    shiftKey: true,
    altKey: false,
    metaKey: false,
    key: 'M',
    preventDefault: () => {},
  } as unknown as KeyboardEvent

  // Check if event matches shortcut
  const matches = matchesShortcut(mockEvent, 'Ctrl+Shift+M')
  console.log('Event matches Ctrl+Shift+M:', matches) // true

  // Example usage in a component:
  // window.addEventListener('keydown', (e) => {
  //   if (matchesShortcut(e, 'Ctrl+Shift+M')) {
  //     e.preventDefault()
  //     toggleMetaModeWindow()
  //   }
  // })
}

// ============================================================================
// Example 7: Language Detection
// ============================================================================

/**
 * Demonstrates automatic language detection.
 */
function languageDetectionExample(): void {
  const russianText = 'Как улучшить производительность рендеринга кубиков?'
  const englishText = 'How can I improve cube rendering performance?'
  const mixedText = 'Привет! How are you doing?'

  console.log('Russian text language:', detectLanguage(russianText)) // 'ru'
  console.log('English text language:', detectLanguage(englishText)) // 'en'
  console.log('Mixed text language:', detectLanguage(mixedText)) // 'ru' (has Cyrillic)
}

// ============================================================================
// Example 8: Tab Management
// ============================================================================

/**
 * Demonstrates tab utilities.
 */
function tabManagementExample(): void {
  // Get all available tabs
  const allTabs = getAvailableTabs()
  console.log('All available tabs:', allTabs)

  // Check if a string is a valid tab
  console.log('Is "conversation" a valid tab:', isValidTab('conversation')) // true
  console.log('Is "invalid" a valid tab:', isValidTab('invalid')) // false

  // Get info about a specific tab
  const conversationTabInfo = getTabInfo('conversation')
  console.log('Conversation tab info:', conversationTabInfo)

  // List all tab IDs
  console.log('MetaMode tabs:', METAMODE_TABS)
}

// ============================================================================
// Example 9: Using Built-in Templates and Colors
// ============================================================================

/**
 * Demonstrates using built-in templates and constants.
 */
function templatesAndColorsExample(): void {
  // Access built-in issue templates
  console.log('Built-in issue templates:', BUILTIN_ISSUE_TEMPLATES)

  // Access label colors for GitHub
  console.log('Label colors:', LABEL_COLORS)
}

// ============================================================================
// Example 10: Utility Functions
// ============================================================================

/**
 * Demonstrates various utility functions.
 */
function utilityFunctionsExample(): void {
  // Clamp a value to a range
  console.log('clamp(150, 0, 100):', clamp(150, 0, 100)) // 100
  console.log('clamp(-10, 0, 100):', clamp(-10, 0, 100)) // 0
  console.log('clamp(50, 0, 100):', clamp(50, 0, 100)) // 50

  // Get default window state
  console.log('Default window state:', DEFAULT_WINDOW_STATE)
}

// ============================================================================
// Run Examples
// ============================================================================

export function runAllExamples(): void {
  console.log('=== Running @isocubic/metamode Advanced Examples ===\n')

  console.log('--- Example 1: Custom Component Registry ---')
  // Registry already demonstrated above

  console.log('\n--- Example 2: Custom Configuration ---')
  // Config already demonstrated above

  console.log('\n--- Example 3: Conversation Management ---')
  conversationExample()

  console.log('\n--- Example 4: Issue Draft Creation ---')
  issueDraftExample()

  console.log('\n--- Example 5: Window State Management ---')
  windowStateExample()

  console.log('\n--- Example 6: Keyboard Shortcuts ---')
  keyboardShortcutExample()

  console.log('\n--- Example 7: Language Detection ---')
  languageDetectionExample()

  console.log('\n--- Example 8: Tab Management ---')
  tabManagementExample()

  console.log('\n--- Example 9: Templates and Colors ---')
  templatesAndColorsExample()

  console.log('\n--- Example 10: Utility Functions ---')
  utilityFunctionsExample()

  console.log('\n=== All Examples Complete ===')
}

// Export for use in other files
export {
  createCustomRegistry,
  createCustomConfig,
  conversationExample,
  issueDraftExample,
  windowStateExample,
  keyboardShortcutExample,
  languageDetectionExample,
  tabManagementExample,
  templatesAndColorsExample,
  utilityFunctionsExample,
}
