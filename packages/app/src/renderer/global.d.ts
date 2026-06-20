import { FilterOptions, KillResult, PortInfo, UserConfig } from '@portwatch/core';

declare global {
  interface Window {
    portwatchAPI: {
      scanPorts: (filters?: FilterOptions) => Promise<{ success: boolean; data?: PortInfo[]; error?: string }>;
      killByPort: (port: number, force?: boolean) => Promise<KillResult>;
      killByPid: (pid: number, force?: boolean) => Promise<KillResult>;
      loadConfig: () => Promise<{ success: boolean; data?: UserConfig; error?: string }>;
      saveConfig: (config: UserConfig) => Promise<{ success: boolean; error?: string }>;
      quitApp: () => Promise<void>;
    };
  }
}
