import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';

export interface ElectronTestContext {
  app: ElectronApplication;
  window: Page;
}

/**
 * Launch the Electron app for testing
 */
export async function launchElectronApp(): Promise<ElectronTestContext> {
  // Launch Electron app
  const app = await electron.launch({
    args: [path.join(__dirname, '..', 'dist', 'main', 'main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  // Wait for the first window to be created
  const window = await app.firstWindow();

  // Wait for the app to be ready
  await window.waitForLoadState('domcontentloaded');

  return { app, window };
}

/**
 * Close the Electron app
 */
export async function closeElectronApp(context: ElectronTestContext): Promise<void> {
  await context.app.close();
}

/**
 * Wait for an element to be visible
 */
export async function waitForElement(window: Page, selector: string, timeout = 5000): Promise<void> {
  await window.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Get text content of an element
 */
export async function getElementText(window: Page, selector: string): Promise<string> {
  const element = await window.waitForSelector(selector);
  return (await element.textContent()) || '';
}

/**
 * Click an element
 */
export async function clickElement(window: Page, selector: string): Promise<void> {
  await window.click(selector);
}

/**
 * Type into an input field
 */
export async function typeIntoInput(window: Page, selector: string, text: string): Promise<void> {
  await window.fill(selector, text);
}

/**
 * Wait for a specific condition
 */
export async function waitFor(condition: () => Promise<boolean>, timeout = 5000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}
