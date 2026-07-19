import { expect, test } from '@playwright/test';

test.use({
  viewport: { width: 1440, height: 1000 },
  colorScheme: 'light',
});

// Baselines are recorded with the repository owner's macOS CJK font stack.
// Functional/a11y E2E remains a CI gate; regenerate visual baselines on the
// reference machine to avoid meaningless cross-OS glyph raster diffs.
test.skip(Boolean(process.env.CI), 'visual baselines use the reference macOS font stack');

test('academic homepage visual baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('academic-home.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  });
});

test('notes index visual baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/blog');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('notes-index.png', {
    fullPage: true,
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  });
});

test('three-column article visual baseline', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/blog/Reaserch_Note/260707');
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('article-three-column.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.02,
  });
});
