import { Command } from 'commander';
import ora from 'ora';
import { scanPortsEnriched, FilterOptions, loadConfig } from '@portwatch/core';
import { formatPortTable, formatError, formatJson } from '../utils/formatter';

export const listCommand = new Command('list')
  .alias('ls')
  .description('List all processes listening on ports')
  .option('-p, --port <port>', 'Filter by port number', parseInt)
  .option('-r, --port-range <range>', 'Filter by port range (e.g., 3000-3100)')
  .option('--pid <pid>', 'Filter by process ID', parseInt)
  .option('-n, --name <name>', 'Filter by process name (substring match)')
  .option('--prefix <prefix>', 'Filter by process name prefix')
  .option('-d, --dir <directory>', 'Filter by working directory')
  .option('-j, --json', 'Output as JSON')
  .option('--no-enriched', 'Skip fetching working directory and command (faster)')
  .action(async (options) => {
    const spinner = ora('Scanning ports...').start();

    try {
      // Build filter options
      const filters: FilterOptions = {};
      if (options.port) filters.port = options.port;
      if (options.portRange) {
        const [min, max] = options.portRange.split('-').map((s: string) => parseInt(s.trim(), 10));
        if (isNaN(min) || isNaN(max) || min > max) {
          spinner.stop();
          console.error(formatError('Invalid port range. Use format: 3000-3100'));
          process.exit(1);
        }
        filters.portRange = { min, max };
      }
      if (options.pid) filters.pid = options.pid;
      if (options.name) filters.processName = options.name;
      if (options.prefix) filters.processPrefix = options.prefix;
      if (options.dir) filters.workingDirectory = options.dir;

      // Scan ports
      const ports = await scanPortsEnriched(filters);

      spinner.stop();

      // Output results
      if (options.json) {
        console.log(formatJson(ports));
      } else {
        // Load user config for display preferences
        const config = await loadConfig();
        console.log(formatPortTable(ports, config.display));
      }

      process.exit(0);
    } catch (error: any) {
      spinner.stop();
      console.error(formatError(error.message));
      process.exit(1);
    }
  });
