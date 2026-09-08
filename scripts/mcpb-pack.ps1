# Local MCPB pack entry for grandorgue-mcp.
# Delegates to the fleet canonical pack script, which wipes + re-scaffolds
# mcpb/ (fresh-stages src/<package>/ -> mcpb/src/<package>/, copies the icon
# from native/icons/icon.png) before packing. Never put files directly in
# mcpb/ and expect them to survive — only mcpb/assets/prompts/* are preserved.
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\Dev\repos\mcp-central-docs\scripts\make-mcpb.ps1" -RepoPath $repoRoot
