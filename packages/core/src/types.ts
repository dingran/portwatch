import { z } from 'zod';

/**
 * Represents a process listening on a port
 */
export interface PortInfo {
  port: number;
  pid: number;
  processName: string;
  workingDirectory: string;
  command: string;
  address: string;
  protocol: string;
}

/**
 * Configuration for field display
 */
export interface DisplayConfig {
  showPort: boolean;
  showPid: boolean;
  showProcessName: boolean;
  showWorkingDirectory: boolean;
  showCommand: boolean;
  showAddress: boolean;
  showProtocol: boolean;
}

/**
 * Filter options for port scanning
 */
export interface FilterOptions {
  port?: number;
  pid?: number;
  processName?: string;
  workingDirectory?: string;
}

/**
 * Configuration for auto-refresh
 */
export interface RefreshConfig {
  enabled: boolean;
  intervalMs: number;
}

/**
 * User preferences
 */
export interface UserConfig {
  display: DisplayConfig;
  refresh: RefreshConfig;
}

// Zod schemas for validation
export const PortInfoSchema = z.object({
  port: z.number().int().min(0).max(65535),
  pid: z.number().int().positive(),
  processName: z.string(),
  workingDirectory: z.string(),
  command: z.string(),
  address: z.string(),
  protocol: z.string(),
});

export const FilterOptionsSchema = z.object({
  port: z.number().int().min(0).max(65535).optional(),
  pid: z.number().int().positive().optional(),
  processName: z.string().optional(),
  workingDirectory: z.string().optional(),
});

export const DisplayConfigSchema = z.object({
  showPort: z.boolean(),
  showPid: z.boolean(),
  showProcessName: z.boolean(),
  showWorkingDirectory: z.boolean(),
  showCommand: z.boolean(),
  showAddress: z.boolean(),
  showProtocol: z.boolean(),
});

export const RefreshConfigSchema = z.object({
  enabled: z.boolean(),
  intervalMs: z.number().int().positive(),
});

export const UserConfigSchema = z.object({
  display: DisplayConfigSchema,
  refresh: RefreshConfigSchema,
});

// Default configurations
export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
  showPort: true,
  showPid: true,
  showProcessName: true,
  showWorkingDirectory: true,
  showCommand: false,
  showAddress: false,
  showProtocol: false,
};

export const DEFAULT_REFRESH_CONFIG: RefreshConfig = {
  enabled: true,
  intervalMs: 5000,
};

export const DEFAULT_USER_CONFIG: UserConfig = {
  display: DEFAULT_DISPLAY_CONFIG,
  refresh: DEFAULT_REFRESH_CONFIG,
};
