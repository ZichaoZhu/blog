import { test, expect, type Page } from '@playwright/test';

const article = '/notes/reinforcement-learning-lec1-basic-concepts/';

async function expectBluePalette(page: Page) {
  const palette = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    const rgb = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const root = getComputedStyle(document.documentElement);
    const badge = getComputedStyle(document.querySelector('.toc-badge-index')!);
    const marker = getComputedStyle(document.querySelector('.custom-md li')!, '::marker');
    return {
      accent: rgb(root.getPropertyValue('--primary')),
      background: rgb(root.backgroundColor),
      badge: rgb(badge.backgroundColor),
      marker: rgb(marker.color),
    };
  });
  for (const [name, [red, green, blue, alpha]] of Object.entries(palette)) {
    expect(alpha, `${name} is opaque`).toBe(255);
    expect(blue, `${name} is blue`).toBeGreaterThan(green);
    expect(green, `${name} is blue`).toBeGreaterThan(red);
  }
}

test('blue site palette applies in light and dark reading modes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    await page.goto(article);
    await expectBluePalette(page);
  }
});

test('disabled color picker cannot restore a saved green palette', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hue', '165'));
  await page.goto(article);
  await expectBluePalette(page);
});

test('blue palette is rendered without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(article);
    await expectBluePalette(page);
  } finally {
    await context.close();
  }
});
