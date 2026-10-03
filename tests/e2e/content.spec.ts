import {test,expect} from '@playwright/test';
test('full content paginates 25 plus 19 and encoded local images load',async({page})=>{
 await page.goto('/notes/');await expect(page.locator('.post-card-title')).toHaveCount(25);
 await page.goto('/notes/page/2/');await expect(page.locator('.post-card-title')).toHaveCount(19);
 await page.goto('/notes/operating-systems-lec1/');
 const image=page.locator('img[data-source-asset*="NotebookLM"]');await expect(image).toHaveCount(1);
 await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
 const response=await page.request.get(await image.getAttribute('src')||'');expect(response.status()).toBe(200);
});
