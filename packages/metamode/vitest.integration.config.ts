/**
 * Vitest integration test configuration for @isocubic/metamode
 *
 * TASK 91: @isocubic/metamode Phase 4 — Интеграционный тест использования пакета
 * Phase 14: @isocubic/metamode NPM Package — Build System & Publishing Infrastructure
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
