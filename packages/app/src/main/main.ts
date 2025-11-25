import { app, ipcMain, nativeImage, Menu } from 'electron';
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
 * Update the context menu for the tray icon
 */
function updateContextMenu() {
  if (!mb || !mb.tray) return;

  const loginItemSettings = app.getLoginItemSettings();
  const openAtLogin = loginItemSettings.openAtLogin;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: openAtLogin,
      click: () => {
        app.setLoginItemSettings({
          openAtLogin: !openAtLogin,
        });
        updateContextMenu();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit PortWatch',
      click: () => {
        app.quit();
      },
    },
  ]);

  mb.tray.setContextMenu(contextMenu);
}

/**
 * Load menubar icon with graceful fallback
 */
function getMenubarIcon(): nativeImage {
  // In production, assets are in app.getPath('userData')/../Resources/assets
  // In development, they're relative to __dirname
  let iconPath: string;

  if (app.isPackaged) {
    // Production: assets are in Contents/Resources/assets/
    iconPath = path.join(process.resourcesPath, 'assets', 'IconTemplate.png');
  } else {
    // Development: relative to dist/main
    iconPath = path.join(__dirname, '..', '..', 'assets', 'IconTemplate.png');
  }

  console.log('Looking for icon at:', iconPath);
  console.log('  app.isPackaged:', app.isPackaged);
  console.log('  process.resourcesPath:', process.resourcesPath);

  if (fs.existsSync(iconPath)) {
    console.log('✓ Icon found, loading from disk');
    const img = nativeImage.createFromPath(iconPath);
    // Mark as template image for macOS menu bar
    img.setTemplateImage(true);
    return img;
  }

  console.warn('⚠ Menubar icon not found, using text fallback');
  console.warn('  Create icon at:', iconPath);

  // Create a simple text-based icon as fallback
  // This creates a 16x16 black square that will be visible in the menu bar
  const canvas = `
    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
      <text x="8" y="12" font-size="12" text-anchor="middle" fill="black">P</text>
    </svg>
  `;
  const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(canvas).toString('base64');
  const img = nativeImage.createFromDataURL(dataUrl);
  img.setTemplateImage(true);
  return img;
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
        preload: path.join(__dirname, '..', 'preload', 'preload.cjs'),
      },
      resizable: false,
      movable: false,
    },
    tooltip: 'PortWatch',
    preloadWindow: true,
  });

  mb.on('ready', () => {
    console.log('✓ PortWatch menubar is ready');

    if (mb.tray) {
      // Don't set context menu initially - only on right-click
      // This prevents it from showing on left-click

      // Right click: show context menu
      mb.tray.on('right-click', () => {
        updateContextMenu();
        if (mb.tray) {
          mb.tray.popUpContextMenu();
        }
      });
    }

    // In development mode, show the window once
    if (process.env.NODE_ENV === 'development' && mb.window) {
      console.log('🔍 Development mode: showing window');
      mb.showWindow();

      // Make the window not auto-hide on blur in dev mode
      mb.window.setAlwaysOnTop(false);
    }
  });

  mb.on('show', () => {
    console.log('📂 Menubar window shown');
  });

  mb.on('hide', () => {
    console.log('📁 Menubar window hidden');
    // Don't re-show automatically - let it hide normally
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
