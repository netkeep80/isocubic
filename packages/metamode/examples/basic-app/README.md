# @netkeep80/metamode — Integration Test Example

This directory contains an integration test that demonstrates and verifies usage of `@netkeep80/metamode` from the **built `dist/` artifact** (not from `src/`).

## Purpose

Unlike unit tests (which import from `src/`), this integration test:

- Imports all public API from `dist/metamode.js` — the actual built package file
- Verifies that the build process produces working, correctly exported modules
- Simulates how a real consumer would use `@netkeep80/metamode` after installing it from npm

## Running the Integration Test

```bash
# From packages/metamode/ directory:

# 1. Build the package first (required)
npm run build

# 2. Run integration tests
npm run test:integration
```

## What Is Tested

The integration test covers all major public exports from `dist/`:

| Category | Exports Tested |
|----------|---------------|
| Core composables | `provideMetaMode`, `useMetaMode`, `METAMODE_KEY` |
| Language detection | `detectLanguage`, `DEFAULT_COMPONENT_REGISTRY` |
| Tab utilities | `METAMODE_TABS`, `isValidTab`, `getTabInfo`, `getAvailableTabs` |
| Window utilities | `clamp`, `constrainPosition`, `constrainSize` |
| Keyboard shortcuts | `parseShortcut`, `matchesShortcut` |
| State persistence | `loadMetaModeState`, `saveMetaModeState` |
| Conversation | `createMessage`, `createSession` |
| Issue drafts | `createIssueDraft`, `validateIssueDraft`, `getDefaultLabels` |
| Constants | `DEFAULT_METAMODE_CONFIG`, `DEFAULT_WINDOW_STATE`, `BUILTIN_ISSUE_TEMPLATES` |

## Vue.js Integration

To use `@netkeep80/metamode` in a real Vue.js 3.0 application:

```vue
<script setup lang="ts">
import { provideMetaMode, useMetaMode } from '@netkeep80/metamode'

// In your root App.vue component:
provideMetaMode({
  github: { owner: 'my-org', repo: 'my-repo' },
  preferredLanguage: 'en',
  storageKeyPrefix: 'my_app_metamode',
})
</script>
```

```vue
<script setup lang="ts">
import { useMetaMode } from '@netkeep80/metamode'

// In any child component:
const { toggleWindow, isVisible } = useMetaMode()
</script>
```

See `../basic-usage.vue` for a complete Vue SFC example.
