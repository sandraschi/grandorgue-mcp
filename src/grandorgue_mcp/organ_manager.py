"""Organ / sample set management for GrandOrgue MCP."""

from __future__ import annotations

from pathlib import Path

from grandorgue_mcp.models import OrganInfo, SampleSetEntry

# Known free sample set catalogs
FREE_SAMPLE_SET_SOURCES = [
    {
        "name": "Piotr Grabowski",
        "url": "https://piotrgrabowski.pl/",
        "description": "Free Hauptwerk-compatible sample sets",
    },
    {
        "name": "Lars Palo",
        "url": "http://familjenpalo.se/vpo/",
        "description": "Free virtual pipe organ sample sets",
    },
    {
        "name": "Burea Church",
        "url": "http://familjenpalo.se/vpo/burea/",
        "description": "Swedish church organ by Lars Palo",
    },
    {
        "name": "Pitea MHS",
        "url": "http://familjenpalo.se/vpo/pitea-mhs/",
        "description": "Swedish school organ by Lars Palo",
    },
    {
        "name": "Demo Organ",
        "url": "https://github.com/GrandOrgue/grandorgue/releases",
        "description": "Built-in GrandOrgue demo organ",
    },
]


class OrganManager:
    def __init__(self, organ_dir: str | None = None) -> None:
        self._organ_dir = Path(organ_dir) if organ_dir else Path.home() / "GrandOrgue" / "organs"
        self._current_organ: OrganInfo | None = None

    def list_installed(self) -> list[SampleSetEntry]:
        entries: list[SampleSetEntry] = []
        if not self._organ_dir.exists():
            return entries
        for path in self._organ_dir.iterdir():
            if path.is_dir():
                entries.append(SampleSetEntry(
                    name=path.name,
                    path=str(path),
                    installed=True,
                    description="",
                ))
        return entries

    def list_catalog(self) -> list[SampleSetEntry]:
        entries: list[SampleSetEntry] = []
        for src in FREE_SAMPLE_SET_SOURCES:
            entries.append(SampleSetEntry(
                name=src["name"],
                path="",
                installed=False,
                url=src["url"],
                description=src["description"],
                is_free=True,
            ))
        return entries

    def load_organ(self, path: str) -> OrganInfo:
        self._current_organ = OrganInfo(name=Path(path).stem, path=path, loaded=True)
        return self._current_organ

    def unload_organ(self) -> None:
        self._current_organ = None

    @property
    def current(self) -> OrganInfo | None:
        return self._current_organ


organ_manager = OrganManager()
