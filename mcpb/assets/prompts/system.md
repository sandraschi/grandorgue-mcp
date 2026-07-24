# grandorgue-mcp — MCP Server Capabilities

## Server Overview

grandorgue-mcp turns the GrandOrgue pipe organ simulator into an AI-controllable instrument. GrandOrgue itself is a mature C++ sample-playback engine with an aging wxWidgets GUI; this server leaves the audio engine untouched and drives it over MIDI (virtual ports via mido/python-rtmidi) plus Windows UI automation for the operations GO only exposes through menus (loading organs, playing MIDI files through GO's built-in player).

The server runs in two modes. Over **stdio** (default, used by Claude Desktop and the mcpb bundle) it exposes only the MCP tools below. Over **HTTP** (`MCP_TRANSPORT=http`, port 11010) it additionally serves a REST API and WebSocket used by the bundled React web console, and mounts the MCP streamable-HTTP endpoint at `/mcp`.

A "MIDI depot" ships with ~200 J.S. Bach MIDI files (fugues, inventions, chorale preludes, Goldberg variations) and can fetch the complete bachcentral.com bundle. Any depot file can be played through GO's pipe organ engine.

## Tools

### Process control
- **go_status** — GrandOrgue process state, MIDI bridge state, current organ, exe path, detected version. Returns `{success, go_running, midi_connected, organ, go_path, go_version}`.
- **go_start(organ_path?)** — Launch GrandOrgue. Optional `organ_path` loads an `.organ` file via CLI at startup. Returns `{success, message, pid, version, auto_loaded}`.
- **go_stop** — Terminate GO and disconnect MIDI. Returns `{success, message}`.

### MIDI bridge
- **go_midi_connect** — Open the configured virtual MIDI ports ("GrandOrgue MCP In"/"Out" by default; create them with loopMIDI first and select them in GO's Audio/MIDI settings). Returns `{success, message, ports}`.
- **go_midi_disconnect** — Close the bridge.
- **go_list_midi_ports** — All system MIDI inputs/outputs with connection flags.

### Performance
- **go_play_note(midi_note=60, velocity=64, channel=0, duration_ms=500)** — Note on; note-off scheduled in the background (tool returns immediately).
- **go_play_chord(notes=[60,64,67], velocity, channel, duration_ms=800)** — Simultaneous notes with scheduled release.
- **go_set_stop(stop_cc, state=true)** — Toggle a drawstop mapped to a MIDI CC.
- **go_set_crescendo(value 0-127)** — Crescendo pedal (CC 8).
- **go_set_enclosure(cc=7, value=127)** — Swell enclosure expression.
- **go_combination(number=1)** — General piston via Program Change.
- **go_panic** — All-notes-off on all 16 channels.
- **go_send_sysex(data_hex)** — Raw SYSEX, e.g. `"F0 7D 10 F7"` (framing bytes stripped automatically).

### Organ / sample set management
- **go_load_organ(path?, name?)** — Load an organ. Tries pywinauto-mcp (port 10788) for UI automation; otherwise registers metadata and asks the user to load once manually (GO remembers it afterwards).
- **go_auto_load** — Reload the last-used organ.
- **go_unload_organ** — Clear the current-organ registry entry.
- **go_list_organs** — Installed sample sets (`~/GrandOrgue/organs`) plus the free catalog.
- **go_marketplace_search(query)** / **go_marketplace_download(name)** — Search the curated free sample set catalog (Piotr Grabowski, Lars Palo, etc.) and get download URLs.

### Repertoire & playback
- **go_bach_catalog(bwv?)** — Curated J.S. Bach organ works catalog (BWV, key, style, difficulty).
- **go_play_midi_file(name)** — Play a depot file through GO's **built-in** MIDI player via Windows keystroke injection (Alt+F, M, filename). Sounds through the pipe organ engine; needs no MIDI cabling and no pywinauto.
- **go_play_midi_file_ui(name)** — Same, but via pywinauto-mcp UI automation.
- **go_midi_playback_status** / **go_stop_playback** — Bridge-side MIDI file playback state and stop.
- **midi_depot_list / midi_depot_upload(name, data_base64) / midi_depot_download(name) / midi_depot_delete(name)** — Depot file management. Names are sanitized; subdirectories and traversal are rejected.
- **midi_depot_download_bach** — Fetch and extract the complete bachcentral.com Bach bundle into the depot.

## Configuration

Environment variables:
- `MCP_TRANSPORT` — `stdio` (default) or `http`.
- `PORT` / `HOST` — HTTP mode bind (default 11010 / 127.0.0.1).
- `GO_EXE_PATH` — GrandOrgue executable; falls back to saved settings, then common install paths.
- `GO_CONFIG_DIR` — settings + last-organ state dir (default `%APPDATA%\GrandOrgue-mcp`).
- `MIDI_DEPOT_DIR` — override depot location (default: repo `midi_depot/` in source checkouts, `GO_CONFIG_DIR/midi_depot` when packaged).
- `GO_MIDI_RECORDINGS_DIR` — GO's MIDI recordings folder (auto-detects Documents/OneDrive variants).
- `PYWINAUTO_MCP_URL` — pywinauto-mcp base URL (default `http://127.0.0.1:10788`).
- `OLLAMA_BASE_URL` / `LMSTUDIO_BASE_URL` — local LLM proxies for the web console chat (HTTP mode only).

## Data Sources

- GrandOrgue's gzipped config (`GrandOrgueConfig`) — read/patched once to register the MCP MIDI input port.
- `settings.json` and `last_organ.json` in `GO_CONFIG_DIR`.
- The MIDI depot directory.
- bachcentral.com (Bach bundle download) and the curated free-sample-set catalog (static list with URLs).
