# Tools — grandorgue-mcp (31 MCP tools)

All tools return `{success, message, ...}`. Full signatures: `docs/MCP_TOOLS.md`.

> Why flat, not portmanteau (assfix 2026-09-08 decision): the 31 `go_*` /
> `midi_depot_*` names are the published contract (glama.json, llms-full.txt,
> Claude Desktop integrations). Regrouping would break every existing client
> for a MEDIUM-severity style gain. Annotations + output schemas now carry the
> machine-readable grouping instead. Revisit only with a versioned v2 API.

## Process control

| Tool | Description |
|---|---|
| `go_status` | GrandOrgue process, MIDI, and organ status |
| `go_start` | Launch GrandOrgue (optional `organ_path` to skip UI automation) |
| `go_stop` | Terminate GrandOrgue |
| `grandorgue_shutdown` | Stop GO, disconnect MIDI, exit server (`confirm=True`) |

## MIDI bridge

| Tool | Description |
|---|---|
| `go_midi_connect` / `go_midi_disconnect` | Open/close virtual MIDI ports |
| `go_list_midi_ports` | List system MIDI ports |
| `go_play_note` / `go_play_chord` | Play note/chord (note-off scheduled) |
| `go_set_stop` / `go_set_crescendo` / `go_set_enclosure` | Drawstop, crescendo, swell via MIDI CC |
| `go_combination` | General piston via Program Change |
| `go_panic` | All-notes-off |
| `go_send_sysex` | Raw SYSEX (hex string) |

## Organs, marketplace, Bach

| Tool | Description |
|---|---|
| `go_load_organ` / `go_auto_load` / `go_unload_organ` | Load (by path/name), reload last, unload |
| `go_list_organs` | Installed sample sets + free catalog |
| `go_marketplace_search` / `go_marketplace_download` | Free sample set catalog |
| `go_bach_catalog` | J.S. Bach organ works by BWV |

## MIDI playback + depot

| Tool | Description |
|---|---|
| `go_play_midi_file` | Play depot file via GO built-in player (keystroke injection) |
| `go_play_midi_file_ui` | Same via pywinauto (needs pywinauto-mcp on :10788) |
| `go_midi_playback_status` / `go_stop_playback` | Playback state |
| `midi_depot_list` / `midi_depot_upload` / `midi_depot_download` / `midi_depot_delete` | Depot CRUD (base64) |
| `midi_depot_download_bach` | Fetch Bach MIDI bundle into depot |

## HTTP-only

REST mirrors under `/api/*` plus `GET /api/capabilities`,
`GET /api/v1/diagnostics` (CUA smoke), `GET /api/llm/*` (provider proxy),
`POST /api/llm/chat/stream` (SSE), `GET /api/skills`,
MCP prompt `grandorgue_assistant`, resource `status://grandorgue`.
