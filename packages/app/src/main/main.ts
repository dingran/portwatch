import { app, ipcMain, nativeImage } from 'electron';
import { menubar, Menubar } from 'menubar';
import path from 'path';
import {
  scanPortsEnriched,
  FilterOptions,
  killProcessByPort,
  killProcessByPid,
  loadConfig,
  saveConfig,
} from '@portwatch/core';

let mb: Menubar;

// Create menubar app
app.whenReady().then(() => {
  // Create icon
  const icon = nativeImage.createFromPath(
    path.join(__dirname, '..', '..', 'assets', 'IconTemplate.png')
  );

  mb = menubar({
    index: process.env.NODE_ENV === 'development'
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '..', 'renderer', 'index.html')}`,
    icon,
    browserWindow: {
      width: 400,
      height: 600,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      },
      resizable: false,
      movable: false,
    },
    tooltip: 'PortWatch',
    preloadWindow: true,
  });

  mb.on('ready', () => {
    console.log('PortWatch is ready');
  });

  // Set up IPC handlers
  setupIpcHandlers();
});

// Set up IPC handlers for communication with renderer
function setupIpcHandlers() {
  // Scan ports
  ipcMain.handle('scan-ports', async (event, filters?: FilterOptions) => {
    try {
      const ports = await scanPortsEnriched(filters);
      return { success: true, data: ports };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Kill process by port
  ipcMain.handle('kill-by-port', async (event, port: number, force: boolean = false) => {
    try {
      const result = await killProcessByPort(port, force);
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  });

  // Kill process by PID
  ipcMain.handle('kill-by-pid', async (event, pid: number, force: boolean = false) => {
    try {
      const result = await killProcessByPid(pid, force);
      return result;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  });

  // Load config
  ipcMain.handle('load-config', async () => {
    try {
      const config = await loadConfig();
      return { success: true, data: config };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Save config
  ipcMain.handle('save-config', async (event, config) => {
    try {
      await saveConfig(config);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Quit app
  ipcMain.handle('quit-app', () => {
    app.quit();
  });
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
