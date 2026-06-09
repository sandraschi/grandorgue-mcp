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
    DEFAULT_GO_EXE_PATH,
    r"C:\Program Files\GrandOrgue\GrandOrgue.exe",
    r"C:\Program Files (x86)\GrandOrgue\GrandOrgue.exe",
    r"C:\Program Files (x86)\GrandOrgue\bin\GrandOrgue.exe",
    "/usr/bin/GrandOrgue",
    "/usr/local/bin/GrandOrgue",
    "/Applications/GrandOrgue.app/Contents/MacOS/GrandOrgue",
]


def _defaults() -> AppSettings:
    env_exe = os.getenv("GO_EXE_PATH")
    return AppSettings(
        go_exe_path=env_exe or DEFAULT_GO_EXE_PATH,
        midi_input_port="GrandOrgue MCP Out",
        midi_output_port="GrandOrgue MCP In",
        config_dir=str(GO_CONFIG_DIR),
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
    }
    if extra:
        payload.update(extra)
    return payload
