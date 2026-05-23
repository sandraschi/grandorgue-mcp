$BackendPort = 11010
$FrontendPort = 11011

# Clear port zombies
Get-NetTCPConnection -LocalPort $BackendPort -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Milliseconds 500

# Start backend
$BackendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & "C:\Users\sandr\.local\bin\uv.exe" run grandorgue-mcp 2>&1
}

Write-Host "Starting GrandOrgue MCP backend on port $BackendPort ..."

# Wait for backend health
$Timeout = 30
$Ready = $false
for ($i = 0; $i -lt $Timeout; $i++) {
    try {
        $Response = Invoke-WebRequest -Uri "http://127.0.0.1:${BackendPort}/health" -UseBasicParsing -TimeoutSec 2
        if ($Response.StatusCode -eq 200) { $Ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
if (-not $Ready) {
    Write-Host "ERROR: Backend failed to start within ${Timeout}s"
    Receive-Job $BackendJob
    exit 1
}
Write-Host "Backend ready."

Write-Host "Starting frontend on port $FrontendPort ..."
Start-Process -FilePath "http://127.0.0.1:${FrontendPort}"

Set-Location "$PSScriptRoot\web_sota"
npm run dev
