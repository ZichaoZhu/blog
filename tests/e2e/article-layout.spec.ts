import {test,expect} from '@playwright/test';

test('article position buttons respond to pointer and keyboard and return to their own course',async({page})=>{
 await page.goto('/notes/japanese-lec1-gojuon/');
 const nav=page.getByRole('navigation',{name:'文章位置',exact:true});
 const back=nav.getByRole('link',{name:/返回课程/});
 const rest=await back.evaluate(el=>getComputedStyle(el).backgroundColor);
 await back.hover();await page.waitForTimeout(180);
 expect(await back.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(rest);
 await page.mouse.down();await page.waitForTimeout(180);
 const pressed=await back.evaluate(el=>getComputedStyle(el).backgroundColor);
 await page.mouse.move(0,0);await page.mouse.up();
 expect(pressed).not.toBe(rest);
 await nav.getByRole('link',{name:'浏览主题',exact:true}).focus();
 await page.keyboard.press('Enter');await expect(page).toHaveURL('/topics/');
 await page.goBack();await expect(page.locator('html')).not.toHaveClass(/is-page-transitioning/);await back.focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL('/courses/japanese/');
});

test('lecture cards preserve first, middle and last boundaries outside the reading surface',async({page})=>{
 await page.goto('/notes/japanese-lec1-gojuon/');
 const nav=page.getByRole('navigation',{name:'上下讲',exact:true});
 await expect(nav.getByRole('link')).toHaveCount(1);
 expect(await nav.evaluate(el=>el.closest('article')===null)).toBe(true);
 await nav.getByRole('link',{name:/下一讲/}).click();
 await expect(page).toHaveURL('/notes/japanese-lec2-pitch-accent/');
 await expect(nav.getByRole('link')).toHaveCount(2);
 await expect(page.locator('html')).not.toHaveClass(/is-page-transitioning/);
 await page.waitForFunction(()=>window.swup?.visit?.done===true);
 await nav.getByRole('link',{name:/下一讲/}).focus();await page.keyboard.press('Enter');
 await expect(page).toHaveURL('/notes/japanese-lec3-dakuon-and-choon/');
 await expect(nav.getByRole('link')).toHaveCount(1);
 await expect(nav.getByRole('link',{name:/上一讲/})).toHaveAttribute('href','/notes/japanese-lec2-pitch-accent/');
});

test('metadata remains ordered, its subject links work and article controls fit small screens',async({page})=>{
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/notes/japanese-lec2-pitch-accent/');
  const meta=page.getByRole('region',{name:'文章信息',exact:true});
  await expect(meta).toBeVisible();
  expect(await meta.locator('[data-meta-field]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-meta-field')))).toEqual(['author','date','type','course','topics','tags','words','minutes']);
  await expect(meta.getByRole('link',{name:'课程：日语学习',exact:true})).toHaveAttribute('href','/courses/japanese/');
  await expect(meta.getByRole('link',{name:'主题：日语学习',exact:true})).toHaveAttribute('href','/topics/japanese/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.getByRole('region',{name:'文章信息',exact:true}).getByRole('link',{name:'主题：日语学习',exact:true}).click();
 await expect(page).toHaveURL('/topics/japanese/');
 await expect(page.locator('main .post-card-title')).toHaveCount(3);
});
