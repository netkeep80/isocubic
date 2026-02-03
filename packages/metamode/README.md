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

```vue
<script setup lang="ts">
import { provideMetaMode, useMetaMode } from '@isocubic/metamode'

// In App.vue setup
provideMetaMode({
  github: { owner: 'my-org', repo: 'my-repo' },
  preferredLanguage: 'en',
  storageKeyPrefix: 'my_app',
  tabs: ['conversation', 'issues'],
})
</script>

<template>
  <MyApp />
</template>
```

Toggle button example:

```vue
<script setup lang="ts">
import { useMetaMode } from '@isocubic/metamode'

const { toggleWindow, isVisible } = useMetaMode()
</script>

<template>
  <button @click="toggleWindow">
    {{ isVisible ? 'Close' : 'Open' }} MetaMode
  </button>
</template>
```

## Configuration

### MetaModeConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `github` | `{ owner, repo, defaultLabels? }` | — | GitHub repository for issue creation |
| `position` | `WindowPosition` | `{ x: 20, y: 80, anchor: 'top-right' }` | Initial window position |
| `size` | `Partial<WindowSize>` | `500x600` | Initial window size |
| `tabs` | `MetaModeTab[]` | `['query', 'context', 'search']` | Visible tabs |
| `shortcuts` | `Partial<KeyboardShortcuts>` | `{ toggleWindow: 'Ctrl+Shift+M' }` | Keyboard shortcuts |
| `preferredLanguage` | `'ru' \| 'en'` | `'ru'` | UI language |
| `persistState` | `boolean` | `true` | Save state to localStorage |
| `storageKeyPrefix` | `string` | `'metamode'` | localStorage key prefix |

### Component Registry

To connect your application's component metadata with MetaMode:

```typescript
import type { ComponentRegistry } from '@isocubic/metamode'

const myRegistry: ComponentRegistry = {
  getAllComponents: () => [
    { id: 'button', name: 'Button', description: 'Primary button component' },
    { id: 'modal', name: 'Modal', description: 'Modal dialog component' },
  ],
  searchComponents: (query) =>
    myComponents.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
}
```

## API Reference

### Components

- `provideMetaMode(config?)` — Vue provide/inject setup for state management
- `useMetaMode()` — Composable to access MetaMode state and actions

### Types

- `MetaModeConfig` — Configuration options
- `MetaModeWindowState` — Window state (position, size, tab, pin)
- `MetaModeTab` — Tab identifiers: `'query' | 'context' | 'search' | 'conversation' | 'issues'`
- `ConversationMessage` — Chat message structure
- `ConversationSession` — Conversation session with history
- `IssueDraft` — GitHub issue draft structure
- `IssueTemplate` — Structured issue template
- `ComponentMeta` — Component metadata for AI context
- `ComponentRegistry` — Interface for providing component metadata

### Utility Functions

- `loadMetaModeState(prefix?)` — Load window state from localStorage
- `saveMetaModeState(state, prefix?)` — Save window state
- `createMessage(role, content, context?)` — Create conversation message
- `createSession(language?)` — Create new conversation session
- `createIssueDraft(overrides?)` — Create issue draft with defaults
- `validateIssueDraft(draft)` — Validate draft structure
- `matchesShortcut(event, shortcut)` — Check keyboard shortcut match
- `detectLanguage(text)` — Detect Russian/English text language

## Migration from @isocubic/god-mode

If you were using the previous `@isocubic/god-mode` package, here's how to migrate:

```typescript
// Before (deprecated)
import { provideGodMode, useGodMode, GodModeConfig } from '@isocubic/god-mode'

// After
import { provideMetaMode, useMetaMode, MetaModeConfig } from '@isocubic/metamode'
```

Backward compatibility aliases are provided for a smooth transition, but they will be removed in a future version.

## License

Unlicense
