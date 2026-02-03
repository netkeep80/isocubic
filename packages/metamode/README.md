# @isocubic/metamode

MetaMode — unified floating development window with AI conversation, GitHub issue generation, screen capture & annotations for Vue.js 3.0 applications.

## Features

- **Floating MetaMode Window** — draggable, resizable window with tabbed interface
- **AI Conversation Agent** — natural language dialog for discussing improvements
- **Issue Draft Generator** — automatic GitHub issue creation from conversations
- **Screen Capture & Annotation** — screenshot capture with drawing tools
- **GitHub Integration** — OAuth/PAT auth, issue creation, label management
- **Keyboard Shortcuts** — Ctrl+Shift+M to toggle, fully configurable
- **localStorage Persistence** — window state, conversations, drafts saved between sessions
- **Multi-language** — Russian and English UI support
- **Configurable** — storage key prefix, tabs, shortcuts, component registry

## Installation

```bash
npm install @isocubic/metamode
```

## Quick Start

### Basic Setup (App.vue)

```vue
<script setup lang="ts">
import { provideMetaMode } from '@isocubic/metamode'

// Provide MetaMode context to all child components
provideMetaMode({
  github: { owner: 'my-org', repo: 'my-repo' },
  preferredLanguage: 'en',
  storageKeyPrefix: 'my_app',
  tabs: ['conversation', 'issues'],
})
</script>

<template>
  <router-view />
</template>
```

### Using MetaMode in Components

```vue
<script setup lang="ts">
import { useMetaMode } from '@isocubic/metamode'

const { toggleWindow, isVisible, windowState, setActiveTab } = useMetaMode()
</script>

<template>
  <button @click="toggleWindow">
    {{ isVisible ? 'Close' : 'Open' }} MetaMode
  </button>
  <span v-if="windowState.isPinned">📌 Pinned</span>
</template>
```

## Configuration

### MetaModeConfig

| Property             | Type                                   | Default                               | Description                           |
| -------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------- |
| `github`             | `{ owner, repo, defaultLabels? }`      | —                                     | GitHub repository for issue creation  |
| `position`           | `WindowPosition`                       | `{ x: 20, y: 80, anchor: 'top-right'}` | Initial window position               |
| `size`               | `Partial<WindowSize>`                  | `500x600`                             | Initial window size                   |
| `tabs`               | `MetaModeTab[]`                        | `['query', 'context', 'search']`      | Visible tabs                          |
| `shortcuts`          | `Partial<KeyboardShortcuts>`           | `{ toggleWindow: 'Ctrl+Shift+M' }`    | Keyboard shortcuts                    |
| `preferredLanguage`  | `'ru' \| 'en'`                         | `'ru'`                                | UI language                           |
| `persistState`       | `boolean`                              | `true`                                | Save state to localStorage            |
| `storageKeyPrefix`   | `string`                               | `'metamode'`                          | localStorage key prefix               |

### Component Registry

To connect your application's component metadata with MetaMode:

```typescript
import type { ComponentRegistry, ComponentMeta } from '@isocubic/metamode'

const myRegistry: ComponentRegistry = {
  getAllComponents: (): ComponentMeta[] => [
    {
      id: 'button',
      name: 'Button',
      description: 'Primary button component',
      category: 'ui',
      tags: ['button', 'form', 'input'],
      status: 'stable'
    },
    {
      id: 'modal',
      name: 'Modal',
      description: 'Modal dialog component',
      category: 'ui',
      tags: ['modal', 'dialog', 'overlay'],
      status: 'stable'
    },
  ],
  searchComponents: (query: string): ComponentMeta[] =>
    myRegistry.getAllComponents().filter(
      (c) => c.name.toLowerCase().includes(query.toLowerCase())
    ),
}
```

## Public API Reference

### Provider & Composable

| Export             | Type       | Description                                                     |
| ------------------ | ---------- | --------------------------------------------------------------- |
| `provideMetaMode`  | Function   | Call in root component's setup to enable MetaMode               |
| `useMetaMode`      | Composable | Access MetaMode state and actions from any child component      |
| `METAMODE_KEY`     | Symbol     | Vue injection key for MetaMode context                          |

### MetaModeContextValue (returned by useMetaMode)

| Property          | Type                                  | Description                         |
| ----------------- | ------------------------------------- | ----------------------------------- |
| `windowState`     | `MetaModeWindowState`                 | Current window state (reactive)     |
| `config`          | `MetaModeConfig`                      | Configuration object                |
| `isVisible`       | `boolean`                             | Whether window is visible           |
| `openWindow`      | `() => void`                          | Open the MetaMode window            |
| `closeWindow`     | `() => void`                          | Close the MetaMode window           |
| `minimizeWindow`  | `() => void`                          | Toggle minimize state               |
| `toggleWindow`    | `() => void`                          | Toggle window visibility            |
| `setActiveTab`    | `(tab: MetaModeTab) => void`          | Set the active tab                  |
| `setPosition`     | `(pos: WindowPosition) => void`       | Update window position              |
| `setSize`         | `(size: Partial<WindowSize>) => void` | Update window size                  |
| `togglePin`       | `() => void`                          | Toggle pinned state                 |
| `resetState`      | `() => void`                          | Reset to default state              |

### Types

#### Window & UI Types

| Type                  | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `MetaModeTab`         | Tab identifiers: `'query' \| 'context' \| 'search' \| 'conversation' \| 'issues' \| 'tree'` |
| `MetaModeTabInfo`     | Tab metadata with id, icon, label                              |
| `WindowAnchor`        | Position anchor: `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` |
| `WindowPosition`      | Position with x, y, anchor                                     |
| `WindowSize`          | Window dimensions (width, height, minWidth, minHeight)         |
| `WindowState`         | Window state: `'open' \| 'closed' \| 'minimized'`              |
| `MetaModeWindowState` | Complete window state object                                   |
| `MetaModeConfig`      | Configuration options                                          |
| `KeyboardShortcuts`   | Shortcut mappings                                              |

