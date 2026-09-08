# grandorgue-mcp — User Guide

This guide takes you from zero to music with the GrandOrgue MCP server and its
web console: installation, first sounds, the full console tour, twelve
step-by-step tutorials, the REST API, troubleshooting, and a FAQ. It assumes a
Windows PC (the Tauri desktop build is Windows-first), but the backend and the
MCP tools work identically on Linux and macOS wherever GrandOrgue itself runs.

## 1. Installation

You need three things: GrandOrgue, this server, and (for the console) a Node
runtime via Bun. Start with GrandOrgue itself from its GitHub Releases page —
take the latest stable Windows build and run the installer with defaults. You do
not need any sample set yet; GrandOrgue ships ready to load one, and this guide
will fetch you a free set in Tutorial 9.

Next, the server. Install `uv` (the Astral Python manager) once, then in the
repository directory run `just install` (or `uv sync --all-extras --group dev`
without just). This creates the `.venv`, installs FastMCP, FastAPI, uvicorn,
mido, python-rtmidi, and the dev tools. Verify with `uv run pytest tests -q` —
26 tests should pass — and `uv run ruff check src/ tests/`, which should report
all checks passed. If either fails, stop here and fix the environment before
continuing; every later step assumes a green tree.

For the web console, install Bun (the fleet-standard JavaScript runtime) and run
`just install-web` (equivalently `bun install` inside `web_sota/`), which reads
the committed `bun.lock`. Verify with `bunx tsc -b` (typecheck) and
`bunx @biomejs/biome check src/` (lint plus format) from `web_sota/`. The
console needs no accounts, no keys, and no cloud anything: the only "AI" it can
use out of the box is a local engine you run yourself (Tutorial 11).

Finally, launch everything with `just web` (equivalently `.\start.ps1`), which
starts the backend on port 11010, the Vite frontend on port 11011, and opens the
console in your browser. The backend needs HTTP mode for the console, which the
launcher sets automatically; running `uv run grandorgue-mcp` by hand gives you
stdio mode for Claude Desktop instead. Keep both straight: stdio for agents,
HTTP for the browser.

## 2. First sounds in five minutes

Open the console at `http://127.0.0.1:11011`. The Dashboard shows four status
cards (GrandOrgue, MIDI Bridge, Organ, Version), action buttons, and — on a
fresh install — a red setup button. Click **Start GrandOrgue**. The card flips
to Running within seconds; if it does not, the red offline box tells you the
backend is unreachable and how to start it.

Click **Connect MIDI**. The MIDI Bridge card flips to Connected. Now load an
organ: if this is truly your first run you have none yet, so jump to Tutorial 9
and come back. With a set installed, open Library, click Load on any organ, and
return to the Console page. Press the on-screen keys (or ask the chat to play a
note). Sound means the whole chain works: browser → backend → virtual MIDI →
GrandOrgue engine → your speakers. No sound with everything green almost always
means GrandOrgue's own audio output device is wrong — check its audio settings,
not this console.

## 3. Console tour

**Dashboard** (`/`) is mission control: status cards, Start/Stop, Connect/
Disconnect, Panic, the last-organ Auto-Load card, MIDI port lists, and the AI
setup cue. When the backend is offline you instead get sample preview cards with
MOCK badges — obvious placeholders, never mistaken for live data.

**Inbox** (`/inbox`) lists things needing you, computed live: engine stopped,
bridge down (with a Connect-now button), no organ (with an Auto-Load button when
one is remembered), depot files waiting, no LLM detected. Empty inbox, clear day.

**Console** (`/console`) is the playing surface: manuals, stops, crescendo and
swell controls, combinations, panic. **Library** (`/library`) lists installed
sets and loads them. **Marketplace** (`/marketplace`) searches the free catalog.
**Memory** (`/combinations`) manages piston memories. **Record** captures MIDI.
**Registrations** saves and applies named stop combinations. **MIDI Depot**
uploads, lists, downloads, and deletes `.mid` files; **Player** plays them
through GrandOrgue's engine. **Mixer** trims expression levels. **Assistant**
suggests registrations from a text prompt. **Visualizer** draws the organ.
**Practice** loops Bach works with speed control. **Chat** (`/chat`) is the
full AI chat with presets, personalities, streaming, and export; the floating
button offers the same brain everywhere. **Apps** (`/apps`) is the fleet hub:
every fleet webapp with live health dots and one-click start. **Tools**
(`/tools`) and **Skills** (`/skills`) inventory the machine surface agents see.
**Logs** (`/logs`) shows the server ring buffer plus browser logs, with export
and AI analysis. **Help** (`/help`) is this guide's in-app sibling. **Settings**
holds paths, ports, providers, and the setup walkthrough.

