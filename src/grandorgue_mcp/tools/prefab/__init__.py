"""MCP Apps (Prefab UI) for rich chat surfaces - ``prefab-ui`` is a core dependency."""

from __future__ import annotations

import logging

logger = logging.getLogger("grandorgue_mcp.tools.prefab")


def register_prefab_tools() -> None:
    """Register MCP App tools (status / organs / depot cards)."""
    from .depot_card import register_depot_card_tool
    from .organs_card import register_organs_card_tool
    from .status_card import register_status_card_tool

    register_status_card_tool()
    register_organs_card_tool()
    register_depot_card_tool()
