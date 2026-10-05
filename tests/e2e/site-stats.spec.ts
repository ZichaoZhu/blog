import {test,expect} from '@playwright/test';
test('six statistics are real SSR values with actual activity date, even without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:1440,height:900}});
 const page=await context.newPage();await page.goto('/papers/');const stats=page.locator('[data-site-stats]');await expect(stats).toBeVisible();
 for(const [id,value] of [['articles','45'],['categories','9'],['tags','21']])await expect(stats.locator(`[data-stat-id="${id}"]`)).toHaveText(value);
 expect(Number((await stats.locator('[data-stat-id="words"]').textContent())?.replaceAll(',',''))).toBeGreaterThan(7978);
 expect(Number(await stats.locator('[data-stat-id="running-days"]').textContent())).toBeGreaterThan(640);
 await expect(stats.locator('time')).toHaveAttribute('datetime',/2026-07-07/);await expect(stats).toContainText('2026-07-07');await context.close();
});
test('client calendar is Shanghai in every browser timezone and advances across midnight',async({browser})=>{
 for(const timezoneId of ['America/Los_Angeles','Asia/Tokyo']){
 const context=await browser.newContext({timezoneId,viewport:{width:1440,height:900}});const page=await context.newPage();
 await page.clock.install({time:new Date('2026-10-03T15:59:59Z')});await page.goto('/papers/');await expect(page.locator('[data-stat-id="running-days"]')).toHaveText('640');
 await page.clock.fastForward(61000);await expect(page.locator('[data-stat-id="running-days"]')).toHaveText('641');await context.close();}
});
