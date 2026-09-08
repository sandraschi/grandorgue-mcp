# Build Log

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
