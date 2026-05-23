"""
GrandOrgue MCP Server — Modern pipe organ control via MIDI bridge.

FastMCP 3.2+ tools + FastAPI REST + WebSocket real-time state.
Port: 11010 (backend) / 11011 (frontend via Vite proxy).
"""

from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastmcp import FastMCP

from grandorgue_mcp.go_process import go_process
from grandorgue_mcp.midi_bridge import midi_bridge
from grandorgue_mcp.organ_manager import FREE_SAMPLE_SET_SOURCES, organ_manager

PORT = int(os.getenv("PORT", "11010"))
HOST = os.getenv("HOST", "127.0.0.1")

mcp = FastMCP("grandorgue-mcp")
app = FastAPI(title="GrandOrgue MCP Server", version="0.1.0")

_ws_clients: list[WebSocket] = []

# ── WebSocket broadcast ──────────────────────────────────────────

async def _broadcast(data: dict[str, Any]) -> None:
    dead = []
    for ws in _ws_clients:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _ws_clients.remove(ws)

# ── MCP Tools ────────────────────────────────────────────────────

@mcp.tool()
async def go_status() -> dict[str, Any]:
    """Get GrandOrgue process, MIDI, and organ status.

    ## Return Format
    {"success": bool, "go_running": bool, "midi_connected": bool, "organ": {...}}
    """
    proc = go_process.discover()
    return {
        "success": True,
        "go_running": proc.running,
        "midi_connected": midi_bridge.connected,
        "organ": organ_manager.current.model_dump() if organ_manager.current else None,
        "go_path": proc.exe_path,
        "go_version": proc.version,
    }


@mcp.tool()
async def go_start() -> dict[str, Any]:
    """Launch GrandOrgue executable via process manager.

    ## Return Format
    {"success": bool, "message": str, "pid": int|null}
    """
    try:
        info = go_process.start()
        return {"success": True, "message": "GrandOrgue launched", "pid": info.pid, "version": info.version}
    except FileNotFoundError as e:
        return {"success": False, "message": str(e), "pid": None}


@mcp.tool()
async def go_stop() -> dict[str, Any]:
    """Terminate the GrandOrgue process.

    ## Return Format
    {"success": bool, "message": str}
    """
    ok = go_process.stop()
    midi_bridge.disconnect()
    return {"success": ok, "message": "GrandOrgue stopped" if ok else "Not running"}


@mcp.tool()
async def go_midi_connect() -> dict[str, Any]:
    """Create virtual MIDI ports and connect to GrandOrgue.

    ## Return Format
    {"success": bool, "message": str, "ports": {"input": str, "output": str}}
    """
    ok = midi_bridge.connect()
    status = midi_bridge.list_ports()
    return {"success": ok, "message": "MIDI bridge connected" if ok else "MIDI bridge failed", "ports": {"input": status.go_input_port, "output": status.go_output_port}}


@mcp.tool()
async def go_midi_disconnect() -> dict[str, Any]:
    """Close MIDI bridge connections.

    ## Return Format
    {"success": bool}
    """
    midi_bridge.disconnect()
    return {"success": True}


@mcp.tool()
async def go_list_midi_ports() -> dict[str, Any]:
    """List all available MIDI input and output ports on the system.

    ## Return Format
    {"success": bool, "inputs": [...], "outputs": [...]}
    """
    status = midi_bridge.list_ports()
    return {
        "success": True,
        "inputs": [p.model_dump() for p in status.inputs],
        "outputs": [p.model_dump() for p in status.outputs],
    }


@mcp.tool()
async def go_play_note(
    midi_note: int = 60,
    velocity: int = 64,
    channel: int = 0,
    duration_ms: int = 500,
) -> dict[str, Any]:
    """Play a MIDI note through GrandOrgue.

    ## Return Format
    {"success": bool, "note": int, "velocity": int, "channel": int}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected. Run go_midi_connect first."}
    midi_bridge.play_note(channel, midi_note, velocity)
    import asyncio
    await asyncio.sleep(duration_ms / 1000)
    midi_bridge.release_note(channel, midi_note)
    return {"success": True, "note": midi_note, "velocity": velocity, "channel": channel}


@mcp.tool()
async def go_play_chord(
    notes: list[int] = [60, 64, 67],
    velocity: int = 64,
    channel: int = 0,
    duration_ms: int = 800,
) -> dict[str, Any]:
    """Play a chord (multiple notes simultaneously).

    ## Return Format
    {"success": bool, "notes": [...], "velocity": int}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.play_chord(channel, notes, velocity, duration_ms)
    return {"success": True, "notes": notes, "velocity": velocity}


