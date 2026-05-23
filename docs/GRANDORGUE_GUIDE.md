# GrandOrgue — What It Is, How We Got Here

## What Is GrandOrgue?

GrandOrgue is a **free and open-source virtual pipe organ simulator**. It loads sample sets — digital recordings of every pipe of a real pipe organ — and lets you play them via MIDI keyboards. The result is indistinguishable from playing the actual organ in the actual church.

GrandOrgue is the free alternative to the commercial **Hauptwerk** software. Both use the same sample set format and offer comparable audio quality. The difference: GrandOrgue is GPL-licensed, community-maintained, and costs nothing.

### Key Features

- Loads **Hauptwerk-compatible sample sets** (.organ ODF format + .wav samples)
- **Polyphonic pipe simulation** — every pipe played independently with its own attack/sustain/release
- **Convolution reverb** — realistic church/cathedral acoustics via impulse response files
- **MIDI control** — stops, pistons, expression pedals, crescendo, all via MIDI
- **Combination memory** — thumb pistons and toe studs with YAML-format memories
- **Multi-manual** — unlimited manuals/keyboards + pedalboard
- **Tremulants** — sampled or modelled wind tremulant
- **Cross-platform** — Windows, Linux (including Raspberry Pi), macOS (Intel + Apple Silicon)

### Who Made It?

- **Original author**: Unknown — MyOrgan was released anonymously as a free Hauptwerk 1 alternative (2006)
- **Current maintainers**: Lars Palo, Oleg Samarin, Denis Roussel
- **Key contributors**: Piotr Grabowski (sample sets), Graham Goode, JLD
- **License**: GPL-2.0-or-later
- **Repository**: https://github.com/GrandOrgue/grandorgue
- **Version**: 3.17.1-1 (April 2026)

---

## A Brief History of PC Organ Simulation

### 1980s: The MIDI Revolution

The MIDI protocol (1983) made it possible to connect organ consoles to computers. Early software like **Soundscape** and **Miditzer** used synthesis — generating organ tones algorithmically from oscillators and filters. Good for its time, but not convincing.

### 1990s: Sampling Arrives

The first sample-based organ software appeared. **Hauptwerk 1** (2002, Milan Digital Audio) was the breakthrough: instead of synthesizing, it played back actual recordings of real organ pipes. Each pipe was sampled at multiple velocities, with separate attack and release samples. This was the first software that could fool a trained organist.

But Hauptwerk was expensive — several hundred dollars for the basic license, plus commercial sample sets costing hundreds more.

### 2006: MyOrgan — The Free Alternative

An anonymous developer released **MyOrgan**, a free clone of Hauptwerk 1's feature set. It loaded the same sample sets and sounded identical, but was GPL-licensed and free. The name came from the British phrase "my organ."

In 2009, the original MyOrgan author transferred copyrights to Milan Digital Audio (Hauptwerk's publisher). The community forked the codebase and renamed it **GrandOrgue** ("great organ" in French).

### 2010s: GrandOrgue Matures

The project moved between hosts — SourceForge, then GitHub. Features accumulated:
- Convolution reverb (2012)
- Jack native audio output (2014)
- macOS and Raspberry Pi builds
- WAV lossless compression, multi-release samples
- Tremulant modelling, windchest physics

### 2020s: Active Development Resumes

After a quiet period, Oleg Samarin picked up development in 2021 and has been pushing regular releases since. Key milestones:
- **3.6.0** (Jan 2022): MIDI device regex matching, PortAudio 19.7
- **3.11.0** (Apr 2023): YAML combination files, organ package support
- **3.15.0** (Aug 2024): Regex audio device matching, tone balance voicing
- **3.17.0** (Feb 2026): Command-line `--config` option, metronome customization
- **3.17.1** (Apr 2026): latest stable

### Free Sample Set Ecosystem

The GrandOrgue ecosystem is powered by generous creators who sample organs and release them for free:

- **Lars Palo** (Sweden): Burea Church, Pitea MHS, and many Swedish organs — meticulously sampled
- **Piotr Grabowski** (Poland): Large Romantic organs including the famous Caen Abbey set
- **Other creators**: Augustine Zwick, Jiri Zurek, and dozens of one-off instrument samplers

Today there are **hundreds of free sample sets** covering organs from Baroque through Romantic to modern.

---

## Hauptwerk vs GrandOrgue

| | Hauptwerk 8 | GrandOrgue 3.17 |
|---|---|---|
| **Price** | $249-$599 (Advanced), $99 (Basic) | Free |
| **License** | Proprietary | GPL-2.0 |
| **Encrypted sample sets** | Yes (DRM) | No |
| **Free sample sets** | ~50 (unencrypted only) | Hundreds |
| **Commercial sample sets** | Hundreds (encrypted) | Few (10-15 unencrypted) |
| **Convolution reverb** | Built-in | Built-in (ZitaConvolver) |
| **Wind model** | Physical modelling | Enclosure-based |
| **Polyphony** | Unlimited (CPU-bound) | Unlimited (CPU-bound) |
| **Combinations** | Yes | Yes (YAML since 3.11) |
| **MIDI learn** | Yes | Manual MIDI editor |
| **macOS** | Yes (Intel + AS) | Yes (14+ for AS, 15+ for Intel) |
| **Raspberry Pi** | No | Yes |
| **CLI / API** | No | No (MIDI only) |
| **Modern web console** | No | **Yes — GrandOrgue MCP** |

### Why Use GrandOrgue + MCP?

Hauptwerk's GUI is polished but proprietary. GrandOrgue's wxWidgets UI is functional but dated. GrandOrgue MCP adds:
- A **modern web console** accessible from any device on the network
- **AI agent control** — an LLM can play the organ, set stops, and perform for you
- **MIDI port management** with one-click connect/disconnect
- **Sample set marketplace** with catalog browsing
- **Combination memory** with visual piston editor
- **Recording** with MIDI capture

The core audio engine (GrandOrgue C++) remains untouched. MCP is a control surface layer — like upgrading the console without touching the pipes.
