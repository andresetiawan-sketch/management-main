import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR', err.toString()));
  page.on('requestfailed', req => console.log('REQUESTFAILED', req.url(), req.failure()?.errorText));
  page.on('response', resp => console.log('RESPONSE', resp.status(), resp.url()));
  page.on('crash', () => console.log('PAGE CRASHED'));
  page.on('close', () => console.log('PAGE CLOSED'));

  try {
    console.log('navigating to login');
    await page.goto('http://localhost:5173/EmployeeLogin', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('page loaded', page.url());

    await page.screenshot({ path: './e2e/debug-login-before.png' });
    console.log('screenshot before login saved');

    await page.locator('input[placeholder="Contoh: PU072026001"]').fill('001');
    await page.locator('input[placeholder="Password (default: 123456)"]').fill('123456');
    console.log('filled credentials');

    await page.getByRole('button', { name: /Masuk/i }).click();
    console.log('clicked login');

    try {
      await page.waitForURL(/Dashboard/, { timeout: 20000 });
      console.log('navigation succeeded', page.url());
    } catch (err) {
      console.log('waitForURL error', err.message);
    }

    await page.screenshot({ path: './e2e/debug-login-after.png' });
    console.log('screenshot after login saved', page.url());
  } catch (err) {
    console.log('error', err);
  } finally {
    await browser.close();
    console.log('browser closed');
  }
})();