#!/usr/bin/env node

import { Command } from 'commander';
import { listCommand } from './commands/list';
import { watchCommand } from './commands/watch';
import { killCommand } from './commands/kill';
import { showCommand } from './commands/show';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('portwatch')
  .description('macOS port monitoring tool')
  .version('1.0.0');

// Register commands
program.addCommand(listCommand);
program.addCommand(watchCommand);
program.addCommand(killCommand);
program.addCommand(showCommand);
program.addCommand(configCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
