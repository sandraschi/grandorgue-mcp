# grandorgue-mcp — Full Assessment (2026-07-10)

Scope: HEAD of `D:\Dev\repos\grandorgue-mcp`. Backend (`src/grandorgue_mcp`), frontend (`web_sota`), mcpb bundle (`mcpb/`), Tauri (`native/`), CI, tests, scripts.

**Verdict: the REST + webapp side is ~80% real and mostly works through the Vite proxy. The MCP side is broken on both transports — right now this is a FastAPI backend wearing an MCP costume.** The mcpb bundle would not start under Claude Desktop, the HTTP MCP mount is misconfigured, several tools crash at runtime by calling decorated tool objects as functions, and none of the FastMCP 3.x surface (sampling, prompts, resources, skills, prefab) is used despite `prefab-ui` being a declared dependency. Below, by severity.

---

## 1. Critical bugs (server unusable or wrong)

### C1 — mcpb bundle cannot work: HTTP-only entry point behind a stdio manifest
`mcpb/manifest.json` launches `run_server.py`, which calls `grandorgue_mcp.server:main()`, which runs **uvicorn on port 11010**. Claude Desktop launches mcpb bundles as **stdio** MCP servers. Result: Claude Desktop spawns a web server, gets no MCP handshake on stdout, and the server shows as failed/hung. There is no `MCP_TRANSPORT` switch anywhere in the codebase, even though `CLAUDE.md`/`AGENTS.md` explicitly claim "Dual transport: stdio (Claude Desktop) + HTTP (`MCP_TRANSPORT=http`)". The docs describe a server that does not exist.

Fix (standard fleet pattern):
```python
def main() -> None:
    transport = os.getenv("MCP_TRANSPORT", "stdio").lower()
    if transport == "http":
        import uvicorn
        uvicorn.run(app, host=HOST, port=PORT, log_level="info")
    else:
        mcp.run()  # stdio for Claude Desktop / mcpb
```
The webapp launcher (`start.ps1`, justfile `run`) then needs `MCP_TRANSPORT=http` set — or invert the default and set stdio in the manifest env. Pick one; document it.

Caveat for stdio: `apply_runtime_settings()` and `_MIDI_DEPOT.mkdir()` run at import time and print nothing, but uvicorn/log output to stdout would corrupt stdio framing — make sure all logging goes to stderr in stdio mode.

### C2 — `mcpb/src` is a stale fork of `src/grandorgue_mcp`
Two full copies of the server exist. The mcpb copy is older: no `win32midi.py`, no `go_play_midi_file*` tools, no `organ_path` param on `go_start`, no `Annotated` fields, `mcpb/pyproject.toml` pins `fastmcp>=3.2` (uncapped) vs root `>=3.4.2,<4`. Whatever you fix in `src/` silently never reaches the bundle. Kill `mcpb/src` and `mcpb/pyproject.toml`; have `scripts/mcpb-pack.ps1` stage from the canonical `src/` (copy at pack time, or pack the repo root with a proper `.mcpbignore`). Loose `.pyc` files sit next to sources in `mcpb/src` — delete.

### C3 — Decorated tools called as plain functions (fragile cross-calls)
**CORRECTION 2026-07-10 (verified on Goliath, FastMCP 3.4.x):** `@mcp.tool()` in
FastMCP 3.x returns the *original function*, so the direct calls did NOT crash at
runtime — the original assessment overclaimed this as a TypeError, which is true
only for FastMCP 2.x (non-callable FunctionTool). Verified empirically:
`inspect.isfunction(midi_depot_upload)` is True post-decoration on 3.4.

It remains an architectural defect: REST endpoints calling MCP tool objects
couples both surfaces to decorator semantics that have already flipped once
between major versions. Five call sites affected:

- `go_auto_load()` → `return await go_load_organ(...)` (server.py)
- `api_midi_depot_upload` → `await midi_depot_upload(name, data)`
- `api_midi_depot_download` → `await midi_depot_download(name)`
- `api_midi_depot_delete` → `await midi_depot_delete(name)`
- `api_midi_depot_bach` → `await midi_depot_download_bach()`

