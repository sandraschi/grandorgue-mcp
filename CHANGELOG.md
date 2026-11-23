# Changelog — grandorgue-mcp

## Unreleased

- 2026-11-23 revival pass: refreshed `uv.lock` (fastmcp 3.4.4 -> 3.4.11, prefab-ui 0.20.2 -> 0.21.1,
  fastapi 0.136 -> 0.165, plus transitive); `.claude-plugin/plugin.json` version aligned to 0.3.0;
  15 new tests (MIDI bridge routing/clamping, response helpers, fleet parsing, last-organ state),
  coverage gate 30 -> 33; AGENTS.md repo rules (LF, single trunk, non-destructive templating).

- assfix 2026-09-08: dialogic `{success, message}` on all tools; `## Examples`
  on `grandorgue_shutdown`; `_error_response()` + module logger; new endpoints
  (`/api/capabilities`, `/api/v1/health`, `/api/llm/discover|models|onboarding`,
  `/api/llm/chat/stream` SSE); MCP prompt `grandorgue_assistant`; frontend via
  backend LLM proxy; fleet `chat-*` testids; onboarding CTA; Tauri
  `backend-status` listener; `just serve|e2e|gates-green|certify`; CI pyright +
  format check; ruff T20; pre-commit Biome hook; docs/ stack + ONBOARDING;
  `skills/`, Antigravity skills, renovate, CHANGELOG; CUA `nav_routes`.

## 0.3.0

- 31 MCP tools (process, MIDI bridge, organ, marketplace, Bach, depot).
- FastAPI REST + WebSocket `/ws` + dual transport (stdio/HTTP).
- React console (`web_sota/`) on :11011, backend on :11010.
- Tauri NSIS desktop wrapper (`native/`).
- CUA smoke + webapp test scaffolding.
