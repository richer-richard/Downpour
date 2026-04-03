# Codebase Improvements Design

## Overview

Six areas of improvement for the Downpour codebase: testing gaps, CI/CD pipeline, state management optimization, custom error serialization, dead code cleanup, and documentation.

## 1. Testing

### Frontend (vitest + React Testing Library)

Tests go in `ui/__tests__/` and `ui/components/__tests__/`, following the existing `game/__tests__/` pattern.

**Screen tests:**
- `StartScreen.test.tsx` — renders content, button callbacks fire correctly
- `EndScreen.test.tsx` — renders all summary fields, save status states, button callbacks
- `SettingsScreen.test.tsx` — all four controls (sound, reduced motion, quality, difficulty) update settings via onChange
- `RecordsScreen.test.tsx` — empty state, table rendering, sort toggle, reset confirmation flow, loading state
- `GameScreen.test.tsx` — shallow test with mocked `useGameSession`. Renders HUD, pause overlay, keyboard events reach handlers

**Component tests:**
- `NeonButton.test.tsx` — renders children, fires onClick, respects disabled
- `SortHeader.test.tsx` — renders label, direction indicator, fires onToggle
- `WaterlineMeter.test.tsx` — renders at given water level

### Rust (inline #[cfg(test)] in engine.rs)

- Word pool construction (non-empty, non-overlapping)
- Difficulty profile scaling across levels and modes
- Session lifecycle (create, tick, destroy, tick-after-destroy)
- Waterline physics (rise on miss, drop on clear, interpolation)
- Scoring and combo (increment, reset, formula)
- Pause/resume (no elapsed time advance while paused)
- Game over trigger and state freeze

## 2. CI/CD

Single GitHub Actions workflow (`.github/workflows/ci.yml`), triggers on PRs to main + pushes to main.

**Parallel jobs:**
- `lint-and-typecheck` — pnpm lint + typecheck
- `test-frontend` — vitest run
- `test-rust` — cargo test
- `build-tauri` — full tauri build (depends on all three above passing)

Runner: `macos-latest`. Caches pnpm store and Cargo registry/target.

## 3. State Management

Extract three hooks from App.tsx:

- `useBootstrap()` — owns `booting`, `bootError`, `bootstrapApp`. Returns bootstrap state and retry function.
- `useRecords(bootstrapRecords)` — owns `records`, `recordsLoading`, `refreshRecords`, `resetRecords`. Accepts initial records from bootstrap.
- `useSettings()` — owns `settings`, `setSettings`, localStorage sync.

App.tsx becomes a thin composition shell (~150 lines). All existing memoization, async patterns, and callback structures preserved exactly.

## 4. Custom Error Serialization

Implement `serde::Serialize` on `AppError` to produce `{ code: string, message: string }`. Change all Tauri commands from `Result<T, String>` to `Result<T, AppError>`.

Frontend gets a typed `AppCommandError` interface. The `toErrorMessage` helper in App.tsx can pattern-match on error codes for user-friendly messages.

## 5. Dead Code Cleanup

- Delete `app/router.ts` — inline `AppView` type (minus `'paused'`) into App.tsx
- Delete `game/stateMachine.ts` — entirely unused, zero imports

## 6. Documentation

**Inline comments** in `constants.ts` and `engine.rs` — explain what each constant controls, why it's set to that value, and how it interacts with the game feel.

**Architecture doc** (`docs/architecture.md`) covering:
- Dual-path design: why both a TypeScript GameController and a Rust engine exist
- Tauri bridge frame batching and the rAF flush loop
- 3-canvas rendering pipeline (background, effects, words)
- Game session lifecycle and cleanup
