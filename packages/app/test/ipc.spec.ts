import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, ElectronTestContext } from './utils';

test.describe('IPC Integration Tests', () => {
  let context: ElectronTestContext;

  test.beforeEach(async () => {
    context = await launchElectronApp();
    // Wait for app to be ready
    await context.window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (context) {
      await closeElectronApp(context);
    }
  });

  test('window.portwatchAPI is exposed', async () => {
    const { window } = context;

    // Check if the API is exposed via contextBridge
    const hasAPI = await window.evaluate(() => {
      return typeof (window as any).portwatchAPI !== 'undefined';
    });

    expect(hasAPI).toBe(true);
  });

  test('scanPorts IPC call works', async () => {
    const { window } = context;

    // Call scanPorts via IPC
    const result = await window.evaluate(async () => {
      return await (window as any).portwatchAPI.scanPorts();
    });

    // Should return success
    expect(result.success).toBe(true);

    // Should have data array (may be empty)
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('scanPorts with port range filter', async () => {
    const { window } = context;

    // Call scanPorts with filters
    const result = await window.evaluate(async () => {
      return await (window as any).portwatchAPI.scanPorts({
        portRange: { min: 3000, max: 4000 }
      });
    });

    expect(result.success).toBe(true);

    // All returned ports should be in range
    if (result.data && result.data.length > 0) {
      for (const port of result.data) {
        expect(port.port).toBeGreaterThanOrEqual(3000);
        expect(port.port).toBeLessThanOrEqual(4000);
      }
    }
  });

  test('scanPorts with process prefix filter', async () => {
    const { window } = context;

    // Call scanPorts with process prefix filter
    const result = await window.evaluate(async () => {
      return await (window as any).portwatchAPI.scanPorts({
        processPrefix: 'node'
      });
    });

    expect(result.success).toBe(true);

    // All returned processes should start with 'node'
    if (result.data && result.data.length > 0) {
      for (const port of result.data) {
        expect(port.processName.toLowerCase()).toMatch(/^node/);
      }
    }
  });

  test('loadConfig IPC call works', async () => {
    const { window } = context;

    const result = await window.evaluate(async () => {
      return await (window as any).portwatchAPI.loadConfig();
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.data.display).toBeTruthy();
    expect(result.data.refresh).toBeTruthy();
  });

  test('saveConfig IPC call works', async () => {
    const { window } = context;

    // First load the current config
    const loadResult = await window.evaluate(async () => {
      return await (window as any).portwatchAPI.loadConfig();
    });

    expect(loadResult.success).toBe(true);

    // Modify and save
    const saveResult = await window.evaluate(async (config: any) => {
      config.refresh.intervalMs = 3000;
      return await (window as any).portwatchAPI.saveConfig(config);
    }, loadResult.data);

    expect(saveResult.success).toBe(true);

    // Load again to verify
    const verifyResult = await window.evaluate(async () => {
      return await (window as any).portwatchAPI.loadConfig();
    });

    expect(verifyResult.data.refresh.intervalMs).toBe(3000);
  });

  test('error handling for invalid filters', async () => {
    const { window } = context;

    // This should still succeed but return empty results
    const result = await window.evaluate(async () => {
      return await (window as any).portwatchAPI.scanPorts({
        port: 99999 // Invalid port number (should filter everything out)
      });
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});
