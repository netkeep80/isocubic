<!--
  Basic Usage Example for @isocubic/metamode

  Demonstrates how to integrate MetaMode into a Vue.js 3.0 application.

  TASK 72: Unified DevMode + GodMode → MetaMode (Phase 12)
  TASK 79: Updated example to use MetaMode API (Phase 12)
-->

<script setup lang="ts">
import { computed } from 'vue'
import { provideMetaMode } from '../src'
import type { ComponentRegistry, MetaModeConfig } from '../src'

// ============================================================================
// Component Registry (optional)
// ============================================================================

const myComponentRegistry: ComponentRegistry = {
  getAllComponents: () => [
    {
      id: 'header',
      name: 'Header',
      description: 'Application header with navigation',
      category: 'layout',
      tags: ['navigation', 'header'],
    },
    {
      id: 'sidebar',
      name: 'Sidebar',
      description: 'Side navigation panel',
      category: 'layout',
      tags: ['navigation', 'sidebar'],
    },
    {
      id: 'user-profile',
      name: 'UserProfile',
      description: 'User profile card with avatar',
      category: 'user',
      tags: ['user', 'profile', 'avatar'],
    },
  ],
  searchComponents: (query: string) => {
    const all = myComponentRegistry.getAllComponents()
    const lower = query.toLowerCase()
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.description.toLowerCase().includes(lower) ||
        c.tags?.some((t) => t.includes(lower))
    )
  },
}

// Suppress unused variable warning for example registry
void myComponentRegistry

// ============================================================================
// MetaMode Configuration
// ============================================================================

const metaModeConfig: MetaModeConfig = {
  github: {
    owner: 'my-org',
    repo: 'my-app',
    defaultLabels: ['from-metamode'],
  },
  preferredLanguage: 'en',
  tabs: ['conversation', 'issues', 'search'],
  storageKeyPrefix: 'my_app_metamode',
  persistState: true,
  shortcuts: {
    toggleWindow: 'Ctrl+Shift+M',
  },
}

// ============================================================================
// Provide MetaMode context
// ============================================================================

const metaMode = provideMetaMode(metaModeConfig)

// ============================================================================
// Toggle Button State
// ============================================================================

const isVisible = computed(() => metaMode.isVisible)
const isPinned = computed(() => metaMode.windowState.isPinned)

function handleToggle() {
  metaMode.toggleWindow()
}

const toggleButtonStyle = computed(() => ({
  position: 'fixed' as const,
  bottom: '20px',
  right: '20px',
  padding: '12px 20px',
  backgroundColor: isVisible.value ? '#8b5cf6' : '#1f2937',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  zIndex: 10000,
  fontSize: '14px',
  fontWeight: 600,
}))
</script>

<template>
  <div style="padding: 20px">
    <h1>My Application</h1>
    <p>Press Ctrl+Shift+M or click the button to open MetaMode.</p>

    <!-- Your application content -->
    <main>
      <p>Application content goes here...</p>
    </main>

    <!-- MetaMode toggle button -->
    <button :style="toggleButtonStyle" @click="handleToggle">
      {{ isVisible ? 'Close' : 'Open' }} MetaMode
      {{ isPinned ? ' (Pinned)' : '' }}
    </button>
  </div>
</template>
