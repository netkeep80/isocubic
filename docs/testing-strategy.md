# Testing Strategy

This document defines the testing contract for `isocubic`. Tests are not a final verification step after implementation; they are the safety boundary that allows the project to be refactored.

## Core rule: characterize before refactoring

For existing behavior:

1. Add or identify a test that captures the observable contract.
2. Confirm the test passes before structural changes.
3. Refactor behind that contract.
4. Keep the smallest meaningful regression test for every bug fixed.
5. Do not preserve duplicate legacy implementations only to make migration feel safer. Git keeps the history; tests keep the behavior.

A PR that changes core behavior must explain which tests prove the intended behavior and which tests would fail if the change regressed.

## Test taxonomy

### Unit tests

Fast tests for pure functions, isolated modules and focused Vue components.

- Location: colocated `*.test.ts` / `*.spec.ts` files under `src/`.
- Environment: Vitest, usually `jsdom` for Vue/browser-facing modules.
- Command: `npm run test:unit`.
- Must not depend on external network services.

### Contract tests

Tests for stable boundaries and invariants rather than implementation details.

Examples:

- cube constructors produce schema-valid objects;
- default objects do not share mutable state;
- schema/type/default assumptions stay compatible;
- import/export round trips preserve canonical data;
- shader adapters provide required uniforms;
- public package exports remain consumable.

Contract tests may live next to the boundary they protect or in `src/test/` when they span multiple modules.

### Integration tests

Tests that exercise multiple application modules together without claiming to be a real browser test.

The current files under `src/e2e/` are **Vitest/jsdom integration tests**. They are valuable, but they do not prove that WebGL, browser layout, Vite production serving or real browser APIs work end to end.

- Command: `npm run test:integration`.
- CI command for all current root tests: `npm run test:ci`.
- Renaming/reorganizing `src/e2e/` is tracked separately; the semantic distinction is mandatory immediately.

### Browser E2E tests

Real Chromium tests are tracked by issue #305.

They must cover at least:

- application startup without uncaught runtime errors;
- edit a cube and keep the preview operational;
- export JSON, import it again and recover equivalent state;
- persistence across reload;
- a non-brittle WebGL/Tres rendering smoke check.

A jsdom test must never be presented as evidence that a browser rendering path works.

### Numerical tests

FFT, energy, boundary stitching and rendering math require numerical tests in addition to UI tests.

Requirements:

- use known vectors/fixtures where possible;
- document floating-point tolerance explicitly;
- use fixed seeds for generated/property cases;
- compare JS and WASM implementations on the same inputs where both exist;
- test invariants such as round trips and energy conservation where mathematically applicable.

Tracked by issues #302 and #303.

### Performance tests

Performance claims require reproducible measurements, not manual impressions.

Issue #308 will establish measured baselines for CPU work, browser frame/startup behavior and production bundle size. Thresholds must be derived from measured baselines and account for CI noise; arbitrary aspirational numbers are not acceptable gates.

## Determinism rules

Tests must be reproducible.

- Freeze or inject the clock when timestamps matter.
- Inject/fix random seeds when randomness matters.
- Do not call external APIs or LLM services in the default CI suite.
- Mock only at architectural boundaries; avoid mocking the implementation being tested.
- A flaky test is a defect in the test suite and must not be normalized by retries.

## Required local commands

```bash
# Fast root suite without the current integration directory
npm run test:unit

# Current jsdom workflow/integration suite
npm run test:integration

# All root tests in deterministic CI mode
npm run test:ci

# Standalone MetaMode package build + unit + dist integration tests
npm run package:ci

# Source file size architectural gate
npm run check:file-size

# Reproduce the complete pull-request quality gate locally
npm run check:ci
```

`npm run check:all` is an alias for `npm run check:ci` so there is one canonical validation contract.

## CI gates

A pull request is not green unless the applicable mandatory jobs succeed:

- ESLint;
- TypeScript/Vue type checking;
- Prettier check;
- MetaMode metadata validation while MetaMode remains in this repository;
- source file size gate;
- root unit and integration tests;
- production build;
- standalone `packages/metamode` build, unit tests and built-package integration tests while that package remains in this repository.

Coverage is currently collected as a baseline/diagnostic signal. Explicit coverage thresholds for core modules will be added after the baseline is measured; this avoids inventing a global percentage that can reward low-value tests. Coverage percentage never substitutes for contract, numerical or browser tests.

## Source file size policy

New source files over 1500 lines fail the gate. Existing debt must be explicitly allowlisted with a bounded temporary maximum and a tracking issue. An allowlisted file may not grow.

The initial legacy exception is `src/lib/tinyLLM.ts`, tracked by #309. The exception must be removed when that refactor lands.

## Pull request checklist

For any behavioral or structural change, the PR description should answer:

- What behavior is being protected?
- Which test captures the behavior before refactoring?
- Which new regression test would have caught the fixed bug?
- Are numerical tolerances/seeds/clocks explicit where relevant?
- Does the change require a real-browser test?
- Are obsolete implementations/tests removed after migration rather than retained in parallel?
