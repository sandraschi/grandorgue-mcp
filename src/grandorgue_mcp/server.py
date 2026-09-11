"""
GrandOrgue MCP Server - Modern pipe organ control via MIDI bridge.

FastMCP 3.4+ tools + FastAPI REST + WebSocket real-time state.

Transports:
- stdio (default): Claude Desktop / mcpb bundle. `uv run grandorgue-mcp`
- HTTP: set MCP_TRANSPORT=http - serves REST on port 11010, MCP at /mcp,
  WebSocket at /ws. Used by the webapp (frontend on 11011 via Vite proxy).
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os as _os
import sqlite3 as _sqlite3
import zipfile
from functools import partial
from pathlib import Path
from typing import Annotated, Any

import anyio
import httpx
from fastapi import APIRouter, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastmcp import FastMCP
from fastmcp.tools.tool import ToolAnnotations  # type: ignore[import-not-found]
from pydantic import Field

from grandorgue_mcp.auto_load import ensure_organ_loaded, load_last_organ, save_last_organ
from grandorgue_mcp.bach_catalog import search_bach
from grandorgue_mcp.go_process import go_process
from grandorgue_mcp.midi_bridge import midi_bridge
from grandorgue_mcp.models import AppSettings
from grandorgue_mcp.organ_manager import FREE_SAMPLE_SET_SOURCES, organ_manager
from grandorgue_mcp.settings_store import (
    GO_CONFIG_DIR,
    load_settings,
    resolve_midi_depot_dir,
    save_settings,
    settings_payload,
)

PORT = int(_os.getenv("PORT", "11010"))
HOST = _os.getenv("HOST", "127.0.0.1")

mcp = FastMCP("grandorgue-mcp")

logger = logging.getLogger("grandorgue_mcp")

# -- Server log ring buffer (GET /api/logs for the Logs page) -----------------

from collections import deque

from grandorgue_mcp.services.apps_routes import register_apps_routes

_log_buffer: deque[dict[str, Any]] = deque(maxlen=500)
_log_counter = 0


class _RingBufferHandler(logging.Handler):
    """Keep the last 500 log records for the Logs page."""

    def emit(self, record: logging.LogRecord) -> None:
        global _log_counter
        _log_counter += 1
        try:
            message = record.getMessage()
        except Exception:
            message = str(record.msg)
        _log_buffer.append(
            {
                "id": str(_log_counter),
                "ts": record.created,
                "level": record.levelname.lower(),
                "message": message,
                "source": record.name,
            }
        )


logging.getLogger().addHandler(_RingBufferHandler())
logger.info("Log ring buffer attached (GET /api/logs)")


def _error_response(message: str, **extra: Any) -> dict[str, Any]:
    """Build a dialogic error payload and log the traceback.

    Call inside ``except`` blocks so the traceback is captured via
    ``logger.exception`` (TOOL_DESIGN_STANDARDS.md S7.1 Pattern 3).
    """
    logger.exception("grandorgue-mcp error: %s", message)
    return {"success": False, "message": message, **extra}


_ws_clients: list[WebSocket] = []
_bg_tasks: set[asyncio.Task] = set()


def _spawn(coro) -> None:
    """Keep a reference to fire-and-forget tasks so they aren't GC'd."""
    task = asyncio.create_task(coro)
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)


def apply_runtime_settings() -> None:
    settings = load_settings()
    settings.config_dir = str(GO_CONFIG_DIR)
    midi_bridge.configure(settings.midi_input_port, settings.midi_output_port)
    go_process.set_exe_path(settings.go_exe_path)
    go_process.refresh_exe_path()


apply_runtime_settings()

# -- MIDI File Depot -------------------------------------------------------

_MIDI_DEPOT = resolve_midi_depot_dir()


def _depot_path(name: str) -> Path | None:
    """Resolve a depot file name safely (no path traversal, no subdirs)."""
    safe = Path(name.replace("\\", "/")).name
    if not safe or safe in (".", ".."):
        return None
    return _MIDI_DEPOT / safe


# -- WebSocket broadcast ---------------------------------------------------


async def _broadcast(data: dict[str, Any]) -> None:
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in _ws_clients:
            _ws_clients.remove(ws)


async def _status_payload() -> dict[str, Any]:
    proc = await anyio.to_thread.run_sync(go_process.discover)
    return {
        "go_running": proc.running,
        "go_path": proc.exe_path,
        "go_version": proc.version,
        "midi_connected": midi_bridge.connected,
        "organ": organ_manager.current.model_dump() if organ_manager.current else None,
    }


async def _notify_status() -> None:
    if _ws_clients:
        payload = await _status_payload()
        await _broadcast({"type": "status", **payload})


# -- Shared implementations (called by both MCP tools and REST) ------------
# NOTE: @mcp.tool() replaces the function with a FunctionTool object which is
# NOT directly callable. Never call a decorated tool from other code - call
# these plain helpers instead.


async def _load_organ_impl(path: str = "", name: str | None = None) -> dict[str, Any]:
    organ_name = name or Path(path).stem
    organ_path = path or organ_name

    auto_result = await ensure_organ_loaded(organ_name, organ_path)
    if auto_result["success"]:
        info = organ_manager.load_organ(organ_path)
        save_last_organ(organ_name, organ_path)
        return {
            "success": True,
            "message": f"Loaded organ '{organ_name}'",
            "organ": info.model_dump(),
            "auto_loaded": True,
        }

    info = organ_manager.load_organ(organ_path)
    save_last_organ(organ_name, organ_path)
    return {
        "success": True,
        "message": f"Registered organ '{organ_name}' (manual load still needed)",
        "organ": info.model_dump(),
        "auto_loaded": False,
        "note": auto_result.get("message"),
    }


def _depot_list_impl() -> dict[str, Any]:
    files = []
    for p in sorted(_MIDI_DEPOT.iterdir()):
        if p.suffix.lower() in (".mid", ".midi"):
            stat = p.stat()
            files.append({"name": p.name, "size_bytes": stat.st_size, "modified": stat.st_mtime})
    return {"success": True, "message": f"{len(files)} MIDI files in depot", "files": files}


def _depot_upload_impl(name: str, data_base64: str) -> dict[str, Any]:
    if not name.lower().endswith((".mid", ".midi")):
        name += ".mid"
    path = _depot_path(name)
    if path is None:
        return {"success": False, "message": f"Invalid file name: {name}"}
    try:
        path.write_bytes(base64.b64decode(data_base64))
    except (ValueError, OSError) as e:
        return _error_response(f"Upload failed: {e}")
    return {"success": True, "message": f"Uploaded {path.name}", "path": str(path)}


def _depot_download_impl(name: str) -> dict[str, Any]:
    path = _depot_path(name)
    if path is None or not path.exists():
        return {"success": False, "message": f"File not found: {name}"}
    data = base64.b64encode(path.read_bytes()).decode()
    return {
        "success": True,
        "message": f"Downloaded {path.name}",
        "name": path.name,
        "data_base64": data,
        "size_bytes": path.stat().st_size,
    }


def _depot_delete_impl(name: str) -> dict[str, Any]:
    path = _depot_path(name)
    if path is None or not path.exists():
        return {"success": False, "message": f"File not found: {name}"}
    path.unlink()
    return {"success": True, "message": f"Deleted {path.name}"}


_BACH_ZIP_URL = "http://www.bachcentral.com/bach.zip"
_BACH_MAX_FILES = 500
_BACH_MAX_ENTRY_BYTES = 5 * 1024 * 1024


async def _depot_bach_impl() -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=60) as client:
            r = await client.get(_BACH_ZIP_URL)
            r.raise_for_status()
    except Exception as e:
        return {"success": False, "count": 0, "files": [], "message": f"Download failed: {e}"}

    def _extract(content: bytes) -> list[str]:
        extracted: list[str] = []
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for info in zf.infolist():
                if len(extracted) >= _BACH_MAX_FILES:
                    break
                if not info.filename.lower().endswith((".mid", ".midi")):
                    continue
                if info.file_size > _BACH_MAX_ENTRY_BYTES:
                    continue
                stem = Path(info.filename).name
                dest = _depot_path(stem)
                if dest is None:
                    continue
                if not dest.exists():
                    dest.write_bytes(zf.read(info))
                extracted.append(stem)
        return extracted

    extracted = await anyio.to_thread.run_sync(partial(_extract, r.content))
    return {
        "success": True,
        "count": len(extracted),
        "files": sorted(extracted),
        "message": f"Extracted {len(extracted)} MIDI files from Bach bundle",
    }


# -- MCP Tools ---------------------------------------------------------------


@mcp.resource("status://grandorgue")
async def status_resource() -> dict[str, Any]:
    """Live GrandOrgue status as an MCP resource.

    ## Return Format
    {"success": bool, "go_running": bool, "midi_connected": bool, "organ": {...}}
    """
    return await _status_payload()


@mcp.tool(
    annotations=ToolAnnotations(title="Organ status", readOnlyHint=True, idempotentHint=True),
    output_schema={
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "go_running": {"type": "boolean"},
            "midi_connected": {"type": "boolean"},
        },
    },
)
async def go_status() -> dict[str, Any]:
    """Get GrandOrgue process, MIDI, and organ status.

    ## Return Format
    {"success": bool, "message": str, "go_running": bool, "midi_connected": bool, "organ": {...}}

    ## Examples
    go_status()
    """
    payload = await _status_payload()
    state = "running" if payload.get("go_running") else "stopped"
    midi = "connected" if payload.get("midi_connected") else "disconnected"
    return {"success": True, "message": f"GrandOrgue {state}, MIDI {midi}", **payload}


@mcp.tool(
    annotations=ToolAnnotations(title="Launch GrandOrgue", openWorldHint=True, idempotentHint=True),
    output_schema={
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "pid": {"type": ["integer", "null"]},
        },
    },
)
async def go_start(
    organ_path: Annotated[
        str | None,
        Field(description="Optional path to .organ file to load at startup. Skips pywinauto UI automation."),
    ] = None,
) -> dict[str, Any]:
    """Launch the GrandOrgue process.

    If an organ was previously loaded, attempts auto-reload. Pass organ_path
    to load directly via CLI (avoids pywinauto UI automation).

    ## Return Format
    {"success": bool, "message": str, "pid": int|null, "auto_loaded": str|null}

    ## Examples
    go_start()
    go_start(organ_path="C:/GrandOrgue/organs/Burea/Burea.organ")
    """
    try:
        info = await anyio.to_thread.run_sync(partial(go_process.start, organ_path))
        result = {
            "success": True,
            "message": "GrandOrgue launched",
            "pid": info.pid,
            "version": info.version,
            "auto_loaded": None,
        }
        if organ_path:
            result["auto_loaded"] = Path(organ_path).stem
        else:
            last = load_last_organ()
            if last and last.get("name"):
                result["auto_loaded"] = last["name"]
        await _notify_status()
        return result
    except (FileNotFoundError, RuntimeError) as e:
        return {"success": False, "message": str(e), "pid": None, "auto_loaded": None}


@mcp.tool(
    annotations=ToolAnnotations(title="Stop GrandOrgue", idempotentHint=True),
    output_schema={
        "type": "object",
        "properties": {"success": {"type": "boolean"}, "message": {"type": "string"}},
    },
)
async def go_stop() -> dict[str, Any]:
    """Terminate the GrandOrgue process.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_stop()
    """
    ok = await anyio.to_thread.run_sync(go_process.stop)
    await anyio.to_thread.run_sync(midi_bridge.disconnect)
    await _notify_status()
    return {"success": ok, "message": "GrandOrgue stopped" if ok else "Not running"}


@mcp.tool(
    annotations=ToolAnnotations(title="Connect MIDI bridge", idempotentHint=True),
    output_schema={
        "type": "object",
        "properties": {"success": {"type": "boolean"}, "message": {"type": "string"}},
    },
)
async def go_midi_connect() -> dict[str, Any]:
    """Create virtual MIDI ports and connect to GrandOrgue.

    ## Return Format
    {"success": bool, "message": str, "ports": {"input": str, "output": str}}

    ## Examples
    go_midi_connect()
    """
    ok = await anyio.to_thread.run_sync(midi_bridge.connect)
    status = await anyio.to_thread.run_sync(midi_bridge.list_ports)
    await _notify_status()
    return {
        "success": ok,
        "message": "MIDI bridge connected" if ok else "MIDI bridge failed",
        "ports": {"input": status.go_input_port, "output": status.go_output_port},
    }


@mcp.tool(annotations=ToolAnnotations(title="Disconnect MIDI bridge", idempotentHint=True))
async def go_midi_disconnect() -> dict[str, Any]:
    """Close MIDI bridge connections.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_midi_disconnect()
    """
    await anyio.to_thread.run_sync(midi_bridge.disconnect)
    await _notify_status()
    return {"success": True, "message": "MIDI bridge disconnected"}


@mcp.tool(annotations=ToolAnnotations(title="List MIDI ports", readOnlyHint=True, idempotentHint=True))
async def go_list_midi_ports() -> dict[str, Any]:
    """List all available MIDI input and output ports on the system.

    ## Return Format
    {"success": bool, "message": str, "inputs": [...], "outputs": [...]}

    ## Examples
    go_list_midi_ports()
    """
    status = await anyio.to_thread.run_sync(midi_bridge.list_ports)
    return {
        "success": True,
        "message": f"Found {len(status.inputs)} inputs, {len(status.outputs)} outputs",
        "inputs": [p.model_dump() for p in status.inputs],
        "outputs": [p.model_dump() for p in status.outputs],
    }


async def _release_after(channel: int, notes: list[int], duration_ms: int) -> None:
    await asyncio.sleep(duration_ms / 1000)
    for n in notes:
        midi_bridge.release_note(channel, n)


@mcp.tool(
    annotations=ToolAnnotations(title="Play MIDI note"),
    output_schema={
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "note": {"type": "integer"},
        },
    },
)
async def go_play_note(
    midi_note: int = 60,
    velocity: int = 64,
    channel: int = 0,
    duration_ms: int = 500,
) -> dict[str, Any]:
    """Play a MIDI note through GrandOrgue. The note-off is scheduled in the
    background - the tool returns immediately.

    ## Return Format
    {"success": bool, "message": str, "note": int, "velocity": int, "channel": int}

    ## Examples
    go_play_note(midi_note=60, velocity=80, duration_ms=1000)
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected. Run go_midi_connect first."}
    midi_bridge.play_note(channel, midi_note, velocity)
    _spawn(_release_after(channel, [midi_note], duration_ms))
    return {
        "success": True,
        "message": f"Playing note {midi_note} on channel {channel}",
        "note": midi_note,
        "velocity": velocity,
        "channel": channel,
        "duration_ms": duration_ms,
    }


