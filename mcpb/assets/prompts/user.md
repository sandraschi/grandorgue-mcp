# grandorgue-mcp — User Guide

## Quick Start

1. Install [GrandOrgue](https://github.com/GrandOrgue/grandorgue/releases) and at least one sample set (see Tutorials below for free ones).
2. Install [loopMIDI](https://www.tobias-erichsen.de/software/loopmidi.html) and create two ports: `GrandOrgue MCP In` and `GrandOrgue MCP Out`.
3. Install the mcpb bundle in Claude Desktop (Settings → Extensions → install `grandorgue-mcp-vX.Y.Z.mcpb`). Set the GrandOrgue executable path when prompted, or leave empty for auto-detect.
4. Ask Claude: *"Start GrandOrgue and connect MIDI."*
5. In GrandOrgue: File → Settings → MIDI Devices — enable `GrandOrgue MCP In` as MIDI input. Load an organ once via File → Load; it auto-reloads afterwards.
6. Ask Claude: *"Play a C major chord on the organ."*

Webapp mode instead: from a source checkout run `just web` (backend :11010 with `MCP_TRANSPORT=http`, React console :11011).

## Tutorials

**1. First sound.** "Check the organ status" → `go_status`. If GO isn't running: "start GrandOrgue" → `go_start`. "Connect MIDI" → `go_midi_connect`. "Play middle C for two seconds" → `go_play_note(60, duration_ms=2000)`.

**2. Play a Bach fugue through the pipe organ.** "List the MIDI depot" → `midi_depot_list`. "Play fugue1.mid through GrandOrgue" → `go_play_midi_file("fugue1.mid")` — this uses GO's own MIDI player, so it sounds through the loaded sample set. Stop with `go_stop_playback` or GO's transport.

**3. Get the full Bach bundle.** "Download the Bach MIDI bundle" → `midi_depot_download_bach` (fetches ~200 files from bachcentral.com, skips existing).

**4. Browse repertoire.** "What's in the Bach catalog around intermediate difficulty?" → `go_bach_catalog()` and filter; "Details on BWV 582" → `go_bach_catalog(bwv=582)`.

**5. Install a free sample set.** "Search the marketplace for church organs" → `go_marketplace_search("church")`; "How do I get the Burea Church set?" → `go_marketplace_download("Burea Church")` returns the URL and install instructions; after extracting, `go_load_organ(name="Burea Church")`.

**6. Registration changes mid-piece.** Toggle stops with `go_set_stop(cc, true/false)` using the CC numbers you mapped in GO's MIDI settings; sweep the swell box with `go_set_enclosure(7, 0..127)`; hit a prepared piston with `go_combination(3)`.

**7. Crescendo effect.** `go_set_crescendo(0)` → ramp to `go_set_crescendo(127)` in steps while holding a chord (`go_play_chord([48,55,60,64,67], duration_ms=8000)`).

**8. Upload your own MIDI.** Base64-encode the file and call `midi_depot_upload("mypiece.mid", "<base64>")`; then `go_play_midi_file("mypiece.mid")`.

**9. Recover from stuck notes.** `go_panic` sends all-notes-off on all 16 channels. `go_stop_playback` also cuts notes after stopping playback.

**10. Automate organ loading.** With [pywinauto-mcp](https://github.com/sandraschi/pywinauto-mcp) running on port 10788, `go_load_organ(name="Pitea MHS")` drives GO's File → Load dialog. Without it, load once manually — `go_auto_load` reuses GO's own last-organ memory afterwards.

## API Reference (HTTP mode)

Base: `http://127.0.0.1:11010`. MCP endpoint: `/mcp` (streamable HTTP). WebSocket: `/ws`.

- `GET /health` → `{"ok": true, "service": "grandorgue-mcp"}`
- `GET /api/status` → process/MIDI/organ snapshot
- `GET|PUT /api/settings` → app settings (`go_exe_path`, MIDI port names, `midi_recordings_dir`)
- `GET /api/midi/ports`, `POST /api/midi/connect|disconnect`
- `POST /api/midi/play {"name": "fugue1.mid"}`, `POST /api/midi/stop`, `GET /api/midi/playback-status`
- `POST /api/note {"note":60,"velocity":64,"channel":0}`, `POST /api/note/off`
- `POST /api/stop {"cc":21,"state":true}`, `/api/crescendo`, `/api/enclosure`, `/api/combination`, `/api/panic`
- `POST /api/go/start`, `POST /api/go/stop`, `GET /api/go/status`
- `GET /api/organs`, `POST /api/organs/load {"name":"...","path":"..."}`, `GET /api/organs/last`
- `GET /api/marketplace/search?q=...`, `GET /api/bach/catalog?bwv=565`, `GET /api/catalog`
- `GET /api/midi-depot`, `POST /api/midi-depot/upload`, `GET /api/midi-depot/{name}/raw|download`, `DELETE /api/midi-depot/{name}`, `POST /api/midi-depot/batch/bach`
- `GET /api/llm/providers`, `POST /api/llm/chat` — local Ollama/LM Studio proxy for the console chat

## Troubleshooting

- **"MIDI bridge not connected"** — run `go_midi_connect`; if it fails, verify the loopMIDI ports exist and match the names in Settings.
- **Notes sent, no sound** — GO must have the MCP input port enabled (File → Settings → MIDI Devices) and an organ loaded; check manual MIDI channel mapping.
- **`go_play_midi_file` opens the wrong dialog** — GO's window must be focusable (not minimized to tray); the injection sends Alt+F, M.
- **Claude Desktop shows the server as failed** — the bundle runs stdio; if you overrode `MCP_TRANSPORT=http` in env, remove it.
- **Depot file "not found" with a valid name** — subdirectories and path separators in names are rejected by design.

## FAQ

**Does this replace GrandOrgue's audio engine?** No — GO does all audio; this is a control surface.
**Hauptwerk?** Not supported; GO only.
**macOS/Linux?** The MIDI bridge and process control are cross-platform in principle; keystroke injection (`go_play_midi_file`) is Windows-only. Use `go_play_midi_file_ui` alternatives or bridge playback elsewhere.
**Where do uploads go?** Source checkout: `midi_depot/` in the repo. Packaged: `%APPDATA%\GrandOrgue-mcp\midi_depot` (override with `MIDI_DEPOT_DIR`).
