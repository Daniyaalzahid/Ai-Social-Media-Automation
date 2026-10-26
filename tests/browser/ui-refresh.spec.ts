import { test, expect } from './secure-test';
import { createDatabase } from '../../src/server/db/connection';
import { resolveDatabaseConfiguration } from '../../src/server/db/config';
import { contentActor } from '../helpers/content-fixtures';

let token = '';
test.beforeAll(async () => {
  const config = resolveDatabaseConfiguration(process.env, 'migration');
  if (config.mode !== 'development' || config.database !== 'bsa_dev_browser_tests' || config.user !== 'bsa_dev_browser_migration') throw new Error('Isolated browser database required');
  const handle = createDatabase(config);
  try { token = (await contentActor(handle.db, 'OWNER')).raw.reveal(); }
  finally { await handle.close(); }
});

for (const width of [375, 1440]) {
  test(`refreshed workspace keeps forms, navigation and page surfaces usable at ${width}px`, async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addCookies([{ name: '__Host-bsa-session', value: token, domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of ['login', 'overview', 'create-post', 'content', 'media', 'approvals', 'connections', 'brand-brain', 'team']) {
      let category = 'navigation';
      try {
        expect((await page.goto('/' + route))?.status()).toBe(200);
        category = 'heading';
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        category = 'overflow';
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (route === 'create-post') {
          category = 'composer-keyboard';
          const composer = page.getByRole('form', { name: 'Content composer' });
          const instagram = composer.getByRole('checkbox', { name: 'INSTAGRAM' });
          await instagram.focus();
          await expect(instagram).toBeFocused();
          await page.keyboard.press('Space');
          await expect(instagram).toBeChecked();
          await expect(composer.getByLabel('INSTAGRAM caption', { exact: true })).toBeVisible();
          await page.keyboard.press('Space');
          await expect(instagram).not.toBeChecked();
          await expect(composer.getByLabel('FACEBOOK caption', { exact: true })).toBeVisible();
          category = 'native-groups';
          expect(await composer.locator('fieldset').evaluateAll(elements => elements.every(element => getComputedStyle(element).borderStyle !== 'groove'))).toBe(true);
          category = 'reduced-motion';
          expect(await composer.getByRole('button', { name: 'Save draft', exact: true }).evaluate(element => getComputedStyle(element, '::after').animationName)).toBe('none');
        }
      } catch (error) {
        console.info('UI review diagnostic', JSON.stringify({ route, width, category }));
        throw error;
      }
    }
  });
}
