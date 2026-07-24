# GrandOrgue MCP — Expansion SPEC (BUILT ✅)

## Vision
Turn grandorgue-mcp from a MIDI bridge into the **definitive modern console** for the GrandOrgue pipe organ simulator. The pipe organ community is passionate but underserved by modern UX — this is our opportunity.

## Features (build order)

### 1. Pipe Organ Visualizer (WebGL Canvas)
Real-time animated pipe facade showing which pipes are sounding, with animated stops, swell shades, and pipe movement synced to MIDI.

**Files**: `web_sota/src/components/OrganVisualizer/` — `OrganVisualizer.tsx`, `pipeEngine.ts`, `facadeRenderer.ts`
**Backend**: Reuse existing `/ws` WebSocket for note/stop events
**Effort**: 2-3 files, moderate complexity (canvas rendering)

### 2. Registration Manager
Drag-and-drop stop combination editor with named presets, MIDI-learn, per-organ profiles. Export/import as JSON.

**Files**: `web_sota/src/components/RegistrationManager.tsx`, backend registration CRUD endpoints
**Effort**: 3-4 files

### 3. Smart Registration Assistant (LLM)
"Suggest a plenum registration for this Bach fugue on a Silbermann organ." Uses existing `/api/llm/chat` with a registration-specific system prompt.

**Files**: `web_sota/src/components/RegistrationAssistant.tsx`, registration skill prompt
**Effort**: 2 files, leverages existing LLM infrastructure

### 4. Bach Practice Studio
Enhanced MIDI player: loop sections, speed control (preserve pitch), hand isolation, metronome, progress tracking.

**Files**: `web_sota/src/components/PracticeStudio.tsx`
**Effort**: 2-3 files

### 5. Sample Set Explorer
Catalog with ratings, screenshots, "try before you install" preview audio clips, one-click install, user reviews.

**Files**: Backend marketplace API enhancements, `web_sota/src/components/SampleSetExplorer.tsx`
**Effort**: 3-4 files

### 6. Organ Specification Database
Browsable historical organ specs — Cavaillé-Coll, Silbermann, Schnitger — with stop lists, photos, and sample set cross-references.

**Effort**: 2 files (data + frontend)

### 7. Multi-Organ Profiles
Per-organ settings profiles: MIDI routing, registration sets, audio config. Switch with one click.

**Effort**: Backend settings updates + frontend profile switcher

### 8. Audio Recording & Export
Record organ output via loopback, export as WAV/MP3.

**Effort**: Backend recording endpoint + frontend recorder UI

## Architecture

```
WebSocket /ws ──► OrganVisualizer (real-time pipe animation)
                      │
REST /api/registrations ──► RegistrationManager (CRUD)
                      │
LLM /api/llm/chat ──► RegistrationAssistant (AI suggestions)
                      │
MIDI Bridge ──► PracticeStudio (playback control)
```

All new features reuse existing `/ws` for real-time events, `/api/llm/chat` for AI, and the MIDI bridge for playback. No new infrastructure needed.
