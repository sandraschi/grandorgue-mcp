param(
    [switch]$Headless,
    [switch]$BackendOnly,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$BackendPort = 11010
$FleetStartPath = Join-Path $ScriptRoot "scripts\FleetStartMode.ps1"
if (-not (Test-Path -LiteralPath $FleetStartPath)) {
    Write-Host "ERROR: Missing vendored launcher helper: $FleetStartPath" -ForegroundColor Red
    exit 1
}
. $FleetStartPath

$FrontendPort = 11011

$__PortHelpers = Join-Path $ScriptRoot "scripts\PortHelpers.ps1"
if (Test-Path -LiteralPath $__PortHelpers) {
    . $__PortHelpers
}

Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

$BackendJob = Start-Job -Name "grandorgue-backend" -ScriptBlock {
    param($Root)
    Set-Location $Root
    $env:MCP_TRANSPORT = "http"
    uv run grandorgue-mcp
} -ArgumentList $ScriptRoot

Write-Host "Starting GrandOrgue MCP backend on port $BackendPort ..."

$Ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:${BackendPort}/health" -UseBasicParsing -TimeoutSec 2
        if ($Response.StatusCode -eq 200) {
            $Ready = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 1
}

if (-not $Ready) {
    Write-Host "ERROR: Backend failed to start within 60s"
    Receive-Job $BackendJob
    exit 1
}

Write-Host "Backend ready."

if ($BackendOnly) {
    return
}

$WebRoot = Join-Path $ScriptRoot "web_sota"
Write-Host "Starting frontend on port $FrontendPort ..."
$FrontendProcess = Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx vite --port $FrontendPort --host" -WorkingDirectory $WebRoot -PassThru

if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:${FrontendPort}"
}

while ($true) {
    if ($BackendJob.State -eq "Completed" -or $BackendJob.State -eq "Failed") {
        Receive-Job $BackendJob
        break
    }
    Start-Sleep -Seconds 2
}
