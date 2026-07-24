"""MIDI bridge to GrandOrgue via mido + python-rtmidi."""

from __future__ import annotations

import logging
import threading
import time
from collections.abc import Callable
from pathlib import Path

try:
    import mido
    from mido import Message, MidiFile

    _MIDO_OK = True
except ImportError:
    _MIDO_OK = False
    MidiFile = None  # type: ignore

from grandorgue_mcp.models import MidiDeviceStatus, MidiPortInfo

logger = logging.getLogger(__name__)

# Incoming CC classification. GrandOrgue's mapping is per-organ; these are the
# defaults this bridge sends (set_crescendo uses CRESCENDO_CC) and therefore
# the ones we recognize coming back. Ranges are disjoint by construction.
CRESCENDO_CC = 8
ENCLOSURE_CCS = (1, 7, 11)


class MidiBridge:
    def __init__(self, go_output_name: str = "GrandOrgue MCP In", go_input_name: str = "GrandOrgue MCP Out"):
        self._go_output_name = go_output_name
        self._go_input_name = go_input_name
        self._out_port: mido.ports.BaseOutput | None = None
        self._in_port: mido.ports.BaseInput | None = None
        self._connected = False
        self._stop_state: dict[str, bool] = {}
        self._active_notes: dict[int, bool] = {}
        self._crescendo = 0
        self._enclosures: dict[str, int] = {}
        self._callbacks: dict[str, list[Callable]] = {
            "stop_change": [],
            "note_on": [],
            "note_off": [],
            "crescendo": [],
            "enclosure": [],
        }
        self._lock = threading.Lock()
        self._listen_thread: threading.Thread | None = None
        self._playback_thread: threading.Thread | None = None
        self._stop_playback_flag = False

    @property
    def connected(self) -> bool:
        return self._connected

    @property
    def go_input_name(self) -> str:
        return self._go_input_name

    @property
    def go_output_name(self) -> str:
        return self._go_output_name

    def configure(self, go_input_name: str, go_output_name: str) -> None:
        if self._connected:
            raise RuntimeError("Disconnect MIDI before changing port names")
        self._go_input_name = go_input_name
        self._go_output_name = go_output_name

    def list_ports(self) -> MidiDeviceStatus:
        if not _MIDO_OK:
            return MidiDeviceStatus()
        inputs = []
        outputs = []
        for name in mido.get_input_names():
            inputs.append(MidiPortInfo(name=name, port_type="input", connected=name == self._go_input_name))
        for name in mido.get_output_names():
            outputs.append(MidiPortInfo(name=name, port_type="output", connected=name == self._go_output_name))
        return MidiDeviceStatus(
            inputs=inputs,
            outputs=outputs,
            go_input_port=self._go_input_name,
            go_output_port=self._go_output_name,
        )

    def connect(self) -> bool:
        """Open the configured MIDI ports. Blocking — run in a worker thread."""
        if not _MIDO_OK:
            return False
        mido.set_backend("mido.backends.rtmidi")

        def _resolve_port(name: str, kind: str) -> str | None:
            names = mido.get_input_names() if kind == "input" else mido.get_output_names()
            if name in names:
                return name
            matches = [n for n in names if n.startswith(name)]
            return matches[0] if matches else None

        # Connect output (sending MIDI to GrandOrgue) — required
        out_name = _resolve_port(self._go_output_name, "output")
        if out_name:
            try:
                self._out_port = mido.open_output(out_name)
            except Exception:
                self._out_port = None

        # Connect input (receiving MIDI from GrandOrgue) — optional
        in_name = _resolve_port(self._go_input_name, "input")
        if in_name:
            try:
                self._in_port = mido.open_input(in_name)
            except Exception:
                self._in_port = None

        self._connected = self._out_port is not None
        if self._connected and self._in_port:
            self._start_listener()
        return self._connected

    def disconnect(self) -> None:
        self.stop_playback()
        self._connected = False
        if self._listen_thread:
            self._listen_thread.join(timeout=2)
            self._listen_thread = None
        if self._in_port:
            self._in_port.close()
            self._in_port = None
        if self._out_port:
            self._out_port.close()
            self._out_port = None

    def _start_listener(self) -> None:
        def _listen():
            while self._connected and self._in_port:
                try:
                    msg = self._in_port.receive(block=False)
                    if msg is not None:
                        self._handle_incoming(msg)
                    else:
                        time.sleep(0.001)
                except Exception:
                    time.sleep(0.001)

        self._listen_thread = threading.Thread(target=_listen, daemon=True, name="midi-listener")
        self._listen_thread.start()

    def _handle_incoming(self, msg: Message) -> None:
        with self._lock:
            msg_type = msg.type
            if msg_type == "control_change":
                ctrl = msg.control
                val = msg.value
                if ctrl == CRESCENDO_CC:
                    self._crescendo = val
                    for cb in self._callbacks["crescendo"]:
                        cb(val)
                elif ctrl in ENCLOSURE_CCS:
                    self._enclosures[str(ctrl)] = val
                    for cb in self._callbacks["enclosure"]:
                        cb(ctrl, val)
                else:
                    self._stop_state[str(ctrl)] = val >= 64
                    for cb in self._callbacks["stop_change"]:
                        cb(ctrl, val >= 64)
            elif msg_type == "note_on" and msg.velocity > 0:
                self._active_notes[msg.note] = True
                for cb in self._callbacks["note_on"]:
                    cb(msg.channel, msg.note, msg.velocity)
            elif msg_type == "note_off" or (msg_type == "note_on" and msg.velocity == 0):
                self._active_notes.pop(msg.note, None)
                for cb in self._callbacks["note_off"]:
                    cb(msg.channel, msg.note)

    def on(self, event: str, callback: Callable) -> None:
        if event in self._callbacks:
            self._callbacks[event].append(callback)

    def play_note(self, channel: int, note: int, velocity: int = 64) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("note_on", channel=channel, note=note, velocity=velocity))

    def release_note(self, channel: int, note: int) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("note_off", channel=channel, note=note))

    def set_stop(self, cc: int, state: bool) -> None:
        if self._out_port and self._connected:
            val = 127 if state else 0
            self._out_port.send(Message("control_change", control=cc, value=val))
            self._stop_state[str(cc)] = state

    def set_crescendo(self, value: int) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("control_change", control=CRESCENDO_CC, value=max(0, min(127, value))))
            self._crescendo = value

    def set_enclosure(self, cc: int, value: int) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("control_change", control=cc, value=max(0, min(127, value))))
            self._enclosures[str(cc)] = value

    def trigger_combination(self, number: int) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("program_change", program=min(127, max(0, number - 1))))

    def all_notes_off(self) -> None:
        if self._out_port and self._connected:
            for ch in range(16):
                self._out_port.send(Message("control_change", channel=ch, control=123, value=0))

    def send_sysex(self, data: bytes) -> None:
        if self._out_port and self._connected:
            # mido expects sysex data without the F0/F7 framing bytes
            payload = bytes(data)
            if payload[:1] == b"\xf0":
                payload = payload[1:]
            if payload[-1:] == b"\xf7":
                payload = payload[:-1]
            self._out_port.send(Message("sysex", data=payload))

    # -- MIDI file playback ---------------------------------------------------

    def play_midi_file(self, path: str | Path) -> str:
        """Play a MIDI file through the connected GrandOrgue output port.

        Serialized: an active playback is stopped before the new one starts.
        Runs in a background daemon thread; returns immediately.
        """
        if not _MIDO_OK:
            return "mido not available"
        if not self._connected or not self._out_port:
            return "MIDI bridge not connected"
        path = Path(path)
        if not path.exists():
            return f"MIDI file not found: {path}"

        # Stop any active playback before starting a new one
        if self._playback_thread and self._playback_thread.is_alive():
            self._stop_playback_flag = True
            self._playback_thread.join(timeout=2)
            self.all_notes_off()

        self._stop_playback_flag = False

        def _play():
            try:
                mid = MidiFile(str(path))
                for msg in mid.play():
                    if self._stop_playback_flag or not self._connected:
                        break
                    if not msg.is_meta:
                        self._out_port.send(msg)
            except Exception:
                logger.exception("MIDI playback failed: %s", path.name)
            finally:
                self.all_notes_off()

        self._playback_thread = threading.Thread(target=_play, daemon=True, name="midi-playback")
        self._playback_thread.start()
        return f"Playing: {path.name}"

    def stop_playback(self) -> str:
        """Stop any active MIDI file playback and cut all notes."""
        self._stop_playback_flag = True
        if self._playback_thread and self._playback_thread.is_alive():
            self._playback_thread.join(timeout=2)
        self.all_notes_off()
        return "Playback stopped"

    @property
    def playback_active(self) -> bool:
        """Whether a MIDI file playback thread is currently running."""
        return bool(self._playback_thread and self._playback_thread.is_alive())


midi_bridge = MidiBridge()
