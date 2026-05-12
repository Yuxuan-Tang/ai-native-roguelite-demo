import { expect, test } from '@playwright/test';

test('starts the playable lab demo and renders the workbench', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: '异常清理 Run' })).toBeVisible();
  await expect(page.getByLabel('AI实验室异常清理游戏区域')).toBeVisible();
  await expect(page.getByRole('heading', { name: '研发工作台' })).toBeVisible();
  await expect(page.getByText('Codex')).toBeVisible();
  await expect(page.getByTestId('game-host')).toBeVisible();

  await page.keyboard.down('D');
  await page.waitForTimeout(250);
  await page.keyboard.up('D');
  await expect(page.locator('canvas')).toBeVisible();
});
