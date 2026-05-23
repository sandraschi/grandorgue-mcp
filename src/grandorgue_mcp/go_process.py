"""GrandOrgue process lifecycle management."""

from __future__ import annotations

import os
import subprocess
import time
from pathlib import Path

from grandorgue_mcp.models import GrandOrgueProcessInfo

_DEFAULT_GO_PATHS = [
    "C:\\Program Files\\GrandOrgue\\GrandOrgue.exe",
    "C:\\Program Files (x86)\\GrandOrgue\\GrandOrgue.exe",
    "/usr/bin/GrandOrgue",
    "/usr/local/bin/GrandOrgue",
    "/Applications/GrandOrgue.app/Contents/MacOS/GrandOrgue",
]

GO_CONFIG_DIR = Path(os.getenv("GO_CONFIG_DIR", str(Path.home() / "AppData" / "Roaming" / "GrandOrgue-mcp")))


class GoProcessManager:
    def __init__(self) -> None:
        self._process: subprocess.Popen | None = None
        self._exe_path: str | None = None

    def discover(self) -> GrandOrgueProcessInfo:
        info = GrandOrgueProcessInfo(running=self._process is not None and self._process.poll() is None)
        if self._exe_path:
            info.exe_path = self._exe_path
            info.config_path = str(GO_CONFIG_DIR / "grandorgue-mcp-config")
        else:
            found = None
            for path in _DEFAULT_GO_PATHS:
                if Path(path).exists():
                    found = path
                    break
            if found:
                self._exe_path = found
                info.exe_path = found
                info.config_path = str(GO_CONFIG_DIR / "grandorgue-mcp-config")
        if info.running:
            info.pid = self._process.pid if self._process else None
        info.version = self._detect_version()
        return info

    def _detect_version(self) -> str | None:
        if not self._exe_path:
            return None
        try:
            result = subprocess.run([self._exe_path, "--version"], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                for line in result.stdout.splitlines():
                    if "GrandOrgue" in line or line.strip().startswith("3."):
                        return line.strip()
        except Exception:
            pass
        return None

    def start(self) -> GrandOrgueProcessInfo:
        if self._process and self._process.poll() is None:
            return self.discover()
        if not self._exe_path:
            for path in _DEFAULT_GO_PATHS:
                if Path(path).exists():
                    self._exe_path = path
                    break
            if not self._exe_path:
                raise FileNotFoundError("GrandOrgue executable not found. Install from https://github.com/GrandOrgue/grandorgue/releases")
        GO_CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        config = GO_CONFIG_DIR / "grandorgue-mcp-config"
        if not config.exists():
            config.write_text("")
        self._process = subprocess.Popen(
            [self._exe_path, "--config", str(config)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(2)
        return self.discover()

    def stop(self) -> bool:
        if self._process and self._process.poll() is None:
            self._process.terminate()
            try:
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
            return True
        return False

    def is_running(self) -> bool:
        return self._process is not None and self._process.poll() is None


go_process = GoProcessManager()