@mcp.tool(annotations=ToolAnnotations(title="Play chord"))
async def go_play_chord(
    notes: list[int] | None = None,
    velocity: int = 64,
    channel: int = 0,
    duration_ms: int = 800,
) -> dict[str, Any]:
    """Play a chord (multiple notes simultaneously). Defaults to C major.
    The release is scheduled in the background - the tool returns immediately.

    ## Return Format
    {"success": bool, "message": str, "notes": [...], "velocity": int}

    ## Examples
    go_play_chord(notes=[60, 64, 67], duration_ms=1500)
    """
    if notes is None:
        notes = [60, 64, 67]
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    for n in notes:
        midi_bridge.play_note(channel, n, velocity)
    _spawn(_release_after(channel, notes, duration_ms))
    return {
        "success": True,
        "message": f"Playing chord of {len(notes)} notes on channel {channel}",
        "notes": notes,
        "velocity": velocity,
        "duration_ms": duration_ms,
    }


@mcp.tool(annotations=ToolAnnotations(title="Set stop", idempotentHint=True))
async def go_set_stop(
    stop_cc: int,
    state: bool = True,
) -> dict[str, Any]:
    """Set a stop (drawstop/tab) on or off via MIDI CC.

    ## Return Format
    {"success": bool, "message": str, "stop_cc": int, "state": bool}

    ## Examples
    go_set_stop(stop_cc=21, state=True)
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.set_stop(stop_cc, state)
    return {
        "success": True,
        "message": f"Stop CC {stop_cc} {'on' if state else 'off'}",
        "stop_cc": stop_cc,
        "state": state,
    }


@mcp.tool(annotations=ToolAnnotations(title="Set crescendo", idempotentHint=True))
async def go_set_crescendo(
    value: int = 0,
) -> dict[str, Any]:
    """Set crescendo pedal position (0-127).

    ## Return Format
    {"success": bool, "message": str, "value": int}

    ## Examples
    go_set_crescendo(value=64)
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.set_crescendo(value)
    return {"success": True, "message": f"Crescendo set to {value}", "value": value}


