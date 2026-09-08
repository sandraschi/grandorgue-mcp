# Configuration — grandorgue-mcp

All settings persist via `src/grandorgue_mcp/settings_store.py` and are editable
in the web console at **Settings** (`http://127.0.0.1:11011/settings`, `PUT /api/settings`).

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `11010` | Backend HTTP port (registry: `WEBAPP_PORTS.md` 11010/11011) |
| `HOST` | `127.0.0.1` | Backend bind address |
| `MCP_TRANSPORT` | `stdio` | `stdio` (Claude Desktop / mcpb) or `http` (webapp) |
| `GRANDORGUE_TAURI` | — | Set by the Tauri wrapper; forces HTTP transport |
| `GO_EXE_PATH` | auto-detected | Full path to `GrandOrgue.exe` |
| `GO_CONFIG_DIR` | `%APPDATA%/GrandOrgue-mcp` | Settings + `registrations.sqlite` live here |
| `MIDI_DEPOT_DIR` | `<repo>/midi_depot` | MIDI file depot directory |
| `GO_MIDI_RECORDINGS_DIR` | auto-detected | Where GO saves MIDI recordings |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama endpoint (backend proxy only) |
| `LMSTUDIO_BASE_URL` | `http://127.0.0.1:1234` | LM Studio endpoint (backend proxy only) |
| `PYWINAUTO_MCP_URL` | `http://127.0.0.1:10788` | pywinauto-mcp for GO UI automation (organ load, MIDI-file play) |

Copy `.env.example` to `.env` for local overrides. Never commit `.env`.

## Ports

| Port | Service |
|---|---|
| 11010 | Backend — FastMCP (`/mcp`) + FastAPI REST (`/api/*`) + WebSocket (`/ws`) |
| 11011 | Frontend — Vite React SPA, proxies `/api`, `/health`, `/ws` to 11010 |

## Key REST endpoints

`GET /health` (= `GET /api/v1/health`), `GET /api/status`,
`GET /api/capabilities`, `GET /api/v1/diagnostics`, `GET /api/skills`,
`GET /api/llm/providers|discover|models|onboarding`, `POST /api/llm/chat`,
`POST /api/llm/chat/stream` (SSE). Full list: `llms-full.txt`.
