"""Persisted user settings for GrandOrgue MCP."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from grandorgue_mcp.models import AppSettings

GO_CONFIG_DIR = Path(os.getenv("GO_CONFIG_DIR", str(Path.home() / "AppData" / "Roaming" / "GrandOrgue-mcp")))
SETTINGS_FILE = GO_CONFIG_DIR / "settings.json"


def grandorgue_config_path() -> Path:
    """Where GrandOrgue stores MIDI/audio settings."""
    if os.name == "nt":
        return Path.home() / "AppData" / "Roaming" / "GrandOrgueConfig"
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Preferences" / "GrandOrgueConfig"
    return Path.home() / "GrandOrgueConfig"


DEFAULT_GO_EXE_PATH = r"C:\Program Files\GrandOrgue\bin\GrandOrgue.exe"

DEFAULT_GO_PATHS = [
    r"C:\Program Files\GrandOrgue\bin\GrandOrgue.exe",
    r"C:\Program Files (x86)\GrandOrgue\GrandOrgue.exe",
    r"C:\Program Files (x86)\GrandOrgue\bin\GrandOrgue.exe",
    "/usr/bin/GrandOrgue",
    "/usr/local/bin/GrandOrgue",
    "/Applications/GrandOrgue.app/Contents/MacOS/GrandOrgue",
]


def resolve_midi_depot_dir() -> Path:
    """Stable location for the MIDI depot.

    Priority:
    1. MIDI_DEPOT_DIR env var
    2. repo-root midi_depot/ when running from a source checkout
    3. GO_CONFIG_DIR/midi_depot (packaged installs: wheel, PyInstaller, mcpb)
    """
    env = os.getenv("MIDI_DEPOT_DIR")
    if env:
        depot = Path(env)
    else:
        repo_depot = Path(__file__).resolve().parents[2] / "midi_depot"
        depot = repo_depot if repo_depot.is_dir() else GO_CONFIG_DIR / "midi_depot"
    depot.mkdir(parents=True, exist_ok=True)
    return depot


def resolve_midi_recordings_dir(settings: AppSettings | None = None) -> Path:
    """GrandOrgue's 'MIDI recordings' directory (where GO's file dialog opens).

    Priority: GO_MIDI_RECORDINGS_DIR env > settings.midi_recordings_dir >
    first existing well-known candidate (OneDrive localized variants included) >
    plain Documents fallback (created on demand).
    """
    env = os.getenv("GO_MIDI_RECORDINGS_DIR")
    if env:
        return Path(env)
    settings = settings or load_settings()
    if settings.midi_recordings_dir:
        return Path(settings.midi_recordings_dir)
    home = Path.home()
    candidates = [
        home / "OneDrive" / "Dokumente" / "GrandOrgue" / "MIDI recordings",
        home / "OneDrive" / "Documents" / "GrandOrgue" / "MIDI recordings",
        home / "Documents" / "GrandOrgue" / "MIDI recordings",
    ]
    for c in candidates:
        if c.is_dir():
            return c
    fallback = candidates[-1]
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


def _defaults() -> AppSettings:
    env_exe = os.getenv("GO_EXE_PATH")
    return AppSettings(
        go_exe_path=env_exe or DEFAULT_GO_EXE_PATH,
        midi_input_port="GrandOrgue MCP Out",
        midi_output_port="GrandOrgue MCP In",
        config_dir=str(GO_CONFIG_DIR),
        midi_recordings_dir="",
    )


def load_settings() -> AppSettings:
    GO_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            return AppSettings.model_validate({**_defaults().model_dump(), **data})
        except (json.JSONDecodeError, OSError, ValueError):
            pass
    return _defaults()


def save_settings(settings: AppSettings) -> AppSettings:
    GO_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
    return settings


def resolve_go_exe(settings: AppSettings | None = None) -> str | None:
    settings = settings or load_settings()
    candidates = [
        os.getenv("GO_EXE_PATH"),
        settings.go_exe_path,
        *DEFAULT_GO_PATHS,
    ]
    for path in candidates:
        if path and Path(path).exists():
            return path
    return None


def settings_payload(extra: dict[str, Any] | None = None) -> dict[str, Any]:
    settings = load_settings()
    exe = resolve_go_exe(settings)
    payload = {
        **settings.model_dump(),
        "go_exe_exists": bool(exe and Path(exe).exists()),
        "resolved_go_exe_path": exe,
        "default_go_paths": DEFAULT_GO_PATHS,
        "go_config_path": str(grandorgue_config_path()),
        "resolved_midi_recordings_dir": str(resolve_midi_recordings_dir(settings)),
        "midi_depot_dir": str(resolve_midi_depot_dir()),
    }
    if extra:
        payload.update(extra)
    return payload
