# Development — grandorgue-mcp

## Prereqs

- Python 3.12+, [`uv`](https://docs.astral.sh/uv/) (`C:\Users\sandr\.local\bin\uv.exe`)
- Node 22+ or Bun (frontend uses npm: `web_sota/package-lock.json`)
- GrandOrgue installed (only needed for live MIDI/organ tests)

## Backend

```powershell
uv sync                # install deps
just run               # HTTP mode on :11010
just run-stdio         # stdio mode (Claude Desktop / mcpb)
just serve             # same as just run
uv run pytest tests -q # 26 tests
uv run ruff check src/ tests/
uv run ruff format --check src/ tests/
```

Single canonical server: `src/grandorgue_mcp/server.py` (tools + REST + WS +
transports). Shared logic lives in plain `*_impl` helpers — never call an
`@mcp.tool()`-decorated object directly (it is a FunctionTool, not callable).
Blocking work (subprocess, rtmidi) goes through `anyio.to_thread.run_sync`.
Depot file names must go through `_depot_path()` (traversal-safe).
Tool returns are dialogic: `{success, message, ...}`.

## Frontend (`web_sota/`)

```powershell
just install-web  # npm install
cd web_sota; npm run dev   # Vite on :11011
bunx tsc -b       # typecheck (also `just gates-green`)
npm run biome:ci  # lint gate (hook: scripts/pre-commit-biome.ps1)
```

State: Zustand `src/store/llm.ts` (providers, model, GPU). The browser never
calls LLM providers directly — discovery/chat go through the backend proxy
(`/api/llm/*`) so keys stay server-side.

## Gates

`just gates-green` (ruff + format check + pytest + tsc), `just e2e`
(Playwright, backend+frontend via webServer), `just cua-webapp-test`
(pre-Tauri browser walk), `just build-native` + `just cua-nsis-test` (Tauri).
CI mirrors this in `.github/workflows/ci.yml` (includes pyright).

## Native / packaging

- `just build-native` — PyInstaller backend + Tauri NSIS (`native/`).
- `just mcpb` / `just mcpb-pack` — fleet `make-mcpb.ps1`, fresh-stages
  `src/grandorgue_mcp/` into `mcpb/src/` before pack. Never edit `mcpb/src/`.

Onboarding: N/A is **not** claimed — a GrandOrgue install + sample set is
required for joy; see `docs/ONBOARDING.md`.