Fix (applied): extract plain `_impl` helpers; both the tool and the REST endpoint
call the helper. A regression test asserts tool registration and helper shape.

### C4 — MCP HTTP mount is double-broken
```python
mcp_app = mcp.http_app(path="/mcp")
app.mount("/mcp", mcp_app)
```
1. Path is doubled: the endpoint becomes `/mcp/mcp`.
2. The FastMCP ASGI app's **lifespan is never run**: FastAPI must be created with `FastAPI(lifespan=mcp_app.lifespan)` (or a combined lifespan). Without it, the streamable-HTTP session manager's task group is not initialized and every MCP request 500s.

Combined with C1: **neither stdio nor HTTP MCP currently works.** Fix:
```python
mcp_app = mcp.http_app(path="/")
app = FastAPI(title=..., lifespan=mcp_app.lifespan)
...
app.mount("/mcp", mcp_app)
```
(Define `mcp_app` before `app`, or compose lifespans if you add your own.)

### C5 — `start.ps1` dies on line 9: `$ProjectRoot` used before definition
```powershell
$ScriptRoot = Split-Path -Parent $PSCommandPath
$BackendPort = 11010
$FleetStartPath = Join-Path $ProjectRoot "scripts\FleetStartMode.ps1"   # $ProjectRoot is never assigned
```
`Join-Path` with a null `-Path` throws a parameter-binding error in a fresh shell, so `just web` / `.\start.ps1` fail before doing anything. Should be `$ScriptRoot`. (It may have "worked" in sessions where `$ProjectRoot` leaked from another fleet script — that is the trap.)

### C6 — FloatingChat is triple-dead
`FloatingChat.tsx` fetches `http://127.0.0.1:11010/api/llm/providers`, `/api/llm/chat`, `/api/skills`:
1. Those endpoints exist only in `web_sota/backend/server.py` — a second FastAPI app (port 8000) that **nothing ever starts** (not start.ps1, not justfile, not Tauri).
2. Even if they existed on 11010, the fetch is cross-origin from `:11011` and `:11011` is not in the CORS allowlist (the allowlist contains `:11010` itself, which is pointless — CORS lists the *frontend* origins).
3. The chat sends a `system` field the LLM proxy ignores, so the personality selector is decorative anyway.

Decide: either port the `/api/llm/*` endpoints into the main server (and fetch via the Vite `/api` proxy, dropping `API_BASE`), or delete FloatingChat + `web_sota/backend/` + `lib/api.ts`. Half-shipped chat is worse than none. `/api/skills` has no backend anywhere — implement or remove the call. Also remove `FloatingChat.tsx.bak` from src.

### C7 — `win32midi` keystroke typing sends wrong virtual keys
`vk = ord(char.upper())` is only valid for A-Z/0-9. `'.'` is `0x2E` = **VK_DELETE**, so typing `fugue1.mid` presses Delete mid-filename. Every depot file contains a dot, so `go_play_midi_file` (the "no pywinauto needed" path) types garbage into GO's file dialog. Use `user32.VkKeyScanW(ord(char))` (low byte = VK, high byte = shift state), or better: set the clipboard and send Ctrl+V. Note the module also mixes `PostMessageW` (targeted) with `keybd_event` (global focus-dependent) and contains a fully dead `send_keystrokes()` function.

### C8 — ManualKeyboard pedal keys toggle random stops
```tsx
onMouseDown={() => {
  playNote(midiNote);
  api.midiConnect().then(() => { api.setStop(midiNote, true); });
}}
```
Every pedal press re-connects MIDI and sends a stop-toggle CC whose number equals the note number (36-67), silently flipping arbitrary drawstops. Leftover experiment; delete the `midiConnect`/`setStop` block.

---

## 2. Security

