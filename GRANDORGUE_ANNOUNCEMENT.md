## GrandOrgue MCP — A Modern Web Console + AI Agent Interface for GrandOrgue

**Free. Open Source. MIT. Built in 2 hours by two people who love organs but hate wxWidgets.**

---

### What it is

GrandOrgue MCP is a control surface layer for GrandOrgue. It sits on top of your existing GO installation and replaces the aging wxWidgets GUI with:

- **A modern responsive web console** (React + Tailwind, dark theme)
- **A MIDI bridge** (virtual MIDI ports via python-rtmidi — no hardware required)
- **An MCP agent interface** (16 tools that any AI can use to play, register, and control the organ)
- **A sample set marketplace** with catalog of the best free sets (Caen, Friesach, Giubiasco, Burea, Pitea MHS...)
- **A complete J.S. Bach organ works reference** (BWV 525-771, with registration guidance)
- **6 pages**: Dashboard, Console, Marketplace, Combination Memory, MIDI Recorder, Audio Mixer

### Architecture

```
GrandOrgue      MIDI Bridge (mido)    FastAPI + FastMCP 3.2    React Webapp
  (C++ engine)  ◄────────────────►     (port 11010)           (port 11011)
                 virtual MIDI ports     REST + WebSocket + MCP  Vite proxy
```

No GrandOrgue code was modified. The audio engine, the sample playback, the convolution reverb — untouched. This is a control layer, not a fork.

### Who built it

| Role | Person | 
|---|---|
| **Architect** | Sandra Schipal (Vienna) — defined the system, port allocation, fleet standards, and product vision |
| **Programmer** | DeepSeek V4 Flash (code-named "opencode") — wrote every line of Python, TypeScript, and documentation |
| **Build time** | **2 hours net** (one afternoon, two cups of tea, and a read of the GrandOrgue changelog) |

### Quick start

```powershell
git clone https://github.com/sandraschi/grandorgue-mcp.git
cd grandorgue-mcp
just install
just install-web
just web
```

Requirements: GrandOrgue installed, Python 3.12+, Node.js 20+.

### The stack

- **Backend**: FastMCP 3.2, FastAPI, uvicorn, python-rtmidi, mido
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide icons
- **Docs**: 6 markdown files covering the full GrandOrgue history (Hauptwerk comparison, 1980s→2026), Bach catalog, MIDI setup, sample set installation, MCP tool reference, and system architecture

### Why we built it

GrandOrgue is one of the most impressive open-source projects in the audio space. The fact that it exists at all — a GPL-licensed pipe organ simulator with hundreds of free sample sets, convolution reverb, unlimited polyphony, and cross-platform support — is remarkable.

But the wxWidgets GUI is... honest. It works. It's functional. And it looks like 2006.

GrandOrgue deserves a modern interface. It also deserves to be accessible to the AI tools that are reshaping how we interact with software. The MCP protocol lets Claude, ChatGPT, or any agent load an organ, set stops, and play notes by calling tools. That's new. That's powerful.

### The full documentation

- [README](https://github.com/sandraschi/grandorgue-mcp) — overview and quick start
- [GRANDORGUE_GUIDE.md](https://github.com/sandraschi/grandorgue-mcp/blob/main/docs/GRANDORGUE_GUIDE.md) — history of PC organ simulation, Hauptwerk comparison
- [BACH_CATALOG.md](https://github.com/sandraschi/grandorgue-mcp/blob/main/docs/BACH_CATALOG.md) — complete J.S. Bach organ works reference
- [MCP_TOOLS.md](https://github.com/sandraschi/grandorgue-mcp/blob/main/docs/MCP_TOOLS.md) — AI agent tool reference
- [SAMPLE_SETS.md](https://github.com/sandraschi/grandorgue-mcp/blob/main/docs/SAMPLE_SETS.md) — marketplace and installation guide
- [MIDI_SETUP.md](https://github.com/sandraschi/grandorgue-mcp/blob/main/docs/MIDI_SETUP.md) — step-by-step MIDI configuration

### What's next

- **Tauri native wrapper** (~15 MB single installer, PyInstaller sidecar + Rust shell)
- **ODF editor** — visual organ definition builder
- **MIDI learn** — point-and-click MIDI assignment
- **Live streaming** — audio capture + Icecast broadcast
- **AI accompanist** — LLM-driven continuo

But the core is done. It works today. Try it.

---

*Built for the GrandOrgue community with gratitude for decades of free organ simulation. Free forever under MIT.*
