# PortWatch MCP Server

MCP (Model Context Protocol) server for PortWatch - allows Claude and other AI assistants to query port and process information on your macOS system.

## Installation

From the PortWatch monorepo root:

```bash
npm install
npm run build
```

Or install globally:

```bash
cd packages/mcp-server
npm install -g .
```

## Setup with Claude Desktop

Add the PortWatch MCP server to your Claude Desktop configuration.

**Quick setup:**

```bash
# Run this script to get the exact config for your system
./get-config.sh
```

Then copy the output and add it to:
`~/Library/Application Support/Claude/claude_desktop_config.json`

**Manual setup:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "portwatch": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/portwatch/packages/mcp-server/dist/index.js"
      ]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/portwatch` with the actual path to your PortWatch repository.

After updating the config, restart Claude Desktop.

## Available Tools

### 1. `scan_ports`
Scan for processes listening on ports with optional filtering.

**Parameters:**
- `port` (number, optional): Filter by exact port number
- `portRangeMin` (number, optional): Minimum port in range
- `portRangeMax` (number, optional): Maximum port in range
- `pid` (number, optional): Filter by process ID
- `processName` (string, optional): Filter by process name (substring match)
- `processPrefix` (string, optional): Filter by process name prefix
- `workingDirectory` (string, optional): Filter by working directory

**Example usage with Claude:**
- "What processes are running on ports 3000-3100?"
- "Show me all Node.js processes listening on ports"
- "What's running on port 5432?"

### 2. `get_port_info`
Get detailed information about a specific port.

**Parameters:**
- `port` (number, required): Port number to query

**Example usage with Claude:**
- "What process is on port 8080?"
- "Give me details about port 3000"

### 3. `kill_by_port`
Kill the process listening on a specific port.

**Parameters:**
- `port` (number, required): Port number of process to kill
- `force` (boolean, optional): Use SIGKILL instead of SIGTERM (default: false)

**Example usage with Claude:**
- "Kill the process on port 3000"
- "Force kill whatever is on port 8080"

### 4. `kill_by_pid`
Kill a process by its PID.

**Parameters:**
- `pid` (number, required): Process ID to kill
- `force` (boolean, optional): Use SIGKILL instead of SIGTERM (default: false)

**Example usage with Claude:**
- "Kill process 12345"
- "Force kill PID 67890"

## Response Format

All tools return JSON data. Example response from `scan_ports`:

```json
[
  {
    "port": 3000,
    "pid": 12345,
    "processName": "node",
    "address": "0.0.0.0",
    "protocol": "TCP",
    "workingDirectory": "/Users/username/project",
    "command": "node server.js"
  }
]
```

## Development

Build the server:
```bash
npm run build
```

Watch mode for development:
```bash
npm run dev
```

Test the server manually:
```bash
npm start
```

## Requirements

- macOS (uses `lsof` command)
- Node.js 20+
- MCP-compatible client (e.g., Claude Desktop)

## Security Note

This MCP server has access to:
- View all processes listening on ports
- Kill processes on your system

Only use this with trusted MCP clients. The server runs with your user permissions.