@mcp.tool(annotations=ToolAnnotations(title="Set enclosure", idempotentHint=True))
async def go_set_enclosure(
    cc: int = 7,
    value: int = 127,
) -> dict[str, Any]:
    """Set expression (swell) enclosure level via MIDI CC.

    ## Return Format
    {"success": bool, "message": str, "cc": int, "value": int}

    ## Examples
    go_set_enclosure(cc=7, value=80)
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.set_enclosure(cc, value)
    return {"success": True, "message": f"Enclosure CC {cc} set to {value}", "cc": cc, "value": value}


@mcp.tool(annotations=ToolAnnotations(title="Trigger combination", idempotentHint=True))
async def go_combination(number: int = 1) -> dict[str, Any]:
    """Trigger a combination (general piston) via MIDI Program Change.

    ## Return Format
    {"success": bool, "message": str, "number": int}

    ## Examples
    go_combination(number=3)
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.trigger_combination(number)
    return {"success": True, "message": f"Combination {number} triggered", "number": number}


@mcp.tool(annotations=ToolAnnotations(title="All-notes-off panic", idempotentHint=True))
async def go_panic() -> dict[str, Any]:
    """Send all-notes-off / panic to GrandOrgue.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_panic()
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.all_notes_off()
    return {"success": True, "message": "All notes off"}


@mcp.tool(
    annotations=ToolAnnotations(title="Load organ", openWorldHint=True, idempotentHint=True),
    output_schema={
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "auto_loaded": {"type": "boolean"},
        },
    },
)
async def go_load_organ(
    path: str = "",
    name: str | None = None,
) -> dict[str, Any]:
    """Load an organ by path or name. Uses pywinauto-mcp for UI automation.

    Provide either the full .organ path or the organ name (matching the
    display name in GO's file-open dialog).

    If pywinauto-mcp is not running, registers the organ in the metadata
    registry and tells the user to load it in GO manually once.

    ## Return Format
    {"success": bool, "organ": {"name": str, "path": str}, "auto_loaded": bool}

    ## Examples
    go_load_organ(name="Burea Church")
    go_load_organ(path="C:/GrandOrgue/organs/Burea/Burea.organ")
    """
    result = await _load_organ_impl(path, name)
    await _notify_status()
    return result


@mcp.tool(annotations=ToolAnnotations(title="Auto-load last organ", openWorldHint=True, idempotentHint=True))
async def go_auto_load() -> dict[str, Any]:
    """Load the last-used organ automatically (if one was saved from a previous session).

    ## Return Format
    {"success": bool, "organ": str|null, "message": str}

    ## Examples
    go_auto_load()
    """
    last = load_last_organ()
    if not last or not last.get("name"):
        return {
            "success": False,
            "organ": None,
            "message": "No organ saved. Load one first with go_load_organ() or in the GO GUI.",
        }
    result = await _load_organ_impl(path=last.get("path", ""), name=last["name"])
    await _notify_status()
    return result


@mcp.tool(annotations=ToolAnnotations(title="Unload organ", idempotentHint=True))
async def go_unload_organ() -> dict[str, Any]:
    """Unload the current organ.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_unload_organ()
    """
    organ_manager.unload_organ()
    await _notify_status()
    return {"success": True, "message": "Organ unloaded"}


@mcp.tool(annotations=ToolAnnotations(title="List organs", readOnlyHint=True, idempotentHint=True))
async def go_list_organs() -> dict[str, Any]:
    """List installed sample sets and known free catalogs.

    ## Return Format
    {"success": bool, "message": str, "installed": [...], "catalog": [...]}

    ## Examples
    go_list_organs()
    """
    installed = organ_manager.list_installed()
    catalog = organ_manager.list_catalog()
    return {
        "success": True,
        "message": f"{len(installed)} installed, {len(catalog)} in catalog",
        "installed": [e.model_dump() for e in installed],
        "catalog": [e.model_dump() for e in catalog],
    }


@mcp.tool(annotations=ToolAnnotations(title="Send SYSEX"))
async def go_send_sysex(data_hex: str = "") -> dict[str, Any]:
    """Send raw MIDI SYSEX data (hex string, e.g. 'F0 7D 10 ... F7').

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_send_sysex(data_hex="F0 7D 01 00 F7")
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    try:
        raw = bytes.fromhex(data_hex.replace(" ", ""))
        midi_bridge.send_sysex(raw)
        return {"success": True, "message": f"Sent {len(raw)} SYSEX bytes"}
    except ValueError as e:
        return {"success": False, "message": f"Invalid hex: {e}"}


@mcp.tool(annotations=ToolAnnotations(title="Search sample sets", readOnlyHint=True, idempotentHint=True))
async def go_marketplace_search(query: str = "") -> dict[str, Any]:
    """Search the GrandOrgue sample set marketplace by name, style, or builder.

    ## Return Format
    {"success": bool, "message": str, "results": [...], "total": int}

    ## Examples
    go_marketplace_search(query="Baroque")
    """
    catalog = organ_manager.list_catalog()
    results = [e.model_dump() for e in catalog]
    if query:
        q = query.lower()
        results = [r for r in results if q in r.get("name", "").lower() or q in r.get("description", "").lower()]
    return {
        "success": True,
        "message": f"Found {len(results)} sample sets",
        "results": results,
        "total": len(results),
    }


@mcp.tool(annotations=ToolAnnotations(title="Sample set download info", readOnlyHint=True, idempotentHint=True))
async def go_marketplace_download(name: str = "") -> dict[str, Any]:
    """Get the download URL for a sample set by name.

    ## Return Format
    {"success": bool, "name": str, "url": str|null, "instructions": str}

    ## Examples
    go_marketplace_download(name="Burea Church")
    """
    catalog = organ_manager.list_catalog()
    for entry in catalog:
        if entry.name.lower() == name.lower():
            return {
                "success": True,
                "name": entry.name,
                "url": entry.url,
                "instructions": (
                    f"Download from {entry.url}, extract to your GrandOrgue organs directory, "
                    f"then use go_load_organ() to load it."
                ),
            }
    return {"success": False, "message": f"Sample set '{name}' not found in catalog."}


@mcp.tool(
    annotations=ToolAnnotations(title="Bach catalog", readOnlyHint=True, idempotentHint=True),
    output_schema={
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
            "total": {"type": "integer"},
        },
    },
)
async def go_bach_catalog(bwv: int | None = None) -> dict[str, Any]:
    """Search the J.S. Bach organ works catalog by BWV number.

    ## Return Format
    {"success": bool, "message": str, "works": [...], "total": int}

    ## Examples
    go_bach_catalog(bwv=565)
    go_bach_catalog()
    """
    works = search_bach(bwv)
    return {"success": True, "message": f"Found {len(works)} works", "works": works, "total": len(works)}


