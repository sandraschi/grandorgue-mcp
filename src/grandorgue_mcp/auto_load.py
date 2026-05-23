"""Auto-load organ in GrandOrgue — UI automation + config persistence.

Two working strategies:
1. pywinauto-mcp: click File → Load → [organ] → OK via Windows UI automation
2. "Train once": once loaded, GO remembers the organ in its config file.
   Subsequent starts with the same --config dir auto-load.
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
from typing import Any

import httpx

PYWINAUTO_API = os.getenv("PYWINAUTO_MCP_URL", "http://127.0.0.1:10788")
STATE_FILE = Path(os.getenv("GO_CONFIG_DIR", str(Path.home() / "AppData" / "Roaming" / "GrandOrgue-mcp"))) / "last_organ.json"


def save_last_organ(name: str, path: str) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps({"name": name, "path": path, "version": 1}))


def load_last_organ() -> dict | None:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            return None
    return None


def clear_last_organ() -> None:
    STATE_FILE.unlink(missing_ok=True)


async def load_organ_via_ui(organ_name: str) -> dict[str, Any]:
    """Load organ by automating GrandOrgue's File -> Load menu via pywinauto-mcp.

    Pywinauto-mcp runs on port 10788-10789. It must be started first
    (it's a fleet service; run `start.ps1` in pywinauto-mcp).
    """
    try:
        async with httpx.AsyncClient(base_url=PYWINAUTO_API, timeout=15) as c:
            # 1. Find GO window
            r = await c.post("/automation/windows", json={"operation": "find", "title": "GrandOrgue"})
            if r.status_code != 200:
                return {"success": False, "message": "pywinauto-mcp unreachable", "method": "pywinauto"}
            data = r.json()
            handle = data.get("handle")
            if not handle:
                return {"success": False, "message": "GrandOrgue window not found. Is it running?", "method": "pywinauto"}

            # 2. Focus window
            await c.post("/automation/windows", json={"operation": "activate", "handle": handle})
            await asyncio.sleep(0.3)

            # 3. Open File menu (Alt+F)
            await c.post("/automation/keyboard", json={"operation": "hotkey", "keys": ["alt", "f"]})
            await asyncio.sleep(0.3)

            # 4. Press L for Load
            await c.post("/automation/keyboard", json={"operation": "press", "key": "l"})
            await asyncio.sleep(0.5)

            # 5. Type organ name into the file/open dialog
            await c.post("/automation/keyboard", json={"operation": "type", "text": organ_name})
            await asyncio.sleep(0.3)

            # 6. Press Enter (load/ok)
            await c.post("/automation/keyboard", json={"operation": "press", "key": "enter"})
            await asyncio.sleep(2)

            # 7. Extra Enter for two-stage dialogs
            await c.post("/automation/keyboard", json={"operation": "press", "key": "enter"})
            await asyncio.sleep(1)

            return {"success": True, "message": f"Loaded '{organ_name}' via pywinauto-mcp", "method": "pywinauto"}

    except httpx.ConnectError:
        return {"success": False, "message": "pywinauto-mcp not running (port 10788). Start pywinauto-mcp first.", "method": "pywinauto"}
    except Exception as e:
        return {"success": False, "message": f"pywinauto-mcp failed: {e}", "method": "pywinauto"}


async def ensure_organ_loaded(organ_name: str, organ_path: str) -> dict[str, Any]:
    """Load an organ into GrandOrgue. Tries pywinauto first, persists for auto-reload.

    After a successful load, GO saves the organ path in its own config.
    Re-launching GO with the same --config dir will auto-load it.
    """
    result = await load_organ_via_ui(organ_name)
    if result["success"]:
        save_last_organ(organ_name, organ_path)
        return result

    # Fallback: tell the user to load it once manually
    return {
        "success": False,
        "message": (
            f"Could not auto-load '{organ_name}'. "
            f"Start GrandOrgue, click File -> Load, select '{organ_name}', "
            f"then restart the MCP server. Next time GO will auto-load it."
        ),
        "method": None,
    }
