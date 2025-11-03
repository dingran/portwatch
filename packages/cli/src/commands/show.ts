import { Command } from 'commander';
import ora from 'ora';
import { getPortInfo, enrichPortInfo } from '@portwatch/core';
import { formatPortDetails, formatError, formatWarning, formatJson } from '../utils/formatter';

export const showCommand = new Command('show')
  .description('Show detailed information about a specific port')
  .argument('<port>', 'Port number to inspect', parseInt)
  .option('-j, --json', 'Output as JSON')
  .action(async (port: number, options) => {
    const spinner = ora('Fetching port information...').start();

    try {
      // Get port info
      const portInfo = await getPortInfo(port);

      if (!portInfo) {
        spinner.stop();
        console.log(formatWarning(`No process found on port ${port}`));
        process.exit(0);
      }

      // Enrich with working directory and command
      const enriched = await enrichPortInfo(portInfo);

      spinner.stop();

      // Output results
      if (options.json) {
        console.log(formatJson(enriched));
      } else {
        console.log(formatPortDetails(enriched));
      }

      process.exit(0);
    } catch (error: any) {
      spinner.stop();
      console.error(formatError(error.message));
      process.exit(1);
    }
  });