### S-1 — Path traversal in the MIDI depot (tools + REST)
`_MIDI_DEPOT / name` is used unsanitized in upload, download, delete, and `/raw`. On Windows, `name = "..\\..\\something"` traverses (Starlette's `{name}` blocks `/` but not `\`), giving arbitrary file **read** (`/raw`, `/download`), **delete** (`DELETE /api/midi-depot/{name}`), and constrained **write** (upload appends `.mid` only if missing, so `..\..\evil.mid` writes anywhere). Bound is localhost + CORS, but the Tauri webview and any local process can hit it. Fix everywhere:
```python
safe = Path(name).name          # strip any directory components
path = (_MIDI_DEPOT / safe).resolve()
if _MIDI_DEPOT.resolve() not in path.parents: reject
```

### S-2 — `_BACH_ZIP_URL` is plain `http://` and the zip is extracted without size limits — minor (curated source), but cap entry count/size and prefer https if available.

### S-3 — CORS config confusion. `allow_origins` lists the backend's own origin three ways and Tauri origins, but not the actual dev frontend (`http://127.0.0.1:11011` / `localhost:11011` / `goliath:11011`). Today everything real goes through the Vite proxy so it is masked; the two components that bypass the proxy (C6, F2) are the ones that break. Either commit fully to same-origin-via-proxy (then the CORS list can shrink to Tauri origins only) or add the frontend origins.

---

## 3. High-priority functional bugs

### H1 — Blocking calls starve the event loop
- `go_process.start()` contains `time.sleep(2)` inside async endpoints/tools.
- `go_process.discover()` spawns `tasklist.exe` **and** a PowerShell process (`_detect_version`) synchronously — and the Dashboard polls `/api/status` every 3 seconds, plus `/api/settings` calls it too. That is 2 process spawns / 3 s, each freezing the event loop for 100-500 ms; MIDI note latency from the on-screen keyboard will visibly stutter while polling.
- `play_chord` blocks with `time.sleep(duration_ms)` inside an async tool (up to seconds).
- `midi_bridge.connect()`, file reads, gzip config rewrite: all sync in async context.

Fix: cache `_detect_version` (exe path + mtime key — it never changes at runtime), and wrap process/MIDI-blocking work in `anyio.to_thread.run_sync` (FastMCP 3.x and Starlette both ship anyio).

### H2 — MIDI playback races
`play_midi_file` resets `_stop_playback_flag = False` and spawns a new daemon thread without checking `playback_active` — a second call overlaps two playbacks into GO simultaneously. `_stop_playback_flag` is also only created inside `play_midi_file`; `stop_playback()` before any playback works only by accident of assignment. Serialize: refuse or stop-then-start when a playback thread is alive; keep a handle to the thread instead of scanning `threading.enumerate()` by name.

### H3 — Incoming CC classification has a dead branch
```python
if 1 <= ctrl <= 32: ...crescendo...
elif 7 <= ctrl <= 14: ...enclosure...   # unreachable, subset of the first range
```
Enclosure callbacks never fire, and CCs 1-32 all get treated as crescendo. Also every CC fires `stop_change` callbacks regardless. Define disjoint CC maps (and make them configurable — GO's MIDI mapping is per-organ anyway).

### H4 — JACK support is dead weight
`_send()` (the only method that would use JACK) is never called — `play_note` etc. write directly to `_out_port`. Inside `_send`, `self._jack_client.midi_out("midi_out")` is misused as a context manager and would create a new port per message. `disconnect()` never deactivates/closes the JACK client; `_jack_port` doesn't exist before `connect()` runs. On Windows (your only target right now) `jack-client` will not even import. Recommendation: rip JACK out entirely and drop `jack-client` from `pyproject.toml`, or implement it properly behind a Linux-only flag.

### H5 — Depot path breaks in every packaged form
`_MIDI_DEPOT = Path(__file__).parent.parent.parent / "midi_depot"` resolves to the repo root only in a source checkout. In a wheel install it lands in `site-packages`' parent, in the PyInstaller backend (`native/resources/grandorgue-mcp-backend.exe`) it lands in the `_MEIPASS` temp dir (wiped per run), in the mcpb extraction dir it is ephemeral. Same bug pattern in `win32midi.load_midi_file_in_go`. Move the depot to a stable user dir: `GO_CONFIG_DIR / "midi_depot"` with an env override, and seed it from the bundled files on first run.

### H6 — Hardcoded personal path
`%USERPROFILE%\OneDrive\Dokumente\GrandOrgue\MIDI recordings` (server.py `go_play_midi_file_ui`, auto_load.py, win32midi.py) is Goliath-specific (OneDrive, German locale). GO's actual MIDI directory should come from settings or GO's own config; at minimum make it an `AppSettings` field.

### H7 — `useWebSocket` leaks reconnect loops
Cleanup closes the socket, but `onclose` schedules `setTimeout(connect, delay)` with no cancellation — after unmount (or React 18 StrictMode double-mount) you get zombie sockets and setState-after-unmount. Track the timer id + an `alive` flag in refs and cancel both in cleanup. Related: the server's `_broadcast()` is **never called** — there is no push at all; the Dashboard polls REST every 3 s and WS is only used (if at all) as a command channel. Either wire broadcasts (status change, playback start/stop, incoming MIDI for keyboard highlighting — the listener callbacks in `midi_bridge.on()` are also registered by nobody) or delete the WS layer. Currently it is scaffolding.

### H8 — Dashboard `handleAutoLoad` has no try/catch
On failure the exception escapes, `setAutoLoading(false)` never runs, the button spins forever. Also posts `{name}` without `path`, so `ensure_organ_loaded` gets a bare name as path.

### H9 — Frontend "MIDI Player" page never plays through GrandOrgue
It renders/plays via AlphaTab **in the browser** (generic soundfont), while the backend's actual GO-playback endpoints `/api/midi/play`, `/api/midi/stop`, `/api/midi/playback-status` are called by no component. For a project whose whole point is "hear it through the pipe organ engine," the flagship page bypasses the pipe organ. Add Play-through-GO / Play-in-browser buttons side by side. Also `MidiPlayer` fetches `/raw` via `API_BASE` (cross-origin, CORS-blocked in dev, see S-3) while listing via the proxy — use the relative path.

### H10 — `go_play_note` holds the tool open for the whole duration
`await asyncio.sleep(duration_ms/1000)` means a 10 s note = 10 s tool call. Fine for short notes; for agent workflows schedule the note-off with `asyncio.create_task` (or a small scheduler) and return immediately, mirroring how `play_midi_file` already returns.

---

## 4. Standards compliance (fleet)

| Standard | Status |
|---|---|
| Portmanteau tools (`operation` enum) | **FAIL** — 25 flat `go_*`/`midi_depot_*` tools; CLAUDE.md/AGENTS.md falsely claim the pattern is used |
| Dual transport stdio+HTTP | **FAIL** (C1) — docs claim it, code lacks it |
| FastMCP floor | OK in root pyproject (`>=3.4.2,<4`); mcpb copy stale (`>=3.2`, uncapped); README badge says "FastMCP 3.2" |
| `webapp/` layout | **DRIFT** — still `web_sota/`; winrar-mcp (the fleet template repo) retired `web_sota` in favor of `webapp/` |
| Bun fleet-wide | **PARTIAL** — CI uses `npm ci` + `package-lock.json`; mcpb-pack uses `npx` not `bunx`; no `packageManager` field |
| Biome / Ruff / uv / justfile | OK (Ruff select is thin — add `B`, `ASYNC`, `C4`; `B006` would have caught the mutable default `notes=[60,64,67]`, `ASYNC` catches the blocking sleeps) |
| `start.ps1` naked-PC standard | **FAIL** (C5) |
| CHANGELOG_LATEST.md | **MISSING** |
| LICENSE | **MISSING** — README shows an MIT badge linking to a nonexistent file; embarrassing for a project pitched as a community contribution |
| CI on push/PR | **FAIL** — triggers only on tags `v*` + manual; nothing gates main |
| CI e2e job | **BROKEN** — runs `npx playwright test` without starting backend or frontend (no webServer config found); the API tests against `localhost:11010` cannot pass |
| Tests | Near zero: one 776-byte model test. No tool, bridge, REST, or traversal tests |
| Repo hygiene | `ci.yml.*.bak` files inside `.github/workflows/`; loose `.pyc` in `mcpb/src`; check whether `native/resources/grandorgue-mcp-backend.exe` (PyInstaller binary) is git-tracked — `native/resources/` is not in `.gitignore` while `native/binaries/` is |
| mcpb docs assets | **STUBS** — `mcpb/assets/prompts/system.md` and `user.md` are unfilled "[Write ...]" templates; manifest `tools` list is a single placeholder entry |

Doc drift summary: README (FastMCP 3.2 badge, `npm run dev` instead of bun), CLAUDE.md/AGENTS.md (portmanteau + dual transport claims), docs/MCP_TOOLS.md not audited here but certainly stale after any refactor. `implementation_plan.md` predates all of this.

---

## 5. FastAPI endpoint ↔ frontend usage matrix

Wired correctly through the Vite `/api` proxy (`client.ts`):
`/api/status`, `/api/midi/ports`, `/api/midi/connect`, `/api/midi/disconnect`, `/api/note`, `/api/note/off`, `/api/stop`, `/api/crescendo`, `/api/enclosure`, `/api/combination`, `/api/panic`, `/api/go/start`, `/api/go/stop`, `/api/go/status`, `/api/settings` GET/PUT, `/api/organs`, `/api/organs/last`, `/api/organs/load` (Dashboard), `/api/midi-depot` GET (MidiPlayer, MidiDepot), `/api/midi-depot/upload` + `/api/midi-depot/batch/bach` (MidiDepot — **but both 500 today via C3**).

Orphaned backend endpoints (no caller):
- `/api/midi/play`, `/api/midi/stop`, `/api/midi/playback-status` — the GO playback path (H9)
- `/api/marketplace/search` — Marketplace.tsx uses only `api.organs()`
- `/api/bach/catalog`, `/api/catalog` — no frontend usage; Bach catalog is also duplicated verbatim between the MCP tool and the REST endpoint (extract one `BACH_CATALOG` constant into a data module or load from `docs/BACH_CATALOG.md`-adjacent JSON)
- `/api/midi-depot/{name}/download` — frontend uses `/raw` instead

Frontend calls with no backend: `/api/llm/providers`, `/api/llm/chat`, `/api/skills` (C6).

Frontend calls that bypass the proxy and hit CORS: `MidiPlayer` `/raw` fetch, all FloatingChat fetches (via `API_BASE`). Rule of thumb going forward: delete `lib/api.ts` and forbid absolute backend URLs in components.

Body validation: nearly all POST bodies are `body: dict[str, Any]` with `.get()` defaults — you have Pydantic; use request models so FastAPI returns 422s with useful messages and the OpenAPI docs at `/docs` actually describe the API. Ranges (`note 0-127`, `velocity 0-127`, `cc 0-127`) are unvalidated end to end; `NoteEvent` in models.py already defines them but is used by nothing.

---

## 6. FastMCP 3.4 modernization (sampling, prompts, skills, prefab, agentic)

Current usage of FastMCP 3.4.2 features: **zero**. No `Context`, no sampling, no prompts, no resources, no elicitation, no progress, no skills, no prefab — `prefab-ui>=0.18.0` is a declared dependency imported by nothing (drop it or use it). Concrete, high-value additions in rough order:

1. **Portmanteau consolidation first** (prerequisite for everything else). 25 tools → 5:
   - `go_control(operation: start|stop|status|load_organ|auto_load|unload)`
   - `go_midi(operation: connect|disconnect|list_ports|panic|sysex)`
   - `go_perform(operation: note|chord|stop|crescendo|enclosure|combination)`
   - `go_playback(operation: play_file|play_file_ui|status|stop)`
   - `go_library(operation: depot_list|depot_upload|depot_download|depot_delete|depot_fetch_bach|organs|marketplace_search|bach_catalog)`
   Each dispatches to plain async helpers that the REST endpoints reuse (kills C3 structurally).

2. **Sampling (`ctx.sample`)** — the genuinely good fit here is *registration advice*: a `go_registration(operation="suggest", piece="BWV 582", style="north german baroque")` tool that sends the current organ's stop list + piece metadata to the client LLM and gets back a registration plan, then optionally applies it via CC batch. Second fit: replace the dead FloatingChat/Ollama backend — when the client connects over MCP, chat can be answered by sampling instead of a locally-run model; keep Ollama as HTTP-mode fallback.

3. **Prompts (`@mcp.prompt`)** — `bach_recital` (pick n pieces by difficulty, verify GO running, connect, play sequentially), `midi_setup_walkthrough` (drives the Settings flow), `registration_for_style`. These are the "agentic workflows" entry points: cheap to write, they turn the tool pile into guided flows.

4. **Resources** — `grandorgue://catalog/bach`, `grandorgue://depot`, `grandorgue://settings` as read-only resources so agents can browse without burning tool calls; the Bach catalog moves out of the duplicated literals.

5. **Progress + logging** — long operations (`depot_fetch_bach`, recital playback) should `ctx.report_progress()` and `ctx.info()`; currently a Bach-bundle download is a silent 60 s timeout.

6. **Elicitation** — `go_control(load_organ)` with no args should elicit which installed organ to load rather than failing.

7. **Skills** — write the actual `mcpb/assets/prompts/*.md` content (they are templates today) and add a `SKILL.md` (GO setup, MIDI wiring, registration basics, the loopMIDI story) exposed via SkillsProvider.

8. **Prefab UI** — smallest useful prefab: a playback/status card (running, MIDI, current organ, now-playing with stop button) for `fastmcp dev apps` and Claude Desktop rendering. The full stop console stays in the React app.

---

## 7. mcpb build — concrete fix list

1. C1 transport switch; manifest env sets `MCP_TRANSPORT=stdio` explicitly (or nothing, if stdio is default).
2. Delete `mcpb/src` + `mcpb/pyproject.toml`; `mcpb-pack.ps1` stages canonical `src/` + `run_server.py` + root `pyproject.toml` into a build dir, packs from there.
3. `run_server.py` for stdio: drop the HTTP assumptions; `sys.path` hack is fine, but note `_strptime` preimport suggests a PyInstaller frozen-import issue previously hit — keep it.
4. Manifest: real `tools` list (post-portmanteau: 5 entries with honest descriptions), `user_config` block for `GO_EXE_PATH` / `GO_CONFIG_DIR` so Claude Desktop can prompt for the GrandOrgue path instead of failing on non-default installs.
5. `mcpb-pack.ps1`: `bunx @anthropic-ai/mcpb` per fleet standard (not `npx --yes`); also avoid assigning to `$args` (PowerShell automatic variable) — rename to `$mcpArgs`.
6. Fill `assets/prompts/system.md` / `user.md` (currently shipped as instruction stubs).
7. `mcpb validate` in CI once CI runs on push.
8. Dependency audit for the bundle: `jack-client` should go (H4); `websockets` is redundant (uvicorn[standard] includes it); `prefab-ui` only if actually used.

---

## 8. Suggested execution order (realistic: 2-3 focused days with agent support)

**Day 1 — make it true:** C5 start.ps1 one-liner; C1+C4 transport + mount/lifespan; C3 extract helpers; C2 delete mcpb fork + fix pack script; smoke-test stdio in Claude Desktop and `/mcp` over HTTP; add LICENSE; fix CLAUDE.md/AGENTS.md claims.
**Day 2 — make it safe and honest:** S-1 traversal fix + tests; H1 blocking/caching (version cache alone removes the PowerShell-spawn-per-poll); H5/H6 depot + OneDrive paths; C6 decide FloatingChat fate; C8 pedal fix; H8; H3.
**Day 3 — make it fleet-grade:** portmanteau refactor; prompts + resources + one sampling tool; CI on push with backend-started e2e (Playwright `webServer` config); `web_sota` → `webapp` rename; Bun in CI; CHANGELOG_LATEST.md; rewrite mcpb prompt assets; regenerate docs/MCP_TOOLS.md.

Defer: prefab UI card, WS push architecture (H7 decision), JACK removal (H4, quick win, can slot anywhere), H9 play-through-GO buttons (small, user-visible, good demo payoff — arguably promote to Day 2).
