param([string]$RepoRoot = (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"
Set-Location $RepoRoot

# Read name/version from the canonical root pyproject
$proj = Get-Content pyproject.toml -Raw
$name = if ($proj -match '(?m)^name = "(.*)"') { $matches[1] } else { Split-Path -Leaf $PWD }
$ver = if ($proj -match '(?m)^version = "(.*)"') { $matches[1] } else { "0.0.0" }

# Stage: canonical src + run_server.py + root pyproject/uv.lock + mcpb assets.
# mcpb/ holds ONLY manifest.json and assets - never a second copy of the code.
$stage = Join-Path $RepoRoot "dist\mcpb-stage"
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $RepoRoot "dist") | Out-Null

Copy-Item (Join-Path $RepoRoot "mcpb\manifest.json") $stage
Copy-Item (Join-Path $RepoRoot "run_server.py") $stage
Copy-Item (Join-Path $RepoRoot "pyproject.toml") $stage
if (Test-Path (Join-Path $RepoRoot "uv.lock")) { Copy-Item (Join-Path $RepoRoot "uv.lock") $stage }
Copy-Item -Recurse (Join-Path $RepoRoot "src") (Join-Path $stage "src")
if (Test-Path (Join-Path $RepoRoot "mcpb\assets")) {
    Copy-Item -Recurse (Join-Path $RepoRoot "mcpb\assets") (Join-Path $stage "assets")
}
# Strip caches/backups from the stage
Get-ChildItem -Path $stage -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $stage -Recurse -Include "*.pyc", "*.bak" -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

$bundle = Join-Path $RepoRoot "dist\$name-v$ver.mcpb"
bunx @anthropic-ai/mcpb validate (Join-Path $stage "manifest.json")
bunx @anthropic-ai/mcpb pack $stage $bundle
Write-Host "Bundle: $bundle" -ForegroundColor Green
