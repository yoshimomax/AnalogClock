# AGENTS.md

## Cursor Cloud specific instructions

This is a Tauri-based analog clock desktop application for Windows. The frontend (React + TypeScript + Vite) can be developed and previewed independently in a browser; the Rust/Tauri native shell requires a Windows environment with Rust toolchain and is **not runnable** on this Linux VM.

### Services

| Service | Command | Notes |
|---------|---------|-------|
| Vite dev server (frontend) | `npm run dev` | Serves React UI at `http://localhost:1420`. This is the only service runnable on Linux. |
| Tauri desktop app | `npm run tauri dev` | Requires Rust + Windows. Not available in Cloud Agent environment. |

### Key commands

- **Type check**: `npx tsc --noEmit`
- **Build (frontend only)**: `npx tsc && npx vite build`
- **Dev server**: `npm run dev` (opens on port 1420)

See `README.md` for full documentation.

### Gotchas

- There is no ESLint configuration in this project. Lint checking is limited to TypeScript strict mode (`npx tsc --noEmit`).
- There are no automated test frameworks configured (no Jest, Vitest, etc.).
- The `src-tauri/src/main.rs` references `tauri_plugin_store` which is not listed in `Cargo.toml` dependencies — this may cause a Rust compilation error but does not affect the frontend dev workflow.
- Settings panel is opened by right-clicking on the clock face.
