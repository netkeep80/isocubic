/**
 * Vite Library Mode configuration for @isocubic/metamode package
 *
 * TASK 88: @isocubic/metamode Phase 1 — Vite Library Mode build configuration
 * Phase 14: @isocubic/metamode NPM Package — Build System & Publishing Infrastructure
 *
 * Builds the package in Library Mode for npm publishing:
 * - ES Module output (dist/metamode.js) for modern bundlers with tree-shaking
 * - CommonJS output (dist/metamode.cjs) for Node.js compatibility
 * - TypeScript declarations (dist/index.d.ts) for TypeScript users
 * - Vue and Vue Router are externalized as peer dependencies
 */

import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      // Entry point for the library
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'IsocubicMetamode',
      // Output file names (without extension — Vite adds .js, .cjs, .d.ts)
      fileName: 'metamode',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      // Externalize peer dependencies — consumers provide these themselves
      external: ['vue'],
      output: {
        // Global variable name for UMD builds (unused but required by Rollup)
        globals: {
          vue: 'Vue',
        },
      },
    },
    // Generate source maps for debugging
    sourcemap: true,
    // Clean dist/ before each build
    emptyOutDir: true,
  },
})
