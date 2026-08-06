import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const baseUrl = process.env.FLOW4_BASE_URL || 'http://127.0.0.1:4200';
const email = process.env.FLOW4_ADMIN_EMAIL;
const password = process.env.FLOW4_ADMIN_PASSWORD;
if (!email || !password) throw new Error('FLOW4_ADMIN_EMAIL and FLOW4_ADMIN_PASSWORD are required.');

const viewports = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1600, height: 900 }
];
const output = resolve('.flow4/acceptance');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();
  await authPage.goto(`${baseUrl}/login`);
  await authPage.getByLabel('Email Address').fill(email);
  await authPage.getByLabel('Password', { exact: true }).fill(password);
  await authPage.getByRole('button', { name: 'Sign In' }).click();
  await authPage.waitForURL(/\/admin\//);
  const storageState = await authContext.storageState();
  await authContext.close();

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, storageState });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/admin/billing/manual-payments`);
    await page.getByRole('heading', { name: 'Manual payment review' }).waitFor();
    await page.waitForTimeout(300);

    const dimensions = await page.evaluate(async () => {
      window.scrollTo(100000, 0);
      await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
      const result = {
        scrollWidth: document.body.scrollWidth,
        clientWidth: document.body.clientWidth,
        globalScrollX: window.scrollX,
      };
      window.scrollTo(0, 0);
      return result;
    });
    const overflow = dimensions.scrollWidth > dimensions.clientWidth + 1 || dimensions.globalScrollX > 1;
    const overflowSources = overflow ? await page.evaluate(() => [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth };
      })
      .filter((item) => item.right > document.documentElement.clientWidth + 1 || item.scrollWidth > item.width + 1)
      .sort((left, right) => Math.max(right.right, right.scrollWidth) - Math.max(left.right, left.scrollWidth))
      .slice(0, 5)) : [];
    const tableAncestors = overflow ? await page.evaluate(() => {
      const result = [];
      let element = document.querySelector('table');
      while (element && result.length < 10) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        result.push({ tag: element.tagName.toLowerCase(), className: typeof element.className === 'string' ? element.className : '', left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, overflowX: style.overflowX, minWidth: style.minWidth, maxWidth: style.maxWidth });
        element = element.parentElement;
      }
      return result;
    }) : [];
    if (await page.getByLabel('Search').count() !== 1) failures.push(`${viewport.width}x${viewport.height}: queue search label missing or ambiguous`);
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName || '');
    await page.screenshot({ path: resolve(output, `queue-${viewport.width}x${viewport.height}.png`), fullPage: true });
    if (overflow || !focused) {
      const reason = `overflow=${overflow} width=${dimensions.scrollWidth}/${dimensions.clientWidth} scrollX=${dimensions.globalScrollX} keyboardFocus=${focused || 'none'}`;
      failures.push(`${viewport.width}x${viewport.height}: ${reason}`);
      console.log(`FAILED_LOCAL ${viewport.width}x${viewport.height} ${reason}`);
      if (overflowSources.length) console.log(`OVERFLOW_SOURCES ${viewport.width}x${viewport.height} ${JSON.stringify(overflowSources)}`);
      if (tableAncestors.length) console.log(`TABLE_ANCESTORS ${viewport.width}x${viewport.height} ${JSON.stringify(tableAncestors)}`);
    } else {
      console.log(`READY ${viewport.width}x${viewport.height} overflow=false keyboardFocus=${focused}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) throw new Error(`Responsive/keyboard acceptance failed: ${failures.join('; ')}`);
