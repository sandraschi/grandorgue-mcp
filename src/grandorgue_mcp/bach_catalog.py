"""J.S. Bach organ works catalog — single source of truth.

Used by the go_bach_catalog MCP tool and the /api/bach/catalog REST endpoint.
Extend freely; keep entries sorted roughly by fame.
"""

from __future__ import annotations

BACH_CATALOG: list[dict[str, str | int]] = [
    {
        "bwv": 565,
        "title": "Toccata and Fugue in D minor",
        "key": "D minor",
        "style": "Toccata",
        "difficulty": "Advanced",
    },
    {
        "bwv": 582,
        "title": "Passacaglia and Fugue in C minor",
        "key": "C minor",
        "style": "Passacaglia",
        "difficulty": "Advanced",
    },
    {
        "bwv": 552,
        "title": "Prelude and Fugue 'St. Anne'",
        "key": "Eb major",
        "style": "Prelude & Fugue",
        "difficulty": "Advanced",
    },
    {
        "bwv": 540,
        "title": "Toccata and Fugue in F major",
        "key": "F major",
        "style": "Toccata",
        "difficulty": "Advanced",
    },
    {
        "bwv": 532,
        "title": "Prelude and Fugue in D major",
        "key": "D major",
        "style": "Prelude & Fugue",
        "difficulty": "Advanced",
    },
    {"bwv": 525, "title": "Trio Sonata No. 1", "key": "Eb major", "style": "Trio Sonata", "difficulty": "Advanced"},
    {"bwv": 526, "title": "Trio Sonata No. 2", "key": "C minor", "style": "Trio Sonata", "difficulty": "Advanced"},
    {"bwv": 590, "title": "Pastorale in F major", "key": "F major", "style": "Pastorale", "difficulty": "Intermediate"},
    {
        "bwv": 645,
        "title": "Wachet auf, ruft uns die Stimme",
        "key": "Eb major",
        "style": "Chorale Prelude",
        "difficulty": "Intermediate",
    },
    {
        "bwv": 654,
        "title": "Schmucke dich, o liebe Seele",
        "key": "Eb major",
        "style": "Chorale Prelude",
        "difficulty": "Intermediate",
    },
    {
        "bwv": 659,
        "title": "Nun komm, der Heiden Heiland",
        "key": "G minor",
        "style": "Chorale Prelude",
        "difficulty": "Intermediate",
    },
    {"bwv": 608, "title": "In dulci jubilo", "key": "A major", "style": "Chorale Prelude", "difficulty": "Easy"},
    {
        "bwv": 622,
        "title": "O Mensch, bewein dein Sunde gross",
        "key": "Eb major",
        "style": "Chorale Prelude",
        "difficulty": "Intermediate",
    },
    {
        "bwv": 639,
        "title": "Ich ruf zu dir, Herr Jesu Christ",
        "key": "F minor",
        "style": "Chorale Prelude",
        "difficulty": "Intermediate",
    },
    {
        "bwv": 531,
        "title": "Prelude and Fugue in C major",
        "key": "C major",
        "style": "Prelude & Fugue",
        "difficulty": "Intermediate",
    },
    {
        "bwv": 544,
        "title": "Prelude and Fugue in B minor",
        "key": "B minor",
        "style": "Prelude & Fugue",
        "difficulty": "Advanced",
    },
]


def search_bach(bwv: int | None = None) -> list[dict[str, str | int]]:
    if bwv:
        return [w for w in BACH_CATALOG if w["bwv"] == bwv]
    return list(BACH_CATALOG)