@mcp.tool(annotations=ToolAnnotations(title="Play MIDI file", openWorldHint=True))
async def go_play_midi_file(
    name: Annotated[str, Field(description="Filename from the MIDI depot (e.g. 'fugue1.mid').")],
) -> dict[str, Any]:
    """Play a MIDI file through GrandOrgue's built-in MIDI player.

    Injects keystrokes (Alt+F, M, filename, Enter) via Windows API to trigger
    GO's File -> Load MIDI File menu. Plays through GO's pipe organ engine.
    No MIDI cables, no pywinauto, no external services needed.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_play_midi_file(name="fugue1.mid")
    """
    from grandorgue_mcp.win32midi import load_midi_file_in_go

    return await anyio.to_thread.run_sync(partial(load_midi_file_in_go, name))


@mcp.tool(annotations=ToolAnnotations(title="Play MIDI file (UI)", openWorldHint=True))
async def go_play_midi_file_ui(
    name: Annotated[str, Field(description="Filename from the MIDI depot (e.g. 'bwv543.mid').")],
) -> dict[str, Any]:
    """Play a MIDI file through GrandOrgue's built-in MIDI player via UI automation.

    Uses pywinauto to click File -> Load MIDI File -> select file.
    Requires pywinauto-mcp running.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_play_midi_file_ui(name="bwv543.mid")
    """
    import shutil

    from grandorgue_mcp.auto_load import play_midi_via_ui
    from grandorgue_mcp.settings_store import resolve_midi_recordings_dir

    depot_path = _depot_path(name)
    if depot_path is None or not depot_path.exists():
        return {"success": False, "message": f"File not found in depot: {name}"}
    midi_dir = resolve_midi_recordings_dir()
    midi_dir.mkdir(parents=True, exist_ok=True)
    await anyio.to_thread.run_sync(partial(shutil.copy2, str(depot_path), str(midi_dir / depot_path.name)))
    return await play_midi_via_ui(depot_path.name, str(midi_dir))


@mcp.tool(annotations=ToolAnnotations(title="Playback status", readOnlyHint=True, idempotentHint=True))
async def go_midi_playback_status() -> dict[str, Any]:
    """Check if a MIDI file is currently playing through the MIDI bridge.

    ## Return Format
    {"success": bool, "message": str, "playing": bool}

    ## Examples
    go_midi_playback_status()
    """
    playing = midi_bridge.playback_active
    return {"success": True, "message": "Playing" if playing else "Idle", "playing": playing}


@mcp.tool(annotations=ToolAnnotations(title="Stop playback", idempotentHint=True))
async def go_stop_playback() -> dict[str, Any]:
    """Stop any active MIDI file playback and send all-notes-off.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    go_stop_playback()
    """
    msg = await anyio.to_thread.run_sync(midi_bridge.stop_playback)
    return {"success": True, "message": msg}


@mcp.tool(
    annotations=ToolAnnotations(title="List depot", readOnlyHint=True, idempotentHint=True),
    output_schema={
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "message": {"type": "string"},
        },
    },
)
async def midi_depot_list() -> dict[str, Any]:
    """List all MIDI files in the depot.

    ## Return Format
    {"success": bool, "files": [{"name": str, "size_bytes": int, "modified": float}]}

    ## Examples
    midi_depot_list()
    """
    return _depot_list_impl()


@mcp.tool(annotations=ToolAnnotations(title="Upload to depot", idempotentHint=True))
async def midi_depot_upload(name: str, data_base64: str) -> dict[str, Any]:
    """Upload a MIDI file to the depot. Provide file name and base64-encoded content.

    ## Return Format
    {"success": bool, "path": str}

    ## Examples
    midi_depot_upload(name="my.mid", data_base64="...")
    """
    return _depot_upload_impl(name, data_base64)


@mcp.tool(annotations=ToolAnnotations(title="Download from depot", readOnlyHint=True, idempotentHint=True))
async def midi_depot_download(name: str) -> dict[str, Any]:
    """Download a MIDI file from the depot as base64.

    ## Return Format
    {"success": bool, "name": str, "data_base64": str, "size_bytes": int}

    ## Examples
    midi_depot_download(name="fugue1.mid")
    """
    return _depot_download_impl(name)


@mcp.tool(annotations=ToolAnnotations(title="Delete from depot", destructiveHint=True))
async def midi_depot_delete(name: str) -> dict[str, Any]:
    """Delete a MIDI file from the depot.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    midi_depot_delete(name="fugue1.mid")
    """
    return _depot_delete_impl(name)


@mcp.tool(annotations=ToolAnnotations(title="Download Bach bundle", openWorldHint=True, idempotentHint=True))
async def midi_depot_download_bach() -> dict[str, Any]:
    """Download the complete J.S. Bach MIDI bundle (bachcentral.com) into the depot.

    Downloads bach.zip (~665 KB), extracts all .mid and .midi files into the depot.

    ## Return Format
    {"success": bool, "count": int, "files": [str], "message": str}

    ## Examples
    midi_depot_download_bach()
    """
    return await _depot_bach_impl()


@mcp.tool(annotations=ToolAnnotations(title="Shut down server", destructiveHint=True))
async def grandorgue_shutdown(
    confirm: Annotated[bool, Field(description="Must be True to confirm shutdown")] = False,
) -> dict[str, Any]:
    """Gracefully shut down the GrandOrgue MCP server.

    Stops GrandOrgue, disconnects MIDI, and exits. Requires confirm=True.

    ## Return Format
    {"success": bool, "message": str}

    ## Examples
    grandorgue_shutdown(confirm=True)
    """
    if not confirm:
        return {"success": False, "message": "Shutdown requires confirm=True"}

    await anyio.to_thread.run_sync(go_process.stop)
    await anyio.to_thread.run_sync(midi_bridge.disconnect)
    _spawn(_kill_after_delay())
    return {"success": True, "message": "Server shutting down"}


async def _kill_after_delay() -> None:
    await asyncio.sleep(0.5)
    _os._exit(0)


# -- FastAPI app (MCP HTTP app must be created first: its lifespan runs the
#    streamable-HTTP session manager; without it every /mcp request fails) ---

mcp_app = mcp.http_app(path="/")
app = FastAPI(title="GrandOrgue MCP Server", version="0.2.0", lifespan=mcp_app.lifespan)

_tauri_desktop = _os.environ.get("GRANDORGUE_TAURI", "").lower() in ("1", "true", "yes")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Vite dev frontend (most calls go through the /api proxy and are
        # same-origin, but direct calls must be allowed too)
        "http://127.0.0.1:11011",
        "http://localhost:11011",
        "http://goliath:11011",
        # Tauri desktop webview
        "http://tauri.localhost",
        "https://tauri.localhost",
        "tauri://localhost",
    ],
    allow_origin_regex=r"https?://(?:[a-zA-Z0-9-]+\.ts\.net|.*?\.tail-[a-f0-9]+\.ts\.net|tauri\.localhost|localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|100\.\d{1,3}\.\d{1,3}\.\d{1,3})(?::\d+)?$|^tauri://localhost$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -- FastAPI REST Endpoints ---------------------------------------------------

