import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { test, expect } from '@playwright/test';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

const article = '/notes/reinforcement-learning-lec1-basic-concepts/';
const renderer = await createMarkdownProcessor({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] });
const fractionFixture = (await renderer.render('$\\frac{1}{a-1}$\n\n$$\n\\frac{1}{a-1}\n$$')).code;

for (const width of [1440, 390]) {
  for (const javaScriptEnabled of [true, false]) {
    test.describe(`${width}px, scripts ${javaScriptEnabled ? 'on' : 'off'}`, () => {
      test.use({ viewport: { width, height: 1000 }, javaScriptEnabled });

      test('multi-letter subscripts are smaller and lower than their base', async ({ page }) => {
        await page.goto(article);
        await page.evaluate(() => document.fonts.ready);
        const metrics = await page.locator('.custom-md .katex').evaluateAll(elements => {
          const formula = elements.find(e => e.querySelector('annotation')?.textContent === 'r_{bound} =-1')!;
          const base = formula.querySelector('.katex-html > .base > .mord > .mathnormal')!;
          const subscript = formula.querySelector('.msupsub .sizing')!;
          const baseRect = base.getBoundingClientRect(), subRect = subscript.getBoundingClientRect();
          return {
            baseSize: Number.parseFloat(getComputedStyle(base).fontSize),
            subSize: Number.parseFloat(getComputedStyle(subscript).fontSize),
            baseCenter: baseRect.top + baseRect.height / 2,
            subCenter: subRect.top + subRect.height / 2,
          };
        });
        expect(metrics.subSize).toBeLessThan(metrics.baseSize * 0.8);
        expect(metrics.subCenter).toBeGreaterThan(metrics.baseCenter);
      });

      test('fraction and arrow glyphs fit inside their vertical scroll boundaries', async ({ page }) => {
        await page.goto(article);
        // Use the real Markdown renderer for the reported inline/display fraction.
        await page.locator('.custom-md').evaluate((element, html) => element.insertAdjacentHTML('afterbegin', html), fractionFixture);
        await page.evaluate(() => document.fonts.ready);
        const clipped = await page.locator('.custom-md .katex-html').evaluateAll(formulas => {
          const failures: string[] = [];
          for (const formula of formulas) {
            const tex = formula.closest('.katex')?.querySelector('annotation')?.textContent ?? '';
            const glyphs = [...formula.querySelectorAll('span')].filter(span =>
              span.childNodes.length === 1 && span.firstChild?.nodeType === Node.TEXT_NODE && span.textContent?.trim());
            for (const glyph of glyphs) {
              const rect = glyph.getBoundingClientRect();
              for (let ancestor = glyph.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
                if (!['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(ancestor).overflowY)) continue;
                const boundary = ancestor.getBoundingClientRect();
                if (rect.top < boundary.top - 1 || rect.bottom > boundary.top + ancestor.clientHeight + 1) {
                  failures.push(`${tex}: ${glyph.textContent} clipped by ${ancestor.className}`);
                  break;
                }
              }
            }
          }
          return failures;
        });
        expect(clipped).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });

      test('article images and captions are centered without stretching', async ({ page }) => {
        await page.goto(article);
        const image = page.locator('img[data-source-asset*="193227182"]');
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
        const metrics = await image.evaluate((img: HTMLImageElement) => {
          const imageRect = img.getBoundingClientRect(), figure = img.closest('figure')!, figureRect = figure.getBoundingClientRect();
          return {
            imageCenter: imageRect.left + imageRect.width / 2,
            figureCenter: figureRect.left + figureRect.width / 2,
            captionAlign: getComputedStyle(figure.querySelector('figcaption')!).textAlign,
            ratio: imageRect.width / imageRect.height,
            naturalRatio: img.naturalWidth / img.naturalHeight,
            width: imageRect.width,
            availableWidth: figureRect.width,
          };
        });
        expect(Math.abs(metrics.imageCenter - metrics.figureCenter)).toBeLessThan(1);
        expect(metrics.captionAlign).toBe('center');
        expect(metrics.ratio).toBeCloseTo(metrics.naturalRatio, 2);
        expect(metrics.width).toBeLessThanOrEqual(metrics.availableWidth);
      });
    });
  }
}
