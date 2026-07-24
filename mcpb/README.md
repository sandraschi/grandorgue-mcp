# grandorgue-mcp (MCPB Bundle)

GrandOrgue pipe organ simulator MCP server — MIDI bridge, organ control, sample set management, modern web console

## Usage

Add to \claude_desktop_config.json\:
\\\json
{
  "mcpServers": {
    "grandorgue-mcp": {
      "command": "uv",
      "args": ["run", "--directory", "\D:\Dev\repos", "python", "-m", "grandorgue_mcp"],
      "env": { "PYTHONPATH": "\D:\Dev\repos/src" }
    }
  }
}
\\\

## Tools

- **go_status**: go_status

## Requirements

- Python 3.12+
- uv
