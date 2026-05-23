$FrontendPort = 11011

Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Start-Sleep -Milliseconds 500

Set-Location "$PSScriptRoot"

# Poll for Vite readiness then open browser
$Job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev 2>&1
}

$Timeout = 30
for ($i = 0; $i -lt $Timeout; $i++) {
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:${using:FrontendPort}" -UseBasicParsing -TimeoutSec 2
        Start-Process "http://127.0.0.1:${using:FrontendPort}"
        break
    } catch {}
    Start-Sleep -Seconds 1
}

Wait-Job $Job
