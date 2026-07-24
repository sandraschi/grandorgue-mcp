"""GrandOrgue process lifecycle management."""

from __future__ import annotations

import csv
import gzip
import io
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

from grandorgue_mcp.models import GrandOrgueProcessInfo
from grandorgue_mcp.settings_store import grandorgue_config_path, load_settings, resolve_go_exe


def _creationflags() -> int:
    if sys.platform == "win32":
        return subprocess.CREATE_NO_WINDOW
    return 0


def _powershell_exe() -> str:
    system_root = os.environ.get("SystemRoot", r"C:\Windows")
    return str(os.path.join(system_root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"))


def _tasklist_exe() -> str:
    system_root = os.environ.get("SystemRoot", r"C:\Windows")
    return str(os.path.join(system_root, "System32", "tasklist.exe"))


class GoProcessManager:
    def __init__(self) -> None:
        self._process: subprocess.Popen | None = None
        self._exe_path: str | None = None
        self._last_error: str | None = None
        self._spawned = False
        self._version_cache: tuple[str, float, str | None] | None = None
        self.refresh_exe_path()

    def refresh_exe_path(self) -> str | None:
        self._exe_path = resolve_go_exe()
        return self._exe_path

    def set_exe_path(self, path: str | None) -> None:
        self._exe_path = path

    def _find_running_pids(self) -> list[int]:
        if sys.platform == "win32":
            try:
                result = subprocess.run(
                    [_tasklist_exe(), "/FI", "IMAGENAME eq GrandOrgue.exe", "/FO", "CSV", "/NH"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                )
                pids: list[int] = []
                for row in csv.reader(io.StringIO(result.stdout)):
                    if len(row) >= 2 and row[0] == "GrandOrgue.exe" and row[1].isdigit():
                        pids.append(int(row[1]))
                return pids
            except Exception:
                return []
        pgrep = shutil.which("pgrep") or "/usr/bin/pgrep"
        try:
            result = subprocess.run(
                [pgrep, "-x", "GrandOrgue"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return [int(pid) for pid in result.stdout.split() if pid.isdigit()]
        except Exception:
            return []

    def _resolve_running_pid(self) -> int | None:
        if self._process and self._process.poll() is None:
            return self._process.pid
        pids = self._find_running_pids()
        return pids[0] if pids else None

    def discover(self) -> GrandOrgueProcessInfo:
        pid = self._resolve_running_pid()
        info = GrandOrgueProcessInfo(
            running=pid is not None,
            error=self._last_error,
            pid=pid,
        )
        exe = self.refresh_exe_path()
        if exe:
            info.exe_path = exe
            info.config_path = str(grandorgue_config_path())
        info.version = self._detect_version()
        return info

    def _detect_version(self) -> str | None:
        """Read version from the executable metadata — GO has no --version flag.

        Result is cached per (exe path, mtime): the frontend polls /api/status
        every few seconds and spawning PowerShell on every poll stalls the
        event loop and burns CPU for a value that never changes at runtime.
        """
        exe = self.refresh_exe_path()
        if not exe:
            return None
        try:
            mtime = os.path.getmtime(exe)
        except OSError:
            mtime = 0.0
        if self._version_cache and self._version_cache[0] == exe and self._version_cache[1] == mtime:
            return self._version_cache[2]
        version_str: str | None = None
        if sys.platform == "win32":
            try:
                result = subprocess.run(
                    [
                        _powershell_exe(),
                        "-NoProfile",
                        "-Command",
                        f"(Get-Item -LiteralPath '{exe}').VersionInfo.ProductVersion",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    creationflags=subprocess.CREATE_NO_WINDOW,
                )
                version = result.stdout.strip()
                if version:
                    version_str = f"GrandOrgue {version}"
            except Exception:
                pass
        self._version_cache = (exe, mtime, version_str)
        return version_str

    def _launch(self, exe: str, organ_path: str | None = None) -> subprocess.Popen:
        cmd = [exe]
        if organ_path:
            cmd.append(organ_path)
        return subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            creationflags=_creationflags(),
        )

    def _ensure_midi_config(self) -> None:
        """Add loopMIDI port to GrandOrgue's config so it listens for MIDI input."""
        config_path = Path(grandorgue_config_path())
        if not config_path.exists():
            return
        try:
            raw = config_path.read_bytes()
            data = gzip.decompress(raw).decode("utf-8")
            if "GrandOrgue MCP In" in data:
                return  # already configured

            # Find and update the [MIDIIn] section. GO configs may use CRLF or
            # LF line endings — match both.
            replaced = False
            for eol in ("\r\n", "\n"):
                old = f"[MIDIIn]{eol}Count=0"
                new = (
                    f"[MIDIIn]{eol}Count=1{eol}Device001Name=GrandOrgue MCP In 0{eol}"
                    f"Device001PortName=GrandOrgue MCP In{eol}Device001RegEx={eol}DeviceInstrument001="
                )
                if old in data:
                    data = data.replace(old, new)
                    replaced = True
                    break
            if replaced:
                buf = io.BytesIO()
                with gzip.GzipFile(fileobj=buf, mode="wb") as f:
                    f.write(data.encode("utf-8"))
                config_path.write_bytes(buf.getvalue())
        except Exception:
            pass  # non-fatal — GO will still launch, just without MIDI input

    def start(self, organ_path: str | None = None) -> GrandOrgueProcessInfo:
        existing_pid = self._resolve_running_pid()
        if existing_pid is not None:
            self._last_error = None
            return self.discover()

        exe = self.refresh_exe_path()
        if not exe:
            settings = load_settings()
            raise FileNotFoundError(
                f"GrandOrgue executable not found at '{settings.go_exe_path}'. Open Settings and set the correct path."
            )

        self._last_error = None
        self._spawned = True
        self._ensure_midi_config()
        self._process = self._launch(exe, organ_path)
        time.sleep(2)

        if self._process.poll() is not None:
            stderr = ""
            if self._process.stderr:
                stderr = self._process.stderr.read().decode("utf-8", errors="replace").strip()
            self._process = None
            self._spawned = False
            self._last_error = stderr or "GrandOrgue exited immediately after launch"
            raise RuntimeError(self._last_error)

        return self.discover()

    def stop(self) -> bool:
        if self._process and self._process.poll() is None:
            self._process.terminate()
            try:
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
            self._process = None
            self._spawned = False
            return True

        if self._find_running_pids():
            self._last_error = "GrandOrgue is running outside MCP control. Close it manually."
            return False
        return False

    def is_running(self) -> bool:
        return self._resolve_running_pid() is not None


go_process = GoProcessManager()