# Fleet Apps hub (vendored): apps_routes declares /apps* without a prefix, so
# mount through an /api-prefixed router (Vite only proxies /api, /health, /ws).
_apps_router = APIRouter(prefix="/api")
register_apps_routes(_apps_router)
app.include_router(_apps_router)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": "grandorgue-mcp", "port": PORT}


@app.get("/api/v1/health")
async def health_v1() -> dict[str, Any]:
    """Versioned liveness alias (used by scripts/cua-nsis-config.json)."""
    return await health()


@app.get("/api/status")
async def api_status() -> JSONResponse:
    return JSONResponse(content=await _status_payload())


@app.get("/api/settings")
async def api_get_settings() -> JSONResponse:
    proc = await anyio.to_thread.run_sync(go_process.discover)
    return JSONResponse(
        content=settings_payload(
            {
                "go_version": proc.version,
                "midi_connected": midi_bridge.connected,
            }
        )
    )


@app.put("/api/settings")
async def api_update_settings(body: dict[str, Any]) -> JSONResponse:
    current = load_settings()
    if midi_bridge.connected:
        next_input = body.get("midi_input_port", current.midi_input_port)
        next_output = body.get("midi_output_port", current.midi_output_port)
        if next_input != current.midi_input_port or next_output != current.midi_output_port:
            return JSONResponse(
                status_code=400,
                content={"success": False, "message": "Disconnect MIDI before changing port names"},
            )

    go_exe_path = str(body.get("go_exe_path", current.go_exe_path)).strip()
    midi_input_port = str(body.get("midi_input_port", current.midi_input_port)).strip()
    midi_output_port = str(body.get("midi_output_port", current.midi_output_port)).strip()
    midi_recordings_dir = str(body.get("midi_recordings_dir", current.midi_recordings_dir)).strip()

    if not go_exe_path:
        return JSONResponse(
            status_code=400, content={"success": False, "message": "GrandOrgue executable path is required"}
        )
    if not Path(go_exe_path).exists():
        return JSONResponse(
            status_code=400, content={"success": False, "message": f"Executable not found: {go_exe_path}"}
        )
    if not midi_input_port or not midi_output_port:
        return JSONResponse(status_code=400, content={"success": False, "message": "MIDI port names are required"})

    updated = AppSettings(
        go_exe_path=go_exe_path,
        midi_input_port=midi_input_port,
        midi_output_port=midi_output_port,
        config_dir=str(GO_CONFIG_DIR),
        midi_recordings_dir=midi_recordings_dir,
    )
    save_settings(updated)
    go_process.set_exe_path(go_exe_path)
    go_process.refresh_exe_path()
    midi_bridge.configure(midi_input_port, midi_output_port)
    proc = await anyio.to_thread.run_sync(go_process.discover)
    return JSONResponse(
        content={
            "success": True,
            **settings_payload(
                {
                    "go_version": proc.version,
                    "midi_connected": midi_bridge.connected,
                }
            ),
        }
    )


@app.get("/api/midi/ports")
async def api_midi_ports() -> JSONResponse:
    status = await anyio.to_thread.run_sync(midi_bridge.list_ports)
    return JSONResponse(content=status.model_dump())


@app.post("/api/midi/connect")
async def api_midi_connect() -> JSONResponse:
    ok = await anyio.to_thread.run_sync(midi_bridge.connect)
    await _notify_status()
    return JSONResponse(
        content={
            "success": ok,
            "ports": {"input": midi_bridge.go_input_name, "output": midi_bridge.go_output_name},
        }
    )


@app.post("/api/midi/disconnect")
async def api_midi_disconnect() -> JSONResponse:
    await anyio.to_thread.run_sync(midi_bridge.disconnect)
    await _notify_status()
    return JSONResponse(content={"success": True})


@app.post("/api/midi/play")
async def api_midi_play(body: dict[str, Any]) -> JSONResponse:
    name = body.get("name", "")
    if not name:
        return JSONResponse(status_code=400, content={"success": False, "message": "name required"})
    path = _depot_path(name)
    if path is None or not path.exists():
        return JSONResponse(status_code=404, content={"success": False, "message": f"File not found: {name}"})
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False, "message": "MIDI bridge not connected"})
    msg = midi_bridge.play_midi_file(path)
    return JSONResponse(content={"success": True, "message": msg, "playing": midi_bridge.playback_active})


@app.post("/api/midi/stop")
async def api_midi_stop() -> JSONResponse:
    msg = await anyio.to_thread.run_sync(midi_bridge.stop_playback)
    return JSONResponse(content={"success": True, "message": msg})


@app.get("/api/midi/playback-status")
async def api_midi_playback_status() -> JSONResponse:
    return JSONResponse(content={"success": True, "playing": midi_bridge.playback_active})


@app.post("/api/note")
async def api_play_note(body: dict[str, Any]) -> JSONResponse:
    note = body.get("note", 60)
    velocity = body.get("velocity", 64)
    channel = body.get("channel", 0)
    duration = body.get("duration_ms")
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False, "message": "MIDI not connected"})
    midi_bridge.play_note(channel, note, velocity)
    if duration is not None:
        _spawn(_release_after(channel, [note], int(duration)))
    return JSONResponse(content={"success": True})


@app.post("/api/note/off")
async def api_release_note(body: dict[str, Any]) -> JSONResponse:
    note = body.get("note", 60)
    channel = body.get("channel", 0)
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False, "message": "MIDI not connected"})
    midi_bridge.release_note(channel, note)
    return JSONResponse(content={"success": True})


@app.post("/api/stop")
async def api_set_stop(body: dict[str, Any]) -> JSONResponse:
    cc = body.get("cc", 0)
    state = body.get("state", True)
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False})
    midi_bridge.set_stop(cc, state)
    return JSONResponse(content={"success": True})


@app.post("/api/crescendo")
async def api_set_crescendo(body: dict[str, Any]) -> JSONResponse:
    value = body.get("value", 0)
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False})
    midi_bridge.set_crescendo(value)
    return JSONResponse(content={"success": True})


@app.post("/api/enclosure")
async def api_set_enclosure(body: dict[str, Any]) -> JSONResponse:
    cc = body.get("cc", 7)
    value = body.get("value", 127)
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False})
    midi_bridge.set_enclosure(cc, value)
    return JSONResponse(content={"success": True})


@app.post("/api/combination")
async def api_combination(body: dict[str, Any]) -> JSONResponse:
    number = body.get("number", 1)
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False})
    midi_bridge.trigger_combination(number)
    return JSONResponse(content={"success": True})


@app.post("/api/panic")
async def api_panic() -> JSONResponse:
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False})
    midi_bridge.all_notes_off()
    return JSONResponse(content={"success": True})


@app.get("/api/go/status")
async def api_go_status() -> JSONResponse:
    proc = await anyio.to_thread.run_sync(go_process.discover)
    return JSONResponse(content=proc.model_dump())


@app.post("/api/go/start")
async def api_go_start(body: dict[str, Any] | None = None) -> JSONResponse:
    try:
        organ_path = body.get("organ_path") if body else None
        info = await anyio.to_thread.run_sync(partial(go_process.start, organ_path))
        if not info.running:
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "message": info.error or "GrandOrgue exited immediately after launch",
                    "pid": info.pid,
                },
            )
        await _notify_status()
        return JSONResponse(content={"success": True, "pid": info.pid})
    except FileNotFoundError as e:
        return JSONResponse(status_code=404, content={"success": False, "message": str(e)})
    except RuntimeError as e:
        return JSONResponse(status_code=500, content={"success": False, "message": str(e)})


