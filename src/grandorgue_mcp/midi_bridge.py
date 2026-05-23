"""MIDI bridge to GrandOrgue via mido + python-rtmidi."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable

try:
    import mido
    from mido import Message
    _MIDO_OK = True
except ImportError:
    _MIDO_OK = False

from grandorgue_mcp.models import MidiDeviceStatus, MidiPortInfo

_NOTE_OFF = 0x80
_NOTE_ON = 0x90
_CTRL_CHANGE = 0xB0
_PROG_CHANGE = 0xC0


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

    @property
    def connected(self) -> bool:
        return self._connected

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
        if not _MIDO_OK:
            return False
        try:
            mido.set_backend("mido.backends.rtmidi")
            if self._go_input_name not in mido.get_input_names():
                self._in_port = mido.open_input(self._go_input_name, virtual=True)
            else:
                self._in_port = mido.open_input(self._go_input_name)
            if self._go_output_name not in mido.get_output_names():
                self._out_port = mido.open_output(self._go_output_name, virtual=True)
            else:
                self._out_port = mido.open_output(self._go_output_name)
            self._connected = True
            self._start_listener()
            return True
        except Exception:
            return False

    def disconnect(self) -> None:
        self._connected = False
        if self._listen_thread:
            self._listen_thread.join(timeout=2)
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
                    self._handle_incoming(msg)
                except Exception:
                    time.sleep(0.001)
        self._listen_thread = threading.Thread(target=_listen, daemon=True)
        self._listen_thread.start()

    def _handle_incoming(self, msg: Message) -> None:
        with self._lock:
            msg_type = msg.type
            if msg_type == "control_change":
                ctrl = msg.control
                val = msg.value
                for cb in self._callbacks["stop_change"]:
                    cb(ctrl, val >= 64)
                if 1 <= ctrl <= 32:
                    self._crescendo = val
                    for cb in self._callbacks["crescendo"]:
                        cb(val)
                elif 7 <= ctrl <= 14:
                    for cb in self._callbacks["enclosure"]:
                        cb(ctrl, val)
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

    def play_chord(self, channel: int, notes: list[int], velocity: int = 64, duration_ms: int = 500) -> None:
        for note in notes:
            self.play_note(channel, note, velocity)
        if duration_ms > 0:
            time.sleep(duration_ms / 1000)
        for note in notes:
            self.release_note(channel, note)

    def set_stop(self, cc: int, state: bool) -> None:
        if self._out_port and self._connected:
            val = 127 if state else 0
            self._out_port.send(Message("control_change", control=cc, value=val))
            self._stop_state[str(cc)] = state

    def set_crescendo(self, value: int) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("control_change", control=8, value=max(0, min(127, value))))
            self._crescendo = value

    def set_enclosure(self, cc: int, value: int) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("control_change", control=cc, value=max(0, min(127, value))))
            self._enclosures[str(cc)] = value

    def trigger_combination(self, number: int) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("program_change", program=min(127, number - 1)))

    def all_notes_off(self) -> None:
        if self._out_port and self._connected:
            for ch in range(16):
                self._out_port.send(Message("control_change", channel=ch, control=123, value=0))

    def send_sysex(self, data: bytes) -> None:
        if self._out_port and self._connected:
            self._out_port.send(Message("sysex", data=data))


midi_bridge = MidiBridge()
