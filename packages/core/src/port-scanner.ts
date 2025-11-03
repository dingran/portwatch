import { exec } from 'child_process';
import { promisify } from 'util';
import { PortInfo, FilterOptions, PortInfoSchema } from './types';

const execAsync = promisify(exec);

/**
 * Scans for all processes listening on ports
 */
export async function scanPorts(filters?: FilterOptions): Promise<PortInfo[]> {
  try {
    // Build lsof command to get listening processes
    const { stdout } = await execAsync('lsof -i -P -n | grep LISTEN');

    const lines = stdout.trim().split('\n');
    const portInfos: PortInfo[] = [];

    for (const line of lines) {
      const portInfo = parseLsofLine(line);
      if (portInfo && matchesFilters(portInfo, filters)) {
        portInfos.push(portInfo);
      }
    }

    return portInfos;
  } catch (error: any) {
    // If no processes are listening, lsof returns exit code 1
    if (error.code === 1 && !error.stdout) {
      return [];
    }
    throw new Error(`Failed to scan ports: ${error.message}`);
  }
}

/**
 * Gets information about a specific port
 */
export async function getPortInfo(port: number): Promise<PortInfo | null> {
  const ports = await scanPorts({ port });
  return ports[0] || null;
}

/**
 * Gets the working directory for a process
 */
async function getWorkingDirectory(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`lsof -p ${pid} 2>/dev/null | grep cwd | head -1`);
    const parts = stdout.trim().split(/\s+/);
    return parts[parts.length - 1] || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Gets the full command for a process
 */
async function getFullCommand(pid: number): Promise<string> {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o command=`);
    return stdout.trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Parses a single line from lsof output
 */
function parseLsofLine(line: string): PortInfo | null {
  // Example line: node    72218  user  21u  IPv6 0x1234  0t0  TCP *:5174 (LISTEN)
  const parts = line.trim().split(/\s+/);

  if (parts.length < 9) {
    return null;
  }

  const processName = parts[0];
  const pid = parseInt(parts[1], 10);
  const protocol = parts[7]; // TCP or UDP
  const addressPort = parts[8];

  // Parse address and port
  const match = addressPort.match(/(.+):(\d+)/);
  if (!match) {
    return null;
  }

  const address = match[1] === '*' ? '0.0.0.0' : match[1];
  const port = parseInt(match[2], 10);

  if (isNaN(pid) || isNaN(port)) {
    return null;
  }

  // Return basic info; we'll enrich it later
  return {
    port,
    pid,
    processName,
    address,
    protocol,
    workingDirectory: 'unknown', // Will be fetched separately
    command: 'unknown', // Will be fetched separately
  };
}

/**
 * Enriches port info with working directory and full command
 */
export async function enrichPortInfo(portInfo: PortInfo): Promise<PortInfo> {
  const [workingDirectory, command] = await Promise.all([
    getWorkingDirectory(portInfo.pid),
    getFullCommand(portInfo.pid),
  ]);

  return {
    ...portInfo,
    workingDirectory,
    command,
  };
}

/**
 * Scans ports and enriches all results
 */
export async function scanPortsEnriched(filters?: FilterOptions): Promise<PortInfo[]> {
  const ports = await scanPorts(filters);

  // Enrich all port infos in parallel
  const enriched = await Promise.all(
    ports.map(port => enrichPortInfo(port))
  );

  return enriched;
}

/**
 * Checks if a port info matches the given filters
 */
function matchesFilters(portInfo: PortInfo, filters?: FilterOptions): boolean {
  if (!filters) {
    return true;
  }

  if (filters.port !== undefined && portInfo.port !== filters.port) {
    return false;
  }

  if (filters.portRange !== undefined) {
    const { min, max } = filters.portRange;
    if (portInfo.port < min || portInfo.port > max) {
      return false;
    }
  }

  if (filters.pid !== undefined && portInfo.pid !== filters.pid) {
    return false;
  }

  if (filters.processName !== undefined &&
      !portInfo.processName.toLowerCase().includes(filters.processName.toLowerCase())) {
    return false;
  }

  if (filters.processPrefix !== undefined &&
      !portInfo.processName.toLowerCase().startsWith(filters.processPrefix.toLowerCase())) {
    return false;
  }

  if (filters.workingDirectory !== undefined &&
      !portInfo.workingDirectory.toLowerCase().includes(filters.workingDirectory.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Validates port number
 */
export function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 0 && port <= 65535;
}

/**
 * Validates PID
 */
export function isValidPid(pid: number): boolean {
  return Number.isInteger(pid) && pid > 0;
}
