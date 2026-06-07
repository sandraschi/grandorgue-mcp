param([switch]$Headless, [switch]$BackendOnly, [switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$BackendPort = 11010
$FrontendPort = 11011

# Clear port zombies
Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

# Start backend via Start-Job with proper working directory
$BackendJob = Start-Job -Name "grandorgue-backend" -ScriptBlock {
    param($Root, $Port)
    Set-Location $Root
    uv run grandorgue-mcp
} -ArgumentList $ScriptRoot, $BackendPort

Write-Host "Starting GrandOrgue MCP backend on port $BackendPort ..."

# Readiness poll
$Ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:${BackendPort}/health" -UseBasicParsing -TimeoutSec 2
        if ($Response.StatusCode -eq 200) { $Ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
if (-not $Ready) {
    Write-Host "ERROR: Backend failed to start within 60s"
    Receive-Job $BackendJob
    exit 1
}
Write-Host "Backend ready."

if ($BackendOnly) { return }

# Start frontend via Start-Process with -WorkingDirectory
$WebRoot = Join-Path $ScriptRoot "web_sota"
Write-Host "Starting frontend on port $FrontendPort ..."
$FrontendProcess = Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx vite --port $FrontendPort --host" -WorkingDirectory $WebRoot -PassThru

# Auto-open browser
if (-not $NoBrowser) {
    Start-Process "http://127.0.0.1:${FrontendPort}"
}

# Keep-alive
while ($true) {
    if ($BackendJob.State -eq "Completed" -or $BackendJob.State -eq "Failed") {
        Receive-Job $BackendJob
        break
    }
    Start-Sleep -Seconds 2
}