#### Conversation Types

| Type                        | Description                            |
| --------------------------- | -------------------------------------- |
| `ConversationRole`          | Message role: `'user' \| 'assistant'`  |
| `ConversationMessage`       | Chat message structure                 |
| `ConversationMessageContext`| Optional context attached to messages  |
| `ConversationSession`       | Conversation session with history      |
| `ConversationSuggestion`    | Suggested questions/prompts            |

#### Issue Generator Types

| Type                   | Description                              |
| ---------------------- | ---------------------------------------- |
| `IssueType`            | Issue type: `'bug' \| 'feature' \| 'improvement' \| 'question'` |
| `IssuePriority`        | Priority: `'low' \| 'medium' \| 'high' \| 'critical'` |
| `IssueDraft`           | GitHub issue draft structure             |
| `IssueTemplate`        | Structured issue template                |
| `IssueAnnotation`      | Screenshot annotation data               |
| `IssueScreenshot`      | Screenshot with annotations              |

#### Component Types

| Type                | Description                          |
| ------------------- | ------------------------------------ |
| `ComponentMeta`     | Component metadata interface         |
| `ComponentRegistry` | Interface for providing components   |
| `QueryLanguage`     | Language: `'ru' \| 'en'`             |

### Utility Functions

#### State Management

```typescript
// Load/save window state
loadMetaModeState(prefix?: string): MetaModeWindowState
saveMetaModeState(state: MetaModeWindowState, prefix?: string): void

// Load/save conversation sessions
loadConversationSession(prefix?: string): ConversationSession | null
saveConversationSession(session: ConversationSession, prefix?: string): void
clearConversationSession(prefix?: string): void
```

#### Conversation Helpers

```typescript
// Create messages and sessions
createMessage(role: ConversationRole, content: string, context?: ConversationMessageContext): ConversationMessage
createSession(language?: QueryLanguage): ConversationSession
generateMessageId(): string
generateSessionId(): string
```

#### Issue Draft Helpers

```typescript
// Create and validate issue drafts
createIssueDraft(overrides?: Partial<IssueDraft>): IssueDraft
validateIssueDraft(draft: IssueDraft): { valid: boolean; errors: string[] }
generateDraftId(): string
getDefaultLabels(type: IssueType, priority: IssuePriority): string[]
```

#### Window Utilities

```typescript
// Position and size constraints
clamp(value: number, min: number, max: number): number
constrainPosition(pos: WindowPosition, size: WindowSize): WindowPosition
constrainSize(size: WindowSize): WindowSize

// Tab utilities
isValidTab(tab: string): tab is MetaModeTab
getTabInfo(tab: MetaModeTab): MetaModeTabInfo
getAvailableTabs(): MetaModeTabInfo[]
```

#### Keyboard Shortcuts

```typescript
// Shortcut parsing and matching
parseShortcut(shortcut: string): { ctrl: boolean; shift: boolean; alt: boolean; key: string }
matchesShortcut(event: KeyboardEvent, shortcut: string): boolean
```

#### Language Detection

```typescript
// Detect Russian/English text
detectLanguage(text: string): QueryLanguage
```

### Constants

| Constant                       | Description                          |
| ------------------------------ | ------------------------------------ |
| `METAMODE_TABS`                | Array of all available tabs          |
| `DEFAULT_WINDOW_SIZE`          | Default window dimensions            |
| `DEFAULT_WINDOW_POSITION`      | Default window position              |
| `DEFAULT_KEYBOARD_SHORTCUTS`   | Default keyboard shortcuts           |
| `DEFAULT_METAMODE_CONFIG`      | Default configuration                |
| `DEFAULT_WINDOW_STATE`         | Default window state                 |
| `DEFAULT_CONVERSATION_SETTINGS`| Default conversation settings        |
| `CONVERSATION_SUGGESTIONS`     | Built-in conversation suggestions    |
| `BUILTIN_ISSUE_TEMPLATES`      | Built-in issue templates             |
| `LABEL_COLORS`                 | GitHub label color mappings          |
| `PRIORITY_LABELS`              | Priority label mappings              |
| `TYPE_LABELS`                  | Type label mappings                  |
| `MAX_DRAFTS_COUNT`             | Maximum stored drafts                |
| `DRAFT_AUTO_SAVE_INTERVAL`     | Auto-save interval (ms)              |

## Migration from @isocubic/god-mode

If you were using the previous `@isocubic/god-mode` package:

```typescript
// Before (deprecated)
import { provideGodMode, useGodMode, GodModeConfig } from '@isocubic/god-mode'

// After
import { provideMetaMode, useMetaMode, MetaModeConfig } from '@isocubic/metamode'
```

Backward compatibility aliases are provided for a smooth transition, but they will be removed in a future version:
- `provideGodMode` → use `provideMetaMode`
- `useGodMode` → use `useMetaMode`
- `GOD_MODE_KEY` → use `METAMODE_KEY`
- `GodModeConfig` → use `MetaModeConfig`
- `GodModeTab` → use `MetaModeTab`
- `GodModeWindowState` → use `MetaModeWindowState`

## Examples

See the `examples/` directory for complete usage examples:
- `basic-usage.vue` — Basic integration with configuration
- `advanced-usage.ts` — Advanced TypeScript usage patterns

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

Requires Vue.js 3.5.0 or higher.

## License

Unlicense

## Contributing

Contributions are welcome! Please see the main [isocubic repository](https://github.com/netkeep80/isocubic) for contribution guidelines.
