param([switch]$Headless, [switch]$BackendOnly, [switch]$NoBrowser)
$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent $PSCommandPath
$FrontendPort = 11011
$BackendPort = 11010

# Clear port zombies
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "Starting frontend on port $FrontendPort ..."

Start-Process -NoNewWindow -FilePath "cmd.exe" -ArgumentList "/c npx vite --port $FrontendPort --host" -WorkingDirectory $ScriptRoot

if (-not $NoBrowser) {
    $Ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $null = Invoke-WebRequest -Uri "http://127.0.0.1:${FrontendPort}" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            $Ready = $true
            break
        } catch {}
        Start-Sleep -Seconds 1
    }
    if ($Ready) {
        Start-Process "http://127.0.0.1:${FrontendPort}"
    }
}
