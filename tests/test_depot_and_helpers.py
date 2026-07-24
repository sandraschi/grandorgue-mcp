"""Tests for depot path sanitization, shared helpers, and regression guards."""

from pathlib import Path

import pytest

from grandorgue_mcp import server
from grandorgue_mcp.bach_catalog import BACH_CATALOG, search_bach


@pytest.fixture()
def tmp_depot(tmp_path, monkeypatch):
    monkeypatch.setattr(server, "_MIDI_DEPOT", tmp_path)
    return tmp_path


class TestDepotPathSanitization:
    def test_plain_name(self, tmp_depot):
        p = server._depot_path("fugue1.mid")
        assert p == tmp_depot / "fugue1.mid"

    def test_forward_slash_traversal_stripped(self, tmp_depot):
        p = server._depot_path("../../evil.mid")
        assert p == tmp_depot / "evil.mid"

    def test_backslash_traversal_stripped(self, tmp_depot):
        # Windows-style traversal — the original vulnerability
        p = server._depot_path("..\\..\\secret.mid")
        assert p == tmp_depot / "secret.mid"

    def test_dot_and_dotdot_rejected(self, tmp_depot):
        assert server._depot_path(".") is None
        assert server._depot_path("..") is None
        assert server._depot_path("") is None

    def test_nested_path_flattened(self, tmp_depot):
        p = server._depot_path("sub/dir/file.mid")
        assert p == tmp_depot / "file.mid"


class TestDepotImpls:
    def test_upload_download_delete_roundtrip(self, tmp_depot):
        import base64

        data = base64.b64encode(b"MThd_fake_midi").decode()
        up = server._depot_upload_impl("test.mid", data)
        assert up["success"] is True
        assert Path(up["path"]).parent == tmp_depot

        listing = server._depot_list_impl()
        assert any(f["name"] == "test.mid" for f in listing["files"])

        down = server._depot_download_impl("test.mid")
        assert down["success"] is True
        assert down["data_base64"] == data

        delete = server._depot_delete_impl("test.mid")
        assert delete["success"] is True
        assert not (tmp_depot / "test.mid").exists()

    def test_upload_appends_mid_extension(self, tmp_depot):
        import base64

        up = server._depot_upload_impl("noext", base64.b64encode(b"x").decode())
        assert up["success"] is True
        assert up["path"].endswith("noext.mid")

    def test_upload_traversal_lands_in_depot(self, tmp_depot):
        import base64

        up = server._depot_upload_impl("..\\..\\evil.mid", base64.b64encode(b"x").decode())
        assert up["success"] is True
        assert Path(up["path"]).parent == tmp_depot

    def test_download_missing(self, tmp_depot):
        assert server._depot_download_impl("nope.mid")["success"] is False

    def test_delete_missing(self, tmp_depot):
        assert server._depot_delete_impl("nope.mid")["success"] is False


class TestBachCatalog:
    def test_full_catalog(self):
        works = search_bach()
        assert len(works) == len(BACH_CATALOG) > 0

    def test_bwv_filter(self):
        works = search_bach(565)
        assert len(works) == 1
        assert works[0]["title"].startswith("Toccata and Fugue")

    def test_bwv_miss(self):
        assert search_bach(9999) == []


class TestToolRegistrationRegression:
    """Shared logic must live in plain helpers, not inside decorated tools.

    Empirical note (verified on FastMCP 3.4.x): @mcp.tool() returns the
    original function, so decorated tools remain directly callable — unlike
    FastMCP 2.x, where the decorator returned a non-callable FunctionTool.
    We still route all cross-calls through the _impl helpers so the code
    survives another decorator-semantics change and keeps REST/MCP symmetric.
    """

    def test_helpers_are_plain_callables(self):
        import inspect

        for helper in (
            server._load_organ_impl,
            server._depot_list_impl,
            server._depot_upload_impl,
            server._depot_download_impl,
            server._depot_delete_impl,
            server._depot_bach_impl,
        ):
            assert inspect.isfunction(helper), f"{helper} must be a plain function, not a Tool object"

    def test_decorated_tool_registered(self):
        # The tool must be registered with FastMCP regardless of what the
        # decorator returns. If this fails after a FastMCP upgrade, re-audit
        # registration and all call sites.
        import asyncio

        tools = asyncio.run(server.mcp.list_tools())
        names = {t.name for t in tools}
        assert "midi_depot_upload" in names
        assert "go_status" in names


class TestTransportSwitch:
    def test_default_is_stdio(self, monkeypatch):
        monkeypatch.delenv("MCP_TRANSPORT", raising=False)
        assert __import__("os").getenv("MCP_TRANSPORT", "stdio").lower() == "stdio"

    def test_mcp_http_mounted_once(self):
        # Endpoint must be /mcp, not /mcp/mcp
        mounts = [r.path for r in server.app.routes if getattr(r, "app", None) is server.mcp_app]
        assert mounts == ["/mcp"]
