import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, ElectronTestContext } from './utils';

test.describe('Smoke Tests', () => {
  let context: ElectronTestContext;

  test.beforeAll(async () => {
    // Build the app before running tests
    // This assumes `npm run build` has already been run
    console.log('Launching Electron app...');
  });

  test.beforeEach(async () => {
    context = await launchElectronApp();
  });

  test.afterEach(async () => {
    if (context) {
      await closeElectronApp(context);
    }
  });

  test('app launches successfully', async () => {
    const { app } = context;

    // App should be running
    expect(app).toBeTruthy();

    // Check if window is created
    const windows = app.windows();
    expect(windows.length).toBeGreaterThan(0);
  });

  test('window has correct title', async () => {
    const { window } = context;

    // Wait for the page to load
    await window.waitForLoadState('domcontentloaded');

    // Check title
    const title = await window.title();
    expect(title).toBe('PortWatch');
  });

  test('main UI elements are rendered', async () => {
    const { window } = context;

    // Wait for React to render
    await window.waitForSelector('text=PortWatch', { timeout: 10000 });

    // Wait for initial loading to complete (wait for Loading... to disappear)
    await window.waitForFunction(() => {
      const loadingText = document.body.textContent;
      return !loadingText?.includes('Loading...');
    }, { timeout: 10000 });

    // Check for header
    const header = await window.textContent('h1');
    expect(header).toContain('PortWatch');

    // Check for refresh button
    const refreshButton = await window.locator('button:has-text("↻")');
    expect(await refreshButton.isVisible()).toBe(true);

    // Check for auto-refresh toggle
    const autoButton = await window.locator('button:has-text("Auto")');
    expect(await autoButton.isVisible()).toBe(true);
  });

  test('app quits cleanly', async () => {
    const { app } = context;

    // Close the app - should complete without errors
    await expect(app.close()).resolves.not.toThrow();

    // Verify all windows are closed
    const windows = app.windows();
    expect(windows.length).toBe(0);
  });

  test('window dimensions are correct', async () => {
    const { app, window } = context;

    // Get window bounds using Electron API
    const bounds = await app.evaluate(async ({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return win.getBounds();
    });

    // Should match the dimensions set in main.ts (400x600)
    expect(bounds.width).toBe(400);
    expect(bounds.height).toBe(600);
  });
});
