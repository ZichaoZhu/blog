import {test,expect} from '@playwright/test';
test('long mobile titles and every subject link remain clear of the card arrow',async({page})=>{
 for(const width of [320,390]){await page.setViewportSize({width,height:900});await page.goto('/papers/topics/robotics/');const result=await page.locator('main .knowledge-list .post-card-wrapper').evaluateAll(cards=>cards.every(card=>{const title=card.querySelector('.post-card-title') as HTMLElement;const arrow=card.querySelector('.post-card-enter-btn') as HTMLElement;return title.getBoundingClientRect().right<=arrow.getBoundingClientRect().left-1&&title.scrollWidth<=title.clientWidth+1&&[...card.querySelectorAll('.note-subjects a')].every(a=>a.getBoundingClientRect().right<=arrow.getBoundingClientRect().left-1);}));expect(result,String(width)).toBe(true);}
});
test('papers and research group records by actual subjects and links reach the right members',async({page})=>{
 await page.goto('/papers/');const groups=page.locator('main .topic-groups');await expect(groups.getByRole('link',{name:/^机器人/})).toBeVisible();
 await expect(page.locator('main .post-card-title')).toHaveCount(0);await groups.getByRole('link',{name:/^机器人/}).click();
 await expect(page.locator('h1')).toHaveText('机器人');await expect(page.locator('main .post-card-title')).not.toHaveCount(0);await expect(page.locator('main')).not.toContainText('未分类');
 for(const link of await page.locator('main .post-card-title').evaluateAll(nodes=>nodes.map(n=>(n as HTMLAnchorElement).pathname)))expect(link.startsWith('/notes/')).toBe(true);
 await page.goto('/research/');await page.locator('main .topic-groups').getByRole('link',{name:/三维视觉/}).click();await expect(page.locator('main .post-card-title')).toHaveCount(1);
 for(const path of ['/papers/topics/not-real/','/research/topics/robotics/','/papers/topics/robotics/page/99/'])expect((await page.request.get(path)).status()).toBe(404);
});
test('imported course and empty projects stay honest, and compatibility pagination is usable',async({page})=>{
 await page.goto('/courses/deep-learning-computer-vision/');await expect(page.locator('.post-card-title')).toHaveCount(15);await expect(page.getByText('暂无公开记录。',{exact:true})).toHaveCount(0);
 await page.goto('/projects/');await expect(page.getByText('暂无已整理的公开项目。',{exact:true})).toBeVisible();
 await page.goto('/notes/');await expect(page.locator('.post-card-title')).toHaveCount(25);await page.getByRole('navigation',{name:'分页',exact:true}).getByRole('link',{name:/下一页/}).click();await expect(page.locator('.post-card-title')).toHaveCount(25);await page.reload();await expect(page.locator('.post-card-title')).toHaveCount(25);
});
test('hub and subject directories keep their records inside one surface with a direct introduction',async({page})=>{
 for(const path of ['/courses/','/papers/','/research/','/projects/','/courses/compiler-principles/','/courses/reinforcement-learning/','/papers/topics/robotics/','/research/topics/3d-vision/']){
  await page.goto(path);
  const directory=page.locator('main .knowledge-directory');
  await expect(directory).toHaveCount(1);
  await expect(directory.locator(':scope > .knowledge-directory-header h1')).toBeVisible();
  await expect(directory.locator(':scope > .knowledge-directory-header p')).toBeVisible();
  await expect(directory.locator('.topic-groups, .knowledge-list, .empty-state')).toHaveCount(1);
 }
});
test('compiler grading document is a peer lecture with neighbors, discovery and its old link',async({page})=>{
 const introduction='/notes/compiler-principles-compiler-principle/';
 await page.goto('/courses/compiler-principles/');
 const list=page.locator('main .post-card-title');
 await expect(list).toHaveCount(15);
 await expect(list.first()).toHaveText('课程介绍与评分');
 await expect(page.locator('details.collection-intro')).toHaveCount(0);
 await list.first().click();
 await expect(page).toHaveURL(introduction);
 await expect(page.locator('main .custom-md')).toContainText('分数构成');
 const lectures=page.locator('#left-sidebar-dynamic .course-nav ol a');
 await expect(lectures).toHaveCount(15);
 await expect(lectures.first()).toHaveAttribute('aria-current','page');
 await expect(page.getByRole('navigation',{name:'上下讲'}).getByRole('link')).toHaveCount(1);
 await page.getByRole('navigation',{name:'上下讲'}).getByRole('link',{name:/下一讲/}).click();
 await expect(page).toHaveURL('/notes/compiler-principles-lec1/');
 await page.getByRole('navigation',{name:'上下讲'}).getByRole('link',{name:'上一讲：课程介绍与评分'}).click();
 await expect(page).toHaveURL(introduction);
 await page.goto('/search/?q=评分&course=compiler-principles');
 await expect(page.locator('[data-search-result] a[href="'+introduction+'"]')).toBeVisible();
 const sitemap=await (await page.request.get('/sitemap.xml')).text();
 expect(sitemap).toContain(introduction+'</loc>');
 for(const feed of ['/rss.xml','/atom.xml'])expect(await (await page.request.get(feed)).text()).toContain(introduction);
 await page.goto('/blog/Coure-Notebook/Compiler_Principle/#'+encodeURIComponent('分数构成'));
 await expect(page).toHaveURL(new RegExp(introduction));
 await expect.poll(()=>page.evaluate(()=>!!document.getElementById(decodeURIComponent(location.hash.slice(1))))).toBe(true);
});
test('directory typography, theme surfaces and topic-card states form one system',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/courses/');
 const directory=page.locator('main .knowledge-directory');
 await expect(directory).toHaveCount(1);
 const card=directory.locator('.topic-group').first();
 const styles=await page.evaluate(()=>{
  const read=(selector:string)=>{const style=getComputedStyle(document.querySelector(selector)!);return {background:style.backgroundColor,color:style.color,font:style.fontFamily,size:style.fontSize,weight:Number(style.fontWeight)};};
  return {body:read('body'),directory:read('.knowledge-directory'),heading:read('.knowledge-directory-header h1'),intro:read('.knowledge-directory-header p'),title:read('.topic-group h2'),description:read('.topic-group p'),card:read('.topic-group')};
 });
 expect(styles.directory.background).toBe('rgb(255, 255, 255)');
 expect(styles.card.background).toBe('rgb(255, 255, 255)');
 expect(Number.parseFloat(styles.heading.size)).toBeGreaterThan(Number.parseFloat(styles.intro.size));
 expect(styles.title.size).toBe(styles.intro.size);
 expect(styles.title.weight).toBeGreaterThanOrEqual(700);
 expect(Number.parseFloat(styles.description.size)).toBeLessThan(Number.parseFloat(styles.title.size));
 expect(styles.description.color).not.toBe(styles.title.color);
 const rest=await card.evaluate(el=>getComputedStyle(el).backgroundColor);
 await card.hover();await page.waitForTimeout(180);
 const hover=await card.evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(hover).not.toBe(rest);
 await page.mouse.down();await page.waitForTimeout(180);
 const active=await card.evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(active).not.toBe(hover);
 await page.mouse.up();await card.focus();
 expect(await card.evaluate(el=>Number.parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThan(0);
 await page.evaluate(()=>document.documentElement.classList.add('dark'));
 await expect.poll(()=>directory.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgb(255, 255, 255)');
});
