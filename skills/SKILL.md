---
name: grandorgue-mcp
description: GrandOrgue pipe organ simulator — MIDI bridge, organ control, sample set management, Bach repertoire
---

# GrandOrgue MCP skill

## Session Context (GrandOrgue MCP)

You have access to a GrandOrgue pipe organ simulator MCP server with 31 tools
for MIDI bridge, organ control, sample set management, and Bach repertoire.

**Before starting work:**

1. Check current state: `go_status` — GO running? MIDI connected? organ loaded?
2. Query MIDI ports: `go_list_midi_ports` — virtual port names for GO setup.

**At end of work, save state:**

- Note the loaded organ for next session (`go_auto_load` restores it).
- Registrations persist in `registrations.sqlite`; MIDI depot files persist.
