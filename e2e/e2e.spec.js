import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function createUploadFile(fileName, content) {
  const filePath = path.resolve('e2e', fileName);
  await fs.promises.writeFile(filePath, content);
  return filePath;
}

test('API E2E: login -> upload -> invoke', async ({ request }) => {
  const loginRes = await request.post('http://127.0.0.1:8787/api/functions', {
    data: { name: 'employeeLogin', payload: { nik: '123456', password: '123456' } },
  });
  expect(loginRes.ok()).toBeTruthy();
  const loginJson = await loginRes.json();
  expect(loginJson.success).toBe(true);

  const uploadRes = await request.post('http://127.0.0.1:8787/api/uploads', {
    multipart: {
      file: {
        name: 'e2e.txt',
        buffer: Buffer.from('playwright e2e upload test'),
        mimeType: 'text/plain',
      },
    },
  });
  expect(uploadRes.ok()).toBeTruthy();
  const uploadJson = await uploadRes.json();
  expect(uploadJson.success).toBe(true);
  expect(uploadJson.file_url).toBeTruthy();

  const invokeRes = await request.post('http://127.0.0.1:8787/api/functions', {
    data: { name: 'archiveOldData', payload: { entity_name: 'Attendance', months_threshold: 1 } },
  });
  expect(invokeRes.ok()).toBeTruthy();
  const invokeJson = await invokeRes.json();
  expect(invokeJson.success).toBe(true);
});

const APP_URL = 'http://localhost:5173';

test('UI E2E: Browser login flow', async ({ page }) => {
  // Simple login test without file upload/archive
  await page.goto(`${APP_URL}/EmployeeLogin`);
  await expect(page).toHaveURL(/EmployeeLogin/);
  
  // Fill and submit login form
  await page.locator('input[placeholder="Contoh: PU072026001"]').fill('123456');
  await page.locator('input[placeholder="Password (default: 123456)"]').fill('123456');
  await page.getByRole('button', { name: /Masuk/i }).click();

  // Wait for dashboard navigation
  await page.waitForURL(/Dashboard/, { timeout: 15000 });
  console.log('✓ Login successful, navigated to Dashboard');
});
