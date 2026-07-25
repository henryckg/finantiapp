import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const ROUTES = [
  '/dashboard',
  '/movimientos',
  '/cuentas',
  '/inversiones',
  '/gastos-programados',
  '/objetivos',
  '/reportes',
];

const executablePath =
  process.env.CHROMIUM_PATH ??
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
const page = await context.newPage();

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`[console] ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`[pageerror] ${error.message}`));

for (const route of ROUTES) {
  await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const text = await page.locator('main').innerText();
  console.log(`\n=== ${route} (${text.length} chars) ===`);
  console.log(text.split('\n').slice(0, 14).join('\n'));
}

console.log('\n--- errores ---');
console.log(errors.length === 0 ? 'ninguno' : errors.join('\n'));

await browser.close();
