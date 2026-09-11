"""MCP App (Prefab): GrandOrgue engine / MIDI / organ status card.

Hosts: Claude Desktop, Cursor (when MCP Apps + Prefab renderer supported).
Others fall back to the text ``content`` on the ToolResult.
"""

from __future__ import annotations

import logging
import os
from typing import Any

from fastmcp.tools import ToolResult
from fastmcp.tools.tool import ToolAnnotations  # type: ignore[import-not-found]
from prefab_ui.app import PrefabApp
from prefab_ui.components import Card, CardContent, CardHeader, CardTitle, Text

logger = logging.getLogger("grandorgue_mcp.tools.prefab.status_card")


def _error_view(title: str, message: str) -> ToolResult:
    with Card(css_class="max-w-md") as view:
        with CardHeader():
            CardTitle(title)
        with CardContent():
            Text(message)
    return ToolResult(content=f"{title}: {message}", structured_content=PrefabApp(view=view, title=title))


def register_status_card_tool() -> None:
    """Register ``go_status_card`` on the global FastMCP instance."""
    if os.environ.get("GRANDORGUE_PREFAB_APPS", "1").strip().lower() in ("0", "false", "no", "off"):
        logger.info("Prefab status card disabled (GRANDORGUE_PREFAB_APPS=0)")
        return

    from grandorgue_mcp.auto_load import load_last_organ
    from grandorgue_mcp.server import _status_payload, mcp

    @mcp.tool(
        app=True,
        annotations=ToolAnnotations(title="Status card", readOnlyHint=True, idempotentHint=True),
    )
    async def go_status_card() -> Any:
        """Show a rich GrandOrgue status card (engine, MIDI bridge, organ).

        Works in clients that render MCP Apps / Prefab (e.g. Claude Desktop).
        Disable with ``GRANDORGUE_PREFAB_APPS=0`` (skips registration).

        ## Return Format
        ToolResult with text ``content`` plus a PrefabApp status card.

        ## Examples
        go_status_card()
        """
        try:
            payload = await _status_payload()
        except Exception as e:
            logger.exception("go_status_card failed")
            return _error_view("Status unavailable", f"Could not read status: {e}")

        running = bool(payload.get("go_running"))
        midi = bool(payload.get("midi_connected"))
        organ = payload.get("organ") or {}
        organ_name = organ.get("name") or "none"
        last_record = load_last_organ()
        last = last_record.get("name") if isinstance(last_record, dict) else None

        if running:
            version = payload.get("go_version") or "unknown version"
            engine_line = f"Engine: running ({version})"
        else:
            engine_line = "Engine: stopped"
        midi_line = "MIDI bridge: connected" if midi else "MIDI bridge: disconnected"
        if organ_name != "none":
            organ_line = f"Organ: {organ_name} ({organ.get('manuals', '?')} manuals, {organ.get('stops', '?')} stops)"
        elif last:
            organ_line = f"Organ: none loaded (last: {last})"
        else:
            organ_line = "Organ: none loaded"

        with Card(css_class="max-w-lg") as view:
            with CardHeader():
                CardTitle("GrandOrgue Status")
            with CardContent():
                Text(engine_line)
                Text(midi_line)
                Text(organ_line)

        summary = f"GrandOrgue {'running' if running else 'stopped'}, MIDI {'connected' if midi else 'disconnected'}, organ {organ_name}."
        return ToolResult(content=summary, structured_content=PrefabApp(view=view, title="GrandOrgue Status"))

    import sys

    setattr(sys.modules[__name__], "go_status_card", go_status_card)
    logger.info("Registered go_status_card (MCP App / Prefab)")
