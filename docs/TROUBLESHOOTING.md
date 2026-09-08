# Troubleshooting — grandorgue-mcp

## Backend offline (Dashboard red box)

- Start it: `uv run grandorgue-mcp` (stdio) or `just web` (full stack).
- Health: `curl.exe http://127.0.0.1:11010/health` (alias `/api/v1/health`).
- Port zombie: `just zombies` to list, `just zombie-clean` to clear :11010/:11011.

## GrandOrgue won't start

- Set the exe path in Settings (or `GO_EXE_PATH`); `go_status` shows `go_path`.
- Version detection reads exe metadata — GO has no `--version` flag.

## MIDI bridge fails

- `go_list_midi_ports` first; port names must match GO's MIDI settings
  (see `docs/MIDI_SETUP.md`). Disconnect before renaming ports in Settings.
- rtmidi needs no cables — ports are virtual.

## Organ won't load

- Direct path load (`go_load_organ(path=...)`) avoids UI automation.
- UI automation needs pywinauto-mcp on :10788 (`PYWINAUTO_MCP_URL`).
- Without it, the organ is registered and must be loaded once in the GO GUI.

## Chat says "Request failed"

- Backend must run; chat uses the backend proxy (`/api/llm/chat`), never the
  browser. Check Ollama (`:11434`) or LM Studio (`:1234`) is up, or pick the
  detected provider in Settings.

## NSIS install / smoke failures

- `native/build.ps1` bundles `.env.example`, never `.env`.
- Smoke config: `scripts/cua-nsis-config.json` (health `/api/v1/health`,
  diagnostics `/api/v1/diagnostics`, 14 `nav_routes`).
- Reports land in `reports/` (gitignored) and sync to mcd via `just cua-nsis-test`.

## Logs

Backend logs to stderr; Tauri spawn log: app log dir `backend-spawn.log`.
