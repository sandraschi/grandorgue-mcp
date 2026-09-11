"""MCP App (Prefab): MIDI depot files card.

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

logger = logging.getLogger("grandorgue_mcp.tools.prefab.depot_card")

_MAX_ROWS = 20


def register_depot_card_tool() -> None:
    """Register ``go_depot_card`` on the global FastMCP instance."""
    if os.environ.get("GRANDORGUE_PREFAB_APPS", "1").strip().lower() in ("0", "false", "no", "off"):
        logger.info("Prefab depot card disabled (GRANDORGUE_PREFAB_APPS=0)")
        return

    from grandorgue_mcp.server import _depot_list_impl, mcp

    @mcp.tool(
        app=True,
        annotations=ToolAnnotations(title="Depot card", readOnlyHint=True, idempotentHint=True),
    )
    async def go_depot_card() -> Any:
        """Show a rich card of MIDI depot files with sizes.

        Works in clients that render MCP Apps / Prefab (e.g. Claude Desktop).
        Disable with ``GRANDORGUE_PREFAB_APPS=0`` (skips registration).

        ## Return Format
        ToolResult with text ``content`` plus a PrefabApp depot card.

        ## Examples
        go_depot_card()
        """
        try:
            result = _depot_list_impl()
            files = result.get("files", [])
        except Exception as e:
            logger.exception("go_depot_card failed")
            with Card(css_class="max-w-md") as view:
                with CardHeader():
                    CardTitle("Depot unavailable")
                with CardContent():
                    Text(f"Could not list depot: {e}")
            return ToolResult(
                content=f"Depot unavailable: {e}",
                structured_content=PrefabApp(view=view, title="Depot unavailable"),
            )

        with Card(css_class="max-w-lg") as view:
            with CardHeader():
                CardTitle(f"MIDI Depot ({len(files)} files)")
            with CardContent():
                if files:
                    for f in files[:_MAX_ROWS]:
                        kb = f.get("size_bytes", 0) / 1024
                        Text(f"{f.get('name', '?')} — {kb:.0f} KB")
                    if len(files) > _MAX_ROWS:
                        Text(f"…and {len(files) - _MAX_ROWS} more")
                else:
                    Text("Depot is empty.")
                    Text("Ask for the Bach bundle to fill it in one call.")

        names = ", ".join(f.get("name", "?") for f in files[:10])
        summary = f"{len(files)} MIDI files in depot" + (f" ({names})" if names else ".")
        return ToolResult(content=summary, structured_content=PrefabApp(view=view, title="MIDI Depot"))

    import sys

    setattr(sys.modules[__name__], "go_depot_card", go_depot_card)
    logger.info("Registered go_depot_card (MCP App / Prefab)")