## 4. Tutorials

Twelve workflows, each ending in something you can hear or verify.

### Tutorial 1 — Start the engine and connect MIDI

Goal: both Dashboard cards green. Steps: open `/`, click Start GrandOrgue, wait
for Running; click Connect MIDI, wait for Connected. Verify: `go_status` (tool
or chat) reports `go_running: true, midi_connected: true`. If Connect fails,
open Settings and confirm the port names, then check `go_list_midi_ports`.

### Tutorial 2 — Load your first organ

Goal: an organ name on the Dashboard. Steps: Library → pick any installed set →
Load → wait for the confirmation → Dashboard shows the name. Verify: play a
Console key and hear it. If loading hangs on UI automation, load by full
`.organ` path instead — path loads skip the helper entirely. The choice is
remembered, so next time Tutorial 3 suffices.

### Tutorial 3 — The one-click return

Goal: yesterday's organ, one click. Steps: Dashboard → Auto-Load card → click.
Verify: organ name appears. This calls `go_auto_load`, which replays the saved
record. If it reports "no organ saved," do Tutorial 2 once to create the record.

### Tutorial 4 — Play notes and chords

Goal: deliberate pitched sound. Steps: Console → click keys, or chat "play
middle C," or tools `go_play_note(midi_note=60)` then
`go_play_chord(notes=[60,64,67])`. Middle C is 60; add 12 per octave. Verify by
ear. Remember tool latency is not a metronome — for rhythms, use MIDI files
(Tutorial 7), not five rapid tool calls.

### Tutorial 5 — Stops, crescendo, swell

