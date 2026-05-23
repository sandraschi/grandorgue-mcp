"""Pydantic models for GrandOrgue MCP."""

from __future__ import annotations

from pydantic import BaseModel, Field


class OrganInfo(BaseModel):
    name: str = ""
    path: str = ""
    loaded: bool = False
    manuals: int = 0
    stops: int = 0
    couplers: int = 0
    tremulants: int = 0
    enclosures: int = 0
    polyphony: int = 0


class StopState(BaseModel):
    name: str
    manual: str = ""
    state: bool = False
    midi_cc: int | None = None
    is_tremulant: bool = False


class ManualInfo(BaseModel):
    name: str
    midi_channel: int = 1
    first_note: int = 36
    note_count: int = 61
    enclosure: str | None = None


class CombinationSlot(BaseModel):
    number: int
    name: str = ""
    frame: int = 0


class NoteEvent(BaseModel):
    manual: str
    note: int = Field(ge=0, le=127)
    velocity: int = Field(default=64, ge=0, le=127)
    duration_ms: int | None = Field(default=None, ge=0)


class OrganStatus(BaseModel):
    organ: OrganInfo = Field(default_factory=OrganInfo)
    stops: list[StopState] = Field(default_factory=list)
    manuals: list[ManualInfo] = Field(default_factory=list)
    combinations: list[CombinationSlot] = Field(default_factory=list)
    crescendo_stage: int = 0
    go_running: bool = False
    midi_connected: bool = False
    audio_playing: bool = False
    polyphony_used: int = 0


class GrandOrgueProcessInfo(BaseModel):
    running: bool
    pid: int | None = None
    exe_path: str | None = None
    config_path: str | None = None
    version: str | None = None


class SampleSetEntry(BaseModel):
    name: str
    path: str
    installed: bool = False
    url: str | None = None
    description: str = ""
    manuals: int = 0
    stops: int = 0
    is_free: bool = True


class MidiPortInfo(BaseModel):
    name: str
    port_type: str = "input"  # input | output
    connected: bool = False
    virtual: bool = False


class MidiDeviceStatus(BaseModel):
    inputs: list[MidiPortInfo] = Field(default_factory=list)
    outputs: list[MidiPortInfo] = Field(default_factory=list)
    go_input_port: str = ""
    go_output_port: str = ""


class RecorderStatus(BaseModel):
    recording: bool = False
    playing: bool = False
    filename: str = ""
    elapsed_seconds: float = 0.0
    midi_events: int = 0
