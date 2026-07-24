# GrandOrgue MCP — Fleet Integration Implementation Plan

## Session 1 (COMPLETED — 2026-05-25)

| # | Item | Status |
|---|------|--------|
| 1 | `.github/workflows/ci.yml` — 3 jobs (backend lint+test, webapp build, Playwright e2e) | Done |
| 2 | `@playwright/test` in `web_sota/package.json` | Done |
| 3 | `start.ps1` — SOTA template (param block, `-ArgumentList`, `-WorkingDirectory`, keep-alive) | Done |
| 4 | `.gitignore` — `!grandorgue-mcp-backend.spec` exception | Done |
| 5 | `biome.json` — VCS off, Tailwind parser, disabled noisy rules | Done |
| 6 | `mcp-central-docs/starts/grandorgue-mcp-start.bat` | Done |
| 7 | `AGENTS.md` created with session context | Done |

---

## Session 2 — Phase Plan

### Phase A: Registry & Config (HIGH)

| # | Task | File | Effort |
|---|------|------|--------|
| A1 | Add grandorgue-mcp entry to `webapp-registry.json` (11010/11011) | `mcp-central-docs/operations/webapp-registry.json` | 5 min |
| A2 | Add `ci` recipe to justfile (`ci: lint test`) | `justfile` | 2 min |
| A3 | Fix `justfile` `health` recipe — use `curl.exe` not `curl` | `justfile` | 1 min |
| A4 | Add CI badge to README | `README.md` | 2 min |
| A5 | Fix empty-href badges in README | `README.md` | 2 min |

### Phase B: Test Infrastructure (HIGH)

| # | Task | File | Effort |
|---|------|------|--------|
| B1 | Add `web_sota/test-results/` to `.gitignore` | `.gitignore` | 1 min |
| B2 | Clean up stale Playwright artifacts (`web_sota/test-results/`) | — | 1 min |
| B3 | Add smoke tests for `server.py` (health endpoint, MCP tool list) | `tests/test_server.py` (new) | 15 min |
| B4 | Add smoke tests for `go_process.py`, `midi_bridge.py`, `organ_manager.py`, `auto_load.py` | `tests/test_go_process.py` etc | 20 min |
| B5 | Fix failing e2e test "sidebar navigation > Console" | `web_sota/e2e/grandorgue.spec.ts` | 10 min |
| B6 | Move `pytest`/`playwright` deps to `[test]` group in `pyproject.toml` | `pyproject.toml` | 5 min |

### Phase C: SOTA Start Script Alignment (MEDIUM)

| # | Task | File | Effort |
|---|------|------|--------|
| C1 | Rewrite `web_sota/start.ps1` — SOTA param block, `-ArgumentList`, port zombie clearing | `web_sota/start.ps1` | 10 min |
| C2 | Update `start.ps1` to pass `--port $Port` to backend command | `start.ps1` | 2 min |
| C3 | Increase readiness poll to 60s in `start.ps1` | `start.ps1` | 1 min |

### Phase D: Documentation (LOW)

| # | Task | File | Effort |
|---|------|------|--------|
| D1 | Reconcile tool count (16 vs 20 vs 21) across docs | `AGENTS.md`, `GRANDORGUE_ANNOUNCEMENT.md` | 5 min |
| D2 | Mention `just-starts/grandorgue-mcp-just.bat` in AGENTS.md | `AGENTS.md` | 2 min |
| D3 | Update `WEBAPP_PORTS.md` if needed (verify path info) | `WEBAPP_PORTS.md` | 2 min |

---

## Summary

| Phase | Items | Priority | Est. Time |
|-------|-------|----------|-----------|
| A — Registry & Config | 5 | HIGH | 12 min |
| B — Test Infrastructure | 6 | HIGH | 52 min |
| C — SOTA Start Scripts | 3 | MEDIUM | 13 min |
| D — Documentation | 3 | LOW | 9 min |
| **Total** | **17** | | **~86 min** |

## Verification Checklist

After all phases:
- [ ] `uv run ruff check src/ tests/` — 0 errors
- [ ] `npx @biomejs/biome check src/` — 0 errors
- [ ] `npx tsc -b` — 0 errors
- [ ] `npm run build` — clean build
- [ ] `uv run pytest -q` — all backend tests pass
- [ ] `npx playwright test` — all e2e tests pass
- [ ] `.\start.ps1` — launches without error
- [ ] `.\web_sota\start.ps1` — launches without error
