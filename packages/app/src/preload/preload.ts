import { contextBridge, ipcRenderer } from 'electron';
import { FilterOptions, UserConfig, KillResult, PortInfo } from '@portwatch/core';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('portwatchAPI', {
  // Scan ports
  scanPorts: (filters?: FilterOptions): Promise<{ success: boolean; data?: PortInfo[]; error?: string }> =>
    ipcRenderer.invoke('scan-ports', filters),

  // Kill process by port
  killByPort: (port: number, force?: boolean): Promise<KillResult> =>
    ipcRenderer.invoke('kill-by-port', port, force),

  // Kill process by PID
  killByPid: (pid: number, force?: boolean): Promise<KillResult> =>
    ipcRenderer.invoke('kill-by-pid', pid, force),

  // Load config
  loadConfig: (): Promise<{ success: boolean; data?: UserConfig; error?: string }> =>
    ipcRenderer.invoke('load-config'),

  // Save config
  saveConfig: (config: UserConfig): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-config', config),

  // Quit app
  quitApp: (): Promise<void> =>
    ipcRenderer.invoke('quit-app'),
});

// TypeScript type declaration for window object
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
