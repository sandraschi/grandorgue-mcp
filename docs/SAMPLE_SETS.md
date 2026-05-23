# Sample Sets — Marketplace & Installation Guide

## Free Sample Sets Catalog

### Piotr Grabowski Collection

One of the most prolific and respected free sample set creators. His sets are meticulously sampled with multiple releases, tremulant samples, and full ODF configurations.

| Organ | Location | Style | Manuals | Stops | Size |
|-------|----------|-------|---------|-------|------|
| **Caen Abbey** | Caen, France | French Romantic | 4 | 54 | ~6 GB |
| **Giubiasco** | Giubiasco, CH | Italian Baroque | 2 | 25 | ~2 GB |
| **Friesach** | Friesach, AT | Austrian Baroque | 3 | 34 | ~3 GB |
| **Palma** | Palma, ES | Spanish Baroque | 4 | 52 | ~4 GB |
| **Melcer Chamber** | Poland | Polish Romantic | 2 | 12 | ~1 GB |
| **St. Omer** | St. Omer, FR | French Classical | 4 | 48 | ~5 GB |
| **Cracov** | Krakow, PL | Polish Romantic | 2 | 31 | ~2.5 GB |

**Website**: https://piotrgrabowski.pl/

### Lars Palo Collection

Swedish organist and GrandOrgue core developer. His sets are extremely detailed with meticulous recording technique.

| Organ | Location | Style | Manuals | Stops | Size |
|-------|----------|-------|---------|-------|------|
| **Burea Church** | Burea, SE | Swedish Romantic | 2 | 20 | ~2 GB |
| **Burea Funeral** | Burea, SE | Swedish Romantic | 1 | 8 | ~800 MB |
| **Pitea MHS** | Pitea, SE | Swedish School | 2 | 12 | ~1.5 GB |
| **Kalvtrask Church** | Kalvtrask, SE | Swedish | 1 | 8 | ~600 MB |
| **Ekeby Church** | Ekeby, SE | Swedish | 2 | 18 | ~1.8 GB |

**Website**: http://familjenpalo.se/vpo/

### Other Free Sources

| Creator | Website | Notable Sets |
|---------|---------|-------------|
| Augustine Zwick | http://www.zwickmusic.com/ | Various German Baroque |
| Jiri Zurek | http://www.sonusparadisi.cz/ | Czech organs (some free) |
| GrandOrgue Demo | Built into GO | Small 2-manual demo |

---

## Commercial Sample Sets (Hauptwerk-compatible)

These companies sell encrypted Hauptwerk sample sets, but some offer **unencrypted versions** that work with GrandOrgue:

| Publisher | Website | GrandOrgue Compatible? |
|-----------|---------|----------------------|
| Sonus Paradisi | sonusparadisi.cz | Some unencrypted |
| Inspired Acoustics | inspiredacoustics.com | Limited |
| Piotr Grabowski | piotrgrabowski.pl | Yes (all free) |

> **Note**: Encrypted Hauptwerk sample sets (DRM-protected) CANNOT be used with GrandOrgue. Only unencrypted .organ ODF + .wav format works.

---

## How to Install a Sample Set

### Method 1: Auto-Install (.orgue packages)

1. Download a `.orgue` file (GrandOrgue package format)
2. In GrandOrgue: **File → Install Organ Package**
3. Select the downloaded file
4. GrandOrgue extracts the package and registers the organ

### Method 2: Manual Install (ODF + WAV)

1. Download the sample set archive (ZIP, RAR, etc.)
2. Extract to a directory in your GrandOrgue organ search path:
   - Windows: `C:\Users\<You>\GrandOrgue\organs\`
   - Linux: `~/GrandOrgue/organs/`
   - macOS: `~/GrandOrgue/organs/`
3. In GrandOrgue: **File → Load** — the organ should appear
4. First load will build the sample cache (may take several minutes)

### Method 3: Web Console Install (future)

The GrandOrgue MCP web console will support one-click download and install from the catalog.

---

## Recommended Starter Set

For first-time users, we recommend:

**Burea Church** (Lars Palo) — small, beautiful, easy to install, free.

1. Download from http://familjenpalo.se/vpo/burea/
2. Extract to `~/GrandOrgue/organs/Burea Church/`
3. Load in GrandOrgue
4. Enjoy a Swedish Romantic church organ from your desk

---

## Sample Set Quality Tiers

| Tier | Description | Polyphony Load | Example |
|------|-------------|---------------|---------|
| **Demo** | Built-in, 1-2 stops | Very low | GO Demo Organ |
| **Small** | 1-2 manuals, 8-20 stops | Low (~200 pipes) | Burea Church |
| **Medium** | 2-3 manuals, 20-40 stops | Medium (~500 pipes) | Giubiasco |
| **Large** | 3-4 manuals, 40-60 stops | High (~1000+ pipes) | Caen, Friesach |

Start small — even a single-manual organ with 8 stops is a magnificent instrument when played well.

---

## Contributing New Sample Sets

If you have recorded an organ and want to create a GrandOrgue sample set:

1. Use **ODFEdit** (included with GrandOrgue Tools) for ODF creation
2. Record at 48 kHz / 24-bit for best quality
3. Include at least 3 releases per pipe (short, medium, long)
4. Consider recording tremulant samples for key stops
5. Use lossless compression (WavPack) to keep file sizes manageable
6. Package as `.orgue` for easy distribution

The community is always grateful for new sample sets of organs not yet available.

---

## AI Agent Marketplace Tools

The MCP server exposes these tools for agents to browse and manage sample sets:

- `go_list_organs()` — list installed + catalog entries
- `go_load_organ(path)` — load an organ by path

Future tools:
- `go_find_sample_set(query)` — search the catalog by keyword
- `go_download_sample_set(name)` — fetch and install a free set
- `go_organ_info(name)` — detailed stop list and specification