@app.post("/api/go/stop")
async def api_go_stop() -> JSONResponse:
    ok = await anyio.to_thread.run_sync(go_process.stop)
    await anyio.to_thread.run_sync(midi_bridge.disconnect)
    await _notify_status()
    if not ok:
        proc = await anyio.to_thread.run_sync(go_process.discover)
        message = proc.error or "GrandOrgue is not running"
        return JSONResponse(status_code=409, content={"success": False, "message": message})
    return JSONResponse(content={"success": True})


@app.get("/api/organs")
async def api_list_organs() -> JSONResponse:
    installed = organ_manager.list_installed()
    catalog = organ_manager.list_catalog()
    return JSONResponse(
        content={
            "installed": [e.model_dump() for e in installed],
            "catalog": [e.model_dump() for e in catalog],
        }
    )


@app.post("/api/organs/load")
async def api_load_organ(body: dict[str, Any]) -> JSONResponse:
    name = body.get("name", "")
    path = body.get("path", "")
    result = await _load_organ_impl(path, name or None)
    await _notify_status()
    return JSONResponse(content=result)


@app.get("/api/organs/last")
async def api_last_organ() -> JSONResponse:
    last = load_last_organ()
    if last:
        return JSONResponse(content={"success": True, "organ": last})
    return JSONResponse(content={"success": False, "organ": None})


@app.get("/api/catalog")
async def api_catalog() -> JSONResponse:
    return JSONResponse(content=FREE_SAMPLE_SET_SOURCES)


@app.get("/api/marketplace/search")
async def api_marketplace_search(q: str = "") -> JSONResponse:
    catalog = organ_manager.list_catalog()
    results = [e.model_dump() for e in catalog]
    if q:
        ql = q.lower()
        results = [r for r in results if ql in r.get("name", "").lower() or ql in r.get("description", "").lower()]
    return JSONResponse(content={"success": True, "results": results, "total": len(results)})


@app.get("/api/bach/catalog")
async def api_bach_catalog(bwv: int | None = None) -> JSONResponse:
    works = search_bach(bwv)
    return JSONResponse(content={"success": True, "works": works, "total": len(works)})


@app.get("/api/midi-depot")
async def api_midi_depot_list() -> JSONResponse:
    return JSONResponse(content=_depot_list_impl())


@app.post("/api/midi-depot/upload")
async def api_midi_depot_upload(body: dict[str, Any]) -> JSONResponse:
    name = body.get("name", "")
    data = body.get("data_base64", "")
    if not name or not data:
        return JSONResponse(status_code=400, content={"success": False, "message": "name and data_base64 required"})
    result = _depot_upload_impl(name, data)
    status = 200 if result["success"] else 400
    return JSONResponse(status_code=status, content=result)


@app.get("/api/midi-depot/{name}/download")
async def api_midi_depot_download(name: str) -> JSONResponse:
    result = _depot_download_impl(name)
    if not result["success"]:
        return JSONResponse(status_code=404, content=result)
    return JSONResponse(content=result)


@app.delete("/api/midi-depot/{name}")
async def api_midi_depot_delete(name: str) -> JSONResponse:
    result = _depot_delete_impl(name)
    status = 404 if not result["success"] else 200
    return JSONResponse(status_code=status, content=result)


@app.get("/api/midi-depot/{name}/raw")
async def api_midi_depot_raw(name: str) -> Response:
    path = _depot_path(name)
    if path is None or not path.exists():
        return JSONResponse(status_code=404, content={"success": False, "message": f"File not found: {name}"})
    return Response(
        content=path.read_bytes(),
        media_type="audio/midi",
        headers={"Content-Disposition": f'inline; filename="{path.name}"'},
    )


@app.post("/api/midi-depot/batch/bach")
async def api_midi_depot_bach() -> JSONResponse:
    result = await _depot_bach_impl()
    status = 200 if result["success"] else 502
    return JSONResponse(status_code=status, content=result)


# -- Local LLM proxy (FloatingChat) ------------------------------------------

_OLLAMA_BASE = _os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
_LMSTUDIO_BASE = _os.getenv("LMSTUDIO_BASE_URL", "http://127.0.0.1:1234")


async def _llm_providers_impl() -> list[dict[str, Any]]:
    """Probe Ollama + LM Studio and return provider dicts (shared helper)."""
    providers: list[dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=3.0) as client:
        try:
            resp = await client.get(f"{_OLLAMA_BASE}/api/tags")
            models = [m["name"] for m in resp.json().get("models", [])] if resp.status_code == 200 else []
        except Exception:
            models = []
        providers.append(
            {"id": "ollama", "label": "Ollama", "base_url": f"{_OLLAMA_BASE}/v1", "models": models, "needs_key": False}
        )
        try:
            resp = await client.get(f"{_LMSTUDIO_BASE}/v1/models")
            models = [m["id"] for m in resp.json().get("data", [])] if resp.status_code == 200 else []
        except Exception:
            models = []
        providers.append(
            {
                "id": "lmstudio",
                "label": "LM Studio",
                "base_url": f"{_LMSTUDIO_BASE}/v1",
                "models": models,
                "needs_key": False,
            }
        )
    return providers


@app.get("/api/llm/providers")
async def api_llm_providers() -> JSONResponse:
    return JSONResponse(content={"providers": await _llm_providers_impl()})


@app.post("/api/llm/chat")
async def api_llm_chat(body: dict[str, Any]) -> JSONResponse:
    provider = body.get("provider", "ollama")
    model = body.get("model", "llama3.2:3b")
    prompt = body.get("prompt") or body.get("message", "")
    system = body.get("system", "")
    base = f"{_LMSTUDIO_BASE}/v1" if provider == "lmstudio" else f"{_OLLAMA_BASE}/v1"
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(f"{base}/chat/completions", json={"model": model, "messages": messages})
            if resp.status_code == 200:
                data = resp.json()
                return JSONResponse(content={"response": data["choices"][0]["message"]["content"]})
            return JSONResponse(status_code=502, content={"response": f"Upstream HTTP {resp.status_code}"})
    except Exception as e:
        return JSONResponse(status_code=502, content={"response": f"Error: {e}"})


@app.get("/api/logs")
async def api_logs(limit: int = 100, offset: int = 0, level: str = "", search: str = "") -> JSONResponse:
    """Paginated server log buffer for the Logs page.

    ## Return Format
    {"entries": [{"id": str, "ts": float, "level": str, "message": str,
     "source": str}], "total": int}
    """
    entries = list(_log_buffer)
    if level and level.lower() != "all":
        entries = [e for e in entries if e["level"] == level.lower()]
    if search:
        q = search.lower()
        entries = [e for e in entries if q in e["message"].lower() or q in e["source"].lower()]
    total = len(entries)
    return JSONResponse(content={"entries": entries[offset : offset + limit], "total": total})


