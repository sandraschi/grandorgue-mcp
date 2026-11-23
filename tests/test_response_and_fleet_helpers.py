"""Tests for response helpers, fleet_common parsing and last-organ state."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from grandorgue_mcp import auto_load
from grandorgue_mcp.services import fleet_common
from grandorgue_mcp.utils.response import error_response, success_response


def test_success_response_shape():
    r = success_response({"a": 1}, "op", message="ok", next_steps=["x"])
    assert r["success"] is True
    assert r["operation"] == "op"
    assert r["result"] == {"a": 1}
    assert r["message"] == "ok"
    assert r["next_steps"] == ["x"]
    assert "recommendations" not in r


def test_error_response_shape():
    r = error_response("op", "boom", recovery_options=["retry"])
    assert r["success"] is False
    assert r["error"] == "boom"
    assert r["recovery_options"] == ["retry"]
    assert "suggested_fixes" not in r


def test_parse_fleet_repos_skips_comments_and_junk():
    text = "# comment\n\nsandraschi/grandorgue-mcp\nnot a slug\nowner/repo.name-1\n"
    assert fleet_common.parse_fleet_repos(text) == [
        ("sandraschi", "grandorgue-mcp"),
        ("owner", "repo.name-1"),
    ]


def test_fleet_repos_roundtrip():
    repos = [("a", "b"), ("c", "d")]
    assert fleet_common.parse_fleet_repos(fleet_common.fleet_repos_to_text(repos)) == repos


def test_parse_iso_handles_z_and_garbage():
    assert fleet_common.parse_iso("2026-01-01T00:00:00Z") == datetime(2026, 1, 1, tzinfo=UTC)
    assert fleet_common.parse_iso("not a date") is None
    assert fleet_common.parse_iso(None) is None


def test_days_since():
    ten_days_ago = (datetime.now(UTC) - timedelta(days=10, hours=1)).isoformat()
    assert fleet_common.days_since(ten_days_ago) == 10
    future = (datetime.now(UTC) + timedelta(days=3)).isoformat()
    assert fleet_common.days_since(future) == 0
    assert fleet_common.days_since(None) is None


def test_last_organ_state_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setattr(auto_load, "STATE_FILE", tmp_path / "sub" / "last_organ.json")
    assert auto_load.load_last_organ() is None
    auto_load.save_last_organ("Hauptwerk Demo", "C:/organs/demo.organ")
    assert auto_load.load_last_organ() == {"name": "Hauptwerk Demo", "path": "C:/organs/demo.organ", "version": 1}
    auto_load.clear_last_organ()
    assert auto_load.load_last_organ() is None


def test_last_organ_state_corrupt_file_returns_none(tmp_path, monkeypatch):
    f = tmp_path / "last_organ.json"
    f.write_text("{not json")
    monkeypatch.setattr(auto_load, "STATE_FILE", f)
    assert auto_load.load_last_organ() is None
