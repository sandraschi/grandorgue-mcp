"""MCP App (Prefab): installed organs + free catalog card.

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

logger = logging.getLogger("grandorgue_mcp.tools.prefab.organs_card")

_MAX_ROWS = 20


def register_organs_card_tool() -> None:
    """Register ``go_organs_card`` on the global FastMCP instance."""
    if os.environ.get("GRANDORGUE_PREFAB_APPS", "1").strip().lower() in ("0", "false", "no", "off"):
        logger.info("Prefab organs card disabled (GRANDORGUE_PREFAB_APPS=0)")
        return

    from grandorgue_mcp.server import mcp, organ_manager

    @mcp.tool(
        app=True,
        annotations=ToolAnnotations(title="Organs card", readOnlyHint=True, idempotentHint=True),
    )
    async def go_organs_card() -> Any:
        """Show a rich card of installed organs plus the free catalog.

        Works in clients that render MCP Apps / Prefab (e.g. Claude Desktop).
        Disable with ``GRANDORGUE_PREFAB_APPS=0`` (skips registration).

        ## Return Format
        ToolResult with text ``content`` plus a PrefabApp organs card.

        ## Examples
        go_organs_card()
        """
        try:
            installed = organ_manager.list_installed()
            catalog = organ_manager.list_catalog()
        except Exception as e:
            logger.exception("go_organs_card failed")
            with Card(css_class="max-w-md") as view:
                with CardHeader():
                    CardTitle("Organs unavailable")
                with CardContent():
                    Text(f"Could not list organs: {e}")
            return ToolResult(
                content=f"Organs unavailable: {e}",
                structured_content=PrefabApp(view=view, title="Organs unavailable"),
            )

        with Card(css_class="max-w-lg") as view:
            with CardHeader():
                CardTitle(f"Organs ({len(installed)} installed)")
            with CardContent():
                if installed:
                    Text("Installed", css_class="text-sm font-semibold mt-2 mb-1")
                    for entry in installed[:_MAX_ROWS]:
                        Text(f"{entry.name} — {entry.manuals} manuals, {entry.stops} stops")
                    if len(installed) > _MAX_ROWS:
                        Text(f"…and {len(installed) - _MAX_ROWS} more")
                else:
                    Text("No organs installed yet.")
                if catalog:
                    Text("Free catalog", css_class="text-sm font-semibold mt-2 mb-1")
                    for entry in catalog[:_MAX_ROWS]:
                        Text(f"{entry.name}")
                    if len(catalog) > _MAX_ROWS:
                        Text(f"…and {len(catalog) - _MAX_ROWS} more")

        names = ", ".join(e.name for e in installed[:10]) or "none"
        summary = f"{len(installed)} organs installed ({names}); {len(catalog)} in the free catalog."
        return ToolResult(content=summary, structured_content=PrefabApp(view=view, title="Organs"))

    import sys

    setattr(sys.modules[__name__], "go_organs_card", go_organs_card)
    logger.info("Registered go_organs_card (MCP App / Prefab)")
