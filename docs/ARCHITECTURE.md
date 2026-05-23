# Architecture — GrandOrgue MCP

```
┌─────────────────────────────────────────────────────────────┐
│                    GrandOrgue MCP System                      │
│                                                               │
│  ┌──────────┐    MIDI     ┌──────────────┐    WebSocket    ┌──────────┐
│  │GrandOrgue│◄──────────►│  MIDI Bridge  │◄──────────────►│  React    │
│  │ C++ Core │  mido/rtmidi │ (mido+rtmidi)│                │  Webapp   │
│  │          │              │  Virtual Ports│                │  :11011   │
│  │ (port audio)            │               │                │           │
│  └──────────┘              └──────┬────────┘                └─────┬─────┘
│                                   │                              │
│                            ┌──────┴────────┐              ┌─────┴─────┐
│                            │   FastMCP 3.2  │              │   Vite    │
│                            │   + FastAPI    │◄─────────────┤   Proxy   │
│                            │   :11010       │  REST /api/* │           │
│                            └──────┬────────┘              └───────────┘
│                                   │
│                            ┌──────┴────────┐
│                            │  Organ Manager │
│                            │  Process Mgr   │
│                            └───────────────┘
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. MIDI Bridge (`midi_bridge.py`)

The core integration layer. Creates **virtual MIDI ports** on the system:
- **Input port** ("GrandOrgue MCP In") — GO sends note/stops events here
- **Output port** ("GrandOrgue MCP Out") — we send control messages here

GrandOrgue is configured to use these ports in its Audio/MIDI Settings.
All MIDI communication uses standard MIDI 1.0 messages:
- Note On/Off (0x90/0x80) for manual key presses
- Control Change (0xB0) for stops, enclosures, crescendo
- Program Change (0xC0) for combination pistons
- SYSEX for Hauptwerk-compatible advanced control

Backend: `mido` with `python-rtmidi` (native C MIDI via RtMidi).

### 2. Process Manager (`go_process.py`)

Manages the GrandOrgue native executable lifecycle:
- Discovers GrandOrgue installation paths
- Starts GO with `--config <path>` pointing to a managed config directory
- Monitors process health
- Graceful shutdown on server exit

### 3. Organ Manager (`organ_manager.py`)

Tracks loaded organs and catalogs:
- Lists installed sample sets from the organ directory
- Maintains curated catalog of known free sample sets
- Tracks current organ state (manuals, stops, polyphony)

### 4. Server (`server.py`)

FastMCP 3.2 + FastAPI dual-stack on a single port:

**MCP Tools** (for AI agents):
- `go_status` — system health
- `go_start` / `go_stop` — process control
- `go_midi_connect` / `go_midi_disconnect` — MIDI bridge
- `go_play_note` — play a single note
- `go_play_chord` — play multiple notes
- `go_set_stop` — toggle a drawstop
- `go_set_crescendo` / `go_set_enclosure` — expression control
- `go_combination` — trigger a piston
- `go_panic` — all notes off
- `go_load_organ` / `go_unload_organ` — organ management
- `go_list_organs` — browse installed + catalog
- `go_send_sysex` — raw MIDI SYSEX

**REST API** (for web console):
- `GET /health` — fleet health check
- `GET /api/status` — full system status
- `GET /api/midi/ports` — MIDI port listing
- `POST /api/note`, `/api/stop`, `/api/crescendo`, etc.
- `POST /api/go/start`, `/api/go/stop`

**WebSocket** (`/ws`):
- Bidirectional state push
- Message types: `note`, `note_off`, `stop`, `panic`, `status`, `ping`

### 5. React Webapp (`web_sota/`)

Pages:
- **Dashboard** — GO process status, MIDI ports, quick actions
- **Console** — visual keyboards (Great/Swell/Choir/Pedal) + drawstop panels + crescendo slider
- **Library** — installed organs + free sample set catalog
- **Memory** — combination piston control (generals + divisionals)
- **Record** — MIDI recorder controls
- **Mixer** — expression pedal / enclosure level sliders

### 6. Tauri Native Wrapper (`native/`, future)

Planned: Tauri 2.0 desktop app bundling the React frontend + Python backend as a sidecar. Single-click installer, ~15 MB.

---

## Port Allocation

| Service | Port | Transport |
|---------|------|-----------|
| GrandOrgue MCP backend | 11010 | HTTP (REST + MCP + WS) |
| GrandOrgue web console | 11011 | Vite dev server |
| GrandOrgue audio engine | N/A | Direct audio device access |
| GrandOrgue MIDI | N/A | Virtual MIDI ports (mido) |

---

## Data Flow

```
User clicks "Principal 8'" in webapp
  → POST /api/stop {cc:21, state:true}
    → midi_bridge.set_stop(21, True)
      → mido sends CC 21 value 127 on virtual port
        → GrandOrgue stops tab lights up, pipes become playable

User presses C4 on Great manual (web keyboard)
  → POST /api/note {note:60, channel:0, velocity:80}
    → midi_bridge.play_note(0, 60, 80)
      → mido sends Note On 60 velocity 80 on channel 1
        → GrandOrgue plays sampled pipe through audio device

GrandOrgue MIDI output (stop state change feedback)
  → midi_bridge._handle_incoming receives CC
    → callback updates webapp stop state via WebSocket
```

---

## Extension Points

- **MIDI learn**: expose MIDI port discovery and binding UI
- **Organ builder**: visual ODF editor for creating new sample sets
- **Streaming**: audio capture and Icecast/RTMP broadcast of performances
- **Collaborative playing**: two organists on different webapp instances controlling the same GO instance
- **AI accompanist**: LLM-driven continuo or hymn accompaniment
