import { expect, test } from '@playwright/test';

test('desktop shell, collapse, routes, and safe preview form', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/overview');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Content overview');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link')).toHaveCount(12);
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('link', { name: 'Brand Brain', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.getByRole('link', { name: 'Calendar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Calendar');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.goto('/login');
  await expect(page.getByLabel('Work email')).toBeDisabled();
  await expect(page.getByLabel('Password', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('mobile drawer traps focus, closes on Escape, restores focus, and navigates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/overview');
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Bismillah Social AI' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('link', { name: 'Brand Brain', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Brand Brain');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('tabs and dialog support keyboard interaction in a real browser', async ({ page }) => {
  await page.goto('/ui-kit');
  await page.getByRole('tab', { name: 'Empty', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Loading', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toHaveText('Loading preview');
  const trigger = page.getByRole('button', { name: 'Open dialog', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'A little room to focus.' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('all navigation placeholders and error previews render without live services', async ({ page }) => {
  for (const route of ['create-post', 'calendar', 'content', 'media', 'approvals', 'analytics', 'connections', 'brand-brain', 'team', 'activity', 'settings']) {
    const response = await page.goto(`/${route}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByText('UI placeholder')).toBeVisible();
  }
  for (const route of ['403', '500', 'offline']) {
    await page.goto(`/${route}`);
    await expect(page.getByText('Visual error-state preview')).toBeVisible();
  }
  const missing = await page.goto('/this-page-does-not-exist');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'This page wandered off.' })).toBeVisible();
});

test('responsive surfaces fit narrow/mobile/tablet/desktop widths and respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ['/', '/login', '/overview', '/ui-kit', '/offline']) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (route === '/') {
        expect(await page.locator('.editorial-card').evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      }
    }
  }
  await page.goto('/ui-kit');
  await page.getByRole('tab', { name: 'Loading', exact: true }).click();
  expect(await page.locator('.loading-indicator').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
});

test('dashboard primary action and drawer controls stay usable at review widths', async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/overview');
    const primary = page.getByRole('link', { name: 'Create a post', exact: true });
    await expect(primary).toBeVisible();
    await expect(primary).toHaveClass(/button--primary/);
    await expect(page.locator('main a.button--primary')).toHaveCount(1);
    await primary.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(primary).toBeFocused();
    const box = await primary.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width < 960) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      const dialog = page.getByRole('dialog', { name: 'Bismillah Social AI' });
      const close = dialog.getByRole('button', { name: 'Close dialog' });
      await expect(close).toBeInViewport();
      await close.click();
      await expect(dialog).not.toBeVisible();
    }
  }
});
