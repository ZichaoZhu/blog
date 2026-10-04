import { test, expect } from '@playwright/test';

test('sidebar TOC retains one click listener after repeated anchor and history navigation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/notes/operating-systems-lec0/');
  const cdp = await page.context().newCDPSession(page);
  const clickListenerCount = async () => {
    const { result } = await cdp.send('Runtime.evaluate', {
      expression: 'document.querySelector("#sidebar-toc-content a")',
    });
    if (!result.objectId) return 0;
    try {
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      return listeners.filter(listener => listener.type === 'click').length;
    } finally {
      await cdp.send('Runtime.releaseObject', { objectId: result.objectId });
    }
  };
  try {
    await expect.poll(clickListenerCount).toBe(1);
    const hashes = await page.locator('#sidebar-toc-content a').evaluateAll(links => links.map(link => link.getAttribute('href')!));
    expect(hashes.length).toBeGreaterThan(1);
    for (let i = 0; i < 6; i++) {
      await page.evaluate(hash => { window.location.hash = hash; }, hashes[i % hashes.length]);
      // Both popstate and hashchange schedule manager replacement within 200ms.
      await page.waitForTimeout(350);
      expect(await clickListenerCount()).toBe(1);
    }
    await page.goBack();
    await page.waitForTimeout(350);
    expect(await clickListenerCount()).toBe(1);
  } finally {
    await cdp.detach();
  }
});
