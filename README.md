# Downpour

Downpour is a macOS-first Tauri desktop typing game in a `pnpm` monorepo.
Words fall like rain in a neon city scene. Type words before impact, keep lives alive, and prevent the waterline from flooding the run.

## Tech Stack

- Monorepo: `pnpm` workspaces
- Desktop shell/backend: Tauri v2 + Rust
- Frontend: React + Vite + TypeScript (strict)
- Styling: Tailwind CSS
- Persistence: SQLite (`rusqlite`) in app data directory (`downpour.db`)

## Workspace Layout

- `apps/downpour-desktop`: Tauri app + frontend
- `packages/shared`: shared TypeScript contracts + validators

## Prerequisites (macOS)

- Node.js `>= 22`
- pnpm `>= 10`
- Rust stable toolchain (`rustup`)
- Xcode Command Line Tools
- Cargo Tauri CLI (`cargo tauri -V` should work)

Install Tauri CLI if needed:

```bash
cargo install tauri-cli
```

## Install

```bash
pnpm i
```

Bootstrap the macOS toolchain and workspace automatically:

```bash
./install.sh
```

## Development (Tauri desktop app)

```bash
pnpm dev
```

This runs:

- frontend Vite dev server on `http://localhost:1420`
- Tauri desktop host via `cargo tauri dev`

### Startup Smoke Checklist

After running `pnpm dev`, verify:

1. A native macOS window opens titled `Downpour`.
2. Start screen is visible (title + `Start`, `Records`, `Settings` buttons).
3. Press `Start` and confirm words are falling and HUD metrics update.

## Lint

```bash
pnpm lint
```

## Typecheck

```bash
pnpm typecheck
```

## Build (Tauri)

```bash
pnpm build
```

This runs `pnpm --filter downpour-desktop tauri build`.

## Optional test commands

Frontend tests:

```bash
pnpm --filter downpour-desktop test
```

Rust tests:

```bash
cargo test --manifest-path apps/downpour-desktop/src-tauri/Cargo.toml
```

## Persistence Details

- DB file: `<app_data_dir>/downpour.db`
- Tauri commands:
  - `get_records`
  - `save_record`
  - `get_best_wpm`
  - `set_best_wpm`
  - `reset_records`
- SQLite settings:
  - `PRAGMA journal_mode=WAL`
  - `PRAGMA synchronous=FULL`
  - `PRAGMA foreign_keys=ON`

## Controls

- Type letters: lock and progress falling words
- `Backspace`: rewind target progress
- `Esc`: pause/resume
- Missed words increase waterline and reduce lives
- Game ends when lives reach `0` or waterline reaches threshold

## Troubleshooting

- If `pnpm build` fails with Tauri toolchain errors, verify:
  - `cargo tauri -V`
  - `xcode-select -p`
- If the app cannot open WebView resources, ensure Vite port `1420` is available.
- If you run frontend only (`pnpm --filter downpour-desktop dev`), Tauri commands fall back to browser `localStorage` stubs.
