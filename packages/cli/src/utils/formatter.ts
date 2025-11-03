import chalk from 'chalk';
import Table from 'cli-table3';
import { PortInfo, DisplayConfig } from '@portwatch/core';

/**
 * Formats port information as a table
 */
export function formatPortTable(ports: PortInfo[], config?: DisplayConfig): string {
  if (ports.length === 0) {
    return chalk.yellow('No processes listening on ports found.');
  }

  // Determine which columns to show
  const showPort = config?.showPort !== false;
  const showPid = config?.showPid !== false;
  const showProcessName = config?.showProcessName !== false;
  const showWorkingDirectory = config?.showWorkingDirectory !== false;
  const showCommand = config?.showCommand === true;
  const showAddress = config?.showAddress === true;
  const showProtocol = config?.showProtocol === true;

  // Build table headers
  const headers: string[] = [];
  if (showPort) headers.push(chalk.bold('PORT'));
  if (showPid) headers.push(chalk.bold('PID'));
  if (showProcessName) headers.push(chalk.bold('PROCESS'));
  if (showWorkingDirectory) headers.push(chalk.bold('DIRECTORY'));
  if (showCommand) headers.push(chalk.bold('COMMAND'));
  if (showAddress) headers.push(chalk.bold('ADDRESS'));
  if (showProtocol) headers.push(chalk.bold('PROTOCOL'));

  // Create table
  const table = new Table({
    head: headers,
    style: {
      head: ['cyan'],
    },
    wordWrap: true,
    wrapOnWordBoundary: true,
    colWidths: showCommand ? undefined : [8, 8, 15, 40],
  });

  // Add rows
  for (const port of ports) {
    const row: string[] = [];
    if (showPort) row.push(chalk.green(port.port.toString()));
    if (showPid) row.push(port.pid.toString());
    if (showProcessName) row.push(chalk.blue(port.processName));
    if (showWorkingDirectory) {
      const dir = port.workingDirectory.replace(process.env.HOME || '', '~');
      row.push(chalk.gray(dir));
    }
    if (showCommand) row.push(chalk.gray(truncate(port.command, 50)));
    if (showAddress) row.push(port.address);
    if (showProtocol) row.push(port.protocol);

    table.push(row);
  }

  return table.toString();
}

/**
 * Formats a single port info as detailed output
 */
export function formatPortDetails(port: PortInfo): string {
  const lines = [
    chalk.bold.cyan('Port Details:'),
    '',
    `${chalk.bold('Port:')}              ${chalk.green(port.port.toString())}`,
    `${chalk.bold('PID:')}               ${port.pid}`,
    `${chalk.bold('Process Name:')}     ${chalk.blue(port.processName)}`,
    `${chalk.bold('Working Directory:')} ${chalk.gray(port.workingDirectory)}`,
    `${chalk.bold('Command:')}          ${chalk.gray(port.command)}`,
    `${chalk.bold('Address:')}          ${port.address}`,
    `${chalk.bold('Protocol:')}         ${port.protocol}`,
  ];

  return lines.join('\n');
}

/**
 * Formats a success message
 */
export function formatSuccess(message: string): string {
  return chalk.green('✓ ') + message;
}

/**
 * Formats an error message
 */
export function formatError(message: string): string {
  return chalk.red('✗ ') + message;
}

/**
 * Formats a warning message
 */
export function formatWarning(message: string): string {
  return chalk.yellow('⚠ ') + message;
}

/**
 * Formats an info message
 */
export function formatInfo(message: string): string {
  return chalk.blue('ℹ ') + message;
}

/**
 * Truncates a string to a maximum length
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Formats JSON output
 */
export function formatJson(data: any): string {
  return JSON.stringify(data, null, 2);
}