@mcp.tool()
async def go_set_stop(
    stop_cc: int,
    state: bool = True,
) -> dict[str, Any]:
    """Set a stop (drawstop/tab) on or off via MIDI CC.

    ## Return Format
    {"success": bool, "stop_cc": int, "state": bool}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.set_stop(stop_cc, state)
    return {"success": True, "stop_cc": stop_cc, "state": state}


@mcp.tool()
async def go_set_crescendo(
    value: int = 0,
) -> dict[str, Any]:
    """Set crescendo pedal position (0-127).

    ## Return Format
    {"success": bool, "value": int}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.set_crescendo(value)
    return {"success": True, "value": value}


@mcp.tool()
async def go_set_enclosure(
    cc: int = 7,
    value: int = 127,
) -> dict[str, Any]:
    """Set expression (swell/crescendo) enclosure level via MIDI CC.

    ## Return Format
    {"success": bool, "cc": int, "value": int}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.set_enclosure(cc, value)
    return {"success": True, "cc": cc, "value": value}


@mcp.tool()
async def go_combination(number: int = 1) -> dict[str, Any]:
    """Trigger a combination (general piston) via MIDI Program Change.

    ## Return Format
    {"success": bool, "number": int}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.trigger_combination(number)
    return {"success": True, "number": number}


