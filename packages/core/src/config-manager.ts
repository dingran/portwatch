import { promises as fs } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import {
  UserConfig,
  UserConfigSchema,
  DEFAULT_USER_CONFIG,
} from './types';

const CONFIG_DIR = join(homedir(), '.portwatch');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

/**
 * Ensures the config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error: any) {
    throw new Error(`Failed to create config directory: ${error.message}`);
  }
}

/**
 * Loads user configuration
 */
export async function loadConfig(): Promise<UserConfig> {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    // Validate with Zod
    const validated = UserConfigSchema.parse(parsed);
    return validated;
  } catch (error: any) {
    // If file doesn't exist or is invalid, return default config
    return DEFAULT_USER_CONFIG;
  }
}

/**
 * Saves user configuration
 */
export async function saveConfig(config: UserConfig): Promise<void> {
  try {
    // Validate before saving
    const validated = UserConfigSchema.parse(config);

    await ensureConfigDir();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(validated, null, 2), 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to save config: ${error.message}`);
  }
}

/**
 * Resets configuration to defaults
 */
export async function resetConfig(): Promise<void> {
  await saveConfig(DEFAULT_USER_CONFIG);
}

/**
 * Gets the config file path
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Checks if config file exists
 */
export async function configExists(): Promise<boolean> {
  try {
    await fs.access(CONFIG_FILE);
    return true;
  } catch {
    return false;
  }
}
