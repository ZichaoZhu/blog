import {test,expect} from '@playwright/test';
test('papers and research group records by actual subjects and links reach the right members',async({page})=>{
 await page.goto('/papers/');const groups=page.locator('main .topic-groups');await expect(groups.getByRole('link',{name:/^机器人/})).toBeVisible();
 await expect(page.locator('main .post-card-title')).toHaveCount(0);await groups.getByRole('link',{name:/^机器人/}).click();
 await expect(page.locator('h1')).toHaveText('机器人');await expect(page.locator('main .post-card-title')).not.toHaveCount(0);await expect(page.locator('main')).not.toContainText('未分类');
 for(const link of await page.locator('main .post-card-title').evaluateAll(nodes=>nodes.map(n=>(n as HTMLAnchorElement).pathname)))expect(link.startsWith('/notes/')).toBe(true);
 await page.goto('/research/');await page.locator('main .topic-groups').getByRole('link',{name:/三维视觉/}).click();await expect(page.locator('main .post-card-title')).toHaveCount(1);
 for(const path of ['/papers/topics/not-real/','/research/topics/robotics/','/papers/topics/robotics/page/99/'])expect((await page.request.get(path)).status()).toBe(404);
});
test('configured empty course and projects stay honest, and compatibility pagination is usable',async({page})=>{
 await page.goto('/courses/deep-learning-computer-vision/');await expect(page.getByText('暂无公开记录。',{exact:true})).toBeVisible();
 await page.goto('/projects/');await expect(page.getByText('暂无已整理的公开项目。',{exact:true})).toBeVisible();
 await page.goto('/notes/');await expect(page.locator('.post-card-title')).toHaveCount(25);await page.getByRole('navigation',{name:'分页',exact:true}).getByRole('link',{name:/下一页/}).click();await expect(page.locator('.post-card-title')).toHaveCount(19);await page.reload();await expect(page.locator('.post-card-title')).toHaveCount(19);
});