@app.get("/api/v1/diagnostics")
async def api_diagnostics() -> dict[str, Any]:
    """Full diagnostics for CUA-NSIS smoke testing.

    ## Return Format
    {"status": str, "server": str, "version": str, "tool_count": int,
     "tools": [{"name": str}], "system": {...}, "go_running": bool}
    """
    payload = await _status_payload()
    _tool_names = [
        "go_status",
        "go_start",
        "go_stop",
        "go_midi_connect",
        "go_midi_disconnect",
        "go_list_midi_ports",
        "go_play_note",
        "go_play_chord",
        "go_set_stop",
        "go_set_crescendo",
        "go_set_enclosure",
        "go_combination",
        "go_panic",
        "go_load_organ",
        "go_auto_load",
        "go_unload_organ",
        "go_list_organs",
        "go_send_sysex",
        "go_marketplace_search",
        "go_marketplace_download",
        "go_bach_catalog",
        "go_play_midi_file",
        "go_play_midi_file_ui",
        "go_midi_playback_status",
        "go_stop_playback",
        "midi_depot_list",
        "midi_depot_upload",
        "midi_depot_download",
        "midi_depot_delete",
        "midi_depot_download_bach",
        "grandorgue_shutdown",
    ]
    return {
        "status": "ok",
        "server": "grandorgue-mcp",
        "version": "0.3.0",
        "tool_count": len(_tool_names),
        "tools": [{"name": n} for n in sorted(_tool_names)],
        "system": {"windows": True},
        **payload,
    }


@app.get("/api/skills")
async def api_skills() -> JSONResponse:
    return JSONResponse(
        content=[
            {
                "id": "grandorgue",
                "name": "GrandOrgue",
                "description": "Pipe organ console assistant - organ control, MIDI, registrations, Bach repertoire",
                "uri": "skill://grandorgue",
            }
        ]
    )


@app.get("/api/skills/grandorgue/content")
async def api_skill_content() -> JSONResponse:
    """Full skill preprompt text for skill-first chat composition.

    ## Return Format
    {"name": str, "content": str}
    """
    return JSONResponse(content={"name": "GrandOrgue", "content": GRANDORGUE_ASSISTANT_PROMPT})


GRANDORGUE_ASSISTANT_PROMPT = (
    "You are the GrandOrgue console assistant. You control a GrandOrgue pipe organ "
    "simulator through 31 MCP tools plus 3 Prefab app cards (go_status_card, "
    "go_organs_card, go_depot_card): process control (go_status, go_start, go_stop), "
    "MIDI bridge (go_midi_connect, go_midi_disconnect, go_list_midi_ports), organ "
    "performance (go_play_note, go_play_chord, go_set_stop, go_set_crescendo, "
    "go_set_enclosure, go_combination, go_panic, go_send_sysex), organ management "
    "(go_load_organ, go_auto_load, go_unload_organ, go_list_organs), marketplace "
    "(go_marketplace_search, go_marketplace_download), Bach repertoire "
    "(go_bach_catalog), MIDI playback (go_play_midi_file, go_play_midi_file_ui, "
    "go_midi_playback_status, go_stop_playback), and the MIDI depot (midi_depot_list, "
    "midi_depot_upload, midi_depot_download, midi_depot_delete, "
    "midi_depot_download_bach). Always check go_status before playing, and "
    "go_midi_connect before sending any MIDI."
)


@mcp.prompt()
def grandorgue_assistant() -> str:
    """System preprompt for the GrandOrgue pipe organ assistant.

    ## Return Format
    str (system prompt used as the base for chat + personality composition)
    """
    return GRANDORGUE_ASSISTANT_PROMPT


@app.get("/api/capabilities")
async def api_capabilities() -> JSONResponse:
    """Standard fleet capabilities shape for dynamic webapp discovery.

    ## Return Format
    {"server": str, "version": str, "tools": [str], "features": {...}}
    """
    return JSONResponse(
        content={
            "server": "grandorgue-mcp",
            "version": "0.3.0",
            "tools": sorted(
                [
                    "go_status",
                    "go_start",
                    "go_stop",
                    "go_midi_connect",
                    "go_midi_disconnect",
                    "go_list_midi_ports",
                    "go_play_note",
                    "go_play_chord",
                    "go_set_stop",
                    "go_set_crescendo",
                    "go_set_enclosure",
                    "go_combination",
                    "go_panic",
                    "go_load_organ",
                    "go_auto_load",
                    "go_unload_organ",
                    "go_list_organs",
                    "go_send_sysex",
                    "go_marketplace_search",
                    "go_marketplace_download",
                    "go_bach_catalog",
                    "go_play_midi_file",
                    "go_play_midi_file_ui",
                    "go_midi_playback_status",
                    "go_stop_playback",
                    "midi_depot_list",
                    "midi_depot_upload",
                    "midi_depot_download",
                    "midi_depot_delete",
                    "midi_depot_download_bach",
                    "grandorgue_shutdown",
                ]
            ),
            "features": {
                "websocket": True,
                "registrations": True,
                "llm_proxy": True,
                "llm_stream": True,
                "diagnostics": True,
            },
        }
    )


@app.get("/api/llm/discover")
async def api_llm_discover() -> JSONResponse:
    """Probe local LLM providers and report presence + GPU hint.

    ## Return Format
    {"providers": [{"id": str, "label": str, "detected": bool, "models": [...]}],
     "gpu": {"detected": bool|null}}
    """
    providers = await _llm_providers_impl()
    return JSONResponse(
        content={
            "providers": [
                {
                    "id": p["id"],
                    "label": p["label"],
                    "detected": len(p.get("models", [])) > 0,
                    "models": p.get("models", []),
                }
                for p in providers
            ],
            "gpu": {"detected": None, "note": "Run nvidia-smi on the host for GPU detail"},
        }
    )


@app.get("/api/llm/models")
async def api_llm_models(provider: str = "ollama") -> JSONResponse:
    """Model list for one provider (live when reachable, else empty).

    ## Return Format
    {"provider": str, "models": [str]}
    """
    for p in await _llm_providers_impl():
        if p["id"] == provider:
            return JSONResponse(content={"provider": provider, "models": p.get("models", [])})
    return JSONResponse(status_code=404, content={"provider": provider, "models": [], "message": "Unknown provider"})


_INSTALL_ALLOWLIST = {"ollama": ["winget", "install", "-e", "--id", "Ollama.Ollama"]}
_install_state: dict[str, dict[str, Any]] = {}


def _run_install(engine: str) -> None:
    """Blocking winget run in a thread; records tail output in _install_state."""
    global _install_state
    import subprocess

    _install_state[engine] = {"state": "running", "output": ""}
    try:
        proc = subprocess.run(
            _INSTALL_ALLOWLIST[engine],
            capture_output=True,
            text=True,
            timeout=1800,
        )
        tail = (proc.stdout + proc.stderr)[-2000:]
        _install_state[engine] = {
            "state": "done" if proc.returncode == 0 else "error",
            "output": tail,
        }
    except Exception as e:
        _install_state[engine] = {"state": "error", "output": str(e)}


@app.post("/api/llm/install")
async def api_llm_install(body: dict[str, Any]) -> JSONResponse:
    """One-click local engine install (allowlisted only).

    ## Return Format
    {"started": bool, "engine": str, "message": str}
    """
    engine = str(body.get("engine", "")).lower()
    if engine not in _INSTALL_ALLOWLIST:
        return JSONResponse(
            status_code=400,
            content={"started": False, "engine": engine, "message": "Engine not allowlisted"},
        )
    if _install_state.get(engine, {}).get("state") == "running":
        return JSONResponse(content={"started": True, "engine": engine, "message": "Install already running"})

    async def _install_in_background() -> None:
        await anyio.to_thread.run_sync(_run_install, engine)

    _spawn(_install_in_background())
    return JSONResponse(content={"started": True, "engine": engine, "message": "Install started, poll status"})


@app.get("/api/llm/install/status")
async def api_llm_install_status(engine: str = "ollama") -> JSONResponse:
    """Poll install progress.

    ## Return Format
    {"engine": str, "state": str, "output": str}
    """
    st = _install_state.get(engine, {"state": "idle", "output": ""})
    return JSONResponse(content={"engine": engine, **st})


