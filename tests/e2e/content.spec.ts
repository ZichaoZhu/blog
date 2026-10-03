import {readCurrentManifest} from '../../scripts/verify-site';import {isPublicNote} from '../../src/utils/note-model';
import {test,expect} from '@playwright/test';
const total=(await readCurrentManifest('src/content/posts')).records.filter(r=>isPublicNote({entryId:r.sourcePath,data:r,hasBody:r.hasBody})).length;
test('current content paginates without frozen counts and encoded local images load',async({page})=>{
 await page.goto('/notes/');await expect(page.locator('.post-card-title')).toHaveCount(Math.min(25,total));
 if(total>25){await page.goto('/notes/page/2/');await expect(page.locator('.post-card-title')).toHaveCount(Math.min(25,total-25));}
 await page.goto('/notes/operating-systems-lec1/');
 const image=page.locator('img[data-source-asset*="NotebookLM"]');await expect(image).toHaveCount(1);
 await image.scrollIntoViewIfNeeded();await expect.poll(()=>image.evaluate((e:HTMLImageElement)=>e.complete&&e.naturalWidth>0)).toBe(true);
 const response=await page.request.get(await image.getAttribute('src')||'');expect(response.status()).toBe(200);
});
