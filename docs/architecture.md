# Downpour Architecture

How the major pieces fit together.

## Dual-Path Game Engine

Downpour has two implementations of its game simulation — a TypeScript `GameController` class and a Rust engine exposed via Tauri commands. They both implement the same game rules: word spawning, fall physics, input matching, scoring, waterline dynamics, and game-over conditions.

**Why two?** The TypeScript controller came first and runs in the browser. When the app runs as a Tauri desktop build, the Rust engine takes over because it runs the simulation outside the renderer thread and avoids JS garbage collection pauses during gameplay. The TypeScript path still exists for development without a Tauri build (just `vite dev`) and as a reference implementation.

**How the frontend decides which path to use:** `isTauriRuntime()` checks whether `window.__TAURI_INTERNALS__` exists. If it does, the game session hook talks to the Rust engine via Tauri commands. Otherwise, it dynamically imports `GameController` and runs locally.

Both paths produce the same output shape: `GameSessionFrame`, containing a `HudSnapshot` (score, level, WPM, etc.), a `SessionRenderSnapshot` (word positions, water level, wind), an array of `ImpactEvent`s (for particle effects), and an optional `SessionEndSummary` (when the game ends).

## Tauri Bridge and Frame Batching

The Rust engine doesn't push frames — the frontend pulls them. Here's how:

1. A `requestAnimationFrame` loop runs on the frontend. Each frame, it accumulates `deltaSeconds` and any pending user actions (keypresses, pause toggles) into refs.
2. When the accumulated delta is non-zero or there are pending actions, it calls `tickGameSessionCommand()` — a Tauri `invoke()` that crosses the IPC bridge to Rust.
3. The Rust engine applies the actions, advances the simulation by `deltaSeconds`, and returns a `GameSessionFrame`.
4. The frontend publishes the frame: updates the HUD, feeds the render snapshot to the canvas renderer, and plays audio for any impact events.

**Batching matters** because Tauri IPC has overhead. If the player types fast, multiple keystrokes might arrive between frames. Rather than sending one IPC call per keystroke, the hook accumulates actions in a `rustPendingActionsRef` array and flushes them all in the next tick. This also prevents race conditions — only one IPC call is in-flight at a time (`rustInFlightRef` gate).

If a tick response arrives and there are already new pending actions (because the player kept typing while the IPC was in-flight), it immediately flushes again without waiting for the next rAF.

## 3-Canvas Rendering Pipeline

The game uses three stacked `<canvas>` elements, each handling a different visual layer:

### Background Canvas
The static city skyline and ambient atmosphere effects. This layer rarely changes — it redraws when the window resizes or when quality settings change, but otherwise it's essentially a cached backdrop. Separating it means we don't waste GPU cycles re-compositing static pixels every frame.

### FX Canvas
Particle effects, ripples, and the water simulation. When a word hits the ground (miss) or gets cleared, an `ImpactEvent` triggers particles and ripple animations here. The water surface is also drawn on this canvas, animated based on the `waterLevel` and `wind` values from the render snapshot.

### Word Canvas
The falling word text, typed-character highlighting, and mistake flash effects. This is the layer that changes most frequently since word positions update every frame. Text rendering is the most expensive operation per frame, so isolating it lets the performance profiler (`PerformanceProfile`) dynamically downgrade just this layer's quality without affecting the background or FX.

Each canvas is full-screen and absolutely positioned on top of each other. The `CanvasRenderer` class owns all three and orchestrates per-frame rendering based on the current `SessionRenderSnapshot` and quality settings.

## Game Session Lifecycle

### Creation
When the player clicks Start, App.tsx increments `sessionKey` and renders a new `GameScreen`. The `useGameSession` hook initializes audio, the canvas renderer, a performance profiler, and (in Tauri mode) creates a new Rust session via `createGameSessionCommand()`. The Rust `EngineManager` assigns a session ID and stores the `GameSession` struct in a mutex-guarded `HashMap`.

### Active Play
The rAF loop (Tauri) or `GameLoop` (JS) drives the simulation forward. User input flows through `useKeyboardInput` → `handlePrintable`/`handleBackspace`/`togglePause` → either Tauri IPC or direct `GameController` method calls. The HUD React state updates at ~12 Hz (every 80ms) to avoid unnecessary re-renders while still feeling responsive.

### Pause
When the player presses Escape or the window loses focus, a `setPaused` action is sent to the engine. The Rust engine stops advancing `elapsed_seconds` and ignores input while paused. The frontend suspends the audio engine and shows a pause overlay. Resuming reverses the process.

### Game Over
When the waterline hits 1.0, the engine sets `game_over = true` and includes a `SessionEndSummary` in the next frame. The frontend detects this, stops the loop, transitions to the End screen, and asynchronously persists the game record to SQLite (or localStorage in dev mode).

### Cleanup
When the component unmounts (navigating away or starting a new session), the effect cleanup function cancels the rAF loop, destroys the canvas renderer and audio engine, and calls `destroyGameSessionCommand()` to remove the Rust session from the `EngineManager` map.

## Data Persistence

### SQLite (Tauri mode)
Game records are stored in `<app_data_dir>/downpour.db` with WAL journaling and FULL synchronous mode. The database has two tables: `records` (game session data, FIFO-pruned to 1000 rows) and `meta` (key-value store for best WPM). All writes happen in transactions.

### LocalStorage (dev mode)
When running without Tauri, records are serialized as JSON into `localStorage` under the key `downpour.local.snapshot`. A storage version flag (`downpour.storage.version`) tracks schema migrations — when the version changes, stored data is wiped to avoid deserialization errors from old formats.

### Settings
User settings (difficulty, graphics quality, sound, reduced motion) are always stored in `localStorage` under `downpour.settings.v1`, independent of the Tauri/dev storage split.

## Error Handling

Rust errors use `thiserror` with an `AppError` enum covering IO, SQL, serialization, validation, path resolution, engine state, and not-found cases. `AppError` implements `serde::Serialize` to produce `{ code, message }` JSON objects. Tauri commands return `Result<T, AppError>` — Tauri serializes the error automatically and the frontend receives a structured `AppCommandError` object that can be pattern-matched by error code.
