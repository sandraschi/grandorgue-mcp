# Build Log

## 2026-10-06 - NSIS rebuild after dead-spawn-path fix

Result: `dist/GrandOrgue MCP_0.3.0_x64-setup.exe` (30.7 MiB). Frozen backend smoke test on the
operator port: listens on 11244, `GET /health` and `GET /api/apps` return 200, no red flags in stderr.
Not run: CUA install/launch/uninstall smoke test. `native/build.ps1` has no frozen-binary smoke step.

Fixed before building:

| Problem | Fix |
|---------|-----|
| `main.rs` had its own `start_backend` (spawned with `--http --port 11010`, no port freeing, no health poll); `backend.rs::spawn_backend` was dead code. | `start_backend` calls `spawn_backend`; child killed on `Exit` and `ExitRequested`. |
| Operator used the dev backend port 11010. | Operator port 11244 (claimed as `grandorgue-mcp-native`). |
| `free_port` was one `taskkill` by port plus a 500 ms sleep. | Multi-layer kill, self-PID excluded, polls up to 240 s. |
| Backend reads `PORT`/`HOST`, not `MCP_PORT`; spawn set only `MCP_PORT`. | Spawn also sets `PORT` and `HOST`. |
| Frontend `API_BASE = ""` and about 40 raw `fetch("/api/...")` calls: in the Tauri webview these hit `tauri://localhost`, so the UI could never reach its backend. WebSockets used `location.host` or hardcoded `ws://127.0.0.1:11010`. | `API_BASE` from `VITE_API_BASE` (baked by `native/build.ps1`); `main.tsx` fetch shim prefixes root-relative `/api`, `/health`, `/mcp`; WebSockets use `wsOrigin()`. |
| `web_sota/biome.json` used `"preset": "recommended"`, rejected by Biome 2.4, so the pre-commit gate failed on every commit. | `"recommended": true`. |

## Build Failure - 2026-08-26 14:39:56

### Build FAILED (exit 1)
```njust.exe : Set-Location 'D:\Dev\repos\grandorgue-mcp\native'
At C:\Users\sandr\.gemini\antigravity\brain\be84629a-7705-4f3a-898a-e5f3e12f7306\scratch\build_15_repos.ps1:127 char:20
+     $buildOutput = & just build-native 2>&1
+                    ~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Set-Location 'D...gue-mcp\native':String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError

$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
.\build.ps1
.\build.ps1 : The term '.\build.ps1' is not recognized as the name of a cmdlet, function, script file, or operable
program. Check the spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:1 char:1
+ .\build.ps1
+ ~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (.\build.ps1:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException

error: Recipe `build-native` failed on line 58 with exit code 1

```

## Build Failure - 2026-08-26 15:05:06

### Smoke FAILED
Port: 11010
timeout: port 11010 never opened after 30s

## assfix 2026-09-08 — MCPB pack OK

- `make-mcpb.ps1` exit 0: `dist/grandorgue-mcp-v0.3.0.mcpb` (33 KB, 17 files),
  bundle-info verified; `mcpb/src` self-import assert passed.
- Restored `scripts/mcpb-pack.ps1` (was deleted in worktree) as a thin wrapper
  over fleet `make-mcpb.ps1`; `just mcpb` uses it. NOTE: vendored
  `just mcpb-pack` (fleet.just → `mcpb/pack.ps1`) cannot work — the pack
  script wipes + re-scaffolds `mcpb/` every run, and just forbids overriding
  the recipe locally. Flagged as fleet-template gap.
- Added canonical icon source `native/icons/icon.png` (256x256); verified it
  lands in the bundle as `mcpb/assets/icon.png`. Do NOT commit files under
  `mcpb/` by hand — they regenerate (only `mcpb/assets/prompts/*` survive).
- Prompts still runt (system 309/3000w, user 85/4000w, examples 1/100) —
  needs an LLM generation pass before the bundle is store-ready.
- Pyright baseline: 60 pre-existing errors (anyio `to_thread` stubs, mido
  optional-import unbounds); CI pyright step is advisory (`continue-on-error`)
  until that baseline is fixed. My 4 new-code errors fixed.
- Tier 2 2026-09-08: pyright 60 -> 26. Fixed all mido unbounds (Any-annotated
  optional import, `_make_message` helper, port-local capture), the shutdown
  return-type error, my stream/body errors, and the one missing import (kept
  the runtime-correct path with a targeted resolver ignore). All 26 remaining
  are `anyio 4.13 to_thread.run_sync` stub-resolution under pyright 1.1.411 —
  environmental, needs a fleet-wide anyio/pyright pairing decision.
