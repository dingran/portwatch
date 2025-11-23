import { Command } from 'commander';
import ora from 'ora';
import { killProcessByPort, killProcessByPid } from '@portwatch/core';
import { formatSuccess, formatError, formatWarning } from '../utils/formatter';

export const killCommand = new Command('kill')
  .description('Kill a process by port or PID')
  .argument('<target>', 'Port number or PID to kill')
  .option('-f, --force', 'Force kill (SIGKILL instead of SIGTERM)')
  .option('--port', 'Treat target as port number')
  .option('--pid', 'Treat target as PID')
  .action(async (target: string, options) => {
    const targetNum = parseInt(target, 10);

    if (isNaN(targetNum)) {
      console.error(formatError('Target must be a number'));
      process.exit(1);
    }

    const spinner = ora('Killing process...').start();

    try {
      let result;

      // Determine if target is port or PID
      if (options.port) {
        result = await killProcessByPort(targetNum, options.force);
      } else if (options.pid) {
        result = await killProcessByPid(targetNum, options.force);
      } else {
        // Auto-detect: try port first (valid port range), then fall back to PID
        const inPortRange = targetNum >= 0 && targetNum <= 65535;

        if (inPortRange) {
          spinner.text = 'Trying port...';
          result = await killProcessByPort(targetNum, options.force);

          if (!result.success && result.message.includes('No process found on port')) {
            spinner.text = 'No listener found, trying PID...';
            result = await killProcessByPid(targetNum, options.force);
          }
        } else {
          spinner.text = 'Treating as PID...';
          result = await killProcessByPid(targetNum, options.force);
        }
      }

      spinner.stop();

      if (result.success) {
        console.log(formatSuccess(result.message));
        process.exit(0);
      } else {
        console.error(formatError(result.message));
        process.exit(1);
      }
    } catch (error: any) {
      spinner.stop();
      console.error(formatError(error.message));
      process.exit(1);
    }
  });
