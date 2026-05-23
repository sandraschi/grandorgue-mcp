# MIDI Setup Guide

GrandOrgue MCP communicates with GrandOrgue via virtual MIDI ports. This guide walks through the one-time setup.

## Overview

```
┌──────────────┐                    ┌──────────────┐
│ GrandOrgue   │ ── MIDI OUT ────► │ MCP Bridge In │  (GO sends stops/notes to us)
│ (C++ engine) │ ◄── MIDI IN ───── │ MCP Bridge Out│  (We send stops/notes to GO)
└──────────────┘                    └──────────────┘
```

## Step 1: Start the MCP Server

```powershell
uv run grandorgue-mcp
```

The server creates two virtual MIDI ports:
- `GrandOrgue MCP In` (GO output → our input)
- `GrandOrgue MCP Out` (our output → GO input)

## Step 2: Connect MIDI from the Dashboard

Open http://127.0.0.1:11011 and click **Connect MIDI** on the Dashboard.

Or via API:
```
POST http://127.0.0.1:11010/api/midi/connect
```

## Step 3: Configure GrandOrgue

### Windows

1. Launch GrandOrgue
2. Go to **File → Settings... → Audio/MIDI Settings**
3. In the **MIDI Devices** tab:
   - Set **MIDI Input Device** to `GrandOrgue MCP Out`
   - Set **MIDI Output Device** to `GrandOrgue MCP In`
4. Load an organ and test — pressing keys in the web console should produce sound

### Linux

1. Launch GrandOrgue
2. Go to **File → Settings... → Audio/MIDI Settings**
3. In the **MIDI Devices** tab:
   - Set **MIDI Input Device** to `MCP Bridge: GrandOrgue MCP Out`
   - Set **MIDI Output Device** to `MCP Bridge: GrandOrgue MCP In`
4. Ensure you have the ALSA sequencer running (`aconnect -l` to list ports)

### macOS

1. Launch GrandOrgue
2. Go to **File → Settings... → Audio/MIDI Settings**
3. In the **MIDI Devices** tab, select the MCP virtual ports
4. macOS CoreMIDI should pick up the virtual ports automatically

## Step 4: Verify

1. In the web console, navigate to **Dashboard**
2. Check that **MIDI: Connected** shows green
3. Go to **Console** and click a key on the Great manual
4. You should hear a pipe (if an organ with stops engaged is loaded)

## Troubleshooting

### No sound from keyboard clicks
- Verify GrandOrgue has an organ loaded (File → Load)
- Verify stops are engaged (check the Console page)
- Verify GrandOrgue audio device is configured (Settings → Audio Output)

### MIDI ports not appearing
- Restart the MCP server (`uv run grandorgue-mcp`)
- Check Windows Device Manager for MIDI devices
- On Linux, verify ALSA sequencer: `aconnect -l`

### "MIDI Bridge Failed" error
- Ensure python-rtmidi is installed: `uv sync`
- On Windows, a reboot after installing rtmidi may be needed
- Check GrandOrgue isn't already using the ports

### Using physical MIDI keyboards alongside the web console
GrandOrgue can accept MIDI from multiple sources. Use MIDI-OX (Windows) or `aconnect` (Linux) to route both the MCP bridge and your physical keyboard to GrandOrgue.

## Advanced: Custom MIDI Mapping

The MIDI CC assignments used by the web console are:

| Control | MIDI Message | Default Range |
|---------|-------------|---------------|
| Great manual | Note On/Off Ch.1 | 36-96 (C2-C7) |
| Swell manual | Note On/Off Ch.2 | 36-96 |
| Choir manual | Note On/Off Ch.3 | 36-96 |
| Pedal | Note On/Off Ch.4 | 24-55 (C1-G3) |
| Drawstops | Control Change | CC 20-40 |
| Crescendo | Control Change 8 | 0-127 |
| Swell enclosure | Control Change 7 | 0-127 |
| Combination pistons | Program Change | 0-127 |

These can be adjusted to match your sample set's specific MIDI assignments.

## Network MIDI (RTSP)

For remote organ playing (different room/building):
1. Install `rtpmidi` on both machines
2. Route the virtual MIDI ports over the network
3. GrandOrgue on the organ PC, web console on any device

Latency over LAN: ~2-5ms (negligible for organ playing).
