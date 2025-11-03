import { app, ipcMain, nativeImage } from 'electron';
import { menubar, Menubar } from 'menubar';
import path from 'path';
import fs from 'fs';
import {
  scanPortsEnriched,
  FilterOptions,
  killProcessByPort,
  killProcessByPid,
  loadConfig,
  saveConfig,
} from '@portwatch/core';

let mb: Menubar;

/**
 * Load menubar icon with graceful fallback
 */
function getMenubarIcon(): nativeImage {
  const iconPath = path.join(__dirname, '..', '..', 'assets', 'IconTemplate.png');

  console.log('Looking for icon at:', iconPath);

  if (fs.existsSync(iconPath)) {
    console.log('✓ Icon found, loading from disk');
    return nativeImage.createFromPath(iconPath);
  }

  console.warn('⚠ Menubar icon not found, using empty placeholder');
  console.warn('  Create icon at:', iconPath);
  return nativeImage.createEmpty();
}

// Create menubar app
app.whenReady().then(() => {
  console.log('🚀 PortWatch app starting...');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  __dirname:', __dirname);

  const icon = getMenubarIcon();

  const indexUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '..', 'renderer', 'index.html')}`;

  console.log('  Index URL:', indexUrl);

  mb = menubar({
    index: indexUrl,
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
    console.log('✓ PortWatch menubar is ready');
  });

  mb.on('show', () => {
    console.log('📂 Menubar window shown');
  });

  mb.on('hide', () => {
    console.log('📁 Menubar window hidden');
  });

  mb.on('after-create-window', () => {
    console.log('✓ Window created');

    // Open DevTools in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Opening DevTools (development mode)');
      mb.window?.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Set up IPC handlers
  setupIpcHandlers();
});

// Set up IPC handlers for communication with renderer
function setupIpcHandlers() {
  console.log('⚡ Setting up IPC handlers');

  // Scan ports
  ipcMain.handle('scan-ports', async (event, filters?: FilterOptions) => {
    console.log('IPC: scan-ports called with filters:', filters);
    try {
      const ports = await scanPortsEnriched(filters);
      console.log(`IPC: scan-ports found ${ports.length} ports`);
      return { success: true, data: ports };
    } catch (error: any) {
      console.error('IPC: scan-ports error:', error);
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
