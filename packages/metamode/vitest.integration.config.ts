/**
 * Vitest integration test configuration for @netkeep80/metamode
 *
 * TASK 91: @netkeep80/metamode Phase 4 — Интеграционный тест использования пакета
 * Phase 14: @netkeep80/metamode NPM Package — Build System & Publishing Infrastructure
 *
 * Runs integration tests from examples/basic-app/ that import from dist/.
 * Run `npm run build` before running integration tests.
 */

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['examples/**/*.test.ts'],
  },
})
