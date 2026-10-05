import {test,expect} from '@playwright/test';
const audio=Buffer.alloc(44+8000*2*60);audio.write('RIFF',0);audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(8000,24);audio.writeUInt32LE(16000,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40);
test('context, lectures and TOC follow ten soft navigations while audio and statistics persist',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await page.route('**/*.mp4',r=>r.abort());await page.route('**/*.mp3',r=>r.fulfill({body:audio,contentType:'audio/wav'}));
 await page.goto('/papers/');await expect(page.locator('#topic-nav-sidebar')).toContainText('论文主题');
 await page.locator('#left-sidebar .btn-play').click();await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(false);
 const start=await page.evaluate(()=>{const w=window as any;w.testAudio=document.querySelector('audio');w.testStats=document.querySelector('[data-site-stats]');return w.testAudio.currentTime;});
 await page.locator('main .topic-groups a[href="/papers/topics/robotics/"]').click();await expect(page.locator('#topic-nav-sidebar [aria-current="page"]')).toHaveText(/机器人/);
 await page.locator('main .post-card-title').first().click();await expect(page.locator('#topic-nav-sidebar [data-related]')).not.toHaveCount(0);await expect(page.locator('#sidebar-toc-content a')).not.toHaveCount(0);
 for(let i=0;i<10;i++){const target=i%2?'/courses/':'/research/';await page.locator(`#navbar a[href="${target}"]`).first().click();await expect(page.locator('h1')).toHaveText(i%2?'课程':'研究');}
 await page.locator('main .topic-groups a[href="/courses/operating-systems/"]').click();await page.locator('main .post-card-title').first().click();await expect(page.locator('#left-sidebar-dynamic .course-nav [aria-current="page"]')).toHaveText(/Lec0/);
 await expect.poll(()=>page.locator('#sidebar-toc-content a').count()).toBeGreaterThan(0);
 expect(await page.evaluate(()=>{const w=window as any;return w.testAudio===document.querySelector('audio')&&w.testStats===document.querySelector('[data-site-stats]')&&!w.testAudio.paused&&w.testAudio.currentTime>0;})).toBe(true);
 expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(start);
 for(const id of ['swup-container','left-sidebar-dynamic','right-sidebar-dynamic','floating-toc-wrapper'])await expect(page.locator(`#${id}`)).toHaveCount(1);
 expect(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size;})).toBe(true);
 await page.goBack();await expect(page.locator('h1')).toHaveText('操作系统');await page.reload();await expect(page.locator('#topic-nav-sidebar [aria-current="page"]')).toHaveText(/操作系统/);
});
test('navigation and the single stats instance fit all six widths with TOC above stats on wide screens',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('firefly-effects','off'));
 for(const width of [320,390,768,1024,1280,1440]){await page.setViewportSize({width,height:900});await page.goto('/notes/operating-systems-lec0/');await expect(page.locator('[data-site-stats]')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),String(width)).toBe(true);
 if(width<1024){await expect(page.locator('#left-sidebar-wrapper')).toBeHidden();await page.locator('.knowledge-context-inline>summary').click();await expect(page.locator('#topic-nav-inline')).toBeVisible();}else{await expect(page.locator('#topic-nav-sidebar')).toBeVisible();await expect(page.locator('.knowledge-context-inline')).toBeHidden();}
 const main=await page.locator('#content-column').boundingBox();const stats=await page.locator('[data-site-stats]').boundingBox();expect(main&&stats).toBeTruthy();
 if(width<1360){expect(stats!.y).toBeGreaterThan(main!.y+main!.height-1);await expect(page.locator('.inline-toc')).toBeVisible();}else{expect(main!.width).toBeGreaterThan(640);const toc=await page.locator('#sidebar-toc').boundingBox();expect(toc!.y).toBeLessThan(stats!.y);}
 }
});
test('lecture links show each title once and keep keyboard navigation inside the sidebar',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/courses/compiler-principles/');
 await page.locator('main .post-card-title').first().click();
 const nav=page.locator('#left-sidebar-dynamic .course-nav');
 const current=nav.locator('ol a[aria-current="page"]');
 await expect(current).toHaveCount(1);
 expect((await current.innerText()).match(/Lec\s*1/g)).toHaveLength(1);
 const next=nav.locator('ol a').nth(1);
 await next.focus();
 expect(await next.evaluate(el=>Number.parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThan(0);
 const destination=await next.getAttribute('href');
 await page.keyboard.press('Enter');
 await expect(page).toHaveURL(destination!);
 await expect(nav.locator('ol a[aria-current="page"]')).toHaveAttribute('href',destination!);
 expect(await nav.locator('ol a').evaluateAll(links=>links.every(el=>el.scrollWidth<=el.clientWidth+1))).toBe(true);
});
