$Root = Split-Path -Parent $PSScriptRoot
$RepoName = "grandorgue-mcp"
$PackageName = "grandorgue_mcp"
$BackendPath = "$PSScriptRoot\binaries"
$TargetTriple = "x86_64-pc-windows-msvc"

Write-Host "=== GrandOrgue MCP Tauri Build ===" -ForegroundColor Cyan

# Step 1: Build React frontend
Write-Host "`n[1/4] Building React frontend..." -ForegroundColor Yellow
Push-Location "$Root\web_sota"
npm install
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "Frontend build failed!" -ForegroundColor Red; exit 1 }
Write-Host "  Frontend built." -ForegroundColor Green
Pop-Location

# Step 2: Build Python backend as standalone .exe
Write-Host "`n[2/4] Bundling Python backend (PyInstaller)..." -ForegroundColor Yellow
Push-Location "$Root"
& "C:\Users\sandr\.local\bin\uv.exe" run pyinstaller `
    --onedir -y --clean `
    --name "${RepoName}-backend" `
    --add-data "src/${PackageName};${PackageName}" `
    --copy-metadata fastmcp --copy-metadata fastapi `
    --hidden-import uvicorn.logging `
    run_server.py
if ($LASTEXITCODE -ne 0) { Write-Host "PyInstaller failed!" -ForegroundColor Red; exit 1 }
Write-Host "  Backend bundled." -ForegroundColor Green
Pop-Location

# Step 3: Copy sidecar binary for Tauri
Write-Host "`n[3/4] Copying sidecar..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $BackendPath | Out-Null
Copy-Item "$Root\dist\${RepoName}-backend\${RepoName}-backend.exe" `
    "$BackendPath\${RepoName}-backend-${TargetTriple}.exe" -Force
Write-Host "  Sidecar copied." -ForegroundColor Green

# Step 4: Build Tauri bundle
Write-Host "`n[4/4] Building Tauri bundle..." -ForegroundColor Yellow
Push-Location $PSScriptRoot
npx @tauri-apps/cli build
if ($LASTEXITCODE -ne 0) { Write-Host "Tauri build failed!" -ForegroundColor Red; exit 1 }
Write-Host "  Tauri bundle built." -ForegroundColor Green
Pop-Location

Write-Host "`n=== Build complete ===" -ForegroundColor Cyan
Write-Host "Installer: native\target\release\bundle\nsis\GrandOrgue MCP_0.1.0_x64-setup.exe" -ForegroundColor Green
