set windows-shell := ["pwsh.exe", "-NoLogo", "-Command"]

default:
    @pwsh.exe -NoProfile -ExecutionPolicy Bypass -File ../mcp-central-docs/scripts/just-dashboard.ps1 -Path .

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
    uv sync --extra dev
    uv run pytest tests -v

# Sync deps (backend)
install:
    uv sync

# Install frontend deps
install-web:
    cd web_sota && npm install

# Launch full webapp (backend + frontend, opens browser)
web start:
    .\web_sota\start.ps1

# Clean build artifacts
clean:
    powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue dist, build, .ruff_cache, .pytest_cache, web_sota/node_modules, web_sota/dist; Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue; Write-Host 'Cleaned.'"

# Backend health check
health:
    curl -s http://127.0.0.1:11010/health
