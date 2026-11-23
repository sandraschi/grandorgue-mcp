"""MidiBridge tests that need no real MIDI hardware (fake ports + mido messages)."""

from __future__ import annotations

import pytest

mido = pytest.importorskip("mido")

from grandorgue_mcp.midi_bridge import CRESCENDO_CC, ENCLOSURE_CCS, MidiBridge


class FakePort:
    def __init__(self) -> None:
        self.sent: list = []

    def send(self, msg) -> None:
        self.sent.append(msg)


def _connected_bridge() -> tuple[MidiBridge, FakePort]:
    b = MidiBridge()
    port = FakePort()
    b._out_port = port
    b._connected = True
    return b, port


def test_disconnected_bridge_sends_nothing():
    b = MidiBridge()
    b.play_note(0, 60)
    b.set_stop(21, True)
    b.all_notes_off()
    assert b.connected is False


def test_incoming_crescendo_enclosure_and_stop_are_disjoint():
    b = MidiBridge()
    seen: dict[str, list] = {"crescendo": [], "enclosure": [], "stop_change": []}
    for ev in seen:
        b.on(ev, lambda *a, _ev=ev: seen[_ev].append(a))

    b._handle_incoming(mido.Message("control_change", control=CRESCENDO_CC, value=90))
    b._handle_incoming(mido.Message("control_change", control=ENCLOSURE_CCS[0], value=50))
    b._handle_incoming(mido.Message("control_change", control=21, value=100))
    b._handle_incoming(mido.Message("control_change", control=21, value=10))

    assert seen["crescendo"] == [(90,)]
    assert seen["enclosure"] == [(ENCLOSURE_CCS[0], 50)]
    assert seen["stop_change"] == [(21, True), (21, False)]
    assert b._stop_state["21"] is False


def test_incoming_note_on_zero_velocity_is_note_off():
    b = MidiBridge()
    offs: list = []
    b.on("note_off", lambda ch, note: offs.append((ch, note)))
    b._handle_incoming(mido.Message("note_on", channel=1, note=60, velocity=80))
    assert b._active_notes == {60: True}
    b._handle_incoming(mido.Message("note_on", channel=1, note=60, velocity=0))
    assert b._active_notes == {}
    assert offs == [(1, 60)]


def test_set_crescendo_and_enclosure_clamp_to_midi_range():
    b, port = _connected_bridge()
    b.set_crescendo(500)
    b.set_enclosure(11, -5)
    assert port.sent[0].value == 127
    assert port.sent[1].value == 0


def test_trigger_combination_is_one_based_and_clamped():
    b, port = _connected_bridge()
    b.trigger_combination(1)
    b.trigger_combination(0)
    b.trigger_combination(999)
    assert [m.program for m in port.sent] == [0, 0, 127]


def test_all_notes_off_covers_all_16_channels():
    b, port = _connected_bridge()
    b.all_notes_off()
    assert sorted(m.channel for m in port.sent) == list(range(16))
    assert all(m.control == 123 for m in port.sent)


def test_unknown_callback_event_is_ignored():
    b = MidiBridge()
    b.on("nonsense", lambda: None)
    assert "nonsense" not in b._callbacks