@app.get("/api/llm/onboarding")
async def api_llm_onboarding() -> JSONResponse:
    """Fresh-install starter facts + recommended path for the under-hero cue.

    ## Return Format
    {"facts": [str], "recommended": {"provider": str, "model": str}, "setup_url": str}
    """
    return JSONResponse(
        content={
            "facts": [
                "Local LLM keeps organ registrations and MIDI on this machine.",
                "Ollama (port 11434) and LM Studio (port 1234) are auto-detected.",
                "No key needed for local providers; cloud is not configured in this build.",
            ],
            "recommended": {"provider": "ollama", "model": "llama3.2:3b"},
            "setup_url": "https://ollama.com/download",
        }
    )


@app.post("/api/llm/chat/stream")
async def api_llm_chat_stream(body: dict[str, Any]) -> Response:
    """Streaming backend chat proxy (SSE, OpenAI-style chunks).

    ## Return Format
    text/event-stream with `data: {"chunk": str}` events + `data: [DONE]`
    """
    from fastapi.responses import StreamingResponse

    provider = body.get("provider", "ollama")
    model = body.get("model", "llama3.2:3b")
    prompt = body.get("prompt") or body.get("message", "")
    system = body.get("system", "")
    base = f"{_LMSTUDIO_BASE}/v1" if provider == "lmstudio" else f"{_OLLAMA_BASE}/v1"
    messages: list[dict[str, str]] = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    async def _gen():
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{base}/chat/completions",
                    json={"model": model, "messages": messages, "stream": True},
                ) as resp:
                    async for line in resp.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        payload = line[5:].strip()
                        if payload == "[DONE]":
                            break
                        try:
                            delta = json.loads(payload)["choices"][0]["delta"].get("content", "")
                        except (KeyError, ValueError, IndexError):
                            continue
                        if delta:
                            yield f"data: {json.dumps({'chunk': delta})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(_gen(), media_type="text/event-stream")


# -- Registration Store (in-memory SQLite) ----------------------------------

_REG_DB: _sqlite3.Connection | None = None


def _get_reg_db() -> _sqlite3.Connection:
    global _REG_DB
    if _REG_DB is None:
        _REG_DB = _sqlite3.connect(
            str(
                Path(_os.getenv("GO_CONFIG_DIR", str(Path.home() / "AppData" / "Roaming" / "GrandOrgue-mcp")))
                / "registrations.sqlite"
            )
        )
        _REG_DB.row_factory = _sqlite3.Row
        _REG_DB.execute(
            """CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            organ TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            stops TEXT NOT NULL DEFAULT '[]',
            created TEXT DEFAULT (datetime('now')),
            updated TEXT DEFAULT (datetime('now'))
        )"""
        )
    return _REG_DB


@app.get("/api/registrations")
async def api_registrations_list(organ: str = "") -> JSONResponse:
    db = _get_reg_db()
    if organ:
        rows = db.execute("SELECT * FROM registrations WHERE organ = ? ORDER BY updated DESC", (organ,)).fetchall()
    else:
        rows = db.execute("SELECT * FROM registrations ORDER BY updated DESC").fetchall()
    return JSONResponse(content={"success": True, "registrations": [dict(r) for r in rows]})


@app.post("/api/registrations")
async def api_registrations_create(body: dict[str, Any]) -> JSONResponse:
    db = _get_reg_db()
    name = body.get("name", "Unnamed")
    organ = body.get("organ", "")
    stops = body.get("stops", [])
    cur = db.execute(
        "INSERT INTO registrations (organ, name, stops) VALUES (?, ?, ?)",
        (organ, name, json.dumps(stops) if isinstance(stops, list) else stops),
    )
    db.commit()
    return JSONResponse(content={"success": True, "id": cur.lastrowid})


@app.put("/api/registrations/{reg_id}")
async def api_registrations_update(reg_id: int, body: dict[str, Any]) -> JSONResponse:
    db = _get_reg_db()
    name = body.get("name")
    stops = body.get("stops")
    if name is not None:
        db.execute("UPDATE registrations SET name = ?, updated = datetime('now') WHERE id = ?", (name, reg_id))
    if stops is not None:
        db.execute(
            "UPDATE registrations SET stops = ?, updated = datetime('now') WHERE id = ?",
            (json.dumps(stops) if isinstance(stops, list) else stops, reg_id),
        )
    db.commit()
    return JSONResponse(content={"success": True})


@app.delete("/api/registrations/{reg_id}")
async def api_registrations_delete(reg_id: int) -> JSONResponse:
    db = _get_reg_db()
    db.execute("DELETE FROM registrations WHERE id = ?", (reg_id,))
    db.commit()
    return JSONResponse(content={"success": True})


@app.post("/api/registrations/{reg_id}/apply")
async def api_registrations_apply(reg_id: int) -> JSONResponse:
    """Apply a saved registration to GrandOrgue via MIDI CC."""
    db = _get_reg_db()
    row = db.execute("SELECT * FROM registrations WHERE id = ?", (reg_id,)).fetchone()
    if not row:
        return JSONResponse(status_code=404, content={"success": False, "message": "Registration not found"})
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False, "message": "MIDI not connected"})
    stops = json.loads(row["stops"]) if isinstance(row["stops"], str) else row["stops"]
    for stop in stops:
        cc = stop.get("cc") or stop.get("midi_cc")
        state = stop.get("state", True)
        if cc is not None:
            midi_bridge.set_stop(cc, state)
    return JSONResponse(content={"success": True, "applied": len(stops)})


# -- WebSocket ----------------------------------------------------------------


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    _ws_clients.append(ws)
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type", "")
            if msg_type == "status":
                payload = await _status_payload()
                await ws.send_json({"type": "status", **payload})
            elif msg_type == "note":
                if midi_bridge.connected:
                    midi_bridge.play_note(
                        data.get("channel", 0),
                        data.get("note", 60),
                        data.get("velocity", 64),
                    )
            elif msg_type == "note_off":
                if midi_bridge.connected:
                    midi_bridge.release_note(data.get("channel", 0), data.get("note", 60))
            elif msg_type == "stop":
                if midi_bridge.connected:
                    midi_bridge.set_stop(data.get("cc", 0), data.get("state", True))
            elif msg_type == "panic":
                if midi_bridge.connected:
                    midi_bridge.all_notes_off()
            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket handler failed")
    finally:
        if ws in _ws_clients:
            _ws_clients.remove(ws)


# -- MCP HTTP mount (endpoint: /mcp) ------------------------------------------

app.mount("/mcp", mcp_app)


# -- MCP Apps (Prefab) -----------------------------------------------------------
# Deferred import: prefab modules import mcp/managers from this module, so
# registration runs after everything above is defined. Toggle with
# GRANDORGUE_PREFAB_APPS=0 (skips registration, imports still succeed).


def _register_prefab_tools() -> None:
    from grandorgue_mcp.tools.prefab import register_prefab_tools

    register_prefab_tools()


_register_prefab_tools()


# -- Entry point ---------------------------------------------------------------


def main() -> None:
    transport = _os.getenv("MCP_TRANSPORT", "stdio").lower()
    if _os.environ.get("GRANDORGUE_TAURI", "").lower() in ("1", "true", "yes"):
        transport = "http"
    if transport == "http":
        import uvicorn

        uvicorn.run(app, host=HOST, port=PORT, log_level="info")
    else:
        # stdio for Claude Desktop / mcpb. FastMCP logs to stderr, so stdout
        # stays clean for the MCP protocol framing.
        mcp.run()


if __name__ == "__main__":
    main()
