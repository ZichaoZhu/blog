import {test,expect} from '@playwright/test';
test('music stays one paused-by-default instance across ten navigations',async({page})=>{
 await page.route('**/*.mp4',r=>r.abort());await page.goto('/');
 await expect(page.locator('audio')).toHaveCount(1);expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.volume)).toBeCloseTo(.25);
 await page.locator('#left-sidebar .btn-play').click();await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(false);
 await expect.poll(()=>page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
 const started=await page.locator('audio').evaluate((a:HTMLAudioElement)=>{(window as unknown as {__testAudio:HTMLAudioElement}).__testAudio=a;return a.currentTime;});
 await page.getByRole('button',{name:'暂停动态效果',exact:true}).click();expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(false);
 for(let i=0;i<10;i++){
  const target=i%2?'/papers/':'/courses/';await page.locator(`#navbar a[href="${target}"]`).first().click();await expect(page.locator('h1')).toHaveText(i%2?'论文阅读':'课程');await expect(page.locator('h1')).toBeVisible();
  expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a===(window as unknown as {__testAudio:HTMLAudioElement}).__testAudio)).toBe(true);
  await expect(page.locator('audio')).toHaveCount(1);
 }
 expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(started);
 await page.reload();expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
});
for(const mode of ['reduced','save-data','saved-off'])test(`${mode} prevents automatic video request`,async({page})=>{
 if(mode==='reduced')await page.emulateMedia({reducedMotion:'reduce'});
 if(mode==='save-data')await page.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true},configurable:true}));
 if(mode==='saved-off')await page.addInitScript(()=>localStorage.setItem('firefly-effects','off'));
 const videos:string[]=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))videos.push(r.url());});await page.goto('/');await page.waitForTimeout(350);expect(videos).toEqual([]);
 await expect(page.locator('h1')).toBeVisible();
});
test('failed video preserves poster and content, mobile controls work by keyboard',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.route('**/*.mp4',r=>r.abort());await page.goto('/');
 await expect(page.locator('#banner-images-container img').first()).toBeVisible();await expect(page.locator('h1')).toBeVisible();
 await page.getByRole('button',{name:'暂停动态效果',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'启用动态效果',exact:true})).toBeFocused();
 await page.locator('#music-player-switch').click();await expect(page.locator('#music-nav-panel')).not.toHaveAttribute('aria-hidden','true');
 await page.keyboard.press('Escape');await expect(page.locator('#music-player-switch')).toBeFocused();
 await expect(page.locator('#music-nav-panel')).toHaveAttribute('inert','');
});
test('video is muted and pauses in the background, then resumes',async({page})=>{
 await page.route('**/*.mp4',route=>route.fulfill({path:'tests/fixtures/media/background.mp4',contentType:'video/mp4'}));await page.goto('/');
 await expect.poll(()=>page.locator('#bg-player-video').evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 expect(await page.locator('#bg-player-video').evaluate((v:HTMLVideoElement)=>v.muted&&v.loop&&v.playsInline)).toBe(true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 expect(await page.locator('#bg-player-video').evaluate((v:HTMLVideoElement)=>v.paused)).toBe(true);
 await expect(page.locator('#canvas_sakura')).toHaveCount(0);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(()=>page.locator('#bg-player-video').evaluate((v:HTMLVideoElement)=>v.paused)).toBe(false);
 await expect(page.locator('#canvas_sakura')).toHaveCount(1);
});
test('failed music stops, remains stopped across navigation and retries only on user action',async({page})=>{
 let requests=0;await page.route('**/*.mp3',route=>{requests++;return route.abort();});await page.route('**/*.mp4',route=>route.abort());await page.goto('/');await page.locator('#left-sidebar .btn-play').click();
 await expect.poll(()=>page.evaluate(()=>window.__fireflyMusic?.getState().error)).toBeTruthy();await page.waitForTimeout(4500);expect(requests).toBe(1);expect(await page.locator('audio').evaluate((a:HTMLAudioElement)=>a.paused)).toBe(true);
 await page.locator('#navbar a[href="/courses/"]').first().click();await expect(page.locator('h1')).toHaveText('课程');await page.waitForTimeout(2300);expect(requests).toBe(1);
 await page.locator('#left-sidebar .btn-play').click();await expect.poll(()=>requests).toBe(2);await page.waitForTimeout(2300);expect(requests).toBe(2);
});
