# grandorgue-mcp v0.2.0 — 2026-07-10

Full remediation release following the 2026-07-10 repo assessment
(docs/ASSESSMENT_2026-07-10.md). No new features beyond wiring existing
ones together; the theme is "make the MCP server actually an MCP server."

## Critical fixes

- **stdio transport exists now.** `MCP_TRANSPORT=stdio` (default) runs FastMCP
  over stdio for Claude Desktop / mcpb; `MCP_TRANSPORT=http` runs the
  FastAPI+MCP HTTP server on :11010. Previously only HTTP existed, so the
  mcpb bundle could never start under Claude Desktop.
- **MCP HTTP mount fixed.** Endpoint is `/mcp` (was `/mcp/mcp`), and the
  FastMCP app's lifespan is wired into FastAPI, so streamable-HTTP sessions
  initialize instead of 500ing.
- **Tool/REST decoupling.** `go_auto_load` and four REST depot endpoints
  called `@mcp.tool()`-decorated objects directly. Correction to the original
  assessment: on FastMCP 3.4 the decorator returns the original function, so
  this was NOT a runtime crash (it is on FastMCP 2.x) — but it coupled REST to
  decorator semantics that have flipped between major versions. Logic
  extracted into plain helpers shared by tools and REST, with a regression
  test on tool registration.
- **mcpb code fork removed.** `mcpb/src` (stale duplicate server) and
  `mcpb/pyproject.toml` deleted; `scripts/mcpb-pack.ps1` now stages the
  canonical `src/` + root pyproject into `dist/mcpb-stage` and packs with
  `bunx @anthropic-ai/mcpb`. Manifest gained `MCP_TRANSPORT=stdio`, a real
  30-entry tools list, and `user_config` for the GrandOrgue exe path.
- **start.ps1 launcher fixed** (`$ProjectRoot` used before definition — died
  on line 9 in a fresh shell) and now sets `MCP_TRANSPORT=http`.

## Security

- Path traversal closed in the MIDI depot (tools + REST, including Windows
  backslash traversal on `/raw`, download, delete, upload). Names are
  sanitized to bare filenames.
- Bach bundle extraction capped (file count / entry size).
- CORS allowlist corrected: dev frontend origins (:11011) added, pointless
  self-origins removed.

## Functional fixes

- Local LLM chat works: `/api/llm/providers`, `/api/llm/chat` (with system
  prompt support), `/api/skills` moved into the main server; FloatingChat
  now calls them via the Vite proxy. The orphaned `web_sota/backend/` app
  is deleted.
- Blocking calls off the event loop: process discovery/start/stop, MIDI
  connect/disconnect, port listing wrapped in worker threads;
  GrandOrgue version detection is cached (was one PowerShell spawn per
  3-second status poll).
- MIDI playback serialized (no overlapping playback threads); note/chord
  releases scheduled in background tasks instead of holding tool calls open.
- Incoming CC classification fixed (enclosure branch was unreachable);
  crescendo=CC8, enclosures=CC1/7/11, everything else = stop change.
- Dead JACK path removed (never invoked, misused API, leaked client);
  `jack-client`, `websockets`, unused `prefab-ui` dropped from deps.
- `win32midi` filename typing uses `VkKeyScanW` (was `ord(char.upper())`,
  which sent VK_DELETE for '.'); dead `send_keystrokes` removed.
- Depot location is packaging-safe: repo `midi_depot/` in source checkouts,
  `%APPDATA%\GrandOrgue-mcp\midi_depot` when installed (env `MIDI_DEPOT_DIR`
  overrides). Hardcoded OneDrive/Dokumente path replaced by auto-detection
  plus `midi_recordings_dir` setting / `GO_MIDI_RECORDINGS_DIR` env.
- SYSEX framing bytes (F0/F7) stripped before sending (mido rejects them).
- GO config MIDI-in patching handles CRLF configs.
- Webapp: MIDI Player gained "Play in GO" / "Stop GO" (plays through the
  pipe organ engine via `/api/midi/play`); pedal keys no longer toggle
  random stops; auto-load button no longer sticks on failure; WebSocket
  hook cancels reconnects on unmount; status changes are now pushed over
  `/ws` (`_broadcast` was previously dead code).

## Meta

- LICENSE (MIT) added — the README badge finally points at a real file.
- CI runs on push/PR to main (was tags-only); frontend jobs use Bun; e2e
  starts backend + frontend via Playwright webServer config.
- Bach catalog deduplicated into `bach_catalog.py`.
- mcpb prompt assets (`system.md`, `user.md`) written (were unfilled
  templates); CLAUDE.md/AGENTS.md corrected (no more false portmanteau /
  dual-transport claims).

## Known gaps (deliberate, tracked for v0.3)

- Tools are still flat (30), not portmanteau — refactor planned.
- No FastMCP sampling/prompts/resources/skills/prefab yet.
- REST bodies remain loosely-typed dicts (no Pydantic request models).
- `web_sota/` not yet renamed to `webapp/`.
