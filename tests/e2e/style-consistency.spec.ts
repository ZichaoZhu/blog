import {test,expect} from '@playwright/test';

test('search fields stay inside their form at narrow and wide widths',async({page})=>{
 for(const width of [320,390,768,1024,1280,1440]){
  await page.setViewportSize({width,height:1000});
  await page.goto('/search/?q=Bellman');
  await expect(page.locator('[data-search-result]')).not.toHaveCount(0);
  const clipped=await page.getByRole('form',{name:'搜索公开记录'}).evaluate(form=>{
   const bounds=form.getBoundingClientRect();
   return [...form.querySelectorAll('input,select')].filter(el=>{const b=el.getBoundingClientRect();return b.left<bounds.left-1||b.right>bounds.right+1;}).map(el=>el.getAttribute('name'));
  });
  expect(clipped,String(width)).toEqual([]);
 }
});

test('clicking a search excerpt opens its article and back restores the search',async({page})=>{
 await page.goto('/search/?q=Bellman&course=reinforcement-learning');
 const result=page.locator('[data-search-result]').first();
 await expect(result).toBeVisible();
 const destination=await result.locator('a').first().getAttribute('href');
 await result.locator('p').click();
 await expect(page).toHaveURL(destination!);
 await page.goBack();
 await expect(page.getByLabel('关键词')).toHaveValue('Bellman');
 await expect(page.getByLabel('课程',{exact:true})).toHaveValue('reinforcement-learning');
 await expect(page.locator('[data-search-result]')).not.toHaveCount(0);
});

test('home subject cards give pointer feedback and open their destination with a keyboard',async({page})=>{
 await page.goto('/');
 const card=page.getByRole('navigation',{name:'知识入口'}).getByRole('link').first();
 const rest=await card.evaluate(el=>getComputedStyle(el).backgroundColor);
 await card.hover();
 await expect.poll(()=>card.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(rest);
 const destination=await card.getAttribute('href');
 await card.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL(destination!);
});

test('navigation arrows retain a visible glyph on home and after soft navigation',async({page})=>{
 await page.goto('/');
 const arrows=page.locator('.post-card-enter-btn svg');
 await expect(arrows.first()).toBeVisible();
 expect(await arrows.evaluateAll(icons=>icons.every(icon=>(icon as SVGGraphicsElement).getBBox().width>0))).toBe(true);
 await page.getByRole('navigation',{name:'知识入口'}).getByRole('link').first().click();
 await expect(page).toHaveURL('/courses/');
 await page.locator('.topic-group[href="/courses/reinforcement-learning/"]').click();
 await expect(page).toHaveURL('/courses/reinforcement-learning/');
 await expect(arrows.first()).toBeVisible();
 expect(await arrows.evaluateAll(icons=>icons.every(icon=>(icon as SVGGraphicsElement).getBBox().width>0))).toBe(true);
});

test('a course card presents one subject destination when its course and topic share a name',async({page})=>{
 await page.goto('/');
 const card=page.locator('.knowledge-list li').filter({has:page.locator('a.post-card-title[href="/notes/reinforcement-learning-lec2-bellman-equation/"]')}).first();
 const subject=card.locator('.note-subjects').getByRole('link',{name:'强化学习',exact:true});
 await expect(subject).toHaveCount(1);
 await subject.click();await expect(page).toHaveURL('/courses/reinforcement-learning/');
});

test('mobile article contents give feedback and preserve keyboard anchor navigation',async({page})=>{
 await page.setViewportSize({width:390,height:1000});
 await page.goto('/notes/japanese-lec1-gojuon/');
 await page.locator('.inline-toc>summary').click();
 const link=page.locator('.inline-toc a').first();
 const rest=await link.evaluate(el=>getComputedStyle(el).backgroundColor);
 await link.hover();await expect.poll(()=>link.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(rest);
 const hash=await link.getAttribute('href');
 await link.focus();await page.keyboard.press('Enter');
 await expect.poll(()=>decodeURIComponent(new URL(page.url()).hash)).toBe(decodeURIComponent(hash!));
});

test('auxiliary controls distinguish rest, hover and pressed states and retain focus feedback',async({page})=>{
 for(const [path,selector] of [['/categories/','main a.card-base'],['/tags/','main a[href*="archive"][class*="rounded-lg"]'],['/archive/','main .archive-post'],['/series/','.series-acc-header'],['/rss/','#copy-rss-btn'],['/atom/','#copy-atom-btn'],['/404.html','main .back-link']]){
  await page.goto(path);const control=page.locator(selector).first();await expect(control).toBeVisible();
  await page.mouse.move(0,0);const rest=await control.evaluate(el=>getComputedStyle(el).backgroundColor);
  await control.hover();await expect.poll(()=>control.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(rest);
  const hover=await control.evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.mouse.down();await expect.poll(()=>control.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(hover);
  await page.mouse.move(0,0);await page.mouse.up();await control.focus();
  expect(await control.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth)),path).toBeGreaterThan(0);
 }
});
