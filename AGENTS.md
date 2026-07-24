# grandorgue-mcp — Agent Guide

## Overview
GrandOrgue pipe organ simulator MCP server — MIDI bridge, organ control, sample set management, modern web console

## Entry Points
- stdio (Claude Desktop / mcpb, default): `uv run grandorgue-mcp`
- HTTP (webapp backend :11010, MCP at /mcp): `MCP_TRANSPORT=http uv run grandorgue-mcp` or `just run`
- Full webapp (backend + Vite frontend :11011): `just web` / `.\start.ps1`

## Standards
- Flat FastMCP tools (30); portmanteau refactor planned for v0.3
- Dual transport via `MCP_TRANSPORT` env: `stdio` (default) | `http`
- Responses: structured dicts with `success`, `message`, domain-specific fields
- Shared logic lives in plain helpers; never call `@mcp.tool()`-decorated objects directly
- Depot file names must go through `_depot_path()` (traversal-safe)
- Blocking work goes through `anyio.to_thread.run_sync`
- See [mcp-central-docs](https://github.com/sandraschi/mcp-central-docs) for fleet-wide coding standards

## Key Files
- `src/grandorgue_mcp/server.py` — single canonical server (mcpb stages from here)
- `pyproject.toml` — build config and entry points
- `scripts/mcpb-pack.ps1` — mcpb bundle staging + pack
- `CLAUDE.md` — Claude Code context

Install docs: follow mcp-central-docs/standards/AGENT_INSTALL_REFERENCE.md
