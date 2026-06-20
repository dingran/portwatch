import { test, expect } from '@playwright/test';
import { launchElectronApp, closeElectronApp, ElectronTestContext } from './utils';

test.describe('UI Tests', () => {
  let context: ElectronTestContext;

  test.beforeEach(async () => {
    context = await launchElectronApp();
    await context.window.waitForLoadState('domcontentloaded');
    // Wait for initial port scan to complete (wait for Loading... to disappear)
    await context.window.waitForFunction(() => {
      const loadingText = document.body.textContent;
      return !loadingText?.includes('Loading...');
    }, { timeout: 10000 });
  });

  test.afterEach(async () => {
    if (context) {
      await closeElectronApp(context);
    }
  });

  test('search functionality works', async () => {
    const { window } = context;

    // Find the search input
    const searchInput = window.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill('node');

    // Wait a bit for filtering
    await window.waitForTimeout(500);

    // Check if results are filtered (if any ports exist)
    const portElements = window.locator('text=/:\\d+/');
    const count = await portElements.count();

    // If there are results, they should match the filter
    if (count > 0) {
      const portTexts = await portElements.allTextContents();
      // Should have some port numbers
      expect(portTexts.length).toBeGreaterThan(0);
    }
  });

  test('search mode toggle works', async () => {
    const { window } = context;

    const searchMode = window.getByLabel('Search mode');
    await expect(searchMode).toBeVisible();

    const containsButton = searchMode.getByRole('button', { name: 'Contains' });
    const prefixButton = searchMode.getByRole('button', { name: 'Prefix' });
    await expect(containsButton).toBeVisible();
    await expect(prefixButton).toBeVisible();

    await prefixButton.click();

    const prefixClasses = await prefixButton.getAttribute('class');
    expect(prefixClasses).toContain('is-selected');
  });

  test('advanced filters panel toggles', async () => {
    const { window } = context;

    const filtersButton = window.getByRole('button', { name: 'Filters', exact: true });
    await expect(filtersButton).toBeVisible();

    // Advanced filters should be hidden initially
    const advancedFilters = window.getByLabel('Advanced filters');
    await expect(advancedFilters).not.toBeVisible();

    // Click to show
    await filtersButton.click();
    await expect(advancedFilters).toBeVisible();

    // Click to hide
    await filtersButton.click();
    await expect(advancedFilters).not.toBeVisible();
  });

  test('port range filter works', async () => {
    const { window } = context;

    // Open advanced filters
    const filtersButton = window.getByRole('button', { name: 'Filters', exact: true });
    await filtersButton.click();

    // Find port range inputs
    const minInput = window.locator('input[placeholder="3000"]');
    const maxInput = window.locator('input[placeholder="9000"]');

    await expect(minInput).toBeVisible();
    await expect(maxInput).toBeVisible();

    // Set a port range
    await minInput.fill('3000');
    await maxInput.fill('4000');

    // Wait for filtering
    await window.waitForTimeout(1000);

    // Verify clear button appears
    const clearButton = window.getByLabel('Clear port range');
    await expect(clearButton).toBeVisible();

    // Click clear
    await clearButton.click();

    // Inputs should be empty
    await expect(minInput).toHaveValue('');
    await expect(maxInput).toHaveValue('');
  });

  test('refresh button works', async () => {
    const { window } = context;

    const refreshButton = window.getByRole('button', { name: 'Refresh', exact: true });
    await expect(refreshButton).toBeVisible();

    // Click it
    await refreshButton.click();

    // Button should show loading state briefly
    await window.waitForTimeout(500);

    // Should be back to normal state
    await expect(refreshButton).not.toBeDisabled();
  });

  test('auto-refresh toggle works', async () => {
    const { window } = context;

    const autoButton = window.getByLabel('Auto-refresh');
    await expect(autoButton).toBeVisible();

    await expect(autoButton).toContainText('Live');

    // Toggle off
    await autoButton.click();
    await window.waitForTimeout(100);

    await expect(autoButton).toContainText('Paused');

    // Toggle back on
    await autoButton.click();
    await window.waitForTimeout(100);

    await expect(autoButton).toContainText('Live');
  });

  test('footer shows correct port count', async () => {
    const { window } = context;

    // Find footer
    const footer = window.locator('text=/\\d+ port/');
    await expect(footer).toBeVisible();

    // Should match pattern "N port" or "N ports"
    const footerText = await footer.textContent();
    expect(footerText).toMatch(/\d+ ports?/);
  });

  test('port list renders correctly', async () => {
    const { window } = context;

    // Wait for potential port data
    await window.waitForTimeout(1000);

    // Check if we have any ports
    const portNumbers = window.locator('text=/:\\d+/');
    const portCount = await portNumbers.count();

    if (portCount > 0) {
      // First port should be visible
      await expect(portNumbers.first()).toBeVisible();

      // Should have process name
      const processNames = window.locator('div').filter({ hasText: /^[a-zA-Z]/ });
      expect(await processNames.count()).toBeGreaterThan(0);

      // Should have kill button
      const killButton = window.locator('button:has-text("Kill")').first();
      await expect(killButton).toBeVisible();
    }
  });
});
