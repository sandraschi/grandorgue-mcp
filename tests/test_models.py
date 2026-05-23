"""Tests for GrandOrgue MCP models and MIDI bridge."""

from grandorgue_mcp.models import MidiPortInfo, NoteEvent, OrganInfo, StopState


def test_organ_info_defaults():
    o = OrganInfo()
    assert o.name == ""
    assert o.loaded is False
    assert o.manuals == 0


def test_stop_state():
    s = StopState(name="Principal 8'", manual="Great", state=True, midi_cc=21)
    assert s.name == "Principal 8'"
    assert s.state is True


def test_note_event_validation():
    n = NoteEvent(manual="Great", note=60, velocity=80, duration_ms=500)
    assert n.note == 60
    assert n.velocity == 80


def test_midi_port_info():
    p = MidiPortInfo(name="LoopBe Internal MIDI", port_type="input", connected=True)
    assert p.port_type == "input"
    assert p.connected is True
