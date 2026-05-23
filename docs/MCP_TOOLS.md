# MCP Tools Reference — AI Agent Control Surface

All tools are available to any MCP-compatible AI agent (Claude, Goose, opencode, etc.) when the GrandOrgue MCP server is running.

## Process Management

### `go_status()`
Get full system status: GO running, MIDI connected, loaded organ.
```
→ {"success": true, "go_running": true, "midi_connected": true, "organ": {...}}
```

### `go_start()`
Launch the GrandOrgue executable.
```
→ {"success": true, "pid": 12345, "version": "3.17.1"}
```

### `go_stop()`
Gracefully terminate GrandOrgue.
```
→ {"success": true, "message": "GrandOrgue stopped"}
```

## MIDI Control

### `go_midi_connect()`
Create virtual MIDI ports and open the bridge.
```
→ {"success": true, "ports": {"input": "GrandOrgue MCP In", "output": "GrandOrgue MCP Out"}}
```

### `go_midi_disconnect()`
Close the MIDI bridge.
```
→ {"success": true}
```

### `go_list_midi_ports()`
List all MIDI ports on the system.
```
→ {"success": true, "inputs": [...], "outputs": [...]}
```

## Playing Notes

### `go_play_note(midi_note=60, velocity=64, channel=0, duration_ms=500)`
Play a single note with auto-release after duration.

The webapp keyboard uses these channels:
- Channel 0: Great (Hauptwerk)
- Channel 1: Swell (Schwellwerk)
- Channel 2: Choir/Positiv
- Channel 3: Pedal

```
→ {"success": true, "note": 60, "velocity": 64, "channel": 0}
```

### `go_play_chord(notes=[60,64,67], velocity=64, channel=0, duration_ms=800)`
Play multiple notes simultaneously (C major triad by default).
```
→ {"success": true, "notes": [60,64,67], "velocity": 64}
```

## Registration (Stops)

### `go_set_stop(stop_cc=21, state=True)`
Pull (on) or push (off) a drawstop via MIDI CC.

Common default mappings:
- CC 20: Bourdon 16'
- CC 21: Principal 8'
- CC 22: Rohrflote 8'
- CC 23: Octave 4'
- CC 24: Superoctave 2'
- CC 25: Mixture IV
- CC 26: Gamba 8'
- CC 27: Voix Celeste 8'
- CC 28: Flute 4'
- CC 29: Oboe 8'
- CC 30: Trompette 8'
- CC 31: Gedackt 8'
- CC 40: Tremulant

```
→ {"success": true, "stop_cc": 21, "state": true}
```

## Expression Control

### `go_set_crescendo(value=0)`
Set the crescendo roller/pedal (0-127).

### `go_set_enclosure(cc=7, value=127)`
Set an expression enclosure (swell shades, choir box).

### `go_combination(number=1)`
Trigger a combination piston (general/thumb piston).

## Emergency

### `go_panic()`
All notes off immediately — the "panic button."
```
→ {"success": true}
```

## Organ Management

### `go_load_organ(path="C:/GrandOrgue/organs/Burea Church")`
Load an organ definition.

### `go_unload_organ()`
Unload the current organ.

### `go_list_organs()`
List installed sample sets and catalog entries.
```
→ {"success": true, "installed": [...], "catalog": [...]}
```

## Advanced

### `go_send_sysex(data_hex="F0 7D 10 ... F7")`
Send raw MIDI System Exclusive data (hex string). Hauptwerk-compatible SYSEX can control LCD displays, complex MIDI setups, etc.

---

## Example: Agent Plays a Hymn

```
// Agent calling tools in sequence:

1. go_status()                           // check everything is running
2. go_start()                            // launch GO if needed
3. go_midi_connect()                     // open MIDI bridge
4. go_load_organ("Burea Church")         // load the organ
5. go_set_stop(21, true)                 // Principal 8'
6. go_set_stop(22, true)                 // Rohrflote 8'
7. go_set_stop(23, true)                 // Octave 4'
8. go_play_chord([60, 64, 67], 80, 0)   // C major chord on Great
9. go_play_note(48, 70, 3, 1000)        // Low C on Pedal
10. go_set_stop(30, true)                // Add Trompette for climax
11. go_play_chord([67, 71, 74], 90, 0)  // G major chord
12. go_panic()                           // silence
```

## Example: Agent Searches for a Baroque Organ

```
1. go_list_organs()
   → catalog shows "Giubiasco" (Italian Baroque)
2. "This organ has 2 manuals and 25 stops in Italian Baroque style.
   Visit https://piotrgrabowski.pl/giubiasco to download."
3. User downloads and installs Giubiasco
4. go_load_organ("~/GrandOrgue/organs/Giubiasco")
5. go_set_stop(21, true)  // Principale 8'
6. go_play_note(60, 70, 0, 2000)  // Play middle C
```

---

## WebSocket Protocol

For real-time applications, the WebSocket at `/ws` accepts JSON messages:

```json
{"type": "note", "channel": 0, "note": 60, "velocity": 80}
{"type": "note_off", "channel": 0, "note": 60}
{"type": "stop", "cc": 21, "state": true}
{"type": "panic"}
{"type": "status"}
{"type": "ping"}
```

Responses:
```json
{"type": "pong"}
{"type": "status", "go_running": true, "midi_connected": true, "organ": {...}}
```
