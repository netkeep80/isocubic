/**
 * test-utils.ts — Utilities for testing window wrapper components
 * Phase 11, TASK 74: Window wrapper components
 */

import { vi } from 'vitest'

// Mock ComponentInfo to avoid Pinia dependency in tests
vi.mock('../ComponentInfo.vue', () => ({
  default: {
    name: 'ComponentInfo',
    template: '<div><slot /></div>',
  },
}))

// Mock Pinia stores for components that need them
vi.mock('../lib/metamode-store', () => ({
  useIsMetaModeEnabled: () => false,
  useHoveredComponentId: () => ref(null),
  useMetaModeKeyboard: () => {},
}))

vi.mock('../lib/auth', () => ({
  useAuthStore: () => ({
    initialize: () => {},
  }),
}))
