import {test,expect} from '@playwright/test';
test('desktop and mobile navigation use four hubs, homepage shows actual counts and search discovery',async({page})=>{
 await page.goto('/');const links=page.locator('#navbar a').filter({hasText:/^(首页|Notes|Courses|Papers|Research|Projects)$/});await expect(links).toHaveCount(5);
 for(const [path,count] of [['courses','31'],['papers','12'],['research','1'],['projects','0']])await expect(page.locator(`nav[aria-label="知识入口"] a[href="/${path}/"]`)).toContainText(`${count} 篇`);
 await expect(page.getByRole('link',{name:'搜索记录 →',exact:true})).toHaveAttribute('href','/search/');
 await page.setViewportSize({width:390,height:844});await page.locator('#nav-menu-switch').click();await expect(page.locator('#nav-menu-panel a[href="/notes/"]')).toHaveCount(0);
 await page.keyboard.press('Escape');await page.goto('/search/');await expect(page.getByRole('navigation',{name:'搜索备用入口'}).getByRole('link')).toHaveCount(5);
});
test('homepage to course, article, next lecture and back',async({page})=>{
 await page.goto('/');await expect(page.locator('h1')).toHaveText('Goongmly Research Notes');
 await page.getByRole('navigation',{name:'知识入口'}).getByRole('link',{name:'课程',exact:false}).click();
 await page.locator('main .topic-groups').getByRole('link',{name:/^操作系统/}).click();
 await expect(page.locator('h1')).toHaveText('操作系统');
 await page.locator('.post-card-title').filter({hasText:'Lec0: 课程介绍与成绩'}).click();
 await expect(page.locator('h1')).toHaveText('Lec0: 课程介绍与成绩');
 await expect(page.getByRole('navigation',{name:'上下讲'})).toBeVisible();
 await page.getByRole('navigation',{name:'上下讲'}).getByRole('link',{name:/下一讲/}).click();
 await expect(page.locator('h1')).toContainText('Lec');
 await page.locator('main').getByRole('link',{name:/返回课程/}).click();await expect(page.locator('h1')).toHaveText('操作系统');
});
test('collections show real empty states and unknown pages are not generated',async({page})=>{
 const notes=await (await page.request.get('/api/allPostMeta.json')).json();for(const [path,type] of [['/research/ideas/','idea'],['/research/experiments/','experiment']]){await page.goto(path);if(notes.some(n=>n.type===type))await expect(page.locator('.post-card-title')).not.toHaveCount(0);else await expect(page.getByText('暂无公开记录。',{exact:true})).toBeVisible();}
 await page.goto('/projects/');if(await page.locator('.collection-list li').count())await expect(page.locator('.collection-list li')).not.toHaveCount(0);else await expect(page.getByText('暂无已整理的公开项目。')).toBeVisible();
 const response=await page.goto('/courses/not-real/');expect(response?.status()).toBe(404);
});
test('mobile menu and table of contents support keyboard focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/notes/operating-systems-lec0/');
 await page.locator('#nav-menu-switch').focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:'导航菜单'})).toBeVisible();await page.keyboard.press('Tab');
 expect(await page.evaluate(()=>document.getElementById('nav-menu-panel')?.contains(document.activeElement))).toBe(true);
 await page.keyboard.press('Escape');await expect(page.locator('#nav-menu-switch')).toBeFocused();
 await page.locator('summary').filter({hasText:'文章目录'}).focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('navigation',{name:'文章目录',exact:true})).toBeVisible();
 await page.getByRole('navigation',{name:'文章目录',exact:true}).getByRole('link').first().focus();await page.keyboard.press('Enter');
 expect(new URL(page.url()).hash.length).toBeGreaterThan(1);
});