@mcp.tool()
async def go_panic() -> dict[str, Any]:
    """Send all-notes-off / panic to GrandOrgue.

    ## Return Format
    {"success": bool}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    midi_bridge.all_notes_off()
    return {"success": True}


@mcp.tool()
async def go_load_organ(
    path: str = "",
) -> dict[str, Any]:
    """Load an organ (.organ file or package directory).

    ## Return Format
    {"success": bool, "organ": {"name": str, "path": str}}
    """
    if path:
        info = organ_manager.load_organ(path)
        return {"success": True, "organ": info.model_dump()}
    return {"success": False, "message": "Path required"}


@mcp.tool()
async def go_unload_organ() -> dict[str, Any]:
    """Unload the current organ.

    ## Return Format
    {"success": bool}
    """
    organ_manager.unload_organ()
    return {"success": True}


@mcp.tool()
async def go_list_organs() -> dict[str, Any]:
    """List installed sample sets and known free catalogs.

    ## Return Format
    {"success": bool, "installed": [...], "catalog": [...]}
    """
    installed = organ_manager.list_installed()
    catalog = organ_manager.list_catalog()
    return {"success": True, "installed": [e.model_dump() for e in installed], "catalog": [e.model_dump() for e in catalog]}


@mcp.tool()
async def go_send_sysex(data_hex: str = "") -> dict[str, Any]:
    """Send raw MIDI SYSEX data (hex string, e.g. 'F0 7D 10 ... F7').

    ## Return Format
    {"success": bool}
    """
    if not midi_bridge.connected:
        return {"success": False, "message": "MIDI bridge not connected."}
    try:
        raw = bytes.fromhex(data_hex.replace(" ", ""))
        midi_bridge.send_sysex(raw)
        return {"success": True}
    except ValueError as e:
        return {"success": False, "message": f"Invalid hex: {e}"}


@mcp.tool()
async def go_marketplace_search(query: str = "") -> dict[str, Any]:
    """Search the GrandOrgue sample set marketplace by name, style, or builder.

    ## Return Format
    {"success": bool, "results": [...], "total": int}
    """
    catalog = organ_manager.list_catalog()
    results = [e.model_dump() for e in catalog]
    if query:
        q = query.lower()
        results = [r for r in results if q in r.get("name", "").lower() or q in r.get("description", "").lower()]
    return {"success": True, "results": results, "total": len(results)}


@mcp.tool()
async def go_marketplace_download(name: str = "") -> dict[str, Any]:
    """Get the download URL for a sample set by name.

    ## Return Format
    {"success": bool, "name": str, "url": str|null, "instructions": str}
    """
    catalog = organ_manager.list_catalog()
    for entry in catalog:
        if entry.name.lower() == name.lower():
            return {
                "success": True,
                "name": entry.name,
                "url": entry.url,
                "instructions": f"Download from {entry.url}, extract to your GrandOrgue organs directory, then use go_load_organ() to load it.",
            }
    return {"success": False, "message": f"Sample set '{name}' not found in catalog."}


@mcp.tool()
async def go_bach_catalog(bwv: int | None = None) -> dict[str, Any]:
    """Search the J.S. Bach organ works catalog by BWV number.

    ## Return Format
    {"success": bool, "works": [...], "total": int}
    """
    catalog = [
        {"bwv": 565, "title": "Toccata and Fugue in D minor", "key": "D minor", "style": "Toccata", "difficulty": "Advanced"},
        {"bwv": 582, "title": "Passacaglia and Fugue in C minor", "key": "C minor", "style": "Passacaglia", "difficulty": "Advanced"},
        {"bwv": 552, "title": "Prelude and Fugue 'St. Anne'", "key": "Eb major", "style": "Prelude & Fugue", "difficulty": "Advanced"},
        {"bwv": 540, "title": "Toccata and Fugue in F major", "key": "F major", "style": "Toccata", "difficulty": "Advanced"},
        {"bwv": 532, "title": "Prelude and Fugue in D major", "key": "D major", "style": "Prelude & Fugue", "difficulty": "Advanced"},
        {"bwv": 525, "title": "Trio Sonata No. 1", "key": "Eb major", "style": "Trio Sonata", "difficulty": "Advanced"},
        {"bwv": 526, "title": "Trio Sonata No. 2", "key": "C minor", "style": "Trio Sonata", "difficulty": "Advanced"},
        {"bwv": 590, "title": "Pastorale in F major", "key": "F major", "style": "Pastorale", "difficulty": "Intermediate"},
        {"bwv": 645, "title": "Wachet auf, ruft uns die Stimme", "key": "Eb major", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 654, "title": "Schmucke dich, o liebe Seele", "key": "Eb major", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 659, "title": "Nun komm, der Heiden Heiland", "key": "G minor", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 608, "title": "In dulci jubilo", "key": "A major", "style": "Chorale Prelude", "difficulty": "Easy"},
        {"bwv": 622, "title": "O Mensch, bewein dein Sunde gross", "key": "Eb major", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 639, "title": "Ich ruf zu dir, Herr Jesu Christ", "key": "F minor", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 531, "title": "Prelude and Fugue in C major", "key": "C major", "style": "Prelude & Fugue", "difficulty": "Intermediate"},
        {"bwv": 544, "title": "Prelude and Fugue in B minor", "key": "B minor", "style": "Prelude & Fugue", "difficulty": "Advanced"},
    ]
    if bwv:
        catalog = [w for w in catalog if w["bwv"] == bwv]
    return {"success": True, "works": catalog, "total": len(catalog)}


# ── FastAPI REST Endpoints ───────────────────────────────────────

@app.get("/health")
async def health() -> dict[str, Any]:
    return {"ok": True, "service": "grandorgue-mcp", "port": PORT}


@app.get("/api/status")
async def api_status() -> JSONResponse:
    proc = go_process.discover()
    return JSONResponse(content={
        "go_running": proc.running,
        "go_path": proc.exe_path,
        "go_version": proc.version,
        "midi_connected": midi_bridge.connected,
        "organ": organ_manager.current.model_dump() if organ_manager.current else None,
    })


@app.get("/api/midi/ports")
async def api_midi_ports() -> JSONResponse:
    status = midi_bridge.list_ports()
    return JSONResponse(content=status.model_dump())


@app.post("/api/midi/connect")
async def api_midi_connect() -> JSONResponse:
    ok = midi_bridge.connect()
    return JSONResponse(content={"success": ok, "ports": {"input": midi_bridge._go_input_name, "output": midi_bridge._go_output_name}})


@app.post("/api/midi/disconnect")
async def api_midi_disconnect() -> JSONResponse:
    midi_bridge.disconnect()
    return JSONResponse(content={"success": True})


@app.post("/api/note")
async def api_play_note(body: dict[str, Any]) -> JSONResponse:
    note = body.get("note", 60)
    velocity = body.get("velocity", 64)
    channel = body.get("channel", 0)
    duration = body.get("duration_ms", 500)
    if not midi_bridge.connected:
        return JSONResponse(status_code=400, content={"success": False, "message": "MIDI not connected"})
    midi_bridge.play_note(channel, note, velocity)
    import asyncio
    await asyncio.sleep(duration / 1000)
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
    proc = go_process.discover()
    return JSONResponse(content=proc.model_dump())


@app.post("/api/go/start")
async def api_go_start() -> JSONResponse:
    try:
        info = go_process.start()
        return JSONResponse(content={"success": True, "pid": info.pid})
    except FileNotFoundError as e:
        return JSONResponse(status_code=404, content={"success": False, "message": str(e)})


@app.post("/api/go/stop")
async def api_go_stop() -> JSONResponse:
    ok = go_process.stop()
    midi_bridge.disconnect()
    return JSONResponse(content={"success": ok})


@app.get("/api/organs")
async def api_list_organs() -> JSONResponse:
    installed = organ_manager.list_installed()
    catalog = organ_manager.list_catalog()
    return JSONResponse(content={
        "installed": [e.model_dump() for e in installed],
        "catalog": [e.model_dump() for e in catalog],
    })


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
    catalog = [
        {"bwv": 565, "title": "Toccata and Fugue in D minor", "key": "D minor", "style": "Toccata", "difficulty": "Advanced"},
        {"bwv": 582, "title": "Passacaglia and Fugue in C minor", "key": "C minor", "style": "Passacaglia", "difficulty": "Advanced"},
        {"bwv": 552, "title": "Prelude and Fugue 'St. Anne'", "key": "Eb major", "style": "Prelude & Fugue", "difficulty": "Advanced"},
        {"bwv": 540, "title": "Toccata and Fugue in F major", "key": "F major", "style": "Toccata", "difficulty": "Advanced"},
        {"bwv": 532, "title": "Prelude and Fugue in D major", "key": "D major", "style": "Prelude & Fugue", "difficulty": "Advanced"},
        {"bwv": 525, "title": "Trio Sonata No. 1", "key": "Eb major", "style": "Trio Sonata", "difficulty": "Advanced"},
        {"bwv": 526, "title": "Trio Sonata No. 2", "key": "C minor", "style": "Trio Sonata", "difficulty": "Advanced"},
        {"bwv": 590, "title": "Pastorale in F major", "key": "F major", "style": "Pastorale", "difficulty": "Intermediate"},
        {"bwv": 645, "title": "Wachet auf", "key": "Eb major", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 654, "title": "Schmucke dich", "key": "Eb major", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 659, "title": "Nun komm, der Heiden Heiland", "key": "G minor", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 608, "title": "In dulci jubilo", "key": "A major", "style": "Chorale Prelude", "difficulty": "Easy"},
        {"bwv": 622, "title": "O Mensch, bewein dein Sunde gross", "key": "Eb major", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 639, "title": "Ich ruf zu dir", "key": "F minor", "style": "Chorale Prelude", "difficulty": "Intermediate"},
        {"bwv": 531, "title": "Prelude and Fugue in C major", "key": "C major", "style": "Prelude & Fugue", "difficulty": "Intermediate"},
        {"bwv": 544, "title": "Prelude and Fugue in B minor", "key": "B minor", "style": "Prelude & Fugue", "difficulty": "Advanced"},
    ]
    if bwv:
        catalog = [w for w in catalog if w["bwv"] == bwv]
    return JSONResponse(content={"success": True, "works": catalog, "total": len(catalog)})


# ── WebSocket ─────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await ws.accept()
    _ws_clients.append(ws)
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type", "")
            if msg_type == "status":
                proc = go_process.discover()
                await ws.send_json({
                    "type": "status",
                    "go_running": proc.running,
                    "midi_connected": midi_bridge.connected,
                    "organ": organ_manager.current.model_dump() if organ_manager.current else None,
                })
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
        pass
    finally:
        if ws in _ws_clients:
            _ws_clients.remove(ws)


# ── MCP HTTP mount ───────────────────────────────────────────────

mcp_app = mcp.http_app(path="/mcp")
app.mount("/mcp", mcp_app)


# ── Entry point ──────────────────────────────────────────────────

def main() -> None:
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
