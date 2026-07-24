"""Tests for settings resolvers (depot dir, MIDI recordings dir)."""

from pathlib import Path

from grandorgue_mcp import settings_store


def test_depot_dir_env_override(tmp_path, monkeypatch):
    target = tmp_path / "depot"
    monkeypatch.setenv("MIDI_DEPOT_DIR", str(target))
    resolved = settings_store.resolve_midi_depot_dir()
    assert resolved == target
    assert resolved.is_dir()  # created on demand


def test_depot_dir_source_checkout(monkeypatch):
    monkeypatch.delenv("MIDI_DEPOT_DIR", raising=False)
    resolved = settings_store.resolve_midi_depot_dir()
    repo_depot = Path(settings_store.__file__).resolve().parents[2] / "midi_depot"
    if repo_depot.is_dir():
        assert resolved == repo_depot
    else:
        assert resolved == settings_store.GO_CONFIG_DIR / "midi_depot"


def test_recordings_dir_env_override(tmp_path, monkeypatch):
    monkeypatch.setenv("GO_MIDI_RECORDINGS_DIR", str(tmp_path))
    assert settings_store.resolve_midi_recordings_dir() == tmp_path


def test_recordings_dir_from_settings(tmp_path, monkeypatch):
    monkeypatch.delenv("GO_MIDI_RECORDINGS_DIR", raising=False)
    from grandorgue_mcp.models import AppSettings

    s = AppSettings(midi_recordings_dir=str(tmp_path))
    assert settings_store.resolve_midi_recordings_dir(s) == tmp_path


def test_recordings_dir_autodetect_returns_path(monkeypatch):
    monkeypatch.delenv("GO_MIDI_RECORDINGS_DIR", raising=False)
    from grandorgue_mcp.models import AppSettings

    result = settings_store.resolve_midi_recordings_dir(AppSettings())
    assert isinstance(result, Path)
    assert "GrandOrgue" in str(result)
