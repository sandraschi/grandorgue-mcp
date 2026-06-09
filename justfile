set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

default:
    @just --list

# Run backend only (port 11010)
run server:
    uv run grandorgue-mcp

# Lint and format Python
lint check:
    uv run ruff check .
    uv run ruff format --check .

format fmt:
    uv run ruff check .
    uv run ruff format .

# Run tests
test:
    uv sync --all-extras
    uv run pytest tests -v

# CI pipeline (lint + test)
ci:
    uv run ruff check src/ tests/
    uv run pytest tests -q

# Sync deps (backend)
install:
    uv sync

# Install frontend deps
install-web:
    cd web_sota && npm install

# Launch full webapp (backend + frontend, opens browser)
web start:
    .\start.ps1

# Generate Tauri app icons
icons:
    uv run python scripts/generate_icons.py

# Build Tauri native desktop app (full release pipeline)
build-native:
    Set-Location '{{justfile_directory()}}\native'
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    .\build.ps1

# Build Tauri native app (debug, skip PyInstaller)
build-native-debug:
    Set-Location '{{justfile_directory()}}\native'
    $env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
    npx @tauri-apps/cli build --debug

# Clean build artifacts
clean:
    powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, build, .ruff_cache, .pytest_cache, web_sota/node_modules, web_sota/dist; Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Cleaned.'"

# Backend health check
health:
    curl.exe -s http://127.0.0.1:11010/health

