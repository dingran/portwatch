import { Command } from 'commander';
import { loadConfig, saveConfig, resetConfig, getConfigPath } from '@portwatch/core';
import { formatSuccess, formatError, formatInfo, formatJson } from '../utils/formatter';

export const configCommand = new Command('config')
  .description('Manage configuration')
  .addCommand(
    new Command('show')
      .description('Show current configuration')
      .action(async () => {
        try {
          const config = await loadConfig();
          console.log(formatJson(config));
        } catch (error: any) {
          console.error(formatError(error.message));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('path')
      .description('Show configuration file path')
      .action(() => {
        console.log(formatInfo(`Config file: ${getConfigPath()}`));
      })
  )
  .addCommand(
    new Command('reset')
      .description('Reset configuration to defaults')
      .action(async () => {
        try {
          await resetConfig();
          console.log(formatSuccess('Configuration reset to defaults'));
        } catch (error: any) {
          console.error(formatError(error.message));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'Configuration key (e.g., display.showCommand, refresh.intervalMs)')
      .argument('<value>', 'Value to set')
      .action(async (key: string, value: string) => {
        try {
          const config = await loadConfig();

          // Parse key path
          const parts = key.split('.');

          if (parts.length !== 2) {
            console.error(formatError('Key must be in format: section.property (e.g., display.showCommand)'));
            process.exit(1);
          }

          const [section, property] = parts;

          // Validate section
          if (section !== 'display' && section !== 'refresh') {
            console.error(formatError('Section must be "display" or "refresh"'));
            process.exit(1);
          }

          // Parse value
          let parsedValue: any = value;
          if (value === 'true') parsedValue = true;
          else if (value === 'false') parsedValue = false;
          else if (!isNaN(Number(value))) parsedValue = Number(value);

          // Update config
          if (section === 'display') {
            (config.display as any)[property] = parsedValue;
          } else if (section === 'refresh') {
            (config.refresh as any)[property] = parsedValue;
          }

          // Save config
          await saveConfig(config);
          console.log(formatSuccess(`Set ${key} = ${parsedValue}`));
        } catch (error: any) {
          console.error(formatError(error.message));
          process.exit(1);
        }
      })
  );
