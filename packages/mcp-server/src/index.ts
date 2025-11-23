#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import {
  scanPortsEnriched,
  getPortInfo,
  enrichPortInfo,
} from '@portwatch/core';
import {
  killProcessByPort,
  killProcessByPid,
} from '@portwatch/core';

const server = new Server(
  {
    name: 'portwatch-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'scan_ports',
    description: 'Scan for processes listening on ports. Returns port number, PID, process name, working directory, and full command for each listening process. Supports optional filtering by port, port range, PID, process name, or working directory.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'Filter by exact port number (0-65535)',
        },
        portRangeMin: {
          type: 'number',
          description: 'Filter by minimum port in range (use with portRangeMax)',
        },
        portRangeMax: {
          type: 'number',
          description: 'Filter by maximum port in range (use with portRangeMin)',
        },
        pid: {
          type: 'number',
          description: 'Filter by process ID',
        },
        processName: {
          type: 'string',
          description: 'Filter by process name (substring match, case-insensitive)',
        },
        processPrefix: {
          type: 'string',
          description: 'Filter by process name prefix (starts with, case-insensitive)',
        },
        workingDirectory: {
          type: 'string',
          description: 'Filter by working directory (substring match, case-insensitive)',
        },
      },
    },
  },
  {
    name: 'get_port_info',
    description: 'Get detailed information about a specific port. Returns the process listening on that port, including PID, process name, working directory, and full command.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'Port number to query (0-65535)',
        },
      },
      required: ['port'],
    },
  },
  {
    name: 'kill_by_port',
    description: 'Kill the process listening on a specific port. Returns success status and details about the killed process.',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          description: 'Port number of the process to kill (0-65535)',
        },
        force: {
          type: 'boolean',
          description: 'Use SIGKILL (true) instead of SIGTERM (false). Force kill cannot be ignored by the process. Default: false',
          default: false,
        },
      },
      required: ['port'],
    },
  },
  {
    name: 'kill_by_pid',
    description: 'Kill a process by its PID. Returns success status and details about the operation.',
    inputSchema: {
      type: 'object',
      properties: {
        pid: {
          type: 'number',
          description: 'Process ID to kill',
        },
        force: {
          type: 'boolean',
          description: 'Use SIGKILL (true) instead of SIGTERM (false). Force kill cannot be ignored by the process. Default: false',
          default: false,
        },
      },
      required: ['pid'],
    },
  },
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'scan_ports': {
        const filters: any = {};

        if (args?.port !== undefined) {
          filters.port = args.port as number;
        }

        if (args?.portRangeMin !== undefined && args?.portRangeMax !== undefined) {
          if (typeof args.portRangeMin !== 'number' || typeof args.portRangeMax !== 'number') {
            throw new Error('portRangeMin and portRangeMax must be numbers');
          }
          if (args.portRangeMin < 0 || args.portRangeMax > 65535 || args.portRangeMin > args.portRangeMax) {
            throw new Error('Invalid port range; ensure 0 <= min <= max <= 65535');
          }
          filters.portRange = {
            min: args.portRangeMin as number,
            max: args.portRangeMax as number,
          };
        }

        if (args?.pid !== undefined) {
          filters.pid = args.pid as number;
        }

        if (args?.processName !== undefined) {
          filters.processName = args.processName as string;
        }

        if (args?.processPrefix !== undefined) {
          filters.processPrefix = args.processPrefix as string;
        }

        if (args?.workingDirectory !== undefined) {
          filters.workingDirectory = args.workingDirectory as string;
        }

        const ports = await scanPortsEnriched(Object.keys(filters).length > 0 ? filters : undefined);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(ports, null, 2),
            },
          ],
        };
      }

      case 'get_port_info': {
        if (args?.port === undefined || args?.port === null) {
          throw new Error('Port parameter is required');
        }

        const portInfo = await getPortInfo(args.port as number);

        if (!portInfo) {
          return {
            content: [
              {
                type: 'text',
                text: `No process found listening on port ${args.port}`,
              },
            ],
          };
        }

        const enriched = await enrichPortInfo(portInfo);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(enriched, null, 2),
            },
          ],
        };
      }

      case 'kill_by_port': {
        if (args?.port === undefined || args?.port === null) {
          throw new Error('Port parameter is required');
        }

        const force = args.force === true;
        const result = await killProcessByPort(args.port as number, force);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'kill_by_pid': {
        if (args?.pid === undefined || args?.pid === null) {
          throw new Error('PID parameter is required');
        }

        const force = args.force === true;
        const result = await killProcessByPid(args.pid as number, force);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('PortWatch MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
