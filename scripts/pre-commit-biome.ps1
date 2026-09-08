# Fleet pre-commit Biome hook for grandorgue-mcp (web root: web_sota/).
# Canonical template: mcp-central-docs/templates/pre-commit-biome.ps1
# Detects the web root (webapp/ canonical, then legacy variants), ensures
# node_modules, runs npm run biome:ci.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

$webRoot = $null
foreach ($candidate in @("webapp", "webapp/frontend", "web_sota", "web-sota", "web", "frontend", "ui", "web_app")) {
    $path = Join-Path $repoRoot $candidate
    if (Test-Path (Join-Path $path "package.json")) {
        $webRoot = $path
        break
    }
}

if (-not $webRoot) {
    exit 0
}

Push-Location $webRoot
try {
    if (-not (Test-Path "node_modules")) {
        npm ci --silent
        if ($LASTEXITCODE -ne 0) {
            npm install --silent
        }
    }
    npm run biome:ci
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
