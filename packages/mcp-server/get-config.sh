#!/bin/bash

# Get the absolute path to the MCP server
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MCP_PATH="${SCRIPT_DIR}/dist/index.js"

echo "Add this to your Claude Desktop config:"
echo "~/Library/Application Support/Claude/claude_desktop_config.json"
echo ""
echo "{"
echo "  \"mcpServers\": {"
echo "    \"portwatch\": {"
echo "      \"command\": \"node\","
echo "      \"args\": ["
echo "        \"${MCP_PATH}\""
echo "      ]"
echo "    }"
echo "  }"
echo "}"
