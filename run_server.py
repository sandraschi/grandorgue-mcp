"""Entry point for PyInstaller-bundled GrandOrgue MCP server."""
import sys
sys.path.insert(0, ".")

from grandorgue_mcp.server import main
main()
