param(
    [switch]$Headless,
    [switch]$BackendOnly,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$StartScript = Join-Path $RepoRoot "start.ps1"

if (-not (Test-Path -LiteralPath $StartScript)) {
    throw "Missing repo start script: $StartScript"
}

& $StartScript @PSBoundParameters
