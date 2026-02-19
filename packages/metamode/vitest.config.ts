/**
 * Vitest configuration for @isocubic/metamode package tests
 *
 * TASK 90: @isocubic/metamode Phase 3 — Тесты пакета с @vue/test-utils
 * Phase 14: @isocubic/metamode NPM Package — Build System & Publishing Infrastructure
 */

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/**/*.test.ts', 'src/**/*.d.ts'],
    },
  },
})
