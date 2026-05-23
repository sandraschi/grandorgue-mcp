# GrandOrgue MCP

**Modern Organ Console — a free control surface for the GrandOrgue pipe organ simulator.**

GrandOrgue MCP gives GrandOrgue a beautiful, responsive web console + AI-agent-capable backend. It connects to GrandOrgue via MIDI and replaces its aging wxWidgets GUI with a modern React dashboard. Every stop, piston, manual, and swell pedal is controllable from any browser — or from an AI agent via MCP tools.

Built for the GrandOrgue community with gratitude for decades of free organ simulation. This is our contribution back — a modern console layer that works with any existing GrandOrgue installation and sample set.

---

## Contents

- [Quick Start](#quick-start)
- [Documentation](#documentation)
  - [README.md](README.md) — this file, overview and quick start
  - [docs/GRANDORGUE_GUIDE.md](docs/GRANDORGUE_GUIDE.md) — what GrandOrgue is, history of PC organ simulation, Hauptwerk comparison
  - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system architecture, MIDI bridge, port layout
  - [docs/BACH_CATALOG.md](docs/BACH_CATALOG.md) — complete J.S. Bach organ MIDI repertoire
  - [docs/MIDI_SETUP.md](docs/MIDI_SETUP.md) — step-by-step MIDI configuration
  - [docs/MCP_TOOLS.md](docs/MCP_TOOLS.md) — AI agent tool reference
  - [docs/SAMPLE_SETS.md](docs/SAMPLE_SETS.md) — marketplace, free sample sets, installation guide
- [Ports](#ports)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Quick Start

### Prerequisites

- [GrandOrgue](https://github.com/GrandOrgue/grandorgue/releases) installed (Windows / Linux / macOS)
- [uv](https://docs.astral.sh/uv/) for Python dependency management
- [Node.js 20+](https://nodejs.org/) for the web console

### One-Command Setup

```powershell
# Install backend deps
just install

# Install frontend deps
just install-web

# Launch everything (backend + frontend + browser)
just web
```

The backend starts on **port 11010**, the frontend on **port 11011**.

### Manual Start

```powershell
# Terminal 1 — Backend
uv run grandorgue-mcp

# Terminal 2 — Frontend (opens browser)
cd web_sota && npm run dev
```

### First-Time Setup

1. Install GrandOrgue from [GitHub Releases](https://github.com/GrandOrgue/grandorgue/releases)
2. Install at least one free sample set (see [docs/SAMPLE_SETS.md](docs/SAMPLE_SETS.md))
3. Start the MCP server (`uv run grandorgue-mcp`)
4. Open the web console at http://127.0.0.1:11011
5. From the Dashboard, click **Start GrandOrgue** then **Connect MIDI**
6. GrandOrgue must be configured to use the virtual MIDI ports (see [docs/MIDI_SETUP.md](docs/MIDI_SETUP.md))

---

## Ports

| Port | Service |
|------|---------|
| 11010 | Backend — FastMCP 3.2 + FastAPI REST + WebSocket `/ws` |
| 11011 | Frontend — Vite React SPA, proxies `/api` → 11010 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12+, FastMCP 3.2, FastAPI, uvicorn |
| MIDI Bridge | mido + python-rtmidi (virtual ports) |
| Audio Engine | GrandOrgue C++ (untouched — MIDI control only) |
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Linting | Ruff (Python), Biome (TypeScript) |
| Testing | pytest + Playwright e2e |

---

## License

MIT — free for the GrandOrgue community, forever.
