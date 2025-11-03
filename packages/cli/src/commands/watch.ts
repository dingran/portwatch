import { Command } from 'commander';
import { scanPortsEnriched, FilterOptions, loadConfig } from '@portwatch/core';
import { formatPortTable, formatError } from '../utils/formatter';

export const watchCommand = new Command('watch')
  .description('Watch ports with auto-refresh')
  .option('-p, --port <port>', 'Filter by port number', parseInt)
  .option('--pid <pid>', 'Filter by process ID', parseInt)
  .option('-n, --name <name>', 'Filter by process name')
  .option('-d, --dir <directory>', 'Filter by working directory')
  .option('-i, --interval <seconds>', 'Refresh interval in seconds (default: 5)', parseInt, 5)
  .action(async (options) => {
    // Build filter options
    const filters: FilterOptions = {};
    if (options.port) filters.port = options.port;
    if (options.pid) filters.pid = options.pid;
    if (options.name) filters.processName = options.name;
    if (options.dir) filters.workingDirectory = options.dir;

    const intervalMs = options.interval * 1000;

    // Load user config
    const config = await loadConfig();

    // Function to refresh and display ports
    const refresh = async () => {
      try {
        // Clear screen
        console.clear();

        // Show header
        console.log('PortWatch - Live Mode (Press Ctrl+C to exit)');
        console.log(`Refreshing every ${options.interval}s\n`);

        // Scan ports
        const ports = await scanPortsEnriched(filters);

        // Display results
        console.log(formatPortTable(ports, config.display));
      } catch (error: any) {
        console.error(formatError(error.message));
      }
    };

    // Initial refresh
    await refresh();

    // Set up interval
    setInterval(refresh, intervalMs);
  });
