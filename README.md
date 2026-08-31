# PortWatch

> macOS port monitoring tool - CLI and menu bar app

PortWatch helps you quickly see which processes are running on which ports on your Mac, with both a powerful CLI tool and a convenient menu bar app.

## Features

### CLI Tool
- 📋 **List ports** - See all processes listening on ports
- 👁️ **Watch mode** - Auto-refresh port list
- 🔍 **Filter** - Search by port, PID, process name, or directory
- ⚡ **Kill processes** - Terminate processes by port or PID
- 🔧 **Configurable** - Customize display fields and refresh intervals
- 📤 **JSON output** - Perfect for scripting

### Menu Bar App
- 🖥️ **Always accessible** - Lives in your menu bar
- 🔄 **Auto-refresh** - Updates every 5 seconds
- 🔍 **Quick search** - Filter ports instantly
- ⚡ **One-click kill** - Stop processes with a click
- 🎨 **Native UI** - Clean, macOS-style interface

### MCP Server
- 🤖 **Claude integration** - Use with Claude Desktop or other MCP clients
- 🔍 **Query ports** - Ask Claude about running processes
- 📊 **Filter results** - Search by port, PID, process name, etc.
- ⚡ **Control processes** - Kill processes through Claude

## Installation

### CLI Tool

```bash
# Install via npm (coming soon)
npm install -g @portwatch/cli

# Or use npx
npx @portwatch/cli list
```

### Menu Bar App

**Download from GitHub Releases:**

1. Visit [Releases](https://github.com/dingran/portwatch/releases)
2. Download the appropriate file for your Mac:
   - **Apple Silicon (M1/M2/M3)**: `PortWatch-1.0.0-arm64.dmg`
   - **Intel**: `PortWatch-1.0.0.dmg`
3. Open the DMG and drag PortWatch to Applications
4. **First launch**: Right-click the app → Open (due to unsigned app warning)

**Via Homebrew:**

If PortWatch lands in the [official Homebrew Cask](https://github.com/Homebrew/homebrew-cask) repo, you can install it with:

```bash
brew install --cask portwatch
```

Until then, you can install from a tap. See [`homebrew/README.md`](homebrew/README.md) for the current status and setup steps.

**Note**: The app is not notarized, so macOS will show a security warning on first launch. See [RELEASE.md](RELEASE.md) for details.

### MCP Server

The MCP server allows Claude and other AI assistants to query port and process information.

**Setup with Claude Code:**

1. Build the MCP server:
   ```bash
   git clone https://github.com/dingran/portwatch.git
   cd portwatch
   npm install
   npm run build
   ```

2. Add the MCP server:
   ```bash
   cd packages/mcp-server
   claude mcp add portwatch node $(pwd)/dist/index.js
   ```

3. Verify it's connected:
   ```bash
   claude mcp list
   ```

4. Start a new conversation with Claude Code and ask things like:
   - "What processes are running on ports 3000-3100?"
   - "What's on port 5432?"
   - "Kill the process on port 8080"

**Setup with Claude Desktop:**

1. Build the MCP server (same as above)

2. Get your config:
   ```bash
   cd packages/mcp-server
   ./get-config.sh
   ```

3. Add the output to `~/Library/Application Support/Claude/claude_desktop_config.json`

4. Restart Claude Desktop

See [packages/mcp-server/README.md](packages/mcp-server/README.md) for detailed usage and available tools.

## Usage

### CLI Examples

```bash
# List all ports
portwatch list

# Watch ports with auto-refresh
portwatch watch

# Filter by port number
portwatch list --port 3000

# Filter by process name
portwatch list --name node

# Show detailed info for a specific port
portwatch show 3000

# Kill a process on a port
portwatch kill 3000

# Kill a process by PID
portwatch kill --pid 12345

# Force kill
portwatch kill 3000 --force

# Output as JSON
portwatch list --json

# Configure display
portwatch config set display.showCommand true
portwatch config show
```

## Project Structure

```
portwatch/
├── packages/
│   ├── core/           # Shared library
│   ├── cli/            # CLI tool
│   ├── app/            # Electron menu bar app
│   └── mcp-server/     # MCP server for Claude
├── package.json        # Workspace root
└── README.md
```

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- macOS (for menu bar app)

### Setup

```bash
# Clone the repository
git clone https://github.com/dingran/portwatch.git
cd portwatch

# Install dependencies
npm install

# Build all packages
npm run build
```

### CLI Development

```bash
# Watch mode
cd packages/cli
npm run dev

# Test locally
node dist/index.js list
```

### App Development

```bash
# Start development server
cd packages/app
npm run dev
```

### Core Library

```bash
# Build
cd packages/core
npm run build

# Watch mode
npm run dev
```

## Architecture

### Core Library (`@portwatch/core`)

The core library provides shared functionality:
- **Port Scanner** - Wraps `lsof` to scan ports
- **Process Manager** - Kill processes safely
- **Config Manager** - Save/load user preferences
- **Types** - Shared TypeScript types with Zod validation

### CLI Tool (`@portwatch/cli`)

Built with:
- Commander.js - Command framework
- chalk - Terminal colors
- cli-table3 - Formatted tables
- ora - Loading spinners

### Menu Bar App (`@portwatch/app`)

Built with:
- Electron - Native app framework
- menubar - Menu bar integration
- React - UI framework
- Tailwind CSS - Styling
- Vite - Build tool

## Security

The Electron app follows security best practices:
- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ Sandboxed renderer
- ✅ IPC via contextBridge
- ✅ Input validation

## Configuration

User preferences are stored in `~/.portwatch/config.json`:

```json
{
  "display": {
    "showPort": true,
    "showPid": true,
    "showProcessName": true,
    "showWorkingDirectory": true,
    "showCommand": false,
    "showAddress": false,
    "showProtocol": false
  },
  "refresh": {
    "enabled": true,
    "intervalMs": 5000
  }
}
```

## TODO

- [x] Create proper menu bar icon
- [x] Add electron-builder configuration
- [x] Test Electron app build
- [x] Create GitHub release (v1.1.0, see [RELEASE.md](RELEASE.md))
- [ ] Create Homebrew tap repo (template ready in [`homebrew/Casks/portwatch.rb`](homebrew/Casks/portwatch.rb), see [`homebrew/README.md`](homebrew/README.md))
- [ ] Publish CLI to npm
- [ ] Add tests
- [ ] CI/CD with GitHub Actions
- [ ] Better error handling
- [ ] Add app settings UI
- [ ] Support more platforms (Linux, Windows)
- [ ] Code signing & notarization (requires Apple Developer account)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © dingran

## Acknowledgments

Built with [Claude Code](https://claude.com/claude-code)
