import {test,expect} from '@playwright/test';

test('archive entry, pagination, year selection and article links survive soft navigation',async({page})=>{
 await page.goto('/archive/');
 await expect(page).toHaveURL('/archive/');
 await expect(page.locator('main h1')).toHaveText('归档');
 await expect(page.locator('main .archive-post')).toHaveCount(25);
 await expect(page.locator('main .archive-post').first()).toContainText('法线估计方法调研与数据集疑问');
 await expect(page.locator('#topic-nav-sidebar a[aria-current="page"]')).toContainText('全部文章');
 await page.getByRole('navigation',{name:'分页',exact:true}).getByRole('link',{name:'下一页'}).click();
 await expect(page).toHaveURL('/archive/page/2/');
 await expect(page.locator('main .archive-post')).toHaveCount(25);
 await expect(page.locator('main .archive-year h2')).toHaveText(['2026','2025','日期未记录']);
 await expect(page.locator('main .archive-year').last().locator('a')).toHaveCount(7);
 await page.locator('#topic-nav-sidebar a[href="/archive/2025/"]').click();
 await expect(page).toHaveURL('/archive/2025/');
 await expect(page.locator('main .archive-post')).toHaveCount(12);
 await expect(page.locator('#topic-nav-sidebar [aria-current="page"]')).toContainText('2025');
 await expect(page.locator('html')).not.toHaveClass(/is-page-transitioning/);
 await page.waitForFunction(()=>window.swup?.navigating!==true);
 const destination=await page.locator('main .archive-post').first().getAttribute('href');
 await page.locator('main .archive-post').first().focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(destination!);
 await page.goBack();await expect(page).toHaveURL('/archive/2025/');
 await page.reload();await expect(page.locator('main .archive-post')).toHaveCount(12);
 await page.locator('#navbar a[href="/courses/"]').first().click();
 await page.locator('#navbar a[href="/archive/"]').first().click();
 await expect(page.locator('main .archive-post')).toHaveCount(25);
 await expect(page.locator('[data-site-stats]')).toHaveCount(1);
});

test('archive fits narrow screens and timeline rows reuse pointer and keyboard feedback',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('firefly-effects','off'));
 for(const width of [320,390,768,1024,1280,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/archive/undated/');
  await expect(page.locator('main .archive-post')).toHaveCount(25);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),String(width)).toBe(true);
  expect(await page.locator('main .archive-post').evaluateAll(rows=>rows.every(row=>row.scrollWidth<=row.clientWidth+1))).toBe(true);
  if(width<1024){await page.locator('.knowledge-context-inline>summary').click();await expect(page.locator('#topic-nav-inline a[href="/archive/2025/"]')).toBeVisible();}
 }
 const row=page.locator('main .archive-post').first();
 await page.mouse.move(0,0);const rest=await row.evaluate(el=>getComputedStyle(el).backgroundColor);
 await row.hover();await expect.poll(()=>row.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(rest);
 const hover=await row.evaluate(el=>getComputedStyle(el).backgroundColor);
 await page.mouse.down();await expect.poll(()=>row.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(hover);
 await page.mouse.move(0,0);await page.mouse.up();await row.focus();
 expect(await row.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThan(0);
});

test('static archive exposes real links without JavaScript and excludes nonexistent years and pages',async({browser,request})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
 try{
  await page.goto('http://127.0.0.1:4321/archive/2026/');
  await expect(page.locator('main .archive-post')).toHaveCount(25);
  await page.getByRole('navigation',{name:'分页',exact:true}).getByRole('link',{name:'下一页'}).click();
  await expect(page.locator('main .archive-post')).toHaveCount(6);
  const canonical=await page.locator('link[rel="canonical"]').getAttribute('href');expect(canonical).toMatch(/\/archive\/2026\/page\/2\/$/);
 }finally{await context.close();}
 for(const path of ['/archive/1900/','/archive/page/0/','/archive/page/1/','/archive/page/4/','/archive/2025/page/2/','/archive/undated/page/3/'])expect((await request.get(path)).status(),path).toBe(404);
});

test('desktop navigation stays visible without collisions, including while searching',async({page})=>{
 const checkLayout=async(width:number)=>{
  const result=await page.locator('#navbar').evaluate(nav=>{
   const brand=nav.querySelector('a[href="/"]')!.getBoundingClientRect();
   const controls=nav.querySelector('#search-bar')!.closest('.col-start-3')!.getBoundingClientRect();
   const links=[...nav.querySelectorAll('[data-dropdown]>a')].filter(a=>a.getBoundingClientRect().width>0);
   const measured=links.map(a=>{
    const bounds=a.getBoundingClientRect();
    const label=[...a.querySelector('div')!.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent!.trim());
    const range=document.createRange();range.selectNodeContents(label!);
    const rects=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
    const height=Math.max(...rects.map(rect=>rect.bottom))-Math.min(...rects.map(rect=>rect.top));
    const lineHeight=parseFloat(getComputedStyle(a.querySelector('div')!).lineHeight);
    return {label:label!.textContent!.trim(),height,lineHeight,left:bounds.left,right:bounds.right,brandRight:brand.right,controlsLeft:controls.left,safe:height<=lineHeight+1&&bounds.left>=brand.right&&bounds.right<=controls.left};
   });
   return {visible:links.length,safe:measured.every(link=>link.safe),measured};
  });
  expect(result.visible,`Desktop links must be visible at ${width}px`).toBe(6);
  const icons=page.locator('#navbar .navbar-links a .navbar-icon');
  await expect(icons).toHaveCount(6);
  for(const icon of await icons.all())await expect(icon,`Navigation icons must be visible at ${width}px`).toBeVisible();
  expect(result.safe,`${width} ${JSON.stringify(result.measured)}`).toBe(true);
  await expect(page.locator('#nav-menu-switch')).toBeHidden();
 };
 for(const width of [1024,1100,1279,1280,1360,1399,1400,1440,1920]){
  await page.setViewportSize({width,height:900});await page.goto('/archive/');
  await checkLayout(width);
  const searchInput=page.locator('#search-input-desktop');
  if(await searchInput.isVisible()){
   await page.addStyleTag({content:'#navbar *{transition:none!important;}'});
   await searchInput.focus();
   await checkLayout(width);
  }else{
   await page.locator('#search-switch').click();
   await expect(page.locator('#search-bar-inside input')).toBeVisible();
   await page.keyboard.press('Escape');
   await expect(page.locator('#search-switch')).toBeFocused();
  }
 }
});

test('legacy archive filters still reach their subjects and generated archives appear in sitemap',async({page})=>{
 for(const [query,destination] of [['category=编译原理','/courses/compiler-principles/'],['tag=机器人','/topics/robotics/'],['page=2','/archive/page/2/']]){
  await page.goto('/archive/?'+query);await expect(page).toHaveURL(destination);
 }
 const sitemap=await (await page.request.get('/sitemap.xml')).text();
 for(const path of ['/archive/','/archive/page/2/','/archive/2026/','/archive/2026/page/2/','/archive/2025/','/archive/undated/'])expect(sitemap).toContain(path+'</loc>');
});
