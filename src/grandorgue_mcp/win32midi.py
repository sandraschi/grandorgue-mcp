"""Windows MIDI helper for GrandOrgue — keystroke injection for GO's MIDI player.

Since GO's MinGW build doesn't register WINDOWS_MM in RtMidi's getCompiledApi,
we bypass GO's MIDI input entirely and drive GrandOrgue's built-in MIDI file
player via Windows API keystroke injection.
"""

from __future__ import annotations

import ctypes
import ctypes.wintypes
import shutil
import time
from pathlib import Path

from grandorgue_mcp.settings_store import resolve_midi_depot_dir, resolve_midi_recordings_dir

# Windows constants
VK_MENU = 0x12  # Alt key
VK_RETURN = 0x0D
VK_SHIFT = 0x10
VK_F = 0x46
VK_M = 0x4D
KEYEVENTF_KEYUP = 0x0002

user32 = ctypes.windll.user32
user32.VkKeyScanW.restype = ctypes.c_short
user32.VkKeyScanW.argtypes = [ctypes.c_wchar]


def find_window(title: str) -> int | None:
    """Find a window by title substring."""
    hwnds: list[int] = []

    def enum_callback(hwnd, _):
        buf = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, buf, 256)
        if title in buf.value:
            hwnds.append(hwnd)
        return True

    ENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_int, ctypes.c_int)
    proc = ENUMPROC(enum_callback)
    user32.EnumWindows(proc, 0)
    return hwnds[0] if hwnds else None


def _vk_for_char(ch: str) -> tuple[int, bool] | None:
    """Map a character to (virtual-key code, needs-shift) for the active layout.

    ord(char.upper()) is only correct for A-Z/0-9 — '.' is 0x2E which is
    VK_DELETE, so naive mapping corrupts every filename. VkKeyScanW returns
    the proper VK in the low byte and shift state in bit 0 of the high byte.
    """
    res = user32.VkKeyScanW(ch)
    if res == -1:
        return None
    vk = res & 0xFF
    needs_shift = bool((res >> 8) & 0x01)
    return vk, needs_shift


def _press_vk(vk: int, shift: bool = False, delay: float = 0.03) -> None:
    if shift:
        user32.keybd_event(VK_SHIFT, 0, 0, 0)
        time.sleep(0.02)
    user32.keybd_event(vk, 0, 0, 0)
    time.sleep(delay)
    user32.keybd_event(vk, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(delay)
    if shift:
        user32.keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, 0)
        time.sleep(0.02)


def _type_text(text: str) -> bool:
    """Type text via keybd_event using layout-correct VK codes."""
    for ch in text:
        mapped = _vk_for_char(ch)
        if mapped is None:
            return False
        vk, shift = mapped
        _press_vk(vk, shift)
    return True


def load_midi_file_in_go(midi_filename: str, midi_dir: str = "") -> dict:
    """Load and play a MIDI file in GrandOrgue via Windows API keystroke injection.

    1. Copies the MIDI file from the depot to GO's MIDI recordings directory
    2. Sends Alt+F, M, types filename, Enter to GO's window
    3. GO's built-in player plays through the pipe organ engine

    Does NOT require pywinauto-mcp or any MIDI cables.
    """
    target_dir = Path(midi_dir) if midi_dir else resolve_midi_recordings_dir()
    target_dir.mkdir(parents=True, exist_ok=True)

    depot = resolve_midi_depot_dir()
    src = depot / Path(midi_filename).name
    if not src.exists():
        return {"success": False, "message": f"MIDI file not found in depot: {midi_filename}"}
    dst = target_dir / src.name
    shutil.copy2(str(src), str(dst))

    hwnd = find_window("GrandOrgue")
    if not hwnd:
        return {"success": False, "message": "GrandOrgue window not found"}

    user32.ShowWindow(hwnd, 1)  # SW_SHOWNORMAL
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.3)

    # Alt+F to open File menu
    user32.keybd_event(VK_MENU, 0, 0, 0)
    user32.keybd_event(VK_F, 0, 0, 0)
    user32.keybd_event(VK_F, 0, KEYEVENTF_KEYUP, 0)
    user32.keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0)
    time.sleep(0.5)

    # 'M' for Load MIDI File
    _press_vk(VK_M)
    time.sleep(0.5)

    # Type the filename (layout-aware, handles '.', '_', '-')
    if not _type_text(src.name):
        return {"success": False, "message": f"Could not type filename on current keyboard layout: {src.name}"}
    time.sleep(0.3)

    _press_vk(VK_RETURN)
    time.sleep(1)
    # Extra Enter for confirmation dialogs
    _press_vk(VK_RETURN)

    return {"success": True, "message": f"Playing '{src.name}' via GO built-in player"}