Goal: change the tone, not just the pitch. Steps: Console → toggle a stop (or
`go_set_stop(stop_cc=21, state=True)` with your organ's CC), move crescendo
(`go_set_crescendo(value=64)`), open the swell (`go_set_enclosure(cc=7,
value=100)`). Verify: same note, audibly different color. If a stop CC does
nothing, your organ maps it elsewhere — check the set's docs, never assume.

### Tutorial 6 — Pistons and panic

Goal: instant registration changes plus a safety reflex. Steps: set some stops,
fire `go_combination(number=1)`; try number 2 and 3. Then deliberately cause
stuck sound (long chord) and hit **Panic** (or `go_panic`). Verify: pistons
change the chorus; panic always silences. Teach your fingers where Panic lives
before you need it.

### Tutorial 7 — Upload and play a MIDI file

Goal: a full piece through the real engine. Steps: MIDI Depot → upload a `.mid`
(names flatten safely) → Player → play (or `go_play_midi_file(name="...")`).
Verify: `go_midi_playback_status` says playing; stop with `go_stop_playback`.
Prefer GrandOrgue's built-in player path (default) over the UI-automation
variant unless the default fails on your setup.

### Tutorial 8 — The Bach bundle

Goal: a full Bach library in one call. Steps: chat "download the Bach bundle"
or tool `midi_depot_download_bach()` → wait for the count → Depot lists the
files → play any (`go_play_midi_file`). Verify: count > 0 and one file plays.
Files already present are skipped, so re-running is safe.

### Tutorial 9 — Your first free sample set

Goal: a new instrument installed. Steps: Marketplace → search "Baroque" → pick
a set → `go_marketplace_download(name="...")` → open the URL, download, extract
into your organs directory → Library → Load. Verify: the new name on the
Dashboard and a test chord. Quote the set's RAM needs before downloading on a
small machine.

### Tutorial 10 — Save and reuse a registration

Goal: a named sound you can recall. Steps: set stops to taste → Registrations →
save with a name and the organ → change everything → Apply the saved one.
Verify: the chorus returns exactly. Registrations live in SQLite keyed by organ,
so name them per-organ ("Burea / Hymn soft") to stay sane across sets.

### Tutorial 11 — Enable AI chat with a local engine

Goal: chat answers from your own machine. Steps: install Ollama
(`winget install -e --id Ollama.Ollama`; one-click button on Settings when the
backend offers it) → `ollama pull llama3.2:3b` → Settings → Re-detect →
provider card flips green → pick provider and model → Chat. Verify: the Chat
header shows provider and model, and a question streams an answer. No keys, no
accounts, no data leaves the PC. If nothing is detected, the Dashboard cue and
the Inbox both point at Settings.

### Tutorial 12 — Shut down and restart cleanly

Goal: full stop, full recovery. Steps: `go_stop_playback` if playing →
Dashboard Stop GrandOrgue → optionally `grandorgue_shutdown(confirm=True)` to
kill the server itself (agents must confirm this in words first). Restart with
`just web`; recover with Tutorial 3. Verify: `go_status` shows stopped, then
running again after restart. Never kill processes from Task Manager while a
Tauri build holds `resources/*.exe` — use the NSIS uninstall hooks' sidecar
kill instead.

## 5. API reference (condensed)

Liveness: `GET /health` (alias `/api/v1/health`). Status: `GET /api/status`.
Discovery: `GET /api/capabilities`, `GET /api/v1/diagnostics`, `GET /api/skills`
(+ `/api/skills/grandorgue/content` for the preprompt text). Logs:
`GET /api/logs?limit=&offset=&level=&search=`. LLM:
`GET /api/llm/providers|discover|models|onboarding`,
`POST /api/llm/chat {provider, model, prompt, system}`,
`POST /api/llm/chat/stream` (SSE `{chunk}` events, `[DONE]` terminator),
`POST /api/llm/install {engine}` plus `GET /api/llm/install/status`
(allowlisted engines only). Organs: `GET /api/organs`,
`POST /api/organs/load {name, path}`, `GET /api/organs/last`,
`GET /api/catalog`, `GET /api/marketplace/search?q=`,
`GET /api/bach/catalog?bwv=`. MIDI: `GET /api/midi/ports`,
`POST /api/midi/connect|disconnect|play|stop`, `GET /api/midi/playback-status`,
`POST /api/note|note/off|stop|crescendo|enclosure|combination|panic`. GO:
`GET /api/go/status`, `POST /api/go/start|stop`. Depot:
`GET|POST /api/midi-depot`, `GET|DELETE /api/midi-depot/{name}(/download|/raw)`,
`POST /api/midi-depot/batch/bach`. Registrations: CRUD under
`/api/registrations` plus `POST /api/registrations/{id}/apply`. Settings:
`GET|PUT /api/settings`. WebSocket `/ws`: send `status|note|note_off|stop|
panic|ping`, receive status broadcasts and `pong`. MCP: tools at `/mcp`,
prompt `grandorgue_assistant`, resource `status://grandorgue`.

## 6. Troubleshooting

Backend offline box: start `uv run grandorgue-mcp` or `.\start.ps1`; check
`GET /health`. Port zombie: `just zombies`, then `just zombie-clean`. No sound
with green cards: GrandOrgue's audio device, then organ loaded, then stops
actually on. Connect fails: port names in Settings versus `go_list_midi_ports`.
Load hangs: use a full `.organ` path to bypass UI automation. Playback silent:
organ loaded? bridge connected? file in depot (`midi_depot_list`)? Chat
"request failed": backend running? provider detected (Settings)? model picked?
Install button stalls: `GET /api/llm/install/status` shows winget output tail;
finish manually with the printed command. Version shows N/A: exe path unset —
set it in Settings so metadata discovery can run.

## 7. Deep dives

### MIDI concepts for organists

MIDI note numbers center on middle C at 60: C4=60, D4=62, E4=64, F4=65, G4=67,
A4=69, B4=71, C5=72. Pedal reeds typically live two octaves down (36–60). When
the chat plays "a D minor chord," it sends 62/65/69 — ask it to confirm the
spelling if the harmony sounds wrong; enharmonic equivalents (F# vs Gb) share
numbers, so context decides. Channels separate divisions: keep melody,
accompaniment, and pedal on distinct channels or they collapse onto one manual.
Velocity 64 is a neutral default; festive principals like 90–100; strings under
50. Durations in `go_play_note` only schedule the automatic note-off — the
attack is immediate, so "hold for two beats" is approximate by nature. For real
rhythm, MIDI files (Tutorial 7) beat tool calls every time: the engine's player
renders sample-accurate timing while tool calls traverse HTTP, a virtual port,
and the audio buffer with jitter. Finally, CC mappings are per-organ folklore:
write down yours (a sticky note beats memory) because stop 21 on Burea is not
stop 21 anywhere else.

### The registration craft

Think in families. Principals (Diapason, Octave) are the chorus backbone: 8′
foundation, 4′ clarity, 2′ brilliance, mixtures for crown. Flutes (Rohrflöte,
Chimney Flute) accompany and solo softly. Strings (Gamba, Salicional) add keen
edge under flutes, never alone at full. Reeds (Trumpet, Oboe, Krummhorn) solo
and crown — a festival chorus is principals through mixtures plus a reed, not
reeds alone. Pedal needs independent foundation (16′ + 8′) or the bass floats.
Build choruses upward: 8′ alone, add 4′, add 2′, add mixture, add reed last,
checking balance at each step. For hymns, pair a soft 8′ flute pair on the Swell
with a clear 8′ principal on the Great and a 16′+8′ pedal — then use the swell
shoe (`go_set_enclosure`) for phrases instead of changing stops mid-verse. For
Bach preludes, start principal chorus without reeds and add the reed only for
final entries. Save every keeper via Registrations with organ-specific names;
"Burea/Prelude" beats "nice sound 3". When asking the Assistant for ideas, say
the piece, the mood, and the manuals you have — it answers in families first,
CC numbers only with your confirmed mapping.

### Bach repertoire roadmap

Start where the hands separate cleanly: the Eight Little Preludes and Fugues
(BWV 553–560) teach pedal independence without punishing rhythm. Move to the
Schübler Chorales (BWV 645–650) for singing lines over walking bass, then the
"Toccata and Fugue" (BWV 565) for drama — its opening is improvisatory, so
timing freedom is historically honest. The Trio Sonatas (BWV 525–530) demand two
manuals plus pedal and reward months of work; attempt one movement at a time.
The Clavier-Übung III (BWV 552, 669–689) is the summit: catechism chorales
framing the St. Anne prelude and fugue. Use the catalog (`go_bach_catalog`) by
BWV, fetch the bundle once (Tutorial 8), then practice with the Practice page:
slow the tempo to 60%, loop the hard bars, bring speed up in 10% steps. For
registration, period honesty means bright, articulate choruses with minimal
swell-box expression — save the romantic swell for Franck, not Bach.

### Choosing sample sets

Match the set to the machine first: check RAM requirements against installed
memory minus 4 GB headroom for Windows itself; a set that pages to disk stutters
no MIDI bridge can fix. Match to the room second: wet (long reverb) sets flatter
small speakers and muddy fast passagework; dry sets need a little artificial
reverb or sound clinical. Match to repertoire third: Baroque sets (Burea-style,
meantone options, bright mixtures) for Bach; Romantic sets (strings, celestes,
enclosed divisions, orchestral reeds) for Franck, Widor, Vierne. Prefer sets
with documented MIDI CC maps — undocumented stops turn `go_set_stop` into
guesswork. Free sets from the Marketplace cover all three schools; start free,
learn your taste, and only then consider commercial sets. After installing,
always load once manually in GrandOrgue before driving it from tools: caches
build, paths settle, and first-load errors surface where you can see them.

### Latency, timing, and expectations

Every tool call pays three tolls: HTTP to the backend, virtual-MIDI delivery,
and the audio buffer (typically 10–50 ms each way, jittery under load). A
single chord call feels instant; a melody spelled as twelve calls drifts like a
tired drummer. Rules of thumb: one call per musical gesture maximum; chords not
arpeggios via tools; files not tools for pieces; status checks between gestures,
not between notes. If timing degrades mid-session, suspect Windows audio
exclusive-mode contention or a background virus scan before blaming the bridge —
`go_midi_playback_status` plus the Logs page distinguish "engine busy" from
"messages lost." Recording (Record page) captures your Console playing for
later file playback, closing the loop from improvisation to repeatable
performance.

## 8. Settings reference, control by control

**GrandOrgue Executable.** The full path to `GrandOrgue.exe`. The backend
probes this file for version metadata and launches it on Start; a wrong path is
the single most common "Start does nothing" cause. The page lists detected
default install locations as one-click buttons — prefer a detected path over
typing. Status reads "Executable found" plus the version when correct.

**MIDI Bridge Ports.** Two virtual port names: the MCP output port (what
GrandOrgue sees as its MIDI *input*) and the MCP input port (GrandOrgue's MIDI
*output*). Defaults ("GrandOrgue MCP Out/In") work unless another device claims
them. GrandOrgue's MIDI Devices tab must show the same two strings — mismatched
names are silent failures, so compare character by character including case.
Renames are rejected while connected: Dashboard → Disconnect MIDI → edit →
Save → Connect MIDI. The resolved config paths at the page bottom tell you
exactly which files hold these values if you ever need to hand-edit.

**Local LLM Provider.** The provider grid probes Ollama (`:11434`) and LM
Studio (`:1234`) through the backend — green means models listed, not merely a
port open. The provider dropdown only offers detected engines; the model
dropdown only offers their models; both persist to localStorage. Re-detect
re-probes without reload. Provider cards add per-engine Test (live model count)
and, for a missing Ollama, the one-click winget install with progress polling.
The GPU readout comes from the backend discover endpoint: detected / not
detected / checking. A GPU with no engine triggers the opportunity banner —
that banner is an invitation, not an error.

**Onboarding card.** Full mode on Settings always shows status plus setup paths:
detected locals as radio options with model counts, the install hint when
nothing runs, and "Use this setup" persisting the choice and marking onboarded.
The Dashboard banner is the same component in miniature: red cue when
unconfigured, nothing when ready. If you ever want the first-run experience
back (demos love this), clear the `llm_onboarded` localStorage key.

**Configure GrandOrgue checklist.** The numbered walkthrough (save → start →
connect → GO audio/MIDI settings → devices → load → Console keys) is the
canonical order; doing MIDI before audio in GO is the classic mistake that
produces a connected-but-silent rig. The config-path readout underneath names
both files involved so support conversations stay concrete.

## 9. Console, Player, and Practice mastery

The **Console** page centers on the manuals: on-screen keys for mouse playing,
stop tabs grouped by division, crescendo and enclosure sliders, piston buttons,
and panic. Mouse velocity is fixed — expression comes from stops and shoes, as
on the real instrument. Stop changes apply instantly through the bridge; watch
the status line confirm each CC before playing into the new registration.

The **Player** page is a jukebox over the depot: file list with sizes, play via
GrandOrgue's engine, stop, and playback status. It plays only depot files —
upload first (Depot page or `midi_depot_upload`), then play. Long files keep
playing after you navigate away; the Inbox will remind you something is waiting,
and `go_stop_playback` ends it from anywhere including chat.

The **Practice** page pairs a MIDI file selector with speed control (percent of
written tempo), A↔B section looping, and status readout. Workflow: pick a Bach
file, set 60%, loop the hard four bars, play along on a second manual or just
listen, raise speed in tens. Looping a transition (two bars before the hard
part) beats looping the hard bars alone — entries matter as much as execution.

The **Assistant** page turns prose into registrations: describe piece and mood,
get stop families back, apply by hand or via the suggested CC calls. It uses
the same chat proxy as everything else, so it needs a configured model exactly
like Chat does.

The **Apps** page lists the whole fleet (236 services) with live health dots
per port, search, category filters, card/list views, and one-click ensure/start
per app. Unknown ports fall to Experimental. It is the fastest way to discover
that, say, a speech or scraper service already exists for your next idea.

## 10. Combinations, pistons, and performance flow

Generals (Memory page, pistons 1–10) are global: one press reconfigures every
division. Divisionals (where the organ provides them) affect one manual. Build a
performance plan as a piston sequence before playing: 1 = opening registration,
2 = first build, 3 = full chorus, 4 = intimate verse, and so on — then rehearse
the thumb movements, because a missed piston mid-piece is worse than a missed
note. Save the same plan as named Registrations (which survive restarts and are
per-organ) so the piston layout is recoverable after changes. During
performance, keep one hand's thumb near the pistons and never look down: the
Console layout mirrors standard piston rails left-to-right. For page turns and
piston presses colliding, `go_combination` from chat (or a second person) is a
legitimate page-turner. After the performance, panic-check (all notes off),
then unload only if switching organs — keeping the organ loaded makes tomorrow
start with Tutorial 3 instead of Tutorial 2.

## 11. Glossary

**Manual**: a hand keyboard (Great, Swell, Choir, Solo). **Pedal**: the
foot keyboard, usually 30–32 notes driving 16′ and 8′ ranks. **Stop**: one
rank (or chorus) switchable by drawstop, tab, or MIDI CC. **Rank**: one set of
pipes, one pipe per note. **Division**: a manual plus its stops and windchest.
**Swell box**: an enclosed division whose shutters (the enclosure, CC 7 by
default) shape loudness continuously. **Crescendo pedal**: a shoe that adds
stops progressively 0–127. **Combination/piston**: a memorized registration
recalled by one press (Program Change here). **Registration**: a named stop
combination, savable in this console. **Sample set**: recorded ranks plus the
`.organ` definition that maps them. **Depot**: this server's MIDI file folder.
**MOCK badge**: a placeholder-preview marker, never live data. **Onboarded**:
the localStorage flag set after choosing an AI setup; the banner hides once
set. **Ring buffer**: the last-500 server log kept in memory for the Logs
page. **Allowlisted**: the only engine names the install endpoint will run
(`ollama`) — everything else is refused by design.

## 12. FAQ

Do I need GrandOrgue installed? Yes — this is a console for it, not a synth.
Which sample set first? Any small free Baroque set; upgrade to Romantic when RAM
allows. Why two chat UIs? The floating button is always at hand; `/chat` adds
presets, personalities, refine, streaming, and export. Where are my files? Depot
defaults to `midi_depot/` in the repo; recordings wherever GrandOrgue puts
them (Settings shows both). Does chat send data anywhere? Only to the local
engine you chose; there are no cloud providers in this build. Can agents rename
my ports? Only while disconnected — the server rejects it otherwise. What
exactly did the AI change? Every mutation returns a `message`; the Logs page
keeps 500 server entries plus the browser journal. How do I update? Pull, `uv
sync --all-extras --group dev`, `bun install`, `just gates-green`, restart.
Can I use two manuals and pedal from one keyboard? Yes — split your keyboard
by note range in GrandOrgue's MIDI settings (or use two keyboards plus a pedal
board on separate channels); the Console plays channel 0 by default, and tools
take explicit channels. Why does the same MIDI file sound different on two
sets? Because registrations, voicing, temperament, and reverb are set
properties, not file properties — the file is instructions, the set is the
instrument. How big is the Bach bundle? About 665 KB compressed, up to 500
files, each capped at 5 MB; already-present files skip, so updates are cheap.
What does "MOCK" mean on the Dashboard? Placeholder preview cards shown while
the backend is offline — start the backend for live values; mock data never
mixes with real readings. Why is Chat disabled with "no model selected"? The
design never auto-loads a multi-gigabyte model on your behalf; pick one in
Settings once and the choice persists. Can I run the backend on another
machine? Yes — set HOST and the Vite proxy target accordingly, keep the pair
on the same LAN or Tailscale (CORS already allows both patterns), and never
expose 11010 to the open internet without a reverse proxy. Where do I report
bugs? The repository issues page, with the Logs page full export attached —
that bundle (server ring buffer plus your description) resolves most reports
without a follow-up round. Can I drive all of this from an AI agent instead
of clicking? Yes — that is the point of the MCP surface: all 31 tools, the
skill preprompt, and the status resource are available to any MCP client over
stdio (Claude Desktop, the `.mcpb` bundle) or HTTP at `/mcp`. Agents follow
the same playbooks as this guide: status first, connect before playing,
confirm before deleting, and never shut the server down without your explicit
words. The Tools page lists the exact inventory your agent sees.
