import { expect, test } from '@playwright/test';
import { expectNoSeriousAccessibilityViolations } from './accessibility';

test.describe('核心页面', () => {
  test('首页呈现作者、近期笔记与主题', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/世界は優しい/);
    await expect(page.getByRole('heading', { level: 1, name: 'ZZC' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '最近笔记' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '研究与学习主题' })).toBeVisible();
    await expect(page.locator('video')).toHaveCount(0);

    await expectNoSeriousAccessibilityViolations(page);
  });

  test('博客索引显示文章并可把视图写入 URL', async ({ page }) => {
    await page.goto('/blog');

    await expect(
      page.getByRole('heading', { level: 1, name: '研究与学习笔记' }),
    ).toBeVisible();
    await expect(page.locator('.notes-results-header p')).toContainText(/共\s*\d+\s*篇笔记/);
    await expect(page.locator('.academic-post-list article').first()).toBeVisible();

    await page.getByRole('button', { name: '卡片视图' }).click();
    await expect(page).toHaveURL(/(?:\?|&)view=card(?:&|$)/);
    await expect(page.locator('.academic-post-grid article').first()).toBeVisible();

    await expectNoSeriousAccessibilityViolations(page);
  });

  test('真实文章可访问并显示正文结构', async ({ page }) => {
    const response = await page.goto('/blog/Reaserch_Note/260707');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: '260707' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '日常记录' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '收获' })).toBeVisible();
    await expect(page.getByRole('article')).toContainText('stablenormal');

    await expectNoSeriousAccessibilityViolations(page);
  });

  test('未知路径返回自定义 404 与正确状态码', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-e2e');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: '迷路了' })).toBeVisible();
    await expect(page.getByRole('link', { name: /返回首页/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /浏览博客/ })).toBeVisible();

    await expectNoSeriousAccessibilityViolations(page);
  });
});

test('Ctrl/Command + K 按需加载搜索并返回结果', async ({ page }) => {
  let searchIndexRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/_search/index.json') {
      searchIndexRequests += 1;
    }
  });

  await page.goto('/');
  expect(searchIndexRequests).toBe(0);

  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', { name: '搜索研究与学习笔记' });
  await expect(dialog).toBeVisible();

  const input = dialog.getByPlaceholder('输入主题、标题或关键词…');
  await expect(input).toBeEnabled({ timeout: 15_000 });
  await expect(input).toBeFocused();
  await input.fill('260707');
  await expect(dialog.getByRole('link', { name: /260707/ }).first()).toBeVisible();
  expect(searchIndexRequests).toBe(1);

  await input.fill('stablenormal');
  const sectionResult = dialog.getByRole('link', { name: /260707/ }).first();
  await expect(sectionResult).toBeVisible();
  await expect(sectionResult).toContainText('匹配章节：日常记录');

  await expectNoSeriousAccessibilityViolations(page);

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('Typora 文章按需渲染 Mermaid 与 KaTeX', async ({ page }) => {
  let katexStylesheetRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/katex.css') {
      katexStylesheetRequests += 1;
    }
  });

  await page.goto('/');
  await expect(page.locator('svg[id^="mermaid-"]')).toHaveCount(0);

  await page.goto('/blog/Reaserch_Note/260707');
  expect(katexStylesheetRequests).toBe(0);

  await page.goto('/blog/typora-test');
  await expect(page.locator('.katex').first()).toBeVisible();
  await expect(page.locator('svg[id^="mermaid-"]').first()).toBeVisible({
    timeout: 20_000,
  });
  expect(katexStylesheetRequests).toBe(1);
  await expectNoSeriousAccessibilityViolations(page);
});

test('LaTeX 阅读主题样式仅在首次切换时加载', async ({ page }) => {
  let stylesheetRequests = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/reading-theme.css') {
      stylesheetRequests += 1;
    }
  });

  await page.goto('/blog/Reaserch_Note/260707');
  expect(stylesheetRequests).toBe(0);
  await page.getByRole('button', { name: '切换到 LaTeX 论文主题' }).click();
  await expect(page.locator('link#reading-theme-styles')).toHaveAttribute(
    'href',
    '/reading-theme.css',
  );
  await expect.poll(() => stylesheetRequests).toBe(1);
  await expect(page.locator('.theme-latex')).toBeVisible();
});

test.describe('响应式与用户偏好', () => {
  test('移动端导航可以打开并完成导航', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const menuButton = page.getByRole('button', { name: '打开菜单' });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    await expect(page.getByRole('button', { name: '关闭菜单' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    const mobileNavigation = page.locator('#mobile-navigation');
    await expect(mobileNavigation).toBeVisible();
    await mobileNavigation.getByRole('link', { name: /Notes/ }).click();
    await expect(page).toHaveURL(/\/blog$/);
    await expect(
      page.getByRole('heading', { level: 1, name: '研究与学习笔记' }),
    ).toBeVisible();

    await expectNoSeriousAccessibilityViolations(page);
  });

  test('系统暗色偏好生效且可手动切换', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect.poll(() => page.locator('html').getAttribute('class')).toContain('dark');
    const toggle = page.getByRole('button', { name: '切换主题' }).first();
    // Wait until the client-side theme hook has resolved the system theme. The
    // server fallback briefly renders the moon icon even though <html> is dark.
    await expect(toggle.locator('path')).toHaveAttribute('d', /^M12 3/);
    await expectNoSeriousAccessibilityViolations(page);
    await toggle.click();
    await expect.poll(() => page.locator('html').getAttribute('class')).toContain('light');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
  });

  test('reduced-motion 将过渡与入场动画压缩到近零', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/blog/Reaserch_Note/260707');

    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    ).toBe(true);

    const durations = await page.locator('article').evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animation: Number.parseFloat(style.animationDuration) || 0,
        transition: Number.parseFloat(style.transitionDuration) || 0,
      };
    });
    expect(durations.animation).toBeLessThanOrEqual(0.001);
    expect(durations.transition).toBeLessThanOrEqual(0.001);

    await expectNoSeriousAccessibilityViolations(page);
  });
});
