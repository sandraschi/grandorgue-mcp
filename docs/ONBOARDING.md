# Onboarding — grandorgue-mcp

> First-timer path: install GrandOrgue, add one sample set, connect MIDI,
> pick a local LLM. Five minutes to first note.

## What for

GrandOrgue is a free pipe organ simulator (Windows/Linux/macOS). This repo
gives it a modern web console + AI-agent control. Without a GrandOrgue
install there is nothing to control — onboarding is **required**, not optional.

## Money / accounts

- GrandOrgue: free, no account.
- Sample sets: many free (see `docs/SAMPLE_SETS.md`, Marketplace page).
- Local LLM (Ollama / LM Studio): free, no key. No cloud provider is
  configured in this build.

## Steps

1. Install GrandOrgue from [GitHub Releases](https://github.com/GrandOrgue/grandorgue/releases).
2. Install one free sample set (Marketplace page or `docs/SAMPLE_SETS.md`).
3. Start the stack: `just install`, `just install-web`, `just web`
   (backend :11010, console :11011).
4. Dashboard: click **Start GrandOrgue**, then **Connect MIDI**.
5. Configure GO to use the virtual MIDI ports (`docs/MIDI_SETUP.md`).
6. Settings page: pick the auto-detected local LLM (Ollama/LM Studio).
   The Dashboard shows a red setup button until this is done.

## Sanity check

- `GET /health` returns `{"ok": true}`.
- Dashboard KPIs: GrandOrgue Running, MIDI Connected.
- `go_status` via any MCP client reports the loaded organ.
- Floating chat answers using the selected local model.

## Pitfalls

- Renaming MIDI ports while connected is rejected — disconnect first.
- GO has no `--version` flag; version comes from exe metadata.
- UI-automation organ load needs pywinauto-mcp (:10788); path load does not.
