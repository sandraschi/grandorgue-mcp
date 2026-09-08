# Changelog — grandorgue-mcp

## Unreleased

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
