import { exec } from 'child_process';
import { promisify } from 'util';
import { getPortInfo } from './port-scanner';

const execAsync = promisify(exec);

/**
 * Result of a process kill operation
 */
export interface KillResult {
  success: boolean;
  message: string;
  pid?: number;
  port?: number;
}

/**
 * Kills a process by PID
 */
export async function killProcessByPid(pid: number, force: boolean = false): Promise<KillResult> {
  try {
    // Validate PID
    if (!Number.isInteger(pid) || pid <= 0) {
      return {
        success: false,
        message: `Invalid PID: ${pid}`,
        pid,
      };
    }

    // Check if process exists
    try {
      await execAsync(`ps -p ${pid} -o pid=`);
    } catch {
      return {
        success: false,
        message: `Process ${pid} not found`,
        pid,
      };
    }

    // Kill the process
    const signal = force ? '-9' : '-15';
    await execAsync(`kill ${signal} ${pid}`);

    return {
      success: true,
      message: `Successfully killed process ${pid}${force ? ' (forced)' : ''}`,
      pid,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to kill process ${pid}: ${error.message}`,
      pid,
    };
  }
}

/**
 * Kills a process by port number
 */
export async function killProcessByPort(port: number, force: boolean = false): Promise<KillResult> {
  try {
    // Validate port
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      return {
        success: false,
        message: `Invalid port: ${port}`,
        port,
      };
    }

    // Find process on port
    const portInfo = await getPortInfo(port);

    if (!portInfo) {
      return {
        success: false,
        message: `No process found on port ${port}`,
        port,
      };
    }

    // Kill the process
    const result = await killProcessByPid(portInfo.pid, force);

    return {
      ...result,
      port,
      message: result.success
        ? `Successfully killed ${portInfo.processName} (PID ${portInfo.pid}) on port ${port}${force ? ' (forced)' : ''}`
        : result.message,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to kill process on port ${port}: ${error.message}`,
      port,
    };
  }
}

/**
 * Checks if a process is running
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    await execAsync(`ps -p ${pid} -o pid=`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets process name by PID
 */
export async function getProcessName(pid: number): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`ps -p ${pid} -o comm=`);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}
